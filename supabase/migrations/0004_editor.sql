-- ---------------------------------------------------------------------------
-- 0004_editor.sql — in-place content editor save path
-- ---------------------------------------------------------------------------
-- The marketing site stores its editable copy in public.homeready_site_content
-- (id text pk, content jsonb). The published doc is `ferguson-pitch`; the
-- draft/preview doc is `ferguson-pitch-preview`.
--
-- This RPC lets the in-browser editor persist edits WITHOUT exposing a write
-- policy on the table to anon. It is token-gated by public.fl_is_admin(): only
-- a caller holding the firm's admin token may save, and only to the two known
-- document ids. SECURITY DEFINER so it can upsert past RLS once the token check
-- passes.
-- ---------------------------------------------------------------------------

create or replace function public.fl_save_content(
  p_id text,
  p_content jsonb,
  p_token text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- gate on the shared admin token
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  -- only the two known documents may be written through this path
  if p_id not in ('ferguson-pitch', 'ferguson-pitch-preview') then
    raise exception 'invalid document id: %', p_id;
  end if;

  insert into public.homeready_site_content (id, content)
  values (p_id, p_content)
  on conflict (id) do update set content = excluded.content;
end;
$$;

revoke all on function public.fl_save_content(text, jsonb, text) from public;
grant execute on function public.fl_save_content(text, jsonb, text) to anon, authenticated;

comment on function public.fl_save_content(text, jsonb, text) is
  'Token-gated upsert of editor content into homeready_site_content. Requires fl_is_admin(p_token); restricted to the ferguson-pitch and ferguson-pitch-preview document ids.';
