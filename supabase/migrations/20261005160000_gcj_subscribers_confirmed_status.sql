-- Allow confirmed as the double-opt-in success status alongside legacy active.
alter table public.gcj_subscribers drop constraint if exists gcj_subscribers_status_check;
alter table public.gcj_subscribers add constraint gcj_subscribers_status_check
  check (status = any (array['pending'::text, 'active'::text, 'confirmed'::text, 'unsubscribed'::text]));
