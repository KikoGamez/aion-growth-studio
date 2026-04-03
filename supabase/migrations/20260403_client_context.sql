-- Client onboarding context: stores business info from post-registration onboarding
-- One row per client, upserted on each onboarding completion

create table if not exists client_onboarding (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade unique,

  -- What they sell / who they serve
  business_description text,          -- "Software de RRHH para pymes"

  -- Primary goal
  primary_goal text,                  -- 'generate_leads' | 'sell_online' | 'brand_positioning' | 'local_traffic' | 'other'
  goal_detail text,                   -- free text if 'other' or extra context

  -- Geographic scope + URL architecture
  geo_scope text,                     -- 'local_city' | 'national' | 'multi_country' | 'global'
  geo_detail text,                    -- "Madrid centro" or "España + México + Colombia"
  url_architecture text,              -- 'single_url' | 'subdirectories' | 'subdomains' | 'separate_domains'
  url_detail text,                    -- "example.com/es/ + example.com/en/" or "example.es + example.mx"

  -- Budget range
  monthly_budget text,                -- '0' | '<500' | '500-2000' | '2000-5000' | '>5000'

  -- Team size
  team_size text,                     -- 'solo' | '2-5' | '6-20' | '>20'

  -- Competitors (user-confirmed, up to 5)
  competitors jsonb default '[]',     -- [{"url": "...", "name": "..."}]

  -- Metadata
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table client_onboarding enable row level security;

create policy "Onboarding access via client"
  on client_onboarding for all
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));

-- Index for quick lookup
create index if not exists idx_client_onboarding_client on client_onboarding(client_id);
