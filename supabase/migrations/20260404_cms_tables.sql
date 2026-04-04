-- ═══════════════════════════════════════════════════════════════
-- CMS Tables for Client Memory Store
-- Prerequisites for P1-MEM (document pipeline) and P4 (Radar)
-- ═══════════════════════════════════════════════════════════════

-- 1. Client Documents: uploaded files with extracted text and AI summary
create table if not exists client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  filename text not null,
  file_path text not null,              -- Supabase Storage path
  file_type text,                       -- 'pdf', 'docx', 'txt', 'csv', 'image'
  file_size_bytes int,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'error')),
  extracted_text text,                  -- raw text from document
  summary text,                         -- AI-generated summary (~500 words)
  entities jsonb default '[]',          -- extracted entities (people, companies, topics)
  category text,                        -- 'brand_guidelines', 'strategy', 'report', 'competitor', 'other'
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Recommendations Log: tracks AI recommendations and user feedback
create table if not exists recommendations_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  source text not null,                 -- 'audit', 'radar', 'briefing', 'analytics', 'social', 'editorial'
  title text not null,
  description text,
  impact text check (impact in ('high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'in_progress', 'done')),
  feedback text,                        -- user comment on the recommendation
  data jsonb default '{}',              -- supporting data (metrics, references)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Interaction Log: tracks all significant system-user interactions
create table if not exists interaction_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  user_id uuid,                         -- auth.users id (null for system events)
  action text not null,                 -- 'audit_completed', 'briefing_generated', 'recommendation_accepted', 'document_uploaded', 'radar_run', 'tier_changed'
  detail jsonb default '{}',            -- action-specific context
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════════

alter table client_documents enable row level security;
alter table recommendations_log enable row level security;
alter table interaction_log enable row level security;

create policy "Documents access via client"
  on client_documents for all
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));

create policy "Recommendations access via client"
  on recommendations_log for all
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));

create policy "Interaction log access via client"
  on interaction_log for all
  using (client_id in (
    select client_id from client_users where user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════

create index if not exists idx_client_documents_client on client_documents(client_id);
create index if not exists idx_recommendations_client_status on recommendations_log(client_id, status);
create index if not exists idx_interaction_client_action on interaction_log(client_id, action);
create index if not exists idx_interaction_created on interaction_log(created_at desc);

-- ═══════════════════════════════════════════════════════════════
-- Storage Bucket for client documents
-- Run this in Supabase Dashboard > Storage > Create bucket:
--   Name: client-documents
--   Public: false (private)
--   Max file size: 25MB
--   Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/csv, text/markdown, image/png, image/jpeg
-- ═══════════════════════════════════════════════════════════════
