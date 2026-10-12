-- Modules move out of practices.state (JSON blob) into their own table, one row per module.
-- All access stays through the practice-api Edge Function (service_role only).
create table public.practice_modules (
  practice_id uuid not null references public.practices(id) on delete cascade,
  id text not null,
  position integer not null,
  data jsonb not null,
  primary key (practice_id, id)
);
alter table public.practice_modules enable row level security;
revoke all on public.practice_modules from anon, authenticated;
grant all on public.practice_modules to service_role;

create function public.write_practice_modules(p_practice uuid, p_modules jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.practice_modules where practice_id = p_practice;
  insert into public.practice_modules (practice_id, id, position, data)
  select p_practice, e.v->>'id', e.n, e.v
  from jsonb_array_elements(coalesce(p_modules, '[]')) with ordinality as e(v, n);
end;
$$;

create function public.load_practice_modules(p_practice uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(m.data order by m.position), '[]')
  from public.practice_modules m where m.practice_id = p_practice
$$;

-- Same signature as before, so the Edge Function call is unchanged: modules are split off p_state.
create or replace function public.save_practice_data(p_practice uuid, p_version integer, p_state jsonb, p_data jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  update public.practices set state = p_state - 'modules', version = version + 1
  where id = p_practice and version = p_version returning version into v;
  if v is null then return null; end if;
  perform public.write_practice_data(p_practice, p_data);
  perform public.write_practice_modules(p_practice, p_state->'modules');
  return v;
end;
$$;
revoke execute on function public.write_practice_modules(uuid, jsonb), public.load_practice_modules(uuid)
  from public, anon, authenticated;
grant execute on function public.write_practice_modules(uuid, jsonb), public.load_practice_modules(uuid)
  to service_role;

-- Backfill existing practices, then drop the blob copy.
select public.write_practice_modules(id, state->'modules') from public.practices where state ? 'modules';
update public.practices set state = state - 'modules' where state ? 'modules';
