-- Keep the drafting queue to what could still be news.
--
-- max_candidate_age_hours: a feed item older than this is retired instead of
-- drafted (lib/candidate-selection.ts). 72 hours covers a weekend.
--
-- NOAA is switched off. Its item pages answer the Journal's declared user
-- agent with 403 (they open for a browser, and the Journal does not pose as
-- one), so none of its 18 candidates was ever drafted, and one at the top of
-- the queue stalled drafting for hours at a time. Switching it back on is one
-- update if NOAA admits the Journal's reader.
--
-- Three more routine titles from national feeds: NASA's daily astronomy
-- picture, its exhibit-hall schedules and its ethics office's gift notices.

insert into public.gcj_editorial_settings (key, value, description)
values (
  'max_candidate_age_hours',
  '72'::jsonb,
  'Feed items older than this many hours are retired instead of drafted.'
)
on conflict (key) do nothing;

update public.gcj_sources set active = false where id = 'noaa';

update public.gcj_editorial_settings
set value = value || '["^APOD:", "\\bhyperwall schedule\\b", "\\bwidely attended gatherings\\b"]'::jsonb,
    updated_at = now()
where key = 'skip_title_patterns'
  and not value ? '^APOD:';
