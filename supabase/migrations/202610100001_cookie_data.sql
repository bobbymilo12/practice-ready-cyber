-- Consent-gated, first-party analytics. No IP address, user agent or account id is stored:
-- visitor_id is a random UUID the browser only creates after the visitor accepts cookies.
-- RLS on with no policies: only the server (service_role) can read or write.

-- Proof of consent (UK GDPR Art. 7(1)): every banner choice, including withdrawals.
create table public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid,
  choice text not null check (choice in ('accepted', 'rejected')),
  policy_version text not null,
  created_at timestamptz not null default now()
);
alter table public.cookie_consents enable row level security;

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  path text not null check (char_length(path) <= 300),
  referrer_host text check (char_length(referrer_host) <= 255),
  created_at timestamptz not null default now()
);
alter table public.page_views enable row level security;
create index page_views_created_at_idx on public.page_views (created_at);
create index page_views_visitor_id_idx on public.page_views (visitor_id);
