-- Retention (see docs/GDPR.md). Schedule daily, e.g. in the Supabase SQL editor:
--   select cron.schedule('purge-personal-data', '17 3 * * *', 'select public.purge_expired_personal_data()');
-- (needs the pg_cron extension; otherwise run it manually or from a scheduled job.)
create function public.purge_expired_personal_data() returns void
language sql security definer set search_path = '' as $$
  delete from public.page_views where created_at < now() - interval '13 months';
  delete from public.cookie_consents where created_at < now() - interval '3 years';
  delete from public.contact_messages where created_at < now() - interval '24 months';
$$;
revoke execute on function public.purge_expired_personal_data() from public, anon, authenticated;
grant execute on function public.purge_expired_personal_data() to service_role;
