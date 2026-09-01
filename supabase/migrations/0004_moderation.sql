create table if not exists warnings (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  discord_user_id text not null,
  reason text not null,
  moderator_discord_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_warnings_server_user on warnings(server_id, discord_user_id);

create table if not exists moderation_logs (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  action text not null check (action in ('warn', 'timeout', 'kick', 'ban', 'unban', 'purge', 'delete_message')),
  target_discord_id text,
  moderator_discord_id text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_logs_server_id on moderation_logs(server_id, created_at desc);

create table if not exists system_logs (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  category text not null, -- member, moderation, message, role, channel, ticket, security, bot
  event_type text not null, -- e.g. member_join, message_delete, role_created
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_logs_server_id on system_logs(server_id, created_at desc);
create index if not exists idx_system_logs_category on system_logs(server_id, category, created_at desc);

alter table warnings enable row level security;
alter table moderation_logs enable row level security;
alter table system_logs enable row level security;
