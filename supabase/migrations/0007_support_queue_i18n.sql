-- Voice support queue + sessions
create table if not exists support_queue (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  discord_user_id text not null,
  waiting_channel_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'claimed', 'in_session', 'closed')),
  position integer not null default 0,
  claimed_by_discord_id text,
  room_channel_id text,
  joined_at timestamptz not null default now(),
  claimed_at timestamptz,
  closed_at timestamptz
);

-- Only one active (waiting/claimed/in_session) queue entry per user per server.
create unique index if not exists idx_support_queue_active_user
  on support_queue(server_id, discord_user_id)
  where status in ('waiting', 'claimed', 'in_session');

create index if not exists idx_support_queue_server_status on support_queue(server_id, status);

create table if not exists support_sessions (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  queue_id uuid not null references support_queue(id) on delete cascade,
  discord_user_id text not null,
  staff_discord_id text not null,
  room_channel_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_support_sessions_server_id on support_sessions(server_id);

alter table support_queue enable row level security;
alter table support_sessions enable row level security;

-- Bilingual tickets
alter table tickets add column if not exists language text not null default 'en' check (language in ('en', 'ar'));

-- Ticket panel image assets (Supabase Storage object paths, not Discord CDN URLs)
alter table ticket_panels add column if not exists banner_asset_path text;
alter table ticket_panels add column if not exists main_image_asset_path text;
alter table ticket_panels add column if not exists thumbnail_asset_path text;
