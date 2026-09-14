-- These labels predate the repository's source-name punctuation correction.
-- Limit the rewrite to the five known bundled records.
update public.gcj_articles
set
  sources_json = replace(
    sources_json::text,
    ' ' || chr(8212) || ' ',
    ': '
  )::jsonb,
  updated_at = greatest(
    updated_at,
    '2026-09-14T17:42:07Z'::timestamptz
  )
where id in ('gcj-007', 'gcj-008', 'gcj-009', 'gcj-010', 'gcj-011')
  and position(chr(8212) in sources_json::text) > 0;
