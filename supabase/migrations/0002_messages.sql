create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  name text not null,
  category text not null default 'custom',
  content text,
  embed jsonb,
  buttons jsonb not null default '[]'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_message_templates_server_id on message_templates(server_id);

create table if not exists scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  channel_id text not null,
  content text,
  embed jsonb,
  buttons jsonb not null default '[]'::jsonb,
  mentions jsonb not null default '{}'::jsonb,
  send_at timestamptz not null,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'custom')),
  recurrence_interval_minutes integer,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  last_error text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scheduled_messages_due on scheduled_messages(status, send_at);
create index if not exists idx_scheduled_messages_server_id on scheduled_messages(server_id);

alter table message_templates enable row level security;
alter table scheduled_messages enable row level security;
