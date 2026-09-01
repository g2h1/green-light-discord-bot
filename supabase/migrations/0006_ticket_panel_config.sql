-- Extends ticket_panels with the fields needed by the full Panel Editor
-- (appearance extras, routing, welcome message, ticket behavior, claiming/closing).
-- Stored as one flexible jsonb column, consistent with the server_settings
-- key/value pattern already used elsewhere, rather than one column per field.
alter table ticket_panels add column if not exists config jsonb not null default '{}'::jsonb;
alter table ticket_panels add column if not exists disabled boolean not null default false;
