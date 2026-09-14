-- The bundled articles are deliberately seeded once. Keep later editorial
-- corrections explicit so a reader request can never overwrite database work.
update public.gcj_articles as article
set
  section = correction.section,
  title = correction.title,
  updated_at = greatest(
    article.updated_at,
    '2026-09-14T17:38:21Z'::timestamptz
  )
from (
  values
    (
      'gcj-005',
      'california-unemployment-august-brief',
      'Business',
      'California labor market shows improvement, with pressure still uneven'
    ),
    (
      'gcj-007',
      'california-2026-general-election-deadlines',
      'California',
      'California’s 2026 general election calendar; the deadlines voters need'
    ),
    (
      'gcj-008',
      'california-climate-credit-2026-amounts-bill',
      'California',
      'California Climate Credit 2026; the amounts and dates to check on your bill'
    ),
    (
      'gcj-009',
      'california-minimum-wage-2027-rate-exempt-salary',
      'Business',
      'California minimum wage rises to $17.40 in 2027; what workers and employers should check'
    ),
    (
      'gcj-010',
      'track-california-mail-ballot-2026-fix-problems',
      'California',
      'How to track your California mail ballot in 2026; and fix a problem'
    ),
    (
      'gcj-011',
      'california-tax-extension-deadline-2026-october-15',
      'Business',
      'California tax extension deadline 2026; what is due October 15'
    )
) as correction(id, slug, section, title)
where article.id = correction.id
  and article.slug = correction.slug
  and (
    article.section is distinct from correction.section
    or article.title is distinct from correction.title
  );

update public.gcj_articles
set
  body_json = replace(
    body_json::text,
    ' ' || chr(8212) || ' ',
    '; '
  )::jsonb,
  updated_at = greatest(
    updated_at,
    '2026-09-14T17:38:21Z'::timestamptz
  )
where id in ('gcj-003', 'gcj-008', 'gcj-011')
  and position(chr(8212) in body_json::text) > 0;
