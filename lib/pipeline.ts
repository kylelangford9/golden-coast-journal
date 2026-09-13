import { getVercelOidcToken } from '@vercel/oidc';
import { editorialAssets } from '@/lib/imagery';
import { seedDatabase } from '@/lib/repository';
import { getSupabase, unwrap } from '@/lib/supabase-server';
import { decodeHtmlEntities } from '@/lib/text';

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

const autoPublishSourceIds = new Set(['nasa', 'noaa']);

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
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const html = (await response.text()).slice(0, 500000);
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .slice(0, 18000);
}

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

async function draftCandidate(
  candidate: CandidateRow,
  source: SourceRow,
  gatewayToken: string,
) {
  const sourceText = await fetchReadablePage(candidate.external_url);
  const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${gatewayToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'openai/gpt-5-mini',
      store: false,
      instructions:
        'You are the standards desk of The Golden Coast Journal. Produce concise, original newspaper copy only from the supplied primary source. Never invent a quote, number, name, date, implication or source. Clearly qualify uncertainty. Do not imitate or copy source phrasing. Do not propose or generate imagery. Return JSON only.',
      input: `SOURCE NAME: ${source.name}\nSOURCE URL: ${candidate.external_url}\nSOURCE MATERIAL:\n${sourceText}`,
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
            },
          },
        },
      },
    }),
  });
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    throw new Error(
      `AI Gateway drafting failed with ${response.status}${requestId ? ` (${requestId})` : ''}`,
    );
  }
  return JSON.parse(extractOutputText(await response.json())) as {
    title: string;
    dek: string;
    body: string[];
    keyPoints: string[];
    section: string;
    confidence: number;
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
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
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

    for (const source of activeSources) {
      try {
        const response = await fetch(source.feed_url, {
          headers: { 'user-agent': 'GoldenCoastJournalBot/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Feed returned ${response.status}`);
        const entries = parseFeed(await response.text());
        const rows = await Promise.all(
          entries.map(async (entry) => {
            const ageHours = entry.publishedAt
              ? Math.max(
                  0,
                  (Date.now() - Date.parse(entry.publishedAt)) / 3600000,
                )
              : 48;
            return {
              id: await stableId(entry.url),
              source_id: source.id,
              external_url: entry.url,
              title: entry.title,
              summary: entry.summary,
              published_at: entry.publishedAt || null,
              discovered_at: new Date().toISOString(),
              status: 'new',
              score: Math.max(
                1,
                Math.round(
                  source.trust_tier === 1 ? 100 - ageHours : 70 - ageHours,
                ),
              ),
            };
          }),
        );
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
          discovered += (inserted || []).length;
        }
        unwrap(
          await db
            .from('gcj_sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', source.id),
          `Unable to update ${source.name}`,
        );
      } catch (error) {
        failures.push(
          `${source.name}: ${error instanceof Error ? error.message : 'unknown feed error'}`,
        );
      }
    }

    if (gatewayToken) {
      const candidates = unwrap(
        await db
          .from('gcj_story_candidates')
          .select('*')
          .eq('status', 'new')
          .order('score', { ascending: false })
          .limit(2),
        'Unable to load drafting candidates',
      ) as CandidateRow[];
      for (const candidate of candidates) {
        const source = unwrap(
          await db
            .from('gcj_sources')
            .select('*')
            .eq('id', candidate.source_id)
            .eq('active', true)
            .maybeSingle(),
          'Unable to load candidate source',
        ) as SourceRow | null;
        if (!source) continue;
        try {
          const draft = await draftCandidate(candidate, source, gatewayToken);
          const now = new Date().toISOString();
          const publish =
            process.env.AUTO_PUBLISH === 'true' &&
            autoPublishSourceIds.has(source.id) &&
            draft.confidence >= 92;
          const image = editorialAssets.californiaCoast;
          const articleId = crypto.randomUUID();
          const inserted = unwrap(
            await db
              .from('gcj_articles')
              .upsert(
                {
                  id: articleId,
                  slug: `${slugify(draft.title)}-${(await stableId(candidate.external_url)).slice(0, 6)}`,
                  section: draft.section,
                  title: draft.title,
                  dek: draft.dek,
                  body_json: draft.body,
                  key_points_json: draft.keyPoints,
                  author: 'Golden Coast Journal Desk',
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
                note: `Candidate ${candidate.id}`,
                created_at: now,
              }),
              'Unable to record draft action',
            );
            drafted++;
          }
          unwrap(
            await db
              .from('gcj_story_candidates')
              .update({ status: 'processed' })
              .eq('id', candidate.id),
            'Unable to mark candidate processed',
          );
        } catch (error) {
          failures.push(
            `${candidate.title}: ${error instanceof Error ? error.message : 'draft failed'}`,
          );
        }
      }
    }

    const metrics = {
      discovered,
      drafted,
      failures: failures.length,
      aiConfigured: Boolean(gatewayToken),
      autoPublish: process.env.AUTO_PUBLISH === 'true',
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
