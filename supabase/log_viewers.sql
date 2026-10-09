-- Visitor log for the portfolio. Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Privacy: the visitor's IP address is stored (personal data: the site shows a privacy note).
-- visitor_id is a one-way hash of IP + browser + the date, used to count unique visitors per day.

create table if not exists public.log_viewers (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  path         text not null,
  referrer     text,
  source       text not null default 'Direct',  -- Google, LinkedIn, GitHub, Direct...
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  country      text,                             -- ISO code, e.g. ID
  region       text,
  city         text,
  device       text,                             -- Desktop / Mobile / Tablet
  browser      text,
  os           text,
  visitor_id   text not null
);

-- Added later; safe to run on an existing table.
alter table public.log_viewers add column if not exists ip_address inet;

create index if not exists log_viewers_created_at_idx on public.log_viewers (created_at desc);

-- Locked down: with row level security on and no policies, the public (anon) key can't read or
-- write this table. Only the site's server, using the secret key, can.
alter table public.log_viewers enable row level security;
revoke all on table public.log_viewers from anon, authenticated;
grant select, insert on table public.log_viewers to service_role;

comment on table public.log_viewers is 'Portfolio page views. Written by /api/track, read by /stats.';

-- Make the API see the new table right away (fixes "Could not find the table ... in the schema cache").
notify pgrst, 'reload schema';
