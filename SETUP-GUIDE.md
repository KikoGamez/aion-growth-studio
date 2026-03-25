# AION Dashboard — Setup Guide

## 1. Supabase

### Create project
1. Go to [supabase.com](https://supabase.com) → New project
2. Note your `Project URL` and `anon` key

### SQL Schema

```sql
-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null unique,
  sector text,
  tier text not null default 'radar' check (tier in ('radar', 'señales', 'palancas')),
  created_at timestamptz default now()
);

-- Snapshots (monthly analysis results)
create table snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  month text not null, -- "marzo-2026"
  score int not null,
  pipeline_output jsonb not null default '{}',
  created_at timestamptz default now(),
  unique(client_id, month)
);

-- Alerts
create table alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  type text not null check (type in ('seo', 'geo', 'competitor', 'web', 'paid')),
  severity text not null check (severity in ('critical', 'warning', 'positive')),
  title text not null,
  description text not null,
  detail text,
  timestamp timestamptz default now(),
  resolved_at timestamptz
);

-- Context entries (actions + insights)
create table context_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  type text not null check (type in ('action', 'insight')),
  title text not null,
  status text check (status in ('done', 'in_progress', 'pending')),
  impact text check (impact in ('high', 'medium', 'low')),
  date date not null,
  created_at timestamptz default now()
);

-- Users
create table client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz default now(),
  unique(client_id, user_id)
);
```

### RLS Policies

```sql
-- Enable RLS
alter table clients enable row level security;
alter table snapshots enable row level security;
alter table alerts enable row level security;
alter table context_entries enable row level security;
alter table client_users enable row level security;

-- Users can only access their client's data
create policy "Users access own client"
  on client_users for select
  using (user_id = auth.uid());

create policy "Client access via membership"
  on clients for select
  using (id in (
    select client_id from client_users where user_id = auth.uid()
  ));

create policy "Snapshot access via client"
  on snapshots for select
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));

create policy "Alert access via client"
  on alerts for select
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));

create policy "Context entry access via client"
  on context_entries for select
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));
```

---

## 2. Stripe

### Products & Prices

| Plan     | Price ID             | Amount   |
|----------|---------------------|----------|
| Radar    | `price_radar_...`   | 149€/mes |
| Señales  | `price_senales_...` | 349€/mes |
| Palancas | `price_palancas_..` | 699€/mes |

### Webhook

Set endpoint to `https://yourdomain.com/api/stripe/webhook`.

Events to listen:
- `checkout.session.completed` → create/update subscription
- `customer.subscription.updated` → update tier
- `customer.subscription.deleted` → downgrade to radar

---

## 3. Vercel Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...   # server-only

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_RADAR=price_...
STRIPE_PRICE_SENALES=price_...
STRIPE_PRICE_PALANCAS=price_...

# APIs (already used by pipeline)
OPENAI_API_KEY=sk-...
GOOGLE_PSI_KEY=...
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
```

> **Demo mode**: If `SUPABASE_URL` is not set, the app runs in demo mode with "Soluciones Verdes" data. No auth required.

---

## 4. OAuth APIs

### Google (Analytics + Ads + Search Console)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`
4. Scopes needed:
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/adwords`
   - `https://www.googleapis.com/auth/webmasters.readonly`

### Meta Ads
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create app → Marketing API
3. Redirect URI: `https://yourdomain.com/api/auth/meta/callback`
4. Scopes: `ads_read`, `ads_management`

---

## 5. Go Live Checklist

- [ ] Create Supabase project + run schema SQL
- [ ] Set all Vercel env vars
- [ ] Configure Stripe products + webhook
- [ ] Set up OAuth apps (Google + Meta)
- [ ] Test demo mode: `/dashboard` loads with "Soluciones Verdes"
- [ ] Test tier switching: `/dashboard/settings` → Radar → Señales → Palancas
- [ ] Test free report CTA: `/es/audit/[id]/informe` → "Empezar ahora" → `/dashboard/onboarding`
- [ ] Test onboarding flow: step 0 → 1 → 2 → 3 → dashboard
