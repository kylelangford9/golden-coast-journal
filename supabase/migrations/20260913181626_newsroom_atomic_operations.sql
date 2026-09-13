create or replace function public.gcj_consume_rate_limit(
  p_key text,
  p_window_start bigint,
  p_limit integer default 5
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  is_limited boolean;
begin
  insert into public.gcj_request_limits as limits (key, count, window_start)
  values (p_key, 1, p_window_start)
  on conflict (key) do update
  set count = case
      when limits.window_start = excluded.window_start then limits.count + 1
      else 1
    end,
    window_start = excluded.window_start
  returning count > greatest(1, least(p_limit, 100)) into is_limited;

  return is_limited;
end;
$$;

create or replace function public.gcj_apply_editorial_action(
  p_article_id text,
  p_action text,
  p_note text,
  p_now timestamptz
)
returns table (
  article_id text,
  previous_status text,
  next_status text,
  recorded_action text,
  updated_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  existing_status text;
  existing_published_at timestamptz;
  desired_status text;
  audit_action text;
begin
  if p_action not in ('publish', 'reject', 'reopen') then
    raise exception 'Unsupported editorial action';
  end if;

  select a.status, a.published_at
  into existing_status, existing_published_at
  from public.gcj_articles as a
  where a.id = p_article_id
  for update;

  if not found then
    return;
  end if;

  desired_status := case p_action
    when 'publish' then 'published'
    when 'reject' then 'archived'
    else 'review'
  end;
  audit_action := case p_action
    when 'publish' then 'published'
    when 'reject' then 'rejected'
    else 'reopened'
  end;

  update public.gcj_articles as a
  set status = desired_status,
      published_at = case
        when desired_status = 'published' then coalesce(existing_published_at, p_now)
        else null
      end,
      updated_at = p_now
  where a.id = p_article_id;

  insert into public.gcj_editorial_actions (id, article_id, action, actor, note, created_at)
  values (extensions.gen_random_uuid()::text, p_article_id, audit_action, 'publisher', nullif(p_note, ''), p_now);

  return query select p_article_id, existing_status, desired_status, audit_action, p_now;
end;
$$;

revoke all on function public.gcj_consume_rate_limit(text, bigint, integer) from public, authenticated;
revoke all on function public.gcj_apply_editorial_action(text, text, text, timestamptz) from public, authenticated;
grant execute on function public.gcj_consume_rate_limit(text, bigint, integer) to anon, service_role;
grant execute on function public.gcj_apply_editorial_action(text, text, text, timestamptz) to anon, service_role;
