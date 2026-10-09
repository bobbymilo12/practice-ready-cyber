-- Practice setup data moves out of practices.state (JSON blob) into real tables.
-- All access stays through the practice-api Edge Function (service_role only).
create table public.role_templates (
  id text primary key,
  version integer not null default 1,
  label text not null,
  aliases jsonb not null default '[]',
  suggestions_status text not null default 'awaiting-review' check (suggestions_status in ('awaiting-review', 'reviewed')),
  selected_request_ids jsonb not null default '[]',
  position integer not null default 0
);
create table public.practice_settings (
  practice_id uuid primary key references public.practices(id) on delete cascade,
  practice_name text not null default '',
  hours text not null default '',
  address text not null default '',
  out_of_hours_times text not null default '',
  prescription_ordering text not null default '',
  duty_contact text not null default '',
  nominated_pharmacy text not null default '',
  urgent_numbers text not null default '',
  extras text not null default '',
  repeat_order_methods text not null default '',
  repeat_turnaround text not null default '',
  repeat_controlled text not null default '',
  repeat_high_risk text not null default '',
  repeat_emergency text not null default '',
  local_safeguarding text not null default '',
  local_complaints text not null default '',
  local_dna text not null default '',
  local_interpreter text not null default '',
  local_confidentiality text not null default '',
  same_day_reasons jsonb not null default '[]',
  role_policies jsonb not null default '{}',
  safeguarding_route jsonb,
  booking_config jsonb,
  prescription_config jsonb
);
create table public.practice_staff (
  practice_id uuid not null references public.practices(id) on delete cascade,
  id text not null,
  position integer not null,
  name text not null default '',
  role text not null default '',
  clinics text not null default '',
  capabilities jsonb,
  appointment_capabilities jsonb,
  request_overrides jsonb,
  notes text,
  primary key (practice_id, id)
);
-- One row per practice role; selected_request_ids is what the role can handle.
create table public.practice_roles (
  practice_id uuid not null references public.practices(id) on delete cascade,
  role_id text not null,
  label text not null default '',
  confirmed boolean not null default false,
  archived boolean,
  selected_request_ids jsonb not null default '[]',
  categories jsonb not null default '[]',
  template jsonb,
  suggestions_edited boolean,
  primary key (practice_id, role_id)
);
create table public.practice_local_procedures (
  practice_id uuid not null references public.practices(id) on delete cascade,
  request_id text not null,
  data jsonb not null,
  primary key (practice_id, request_id)
);
create table public.practice_requests (
  practice_id uuid not null references public.practices(id) on delete cascade,
  request_id text not null,
  label text not null,
  primary key (practice_id, request_id)
);
alter table public.role_templates enable row level security;
alter table public.practice_settings enable row level security;
alter table public.practice_staff enable row level security;
alter table public.practice_roles enable row level security;
alter table public.practice_local_procedures enable row level security;
alter table public.practice_requests enable row level security;
revoke all on public.role_templates, public.practice_settings, public.practice_staff, public.practice_roles,
  public.practice_local_procedures, public.practice_requests from anon, authenticated;
grant all on public.role_templates, public.practice_settings, public.practice_staff, public.practice_roles,
  public.practice_local_procedures, public.practice_requests to service_role;

create function public.jsonb_compact(j jsonb) returns jsonb language sql immutable
set search_path = '' as $$
  select coalesce(jsonb_object_agg(key, value) filter (where value <> 'null'::jsonb), '{}') from jsonb_each(j)
$$;

create function public.write_practice_data(p_practice uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.practice_settings as s (practice_id, practice_name, hours, address, out_of_hours_times,
    prescription_ordering, duty_contact, nominated_pharmacy, urgent_numbers, extras, repeat_order_methods,
    repeat_turnaround, repeat_controlled, repeat_high_risk, repeat_emergency, local_safeguarding,
    local_complaints, local_dna, local_interpreter, local_confidentiality, same_day_reasons, role_policies,
    safeguarding_route, booking_config, prescription_config)
  values (p_practice, coalesce(p_data->>'practiceName', ''), coalesce(p_data->>'hours', ''),
    coalesce(p_data->>'address', ''), coalesce(p_data->>'outOfHoursTimes', ''),
    coalesce(p_data->>'prescriptionOrdering', ''), coalesce(p_data->>'dutyContact', ''),
    coalesce(p_data->>'nominatedPharmacy', ''), coalesce(p_data->>'urgentNumbers', ''),
    coalesce(p_data->>'extras', ''), coalesce(p_data->>'repeatOrderMethods', ''),
    coalesce(p_data->>'repeatTurnaround', ''), coalesce(p_data->>'repeatControlled', ''),
    coalesce(p_data->>'repeatHighRisk', ''), coalesce(p_data->>'repeatEmergency', ''),
    coalesce(p_data->>'localSafeguarding', ''), coalesce(p_data->>'localComplaints', ''),
    coalesce(p_data->>'localDNA', ''), coalesce(p_data->>'localInterpreter', ''),
    coalesce(p_data->>'localConfidentiality', ''), coalesce(p_data->'sameDayReasons', '[]'),
    coalesce(p_data->'rolePolicies', '{}'), p_data->'safeguardingRoute', p_data->'bookingConfig',
    p_data->'prescriptionConfig')
  on conflict (practice_id) do update set
    practice_name = excluded.practice_name, hours = excluded.hours, address = excluded.address,
    out_of_hours_times = excluded.out_of_hours_times, prescription_ordering = excluded.prescription_ordering,
    duty_contact = excluded.duty_contact, nominated_pharmacy = excluded.nominated_pharmacy,
    urgent_numbers = excluded.urgent_numbers, extras = excluded.extras,
    repeat_order_methods = excluded.repeat_order_methods, repeat_turnaround = excluded.repeat_turnaround,
    repeat_controlled = excluded.repeat_controlled, repeat_high_risk = excluded.repeat_high_risk,
    repeat_emergency = excluded.repeat_emergency, local_safeguarding = excluded.local_safeguarding,
    local_complaints = excluded.local_complaints, local_dna = excluded.local_dna,
    local_interpreter = excluded.local_interpreter, local_confidentiality = excluded.local_confidentiality,
    same_day_reasons = excluded.same_day_reasons, role_policies = excluded.role_policies,
    safeguarding_route = excluded.safeguarding_route, booking_config = excluded.booking_config,
    prescription_config = excluded.prescription_config;

  delete from public.practice_staff where practice_id = p_practice;
  insert into public.practice_staff (practice_id, id, position, name, role, clinics, capabilities,
    appointment_capabilities, request_overrides, notes)
  select p_practice, e.v->>'id', e.n, coalesce(e.v->>'name', ''), coalesce(e.v->>'role', ''),
    coalesce(e.v->>'clinics', ''), e.v->'capabilities', e.v->'appointmentCapabilities',
    e.v->'requestOverrides', e.v->>'notes'
  from jsonb_array_elements(coalesce(p_data->'staff', '[]')) with ordinality as e(v, n);

  delete from public.practice_roles where practice_id = p_practice;
  insert into public.practice_roles (practice_id, role_id, label, confirmed, archived, selected_request_ids,
    categories, template, suggestions_edited)
  select p_practice, e.key, coalesce(e.value->>'label', ''), coalesce((e.value->>'confirmed')::boolean, false),
    (e.value->>'archived')::boolean, coalesce(e.value->'selectedRequestIds', '[]'),
    coalesce(e.value->'categories', '[]'), e.value->'template', (e.value->>'suggestionsEdited')::boolean
  from jsonb_each(coalesce(p_data->'roleRequests', '{}')) e;

  delete from public.practice_local_procedures where practice_id = p_practice;
  insert into public.practice_local_procedures (practice_id, request_id, data)
  select p_practice, e.key, e.value from jsonb_each(coalesce(p_data->'localProcedures', '{}')) e;

  delete from public.practice_requests where practice_id = p_practice;
  insert into public.practice_requests (practice_id, request_id, label)
  select p_practice, e.key, coalesce(e.value->>'label', '') from jsonb_each(coalesce(p_data->'practiceRequests', '{}')) e;
end;
$$;

-- Returns the new version, or null when the practice was edited elsewhere. One transaction.
create function public.save_practice_data(p_practice uuid, p_version integer, p_state jsonb, p_data jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  update public.practices set state = p_state, version = version + 1
  where id = p_practice and version = p_version returning version into v;
  if v is null then return null; end if;
  perform public.write_practice_data(p_practice, p_data);
  return v;
end;
$$;

-- Rebuilds the PracticeData object the app already uses; null when never saved.
create function public.load_practice_data(p_practice uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.jsonb_compact(jsonb_build_object(
    'practiceName', s.practice_name, 'hours', s.hours, 'address', s.address,
    'outOfHoursTimes', s.out_of_hours_times, 'prescriptionOrdering', s.prescription_ordering,
    'dutyContact', s.duty_contact, 'nominatedPharmacy', s.nominated_pharmacy,
    'urgentNumbers', s.urgent_numbers, 'extras', s.extras, 'repeatOrderMethods', s.repeat_order_methods,
    'repeatTurnaround', s.repeat_turnaround, 'repeatControlled', s.repeat_controlled,
    'repeatHighRisk', s.repeat_high_risk, 'repeatEmergency', s.repeat_emergency,
    'localSafeguarding', s.local_safeguarding, 'localComplaints', s.local_complaints,
    'localDNA', s.local_dna, 'localInterpreter', s.local_interpreter,
    'localConfidentiality', s.local_confidentiality, 'sameDayReasons', s.same_day_reasons,
    'rolePolicies', s.role_policies, 'safeguardingRoute', s.safeguarding_route,
    'bookingConfig', s.booking_config, 'prescriptionConfig', s.prescription_config,
    'staff', coalesce((select jsonb_agg(public.jsonb_compact(jsonb_build_object(
        'id', t.id, 'name', t.name, 'role', t.role, 'clinics', t.clinics, 'capabilities', t.capabilities,
        'appointmentCapabilities', t.appointment_capabilities, 'requestOverrides', t.request_overrides,
        'notes', to_jsonb(t.notes))) order by t.position)
      from public.practice_staff t where t.practice_id = p_practice), '[]'),
    'roleRequests', coalesce((select jsonb_object_agg(r.role_id, public.jsonb_compact(jsonb_build_object(
        'roleId', r.role_id, 'label', r.label, 'categories', r.categories,
        'selectedRequestIds', r.selected_request_ids, 'confirmed', r.confirmed,
        'archived', to_jsonb(r.archived), 'template', r.template,
        'suggestionsEdited', to_jsonb(r.suggestions_edited))))
      from public.practice_roles r where r.practice_id = p_practice), '{}'),
    'localProcedures', coalesce((select jsonb_object_agg(l.request_id, l.data)
      from public.practice_local_procedures l where l.practice_id = p_practice), '{}'),
    'practiceRequests', coalesce((select jsonb_object_agg(q.request_id, jsonb_build_object('id', q.request_id, 'label', q.label))
      from public.practice_requests q where q.practice_id = p_practice), '{}')
  ))
  from public.practice_settings s where s.practice_id = p_practice
$$;
revoke execute on function public.write_practice_data(uuid, jsonb), public.save_practice_data(uuid, integer, jsonb, jsonb),
  public.load_practice_data(uuid) from public, anon, authenticated;
grant execute on function public.write_practice_data(uuid, jsonb), public.save_practice_data(uuid, integer, jsonb, jsonb),
  public.load_practice_data(uuid) to service_role;

-- Backfill existing practices, then drop the blob copy.
select public.write_practice_data(id, state->'practiceData') from public.practices where state ? 'practiceData';
update public.practices set state = state - 'practiceData' where state ? 'practiceData';

insert into public.role_templates (id, version, label, aliases, suggestions_status, selected_request_ids, position) values
  ('gp', 1, 'Doctor', '["GP","Doctor / GP","Doctor (GP)"]', 'awaiting-review', '[]', 0),
  ('practice-nurse', 1, 'Practice Nurse', '[]', 'awaiting-review', '[]', 1),
  ('healthcare-assistant', 1, 'Healthcare Assistant', '["HCA"]', 'awaiting-review', '[]', 2),
  ('nurse-practitioner', 1, 'Nurse Practitioner', '[]', 'awaiting-review', '[]', 3),
  ('advanced-nurse-practitioner', 1, 'Advanced Nurse Practitioner', '["ANP"]', 'awaiting-review', '[]', 4),
  ('clinical-pharmacist', 1, 'Clinical Pharmacist', '[]', 'awaiting-review', '[]', 5),
  ('physician-associate', 1, 'Physician Associate', '[]', 'awaiting-review', '[]', 6),
  ('first-contact-physiotherapist', 1, 'First Contact Physiotherapist', '[]', 'awaiting-review', '[]', 7),
  ('mental-health-practitioner', 1, 'Mental Health Practitioner', '[]', 'awaiting-review', '[]', 8),
  ('social-prescribing-link-worker', 1, 'Social Prescribing Link Worker', '[]', 'awaiting-review', '[]', 9),
  ('paramedic', 1, 'Paramedic', '[]', 'awaiting-review', '[]', 10);
