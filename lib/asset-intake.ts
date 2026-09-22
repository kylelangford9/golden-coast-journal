import { getSupabase, unwrap } from '@/lib/supabase-server';

const BUCKET = 'photos';
const PREFIX = 'editorial';
const MAX_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

type RequestRow = {
  id: string;
  source_url: string;
  suggested_id: string;
  alt: string;
  credit: string;
  provenance_url: string;
  section: string | null;
  keywords: string[];
};

function publicUrl(path: string) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

function extensionFor(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
}

/**
 * Drain the image intake queue.
 *
 * Agents publishing from the database cannot upload to storage; that needs a
 * service key. They record what they want here instead and this runs with the
 * key, so the credential stays on the server. Every file is fetched and proved
 * to be an image before it is stored, and the approved asset is only created
 * once the upload has succeeded.
 */
export async function ingestAssetRequests(limit = 4) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = getSupabase();

  const rows =
    (unwrap(
      await db
        .from('gcj_asset_requests')
        .select(
          'id,source_url,suggested_id,alt,credit,provenance_url,section,keywords',
        )
        .eq('status', 'pending')
        .order('created_at')
        .limit(limit),
      'Unable to load asset requests',
    ) as RequestRow[] | null) || [];

  if (!rows.length) return { considered: 0, ingested: 0, failed: 0 };
  if (!serviceKey) {
    // Say so on the row rather than failing silently; the requester can see it.
    for (const row of rows) {
      await db
        .from('gcj_asset_requests')
        .update({ error: 'Storage key is not configured on the server.' })
        .eq('id', row.id);
    }
    return { considered: rows.length, ingested: 0, failed: rows.length };
  }

  let ingested = 0;
  let failed = 0;

  for (const row of rows) {
    const fail = async (error: string) => {
      failed += 1;
      await db
        .from('gcj_asset_requests')
        .update({
          status: 'rejected',
          error,
          processed_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    };

    try {
      const response = await fetch(row.source_url, {
        headers: { 'User-Agent': 'GoldenCoastJournal-asset-intake/1.0' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        await fail(`Source returned ${response.status}`);
        continue;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        await fail(
          `Source is ${contentType || 'an unknown type'}, not an image`,
        );
        continue;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.byteLength) {
        await fail('Source returned an empty file');
        continue;
      }
      if (bytes.byteLength > MAX_BYTES) {
        await fail(
          `Source is ${Math.round(bytes.byteLength / 1024)}KB, over the limit`,
        );
        continue;
      }

      const id = row.suggested_id
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 48);
      const path = `${PREFIX}/${id}.${extensionFor(contentType)}`;

      const upload = await fetch(
        `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${serviceKey}`,
            'content-type': contentType,
            'x-upsert': 'true',
          },
          body: bytes,
        },
      );
      if (!upload.ok) {
        await fail(`Upload failed with ${upload.status}`);
        continue;
      }

      unwrap(
        await db.from('gcj_editorial_assets').upsert(
          {
            id,
            url: publicUrl(path),
            alt: row.alt,
            credit: row.credit,
            provenance_url: row.provenance_url,
            kind: 'photograph',
            section: row.section,
            keywords: row.keywords,
            priority: 90,
            is_section_default: false,
            is_global_default: false,
            article_eligible: true,
            active: true,
          },
          { onConflict: 'id' },
        ),
        'Unable to create the asset',
      );

      await db
        .from('gcj_asset_requests')
        .update({
          status: 'ingested',
          asset_id: id,
          error: null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      ingested += 1;
    } catch (error) {
      await fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return { considered: rows.length, ingested, failed };
}
