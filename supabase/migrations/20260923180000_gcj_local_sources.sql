-- Put local California news in front of the national feeds.
--
-- The newsroom scored every candidate the same way, trust tier less age, and
-- drafted the top one each hour, so a White House release always outranked a
-- county's measles alert or a local emergency proclamation, and seven sources,
-- none of them local, decided what the Journal covered. This adds the county
-- and local-agency newsrooms that publish a working feed a server can read,
-- and a per-source priority that is added to each candidate's score.
--
-- Every feed below was probed the way the pipeline reads it: fetched with the
-- pipeline's user agent, parsed by the same rules, newest item within two
-- weeks, and an item page returning at least 1,200 characters of text. City
-- newsrooms for Los Angeles, San Jose, and state agencies such as CHP and CAL
-- FIRE refuse the Journal's user agent and are not listed; police newsrooms
-- are left out until the publisher decides how to handle releases that name
-- people who have not been convicted.

alter table public.gcj_sources
  add column if not exists priority integer not null default 0;

comment on column public.gcj_sources.priority is
  'Added to every candidate''s score from this source. Local newsrooms 20, state 10, national and world 0.';

insert into public.gcj_sources
  (id, name, feed_url, homepage_url, section, trust_tier, active, auto_publish, priority)
values
  ('lacounty', 'County of Los Angeles', 'https://lacounty.gov/feed/', 'https://lacounty.gov/newsroom/', 'California', 1, true, true, 20),
  ('sdcounty', 'County of San Diego', 'https://www.countynewscenter.com/feed/', 'https://www.countynewscenter.com/', 'California', 1, true, true, 20),
  ('orangecounty', 'County of Orange', 'https://www.ocgov.com/rss.xml', 'https://www.ocgov.com/news', 'California', 1, true, true, 20),
  ('riversidecounty', 'County of Riverside', 'https://rivco.org/rss.xml', 'https://rivco.org/news', 'California', 1, true, true, 20),
  ('sbcounty', 'County of San Bernardino', 'https://main.sbcounty.gov/feed/', 'https://main.sbcounty.gov/news/', 'California', 1, true, true, 20),
  ('contracosta', 'Contra Costa County', 'https://www.contracosta.ca.gov/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml', 'https://www.contracosta.ca.gov/CivicAlerts.aspx', 'California', 1, true, true, 20),
  ('ladwp', 'Los Angeles Department of Water and Power', 'https://www.ladwpnews.com/feed/', 'https://www.ladwpnews.com/', 'California', 1, true, true, 20),
  ('caag', 'California Attorney General', 'https://oag.ca.gov/news/feed', 'https://oag.ca.gov/news', 'California', 1, true, true, 10)
on conflict (id) do nothing;

update public.gcj_sources set priority = 10 where id in ('govca', 'caloes') and priority = 0;

-- Routine notices local newsrooms publish alongside their news. A match is
-- recorded as rejected and never drafted.
insert into public.gcj_editorial_settings (key, value, description)
values (
  'skip_title_patterns',
  '["^pet of the week", "\\badoptable (pet|dog|cat)s?\\b", "\\b(office|offices|facility|facilities) (closed|closure)", "\\bholiday (hours|closure|schedule)\\b", "^job (fair|opening|announcement)", "\\bnow hiring\\b"]'::jsonb,
  'Case-insensitive regular expressions. A feed item whose title matches is recorded as rejected and never drafted.'
)
on conflict (key) do nothing;

-- Two drafts an hour, so local stories arrive in addition to national ones
-- rather than instead of them.
update public.gcj_editorial_settings
set value = '2'::jsonb, updated_at = now()
where key = 'drafts_per_run' and value = '1'::jsonb;
