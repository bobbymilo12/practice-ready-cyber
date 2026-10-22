-- Append-only record of significant manager actions, written by practice-api (service role only).
-- actor_id/target_id are deliberately not foreign keys so the record outlives the people involved;
-- deleting a whole practice (data-rights erasure) removes its log with it.
create table public.audit_events (
  id bigint generated always as identity primary key,
  practice_id uuid not null references public.practices(id) on delete cascade,
  actor_id uuid not null,
  action text not null,
  target_id text not null,
  created_at timestamptz not null default now()
);
create index audit_events_practice_created on public.audit_events(practice_id, created_at desc);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;
grant select, insert on public.audit_events to service_role;
