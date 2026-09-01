create table if not exists giveaways (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  channel_id text not null,
  message_id text,
  prize text not null,
  winners_count integer not null default 1,
  required_role_id text,
  min_account_age_days integer,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'ended', 'cancelled')),
  winner_discord_ids jsonb not null default '[]'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_giveaways_due on giveaways(status, ends_at);
create index if not exists idx_giveaways_server_id on giveaways(server_id);

create table if not exists giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references giveaways(id) on delete cascade,
  discord_user_id text not null,
  created_at timestamptz not null default now(),
  unique (giveaway_id, discord_user_id)
);

create index if not exists idx_giveaway_entries_giveaway_id on giveaway_entries(giveaway_id);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  name text not null,
  trigger_event text not null check (trigger_event in ('member_join', 'ticket_close')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_automations_server_trigger on automations(server_id, trigger_event) where enabled;

create table if not exists automation_actions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  order_index integer not null default 0,
  action_type text not null check (action_type in ('give_role', 'send_message', 'send_log')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_actions_automation_id on automation_actions(automation_id, order_index);

alter table giveaways enable row level security;
alter table giveaway_entries enable row level security;
alter table automations enable row level security;
alter table automation_actions enable row level security;
