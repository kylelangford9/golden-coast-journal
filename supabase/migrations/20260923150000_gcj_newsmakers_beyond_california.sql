-- Let the Journal's own portrait register hold the people its national and
-- world desks name, not only Californians.
--
-- gcj_newsmakers was chartered for Californians without an elected seat,
-- because `representatives`, which the California Votes application owns,
-- already covers the state's elected officials. But two of the newsroom's
-- primary sources are the White House and UN News, and in the first ninety
-- published stories the President was named in fourteen, seven of them in the
-- headline or dek, and the UN Secretary-General in three headlines. None of
-- them had a face beside the story, because no register held them.
--
-- The answer is still not to widen `representatives`, whose meaning belongs to
-- another application. This table is the Journal's, so it takes them, and
-- `level` gains the one value a UN official needs: 'International'. Nothing
-- else about a row changes; a portrait still has to be credited, licensed,
-- provenanced and self-hosted, and still cannot be AI-generated.

alter table public.gcj_newsmakers
  drop constraint if exists gcj_newsmakers_level_check;

alter table public.gcj_newsmakers
  add constraint gcj_newsmakers_level_check
  check (level in ('Federal', 'State', 'Local', 'Judicial', 'Private', 'International'));

comment on table public.gcj_newsmakers is
  'People the Journal names who are not in the California Votes representatives register: Californians without an elected seat, and the national and international figures the Nation and World desks cover. No AI-generated portraits; enforced by the ai_generated check constraint.';
comment on column public.gcj_newsmakers.level is
  'Federal, State, Local, Judicial, Private or International.';
