-- Abuse limits for the public, unauthenticated tables (docs/GDPR.md R9). Triggers run for every
-- writer, so the limit holds even if a client skips the server route. The threshold is deliberately
-- generous; it stops floods, not people. SECURITY DEFINER lets the anon role be counted without SELECT.
create function public.limit_public_writes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'page_views' then
    if (select count(*) from public.page_views
          where visitor_id = new.visitor_id and created_at > now() - interval '1 minute') >= 60 then
      raise exception 'rate limit' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'cookie_consents' then
    if (select count(*) from public.cookie_consents
          where visitor_id is not distinct from new.visitor_id
            and created_at > now() - interval '1 hour') >= (case when new.visitor_id is null then 200 else 20 end) then
      raise exception 'rate limit' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'contact_messages' then
    if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 60
       or (select count(*) from public.contact_messages
             where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3 then
      raise exception 'rate limit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.limit_public_writes() from public, anon, authenticated;

create trigger page_views_limit before insert on public.page_views
  for each row execute function public.limit_public_writes();
create trigger cookie_consents_limit before insert on public.cookie_consents
  for each row execute function public.limit_public_writes();
create trigger contact_messages_limit before insert on public.contact_messages
  for each row execute function public.limit_public_writes();
