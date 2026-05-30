-- ============================================================================
-- Herna - rezervační systém: počáteční schéma
-- Model: "celá herna jednomu" + "kdo dřív" (pending neblokuje, blokuje jen confirmed)
-- Spusť v Supabase: SQL Editor -> vlož a Run. (Nebo `supabase db push`.)
-- ============================================================================

-- Potřeba pro EXCLUDE constraint nad časovým rozsahem.
create extension if not exists btree_gist;

-- ----------------------------------------------------------------------------
-- Tabulka rezervací
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  package       text not null,
  child_count   int,
  customer_name  text not null,
  customer_phone text not null,
  customer_email text not null,
  note          text,
  status        text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  cancel_token  uuid not null default gen_random_uuid(),
  confirmed_at  timestamptz,
  cancelled_at  timestamptz,
  constraint bookings_time_valid check (ends_at > starts_at)
);

-- Řazení "kdo dřív" a rychlé dotazy na obsazenost.
create index if not exists bookings_starts_at_idx on public.bookings (starts_at);
create index if not exists bookings_status_idx on public.bookings (status);

-- TVRDÁ POJISTKA: dvě potvrzené rezervace se nesmí časově překrývat.
-- Čekající (pending) žádosti se schválně neomezují - o termín může žádat víc lidí.
alter table public.bookings drop constraint if exists bookings_no_overlap_confirmed;
alter table public.bookings
  add constraint bookings_no_overlap_confirmed
  exclude using gist (tstzrange(starts_at, ends_at) with &&)
  where (status = 'confirmed');

-- ----------------------------------------------------------------------------
-- Anonymní vložení žádosti se vždy "vyčistí" na bezpečné hodnoty.
-- (RLS neumí omezit jednotlivé sloupce, proto trigger.)
-- ----------------------------------------------------------------------------
create or replace function public.sanitize_booking_insert()
returns trigger
language plpgsql
as $$
begin
  new.status       := 'pending';
  new.created_at   := now();
  new.confirmed_at := null;
  new.cancelled_at := null;
  new.cancel_token := gen_random_uuid();
  return new;
end;
$$;

drop trigger if exists trg_sanitize_booking_insert on public.bookings;
create trigger trg_sanitize_booking_insert
  before insert on public.bookings
  for each row
  -- platí jen pro anonymní (veřejné) vložení; přihlášená herna má plnou kontrolu
  when (auth.role() = 'anon')
  execute function public.sanitize_booking_insert();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.bookings enable row level security;

-- Anonym (rodič) smí JEN vkládat žádost, a to ve stavu pending.
drop policy if exists "anon can insert pending" on public.bookings;
create policy "anon can insert pending"
  on public.bookings
  for insert
  to anon
  with check (status = 'pending');

-- Anonym NEMÁ žádnou SELECT/UPDATE/DELETE politiku -> nepřečte cizí osobní údaje.
-- Obsazenost se čte přes funkci get_busy_slots() níže (vrací jen časy).

-- Přihlášená herna má plný přístup.
drop policy if exists "authenticated full access" on public.bookings;
create policy "authenticated full access"
  on public.bookings
  for all
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- Veřejná obsazenost: jen časy potvrzených rezervací, ŽÁDNÉ osobní údaje.
-- ----------------------------------------------------------------------------
create or replace function public.get_busy_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select b.starts_at, b.ends_at
  from public.bookings b
  where b.status = 'confirmed'
    and b.starts_at < p_to
    and b.ends_at > p_from
  order by b.starts_at;
$$;

revoke all on function public.get_busy_slots(timestamptz, timestamptz) from public;
grant execute on function public.get_busy_slots(timestamptz, timestamptz) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Zrušení rezervace (rodič přes odkaz s tokenem, i herna).
-- Uvolní termín a vrátí true, pokud se něco zrušilo.
-- ----------------------------------------------------------------------------
create or replace function public.cancel_booking(p_id uuid, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.bookings
     set status = 'cancelled', cancelled_at = now()
   where id = p_id
     and cancel_token = p_token
     and status in ('pending', 'confirmed');
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function public.cancel_booking(uuid, uuid) from public;
grant execute on function public.cancel_booking(uuid, uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Pomocný pohled pro adminy: čekající žádosti seřazené "kdo dřív" + počet
-- konkurenčních žádostí na stejný překrývající se termín.
-- ----------------------------------------------------------------------------
-- security_invoker = true -> pohled respektuje RLS volajícího (anon nic nepřečte).
create or replace view public.pending_with_competition
  with (security_invoker = true) as
  select
    b.*,
    (
      select count(*)
      from public.bookings c
      where c.id <> b.id
        and c.status = 'pending'
        and tstzrange(c.starts_at, c.ends_at) && tstzrange(b.starts_at, b.ends_at)
    ) as competing_count
  from public.bookings b
  where b.status = 'pending'
  order by b.created_at;

revoke all on public.pending_with_competition from anon;
grant select on public.pending_with_competition to authenticated;
