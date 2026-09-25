import { getVercelOidcToken } from '@vercel/oidc';
import {
  photoOptionsForStory,
  selectEditorialAsset,
  toAsset,
} from '@/lib/editorial-assets';
import { draftProblems } from '@/lib/draft-checks';
import { getEditorialSettings, getVoiceFromPlaybook } from '@/lib/editorial-settings';
import { ingestAssetRequests } from '@/lib/asset-intake';
import {
  JOURNAL_DRAFT_INSTRUCTIONS,
  KYLE_LANGFORD_AUTHOR,
  KYLE_LANGFORD_NEWSROOM_VOICE,
  normalizeJournalPunctuation,
} from '@/lib/editorial-voice';
import { seedDatabase } from '@/lib/repository';
import { getSupabase, unwrap } from '@/lib/supabase-server';
import { decodeHtmlEntities } from '@/lib/text';
import { notifyWebSubHub } from '@/lib/websub';
import { articleUrl, submitToIndexNow } from '@/lib/indexnow';
import { isPermanentFailure, rankCandidates } from '@/lib/candidate-selection';

type FeedEntry = {
  title: string;
  url: string;
  summary: string;
  publishedAt?: string;
};
type SourceRow = {
  id: string;
  name: string;
  feed_url: string;
  homepage_url: string;
  section: string;
  trust_tier: number;
  active: boolean;
  auto_publish: boolean;
  /**
   * Added to every candidate's score, so the newsroom can put California and
   * local sources ahead of national feeds with an update, not a deploy.
   */
  priority: number | null;
  last_fetched_at: string | null;
};
type CandidateRow = {
  id: string;
  source_id: string;
  external_url: string;
  title: string;
  summary: string;
  published_at: string | null;
  discovered_at: string;
  status: 'new' | 'selected' | 'processed' | 'rejected';
  score: number;
};

const FEED_TIMEOUT_MS = 8_000;
const SOURCE_PAGE_TIMEOUT_MS = 12_000;
const AI_DRAFT_TIMEOUT_MS = 75_000;
const STALE_RUN_AFTER_MS = 15 * 60_000;
/**
 * No new draft is started after this much of the run has passed, so the one
 * in progress (a page fetch and a model call, at most 87 seconds) still ends
 * inside the route's 300-second limit.
 */
const DRAFTING_BUDGET_MS = 180_000;
/** A few failed drafts may be replaced by the next candidate in the same run. */
const EXTRA_DRAFT_ATTEMPTS = 2;
/** How far back a draft is compared with published stories for a repeat. */
const RECENT_STORY_MS = 48 * 3_600_000;

function textFromTag(block: string, tag: string) {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'),
  );
  return match
    ? decodeHtmlEntities(
        match[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
    : '';
}

function parseFeed(xml: string): FeedEntry[] {
  const blocks =
    xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return blocks
    .slice(0, 12)
    .map((block) => {
      const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
      const url =
        textFromTag(block, 'link') || href || textFromTag(block, 'guid');
      const rawDate =
        textFromTag(block, 'pubDate') ||
        textFromTag(block, 'published') ||
        textFromTag(block, 'updated');
      return {
        title: textFromTag(block, 'title'),
        url,
        summary:
          textFromTag(block, 'description') ||
          textFromTag(block, 'summary') ||
          textFromTag(block, 'content'),
        publishedAt:
          rawDate && !Number.isNaN(Date.parse(rawDate))
            ? new Date(rawDate).toISOString()
            : undefined,
      };
    })
    .filter((entry) => entry.title && /^https?:\/\//.test(entry.url));
}

async function stableId(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchReadablePage(url: string) {
  const publicationUrl =
    process.env.SITE_URL || 'https://www.goldencoastjournal.com';
  const response = await fetch(url, {
    headers: {
      'user-agent': `GoldenCoastJournalBot/1.0 (+${publicationUrl}/standards)`,
    },
    signal: AbortSignal.timeout(SOURCE_PAGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const html = (await response.text()).slice(0, 500000);
  // Entities are decoded, not just &nbsp; and &amp;, so a quotation the model
  // copies reads as the speaker's words (“Today’s”, not &#8220;Today&#8217;s)
  // and can be checked against this same text.
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .slice(0, 18000);
}

type RecentStory = { slug: string; title: string };

function extractOutputText(payload: unknown): string {
  const data = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };
  if (typeof data.output_text === 'string') return data.output_text;
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string')
        return content.text;
    }
  }
  throw new Error('The model returned no article text');
}

/**
 * Exported so a change to the instructions or checks can be dry-run against
 * real source pages without storing anything.
 */
export async function draftCandidate(
  candidate: CandidateRow,
  source: SourceRow,
  gatewayToken: string,
  voiceOverride: string | null,
  recent: RecentStory[],
) {
  const sourceText = await fetchReadablePage(candidate.external_url);
  const photos = await photoOptionsForStory({
    section: source.section,
    text: `${candidate.title} ${candidate.summary} ${sourceText}`,
  });
  const photoList = photos.length
    ? photos.map((photo) => `- ${photo.id}: ${photo.alt}`).join('\n')
    : '(none available)';
  const recentList = recent.length
    ? recent.map((story) => `- ${story.slug}: ${story.title}`).join('\n')
    : '(none)';
  const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${gatewayToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'openai/gpt-5-mini',
      store: false,
      // The playbook row is authoritative so the voice can be edited without a
      // deploy; the bundled constant is the fallback if the table is unreachable.
      instructions: voiceOverride
        ? JOURNAL_DRAFT_INSTRUCTIONS.replace(
            KYLE_LANGFORD_NEWSROOM_VOICE,
            voiceOverride,
          )
        : JOURNAL_DRAFT_INSTRUCTIONS,
      input: `SOURCE NAME: ${source.name}\nSOURCE URL: ${candidate.external_url}\nSOURCE MATERIAL:\n${sourceText}\n\nPHOTOGRAPHS (id: what it shows):\n${photoList}\n\nALREADY PUBLISHED IN THE LAST TWO DAYS (slug: headline):\n${recentList}`,
      text: {
        format: {
          type: 'json_schema',
          name: 'journal_article',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'title',
              'dek',
              'body',
              'keyPoints',
              'section',
              'confidence',
              'photoId',
              'duplicateOf',
            ],
            properties: {
              title: { type: 'string' },
              dek: { type: 'string' },
              body: {
                type: 'array',
                minItems: 3,
                maxItems: 8,
                items: { type: 'string' },
              },
              keyPoints: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: { type: 'string' },
              },
              section: {
                type: 'string',
                enum: [
                  'California',
                  'Nation',
                  'World',
                  'Business',
                  'Technology',
                  'Climate',
                  'Culture',
                  'Ideas',
                ],
              },
              confidence: { type: 'integer', minimum: 0, maximum: 100 },
              photoId: {
                type: 'string',
                enum: [...photos.map((photo) => photo.id), 'none'],
              },
              duplicateOf: {
                type: 'string',
                enum: [...recent.map((story) => story.slug), 'none'],
              },
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(AI_DRAFT_TIMEOUT_MS),
  });
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    throw new Error(
      `AI Gateway drafting failed with ${response.status}${requestId ? ` (${requestId})` : ''}`,
    );
  }
  const draft = JSON.parse(extractOutputText(await response.json())) as {
    title: string;
    dek: string;
    body: string[];
    keyPoints: string[];
    section: string;
    confidence: number;
    photoId: string;
    duplicateOf: string;
  };
  // Checked as the model wrote it, before house punctuation turns its dashes
  // into semicolons, so a quotation with a dash is caught rather than altered.
  const problems = draftProblems(draft, sourceText);
  const photo = photos.find((option) => option.id === draft.photoId) || null;
  if (!photo) problems.push('no approved photograph shows this story');
  const duplicateOf = recent.some((story) => story.slug === draft.duplicateOf)
    ? draft.duplicateOf
    : null;
  if (duplicateOf) problems.push(`may repeat /article/${duplicateOf}`);
  return {
    ...draft,
    title: normalizeJournalPunctuation(draft.title),
    dek: normalizeJournalPunctuation(draft.dek),
    body: draft.body.map(normalizeJournalPunctuation),
    keyPoints: draft.keyPoints.map(normalizeJournalPunctuation),
    photo,
    problems,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

export async function runEditorialPipeline() {
  const db = getSupabase();
  await seedDatabase();
  // Imagery, publication thresholds and queue limits all come from the
  // database so the newsroom can be retuned without a redeploy.
  const settings = await getEditorialSettings();
  const voice = await getVoiceFromPlaybook();
  // Pictures an agent asked for are fetched and stored here, where the service
  // key lives, so nothing downstream has to hold a credential to add one.
  const assetIntake = await ingestAssetRequests();
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_RUN_AFTER_MS).toISOString();
  unwrap(
    await db
      .from('gcj_pipeline_runs')
      .update({
        status: 'failed',
        completed_at: startedAt,
        error: 'Closed by a later run after exceeding the pipeline time budget.',
      })
      .eq('status', 'running')
      .lt('started_at', staleBefore),
    'Unable to close stale pipeline runs',
  );
  unwrap(
    await db.from('gcj_pipeline_runs').insert({
      id: runId,
      run_type: 'scheduled-newsroom',
      status: 'running',
      started_at: startedAt,
    }),
    'Unable to create pipeline run',
  );

  let discovered = 0;
  let drafted = 0;
  let feedsSucceeded = 0;
  let reviewBacklog = 0;
  let draftingSkipped: string | null = null;
  let heldByChecks = 0;
  let reviewOnlyPaused = false;
  let webSubNotifications = 0;
  let webSubFailures = 0;
  const failures: string[] = [];
  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY ||
    (await getVercelOidcToken().catch(() => ''));

  try {
    const activeSources = unwrap(
      await db.from('gcj_sources').select('*').eq('active', true),
      'Unable to load sources',
    ) as SourceRow[];
    unwrap(
      await db
        .from('gcj_request_limits')
        .delete()
        .lt('window_start', Math.floor(Date.now() / 60000) - 1440),
      'Unable to prune rate limits',
    );

    const feedResults = await Promise.all(
      activeSources.map(async (source) => {
        try {
          const response = await fetch(source.feed_url, {
            headers: { 'user-agent': 'GoldenCoastJournalBot/1.0' },
            signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
          });
          if (!response.ok)
            throw new Error(`Feed returned ${response.status}`);
          const entries = parseFeed(await response.text());
          const rows = await Promise.all(
            entries.map(async (entry) => {
              const ageHours = entry.publishedAt
                ? Math.max(
                    0,
                    (Date.now() - Date.parse(entry.publishedAt)) / 3600000,
                  )
                : 48;
              // Routine notices are recorded, so they are not rediscovered on
              // the next run, but never drafted.
              const routine = settings.skipTitlePatterns.some((pattern) =>
                pattern.test(entry.title),
              );
              return {
                id: await stableId(entry.url),
                source_id: source.id,
                external_url: entry.url,
                title: entry.title,
                summary: entry.summary,
                published_at: entry.publishedAt || null,
                discovered_at: new Date().toISOString(),
                status: routine ? 'rejected' : 'new',
                score: Math.max(
                  1,
                  Math.round(
                    (source.trust_tier === 1 ? 100 : 70) -
                      ageHours +
                      (source.priority || 0),
                  ),
                ),
              };
            }),
          );
          let sourceDiscovered = 0;
          if (rows.length) {
            const inserted = unwrap(
              await db
                .from('gcj_story_candidates')
                .upsert(rows, {
                  onConflict: 'external_url',
                  ignoreDuplicates: true,
                })
                .select('id'),
              `Unable to store candidates from ${source.name}`,
            );
            sourceDiscovered = (inserted || []).length;
          }
          unwrap(
            await db
              .from('gcj_sources')
              .update({ last_fetched_at: new Date().toISOString() })
              .eq('id', source.id),
            `Unable to update ${source.name}`,
          );
          return { discovered: sourceDiscovered, error: null };
        } catch (error) {
          return {
            discovered: 0,
            error: `${source.name}: ${error instanceof Error ? error.message : 'unknown feed error'}`,
          };
        }
      }),
    );
    discovered = feedResults.reduce(
      (total, result) => total + result.discovered,
      0,
    );
    feedsSucceeded = feedResults.filter((result) => !result.error).length;
    failures.push(
      ...feedResults.flatMap((result) =>
        result.error ? [result.error] : [],
      ),
    );

    const reviewCount = await db
      .from('gcj_articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'review');
    if (reviewCount.error)
      throw new Error(`Unable to count review queue: ${reviewCount.error.message}`);
    reviewBacklog = reviewCount.count || 0;
    // A full queue pauses only the sources whose drafts always wait for a
    // person. On Sept. 25, 2026 overnight UN and NASA drafts filled it, and the
    // county newsrooms, whose drafts publish themselves, were stopped with them
    // until morning. Drafts from those sources can still be held by the checks,
    // so everything stops at twice the limit and the queue cannot grow without
    // bound while nobody is reading it.
    reviewOnlyPaused = reviewBacklog >= settings.reviewQueueLimit;
    const canPublishItself = (source: SourceRow) =>
      settings.autoPublish && source.auto_publish === true;
    if (
      reviewBacklog >= settings.reviewQueueLimit * 2 ||
      (reviewOnlyPaused && !activeSources.some(canPublishItself))
    )
      draftingSkipped = 'review_queue_limit';
    else if (!gatewayToken) draftingSkipped = 'ai_unavailable';

    if (gatewayToken && !draftingSkipped) {
      const waiting = unwrap(
        await db
          .from('gcj_story_candidates')
          .select('*')
          .eq('status', 'new')
          .order('discovered_at', { ascending: false })
          .limit(400),
        'Unable to load drafting candidates',
      ) as CandidateRow[];
      // Ranked by how fresh each item is now, with each source's current
      // priority; items from switched-off sources are left out entirely.
      const { ranked, stale } = rankCandidates(
        waiting,
        activeSources,
        Date.now(),
        settings.maxCandidateAgeHours,
      );
      if (stale.length)
        unwrap(
          await db
            .from('gcj_story_candidates')
            .update({ status: 'rejected' })
            .in(
              'id',
              stale.map((candidate) => candidate.id),
            )
            .eq('status', 'new'),
          'Unable to retire stale candidates',
        );
      const sourcesById = new Map(
        activeSources.map((source) => [source.id, source]),
      );
      // What the model compares each draft with, so the same event reported
      // by the governor and by the attorney general is not published twice.
      const recent =
        (unwrap(
          await db
            .from('gcj_articles')
            .select('slug,title')
            .eq('status', 'published')
            .gte('published_at', new Date(Date.now() - RECENT_STORY_MS).toISOString())
            .order('published_at', { ascending: false })
            .limit(60),
          'Unable to load recent stories',
        ) as RecentStory[] | null) || [];
      let attempts = 0;
      for (const candidate of ranked) {
        if (drafted >= settings.draftsPerRun) break;
        if (attempts >= settings.draftsPerRun + EXTRA_DRAFT_ATTEMPTS) break;
        if (Date.now() - Date.parse(startedAt) > DRAFTING_BUDGET_MS) break;
        const source = sourcesById.get(candidate.source_id);
        if (!source) continue;
        if (reviewOnlyPaused && !canPublishItself(source)) continue;
        attempts++;
        try {
          const claimed = unwrap(
            await db
              .from('gcj_story_candidates')
              .update({ status: 'selected' })
              .eq('id', candidate.id)
              .eq('status', 'new')
              .select('id'),
            'Unable to claim drafting candidate',
          );
          if (!(claimed || []).length) continue;
          const draft = await draftCandidate(
            candidate,
            source,
            gatewayToken,
            voice,
            recent,
          );
          const now = new Date().toISOString();
          const publish =
            canPublishItself(source) &&
            draft.confidence >= settings.minConfidenceToPublish &&
            !draft.problems.length;
          if (canPublishItself(source) && draft.problems.length) heldByChecks++;
          // The model's choice when it made one; otherwise the keyword pick,
          // so the review queue still shows a picture, on a draft that cannot
          // publish itself without a person choosing a better one.
          const image = draft.photo
            ? toAsset(draft.photo)
            : await selectEditorialAsset({
                section: draft.section,
                title: draft.title,
                dek: draft.dek,
                rotationKey: candidate.external_url,
              });
          const articleId = crypto.randomUUID();
          // Held in a variable rather than built inline, because a published
          // draft has to be named to IndexNow by the same slug it was stored
          // under; recomputing it there would be a second chance to disagree.
          const articleSlug = `${slugify(draft.title)}-${(await stableId(candidate.external_url)).slice(0, 6)}`;
          const inserted = unwrap(
            await db
              .from('gcj_articles')
              .upsert(
                {
                  id: articleId,
                  slug: articleSlug,
                  section: draft.section,
                  title: draft.title,
                  dek: draft.dek,
                  body_json: draft.body,
                  key_points_json: draft.keyPoints,
                  author: KYLE_LANGFORD_AUTHOR.name,
                  image_url: image.url,
                  image_alt: image.alt,
                  image_credit: image.credit,
                  sources_json: [
                    { name: source.name, url: candidate.external_url },
                  ],
                  status: publish ? 'published' : 'review',
                  featured: false,
                  confidence: draft.confidence,
                  published_at: publish ? now : null,
                  updated_at: now,
                  created_at: now,
                },
                { onConflict: 'slug', ignoreDuplicates: true },
              )
              .select('id'),
            'Unable to store draft',
          );
          if ((inserted || []).length) {
            unwrap(
              await db.from('gcj_editorial_actions').insert({
                id: crypto.randomUUID(),
                article_id: articleId,
                action: 'drafted',
                actor: 'scheduled-newsroom',
                // The reviewer reads here why a draft did not publish itself.
                note: draft.problems.length
                  ? `Candidate ${candidate.id}. Checks: ${draft.problems.join('; ')}`
                  : `Candidate ${candidate.id}`,
                created_at: now,
              }),
              'Unable to record draft action',
            );
            drafted++;
            if (publish) {
              recent.unshift({ slug: articleSlug, title: draft.title });
              const notification = await notifyWebSubHub();
              if (notification.ok) webSubNotifications++;
              else webSubFailures++;
              // Best effort, and deliberately not counted as a run failure:
              // a search engine declining a ping is not a reason to mark the
              // newsroom run unhealthy.
              await submitToIndexNow([articleUrl(articleSlug)]);
            }
          }
          unwrap(
            await db
              .from('gcj_story_candidates')
              .update({ status: 'processed' })
              .eq('id', candidate.id),
            'Unable to mark candidate processed',
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'draft failed';
          // A page that refused the Journal will refuse it next hour too; it
          // is retired so it stops taking a drafting slot. Anything that may
          // clear goes back in the queue, where it ages like everything else.
          await db
            .from('gcj_story_candidates')
            .update({
              status: isPermanentFailure(message) ? 'rejected' : 'new',
            })
            .eq('id', candidate.id)
            .eq('status', 'selected');
          failures.push(`${candidate.title}: ${message}`);
        }
      }
    }

    const metrics = {
      discovered,
      drafted,
      failures: failures.length,
      feedSources: activeSources.length,
      feedsSucceeded,
      reviewBacklog,
      reviewQueueLimit: settings.reviewQueueLimit,
      draftingSkipped,
      reviewOnlyPaused,
      heldByChecks,
      durationMs: Date.now() - Date.parse(startedAt),
      aiConfigured: Boolean(gatewayToken),
      autoPublish: settings.autoPublish,
      minConfidenceToPublish: settings.minConfidenceToPublish,
      assetsIngested: assetIntake.ingested,
      assetRequestsFailed: assetIntake.failed,
      webSubNotifications,
      webSubFailures,
    };
    unwrap(
      await db
        .from('gcj_pipeline_runs')
        .update({
          status: failures.length ? 'partial' : 'succeeded',
          completed_at: new Date().toISOString(),
          metrics_json: metrics,
          error: failures.join('\n').slice(0, 4000) || null,
        })
        .eq('id', runId),
      'Unable to finish pipeline run',
    );
    return { runId, ...metrics, failureDetails: failures };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed';
    await db
      .from('gcj_pipeline_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: message,
      })
      .eq('id', runId);
    throw error;
  }
}
