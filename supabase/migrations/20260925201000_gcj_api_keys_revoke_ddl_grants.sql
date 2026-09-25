-- The schema's default privileges also hand anon TRUNCATE, REFERENCES and
-- TRIGGER on every new table. None of them is filtered by row-level security,
-- and the key table needs none of them, so they come off here.
revoke truncate, references, trigger on table public.gcj_api_keys from anon;
