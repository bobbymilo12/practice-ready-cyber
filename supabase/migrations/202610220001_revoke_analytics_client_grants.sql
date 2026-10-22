-- Defence in depth: these tables are written only by server functions (service role).
-- RLS already blocks clients; remove the default anon/authenticated grants as well.
revoke all on public.cookie_consents, public.page_views from anon, authenticated;
