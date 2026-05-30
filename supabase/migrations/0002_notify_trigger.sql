-- ============================================================================
-- E-mailové notifikace: trigger na bookings -> zavolá Edge Function "notify".
-- Posílá se přes pg_net (asynchronní HTTP POST z databáze).
--
-- Po nasazení Edge Function NUTNO jednou doplnit URL funkce a tajemství:
--   insert into private.app_settings (key, value) values
--     ('notify_url',    'https://<PROJECT_REF>.functions.supabase.co/notify'),
--     ('notify_secret', '<NÁHODNÝ_ŘETĚZEC>')  -- musí se rovnat WEBHOOK_SECRET ve funkci
--   on conflict (key) do update set value = excluded.value;
-- ============================================================================

create extension if not exists pg_net;

-- Privátní schéma pro konfiguraci, kterou nikdy nečte anon (žádná RLS politika, žádný grant).
create schema if not exists private;

create table if not exists private.app_settings (
  key   text primary key,
  value text not null
);

revoke all on private.app_settings from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Trigger funkce: po vložení/změně rezervace pošle payload Edge Function.
-- ----------------------------------------------------------------------------
create or replace function private.notify_booking()
returns trigger
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url    from private.app_settings where key = 'notify_url';
  select value into v_secret from private.app_settings where key = 'notify_secret';

  -- Není nakonfigurováno -> nic neposíláme, ale operaci nezdržíme/neshodíme.
  if v_url is null then
    return coalesce(new, old);
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    ),
    body    := jsonb_build_object(
      'type', tg_op,
      'record', to_jsonb(new),
      'old_record', to_jsonb(old)
    )
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_notify_booking on public.bookings;
create trigger trg_notify_booking
  after insert or update on public.bookings
  for each row
  execute function private.notify_booking();
