create table if not exists ticket_panels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  channel_id text not null,
  message_id text,
  title text not null,
  description text,
  embed jsonb,
  categories jsonb not null default '[]'::jsonb, -- [{ "label": "Support", "emoji": "🎫" }, ...]
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers(id) on delete cascade,
  panel_id uuid references ticket_panels(id) on delete set null,
  discord_channel_id text not null unique,
  category text not null default 'Support',
  opener_discord_id text not null,
  claimed_by_discord_id text,
  status text not null default 'open' check (status in ('open', 'claimed', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists idx_tickets_server_id on tickets(server_id);
create index if not exists idx_tickets_status on tickets(server_id, status);

create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_discord_id text not null,
  author_username text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_messages_ticket_id on ticket_messages(ticket_id);

create table if not exists ticket_ratings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references tickets(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  rated_by_discord_id text not null,
  created_at timestamptz not null default now()
);

alter table ticket_panels enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table ticket_ratings enable row level security;
