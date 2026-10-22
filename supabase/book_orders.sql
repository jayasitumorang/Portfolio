-- Book sales (QRIS via Midtrans) and a daily visits + transactions summary.
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to run again.

create table if not exists public.book_orders (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  order_id       text not null unique,          -- sent to Midtrans
  access_token   text not null unique,          -- secret in the buyer's order link, never sent to Midtrans
  book_slug      text not null,
  book_title     text not null,
  amount         integer not null check (amount > 0),  -- IDR
  email          text not null,
  name           text,
  status         text not null default 'pending'
                 check (status in ('pending', 'paid', 'expired', 'failed', 'refunded')),
  payment_type   text,                          -- qris
  issuer         text,                          -- the wallet or bank the buyer paid with, when Midtrans says
  transaction_id text,                          -- Midtrans transaction id
  qr_url         text,
  expires_at     timestamptz,
  paid_at        timestamptz,
  downloads      integer not null default 0,
  ip_address     inet,
  country        text,
  device         text
);

create index if not exists book_orders_created_at_idx on public.book_orders (created_at desc);
create index if not exists book_orders_status_idx on public.book_orders (status);

-- Locked down like log_viewers: only the site's server (secret key) can read or write.
alter table public.book_orders enable row level security;
revoke all on table public.book_orders from anon, authenticated;
grant select, insert, update on table public.book_orders to service_role;

comment on table public.book_orders is 'Direct book sales. Written by /api/checkout and the Midtrans webhook, read by /stats.';

-- One row per day (WIB): page views, unique visitors, orders, paid orders and revenue.
-- Open it in Table Editor → Views, or query: select * from daily_visits_transactions order by day desc;
create or replace view public.daily_visits_transactions
with (security_invoker = true) as
with v as (
  select (created_at at time zone 'Asia/Jakarta')::date as day,
         count(*) as page_views,
         count(distinct visitor_id) as visitors
  from public.log_viewers
  group by 1
),
o as (
  select (created_at at time zone 'Asia/Jakarta')::date as day,
         count(*) as orders,
         count(*) filter (where status = 'paid') as paid_orders,
         coalesce(sum(amount) filter (where status = 'paid'), 0) as revenue_idr
  from public.book_orders
  group by 1
)
select coalesce(v.day, o.day) as day,
       coalesce(v.page_views, 0) as page_views,
       coalesce(v.visitors, 0) as visitors,
       coalesce(o.orders, 0) as orders,
       coalesce(o.paid_orders, 0) as paid_orders,
       coalesce(o.revenue_idr, 0) as revenue_idr,
       case when coalesce(v.visitors, 0) > 0
            then round(100.0 * coalesce(o.paid_orders, 0) / v.visitors, 2) end as conversion_pct
from v full join o on o.day = v.day;

revoke all on public.daily_visits_transactions from anon, authenticated;
grant select on public.daily_visits_transactions to service_role;

-- Private bucket for the EPUB files. Upload error-404.epub and krs-kopi.epub to it
-- (Storage → books → Upload). Buyers only get short-lived signed links after paying.
insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
