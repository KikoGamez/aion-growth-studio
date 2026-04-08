-- ═══════════════════════════════════════════════════════════════
-- Integrations table — stores OAuth tokens for GA4, GSC, etc.
-- ═══════════════════════════════════════════════════════════════

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  provider text not null,                    -- 'google_analytics', 'google_search_console'
  status text not null default 'connected'   -- 'connected', 'disconnected', 'error'
    check (status in ('connected', 'disconnected', 'error')),
  access_token text,                         -- short-lived (1h)
  refresh_token text not null,               -- long-lived, used to renew access_token
  token_expires_at timestamptz,              -- when access_token expires
  property_id text,                          -- GA4 property ID (e.g. 'properties/123456')
  property_name text,                        -- Human-readable name
  account_email text,                        -- Google account email used for auth
  scopes text[],                             -- granted scopes
  data_quality_score int,                    -- 0-100, set after quality audit
  metadata jsonb default '{}',               -- extra provider-specific data
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table integrations enable row level security;

create policy "Integrations access via client"
  on integrations for all
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));

-- Indexes
create index if not exists idx_integrations_client on integrations(client_id);
create index if not exists idx_integrations_provider on integrations(client_id, provider);
