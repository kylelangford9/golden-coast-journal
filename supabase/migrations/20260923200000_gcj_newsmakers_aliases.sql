-- Let the register say what else a person is called.
--
-- A story names people the way the copy desk does, not the way the register
-- does. Brazil's president is "Lula" after the first reference, Ukraine's is
-- "Zelensky" in half the wires, and the WHO's director-general is "Tedros". The
-- matcher reads each alias as a name: two or more words name the person
-- outright, one word goes through every guard a surname does.
--
-- Names only. "The emir of Qatar" is an office, and an office changes hands
-- without the register being told.

alter table public.gcj_newsmakers
  add column if not exists aliases text[] not null default '{}';

comment on column public.gcj_newsmakers.aliases is
  'Other names stories use for this person ("Lula", "Zelensky"). Several words name them outright; a single word is treated as a surname. Names only, never titles or offices.';
