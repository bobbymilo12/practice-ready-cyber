-- REVIEW ONLY: application lifecycle, not an Auth-user ban or a change to RLS.
alter table public.profiles add column inactive_at timestamptz;

-- Change membership and withdraw active workload in one transaction. Existing history is untouched.
create function public.set_staff_active(p_manager uuid, p_trainee uuid, p_active boolean, p_version integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  manager_row public.profiles%rowtype;
  member_row public.profiles%rowtype;
  workspace public.practices%rowtype;
  next_assignments jsonb;
  changed_at timestamptz := now();
begin
  select * into manager_row from public.profiles where id = p_manager;
  if not found or manager_row.role <> 'manager' or manager_row.inactive_at is not null then
    raise exception 'Manager access required';
  end if;
  select * into workspace from public.practices where id = manager_row.practice_id for update;
  if workspace.version <> p_version then return null; end if;
  select * into member_row from public.profiles
    where id = p_trainee and practice_id = manager_row.practice_id and role = 'trainee' for update;
  if not found then raise exception 'Staff member not found'; end if;
  if p_active = (member_row.inactive_at is null) then return workspace.version; end if;
  next_assignments := coalesce(workspace.state->'assignments', '[]'::jsonb);
  if not p_active then
    select coalesce(jsonb_agg(case
      when a->>'traineeId' = p_trainee::text and not (a ? 'withdrawnAt') then
        a || jsonb_build_object('withdrawnAt', floor(extract(epoch from changed_at)*1000), 'withdrawnBy', p_manager::text)
      else a end order by ordinal), '[]'::jsonb)
    into next_assignments from jsonb_array_elements(next_assignments) with ordinality as items(a, ordinal);
  end if;
  update public.profiles set inactive_at = case when p_active then null else changed_at end where id = p_trainee;
  update public.practices set state = jsonb_set(state, '{assignments}', next_assignments), version = version + 1
    where id = workspace.id;
  return workspace.version + 1;
end;
$$;
revoke all on function public.set_staff_active(uuid, uuid, boolean, integer) from public, anon, authenticated;
grant execute on function public.set_staff_active(uuid, uuid, boolean, integer) to service_role;
