create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  discord_id text unique not null,
  username text not null,
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists servers (
  id uuid primary key default gen_random_uuid(),
  discord_guild_id text unique not null,
  name text not null,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists server_settings (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, key)
);

create index if not exists idx_server_settings_server_id on server_settings(server_id);

-- Service role (used exclusively by backend/bot) bypasses RLS by default;
-- RLS is enabled here so no other key can read these tables.
alter table users enable row level security;
alter table servers enable row level security;
alter table server_settings enable row level security;
