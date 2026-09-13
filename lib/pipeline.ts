import { env } from 'cloudflare:workers';
import { and, desc, eq, lt } from 'drizzle-orm';
import { getDb } from '@/db';
import { articles, pipelineRuns, requestLimits, sources, storyCandidates } from '@/db/schema';
import { seedDatabase } from '@/lib/repository';
import { editorialAssets } from '@/lib/imagery';
import { decodeHtmlEntities } from '@/lib/text';

type FeedEntry = { title: string; url: string; summary: string; publishedAt?: string };
const autoPublishSourceIds = new Set(['nasa', 'noaa']);

function textFromTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : '';
}

function parseFeed(xml: string): FeedEntry[] {
  const blocks = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return blocks.slice(0, 12).map((block) => {
    const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
    const url = textFromTag(block, 'link') || href || textFromTag(block, 'guid');
    const rawDate = textFromTag(block, 'pubDate') || textFromTag(block, 'published') || textFromTag(block, 'updated');
    return {
      title: textFromTag(block, 'title'),
      url,
      summary: textFromTag(block, 'description') || textFromTag(block, 'summary') || textFromTag(block, 'content'),
      publishedAt: rawDate && !Number.isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : undefined,
    };
  }).filter((entry) => entry.title && /^https?:\/\//.test(entry.url));
}

async function stableId(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).slice(0, 16).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchReadablePage(url: string) {
  const publicationUrl = env.SITE_URL || 'https://golden-coast-journal.kylelangford9999.chatgpt.site';
  const response = await fetch(url, { headers: { 'user-agent': `GoldenCoastJournalBot/1.0 (+${publicationUrl}/standards)` }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const html = (await response.text()).slice(0, 500000);
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').slice(0, 18000);
}

function extractOutputText(payload: unknown): string {
  const data = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> };
  if (typeof data.output_text === 'string') return data.output_text;
  for (const item of data.output || []) for (const content of item.content || []) if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
  throw new Error('The model returned no article text');
}

async function draftCandidate(candidate: typeof storyCandidates.$inferSelect, source: typeof sources.$inferSelect) {
  if (!env.OPENAI_API_KEY) return null;
  const sourceText = await fetchReadablePage(candidate.externalUrl);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5-mini',
      store: false,
      instructions: 'You are the standards desk of The Golden Coast Journal. Produce concise, original newspaper copy only from the supplied primary source. Never invent a quote, number, name, date, implication or source. Clearly qualify uncertainty. Do not imitate or copy source phrasing. Return JSON only.',
      input: `SOURCE NAME: ${source.name}\nSOURCE URL: ${candidate.externalUrl}\nSOURCE MATERIAL:\n${sourceText}`,
      text: {
        format: {
          type: 'json_schema',
          name: 'journal_article',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'dek', 'body', 'keyPoints', 'section', 'confidence'],
            properties: {
              title: { type: 'string' },
              dek: { type: 'string' },
              body: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'string' } },
              keyPoints: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
              section: { type: 'string', enum: ['California', 'Nation', 'World', 'Business', 'Technology', 'Climate', 'Culture', 'Ideas'] },
              confidence: { type: 'integer', minimum: 0, maximum: 100 },
            },
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI drafting failed with ${response.status}`);
  return JSON.parse(extractOutputText(await response.json()));
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
}

export async function runEditorialPipeline() {
  const db = getDb();
  await seedDatabase();
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await db.insert(pipelineRuns).values({ id: runId, runType: 'scheduled-newsroom', status: 'running', startedAt });
  let discovered = 0;
  let drafted = 0;
  const failures: string[] = [];

  try {
    const activeSources = await db.select().from(sources).where(eq(sources.active, true));
    await db.delete(requestLimits).where(lt(requestLimits.windowStart, Math.floor(Date.now() / 60000) - 1440));
    for (const source of activeSources) {
      try {
        const response = await fetch(source.feedUrl, { headers: { 'user-agent': 'GoldenCoastJournalBot/1.0' }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`Feed returned ${response.status}`);
        const entries = parseFeed(await response.text());
        for (const entry of entries) {
          const id = await stableId(entry.url);
          const ageHours = entry.publishedAt ? Math.max(0, (Date.now() - Date.parse(entry.publishedAt)) / 3600000) : 48;
          const score = Math.max(1, Math.round(source.trustTier === 1 ? 100 - ageHours : 70 - ageHours));
          const inserted = await db.insert(storyCandidates).values({ id, sourceId: source.id, externalUrl: entry.url, title: entry.title, summary: entry.summary, publishedAt: entry.publishedAt, discoveredAt: new Date().toISOString(), status: 'new', score }).onConflictDoNothing().returning({ id: storyCandidates.id });
          discovered += inserted.length;
        }
        await db.update(sources).set({ lastFetchedAt: new Date().toISOString() }).where(eq(sources.id, source.id));
      } catch (error) {
        failures.push(`${source.name}: ${error instanceof Error ? error.message : 'unknown feed error'}`);
      }
    }

    if (env.OPENAI_API_KEY) {
      const candidates = await db.select().from(storyCandidates).where(eq(storyCandidates.status, 'new')).orderBy(desc(storyCandidates.score)).limit(2);
      for (const candidate of candidates) {
        const [source] = await db.select().from(sources).where(and(eq(sources.id, candidate.sourceId), eq(sources.active, true))).limit(1);
        if (!source) continue;
        try {
          const draft = await draftCandidate(candidate, source);
          if (!draft) continue;
          const now = new Date().toISOString();
          const publish = env.AUTO_PUBLISH === 'true' && autoPublishSourceIds.has(source.id) && draft.confidence >= 92;
          const image = editorialAssets.californiaCoast;
          await db.insert(articles).values({
            id: crypto.randomUUID(),
            slug: `${slugify(draft.title)}-${(await stableId(candidate.externalUrl)).slice(0, 6)}`,
            section: draft.section,
            title: draft.title,
            dek: draft.dek,
            bodyJson: JSON.stringify(draft.body),
            keyPointsJson: JSON.stringify(draft.keyPoints),
            author: 'Golden Coast Journal Desk',
            imageUrl: image.url,
            imageAlt: image.alt,
            imageCredit: image.credit,
            sourcesJson: JSON.stringify([{ name: source.name, url: candidate.externalUrl }]),
            status: publish ? 'published' : 'review',
            featured: false,
            confidence: draft.confidence,
            publishedAt: publish ? now : null,
            updatedAt: now,
            createdAt: now,
          }).onConflictDoNothing();
          await db.update(storyCandidates).set({ status: 'processed' }).where(eq(storyCandidates.id, candidate.id));
          drafted++;
        } catch (error) {
          failures.push(`${candidate.title}: ${error instanceof Error ? error.message : 'draft failed'}`);
        }
      }
    }

    const metrics = { discovered, drafted, failures: failures.length, aiConfigured: Boolean(env.OPENAI_API_KEY), autoPublish: env.AUTO_PUBLISH === 'true' };
    await db.update(pipelineRuns).set({ status: failures.length ? 'partial' : 'succeeded', completedAt: new Date().toISOString(), metricsJson: JSON.stringify(metrics), error: failures.join('\n').slice(0, 4000) || null }).where(eq(pipelineRuns.id, runId));
    return { runId, ...metrics, failureDetails: failures };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed';
    await db.update(pipelineRuns).set({ status: 'failed', completedAt: new Date().toISOString(), error: message }).where(eq(pipelineRuns.id, runId));
    throw error;
  }
}
