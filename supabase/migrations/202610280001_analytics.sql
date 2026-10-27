-- Sign-in history for the analytics page (docs/GDPR.md). One row per new auth session, i.e. per sign-in;
-- token refreshes reuse the session. Erasing a person (auth user delete) or a practice removes their rows.
create table public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index login_events_practice_created on public.login_events(practice_id, created_at desc);
alter table public.login_events enable row level security;
revoke all on public.login_events from anon, authenticated;
grant select, insert, delete on public.login_events to service_role;

create function public.record_login() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.login_events(user_id, practice_id)
  select p.id, p.practice_id from public.profiles p where p.id = new.user_id;
  return new;
exception when others then
  -- Tracking must never block a sign-in.
  return new;
end;
$$;
create trigger record_login_after_session after insert on auth.sessions
for each row execute function public.record_login();
revoke execute on function public.record_login() from public, anon, authenticated;

-- Platform owner(s) who may view analytics for every practice. Granted by hand:
--   update public.profiles set platform_admin = true where email = '...';
alter table public.profiles add column platform_admin boolean not null default false;

create or replace function public.purge_expired_personal_data() returns void
language sql security definer set search_path = '' as $$
  delete from public.page_views where created_at < now() - interval '13 months';
  delete from public.cookie_consents where created_at < now() - interval '3 years';
  delete from public.contact_messages where created_at < now() - interval '24 months';
  delete from public.login_events where created_at < now() - interval '13 months';
$$;
