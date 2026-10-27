-- Data-subject access export (UK GDPR Art. 15/20). Run in the Supabase SQL editor.
-- Replace the email, check the requester's identity first (docs/GDPR.md section 6), and save the result.
with subject as (
  select p.* from public.profiles p join auth.users u on u.id = p.id
  where lower(u.email) = lower('person@example.com')
)
select jsonb_build_object(
  'profile', (select to_jsonb(s) from subject s),
  'training_sessions', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.training_sessions t
                         where t.trainee_id = (select id from subject)),
  'audit_events_about_person', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.audit_events a
                                 where a.target_id = (select id::text from subject)
                                    or a.actor_id = (select id from subject))
) as export;

-- Legacy free text that may hold personal data (R8): staff notes still present across practices.
-- select practice_id, name, notes from public.practice_staff where coalesce(trim(notes), '') <> '';
