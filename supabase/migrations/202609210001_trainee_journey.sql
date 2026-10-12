create table public.practices (
  id uuid primary key default gen_random_uuid(),
  state jsonb not null default '{}'::jsonb,
  version integer not null default 0
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  practice_id uuid not null references public.practices(id),
  role text not null check (role in ('manager', 'trainee')),
  name text not null,
  email text not null,
  job_role text not null default '',
  must_reset_password boolean not null default false,
  invited_at timestamptz not null default now(),
  invite_status text not null default 'active' check (invite_status in ('active', 'pending', 'sent', 'failed')),
  last_invite_at timestamptz
);
create table public.training_sessions (
  id uuid primary key,
  practice_id uuid not null references public.practices(id),
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id text not null,
  data jsonb not null,
  version integer not null default 0
);
create index training_sessions_practice on public.training_sessions(practice_id);
create index profiles_practice on public.profiles(practice_id);
create unique index one_open_attempt_per_assignment on public.training_sessions(trainee_id, assignment_id)
  where not (data ? 'result');

-- All application data is accessed through the authenticated Edge Function.
-- Never trust client-supplied roles, practice IDs, scores or completion flags.
alter table public.practices enable row level security;
alter table public.profiles enable row level security;
alter table public.training_sessions enable row level security;
revoke all on public.practices, public.profiles, public.training_sessions from anon, authenticated;
grant all on public.practices, public.profiles, public.training_sessions to service_role;

create function public.provision_manager() returns trigger
language plpgsql security definer set search_path = '' as $$
declare practice uuid;
begin
  -- Only admin-created invitations may bypass manager provisioning.
  if coalesce(new.raw_app_meta_data->>'invited_trainee', 'false') = 'true' then
    return new;
  end if;
  insert into public.practices default values returning id into practice;
  insert into public.profiles(id, practice_id, role, name, email)
  values(new.id, practice, 'manager', coalesce(new.raw_user_meta_data->>'name', ''), new.email);
  return new;
end;
$$;
create trigger provision_practice_after_signup after insert on auth.users
for each row execute function public.provision_manager();
revoke execute on function public.provision_manager() from public, anon, authenticated;
