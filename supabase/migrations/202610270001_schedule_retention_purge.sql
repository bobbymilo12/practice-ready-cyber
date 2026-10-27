-- Run the retention purge daily (docs/GDPR.md R5). Needs pg_cron, which Supabase supports.
create extension if not exists pg_cron;
select cron.unschedule('purge-personal-data') where exists (select 1 from cron.job where jobname = 'purge-personal-data');
select cron.schedule('purge-personal-data', '17 3 * * *', 'select public.purge_expired_personal_data()');
