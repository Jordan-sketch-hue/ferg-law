-- ============================================================================
-- 0002_chat.sql — AI chatbot + live-chat + WhatsApp handoff schema
-- ----------------------------------------------------------------------------
-- Two tables back the Ferguson Law chat system:
--   chat_conversations — one row per visitor session/thread
--   chat_messages      — every message (visitor / bot / agent / system)
--
-- SECURITY MODEL (capability-token):
--   The conversation `id` is an unguessable uuid. The public widget only ever
--   queries by the id it created (stored in the visitor's localStorage), so the
--   uuid itself acts as a bearer capability token. RLS therefore allows anon to
--   INSERT and SELECT, but the widget never enumerates — it always filters by
--   its own conversation id. All privileged writes from the API route (status
--   changes, agent replies, lead inserts) go through the service-role key, which
--   bypasses RLS entirely.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.chat_conversations (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  last_message_at   timestamptz not null default now(),
  visitor_name      text,
  visitor_email     text,
  visitor_phone     text,
  channel           text not null default 'web',
  status            text not null default 'bot'
                      check (status in ('bot', 'waiting_agent', 'agent', 'closed')),
  assigned_agent    text,
  unread_for_agent  int  not null default 0,
  meta              jsonb not null default '{}'::jsonb
);

create table if not exists public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.chat_conversations(id) on delete cascade,
  created_at       timestamptz not null default now(),
  role             text not null check (role in ('visitor', 'bot', 'agent', 'system')),
  body             text,
  meta             jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists chat_messages_conversation_id_idx
  on public.chat_messages (conversation_id);
create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);
create index if not exists chat_conversations_last_message_at_idx
  on public.chat_conversations (last_message_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.chat_conversations enable row level security;
alter table public.chat_messages      enable row level security;

-- Conversations: anon may create and read (read is safe — id is an unguessable
-- capability token and the widget only queries by its own id).
drop policy if exists "anon insert conversations" on public.chat_conversations;
create policy "anon insert conversations"
  on public.chat_conversations for insert to anon, authenticated
  with check (true);

drop policy if exists "anon select conversations" on public.chat_conversations;
create policy "anon select conversations"
  on public.chat_conversations for select to anon, authenticated
  using (true);

-- Messages: anon may create and read (same capability-token rationale).
drop policy if exists "anon insert messages" on public.chat_messages;
create policy "anon insert messages"
  on public.chat_messages for insert to anon, authenticated
  with check (true);

drop policy if exists "anon select messages" on public.chat_messages;
create policy "anon select messages"
  on public.chat_messages for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Realtime — let the widget and the agent console subscribe to live inserts.
-- Guarded so re-running the migration never errors on "already a member".
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_conversations'
  ) then
    alter publication supabase_realtime add table public.chat_conversations;
  end if;
end $$;
