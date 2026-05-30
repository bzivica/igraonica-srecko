# Backend - plán a přehled

Stack: **Supabase** (PostgreSQL + Auth + Edge Functions) + **Brevo** (e-maily). Vše free tier, 0 Kč/měsíc.
Operativní postup nasazení krok za krokem je v `SETUP.md`; tento dokument popisuje, **jak backend funguje** a **co zbývá**.

## 1. Co už je hotové (kód v repu)

| Vrstva | Soubor | Obsah |
| --- | --- | --- |
| Schéma + pravidla | `supabase/migrations/0001_init.sql` | tabulka `bookings`, RLS, EXCLUDE pojistka, RPC `get_busy_slots`, `cancel_booking`, pohled `pending_with_competition` |
| Notifikace | `supabase/migrations/0002_notify_trigger.sql` | trigger přes `pg_net` -> volá Edge Function |
| E-maily | `supabase/functions/notify/index.ts` | Deno funkce, odesílá přes Brevo |
| Heartbeat | `.github/workflows/heartbeat.yml` | cron proti uspání free tieru |

## 2. Datový model (`bookings`)

`id`, `created_at`, `starts_at`, `ends_at`, `package`, `child_count`, `customer_name/phone/email`,
`note`, `status` (`pending`/`confirmed`/`rejected`/`cancelled`), `cancel_token`, `confirmed_at`, `cancelled_at`.

## 3. Bezpečnost (RLS)

- **anon (rodič):** smí JEN vložit žádost ve stavu `pending` (trigger ji navíc „vyčistí" na bezpečné
  hodnoty). Nemá žádné SELECT/UPDATE/DELETE -> nepřečte cizí osobní údaje.
- **Obsazenost** se ven dostává jen přes `get_busy_slots()` -> vrací **pouze časy** potvrzených rezervací.
- **authenticated (herna):** plný přístup.

## 4. Model souběhu „kdo dřív"

`pending` žádost slot **neblokuje** (o stejný termín může žádat víc lidí). Tvrdá pojistka v DB
(EXCLUDE nad `tstzrange` pro `status='confirmed'`) **brání potvrdit dvě překrývající se rezervace** ->
druhé potvrzení spadne na `23P01`, agent to mapuje na hlášku „termín se překrývá".

## 5. Tok dat

1. Rodič odešle žádost -> insert `pending` -> trigger sanitizuje -> webhook -> `notify` -> Brevo
   (e-mail herně + potvrzení přijetí rodiči).
2. Herna se přihlásí -> seznam `pending_with_competition` (kdo dřív + počet konkurence) ->
   `confirm` (chrání EXCLUDE) -> webhook -> Brevo (potvrzení rodiči + odkaz na zrušení).
3. Rodič přes odkaz `#/zrusit?id&token` -> RPC `cancel_booking` -> uvolní termín.

## 6. Co zbývá udělat (další sezení) - shrnutí, detail v `SETUP.md`

1. Založit Supabase projekt (region Frankfurt).
2. Spustit `0001_init.sql` a `0002_notify_trigger.sql`.
3. Vytvořit login herny (vypnout „Confirm email").
4. Brevo: API klíč + ověřený odesílatel; `supabase functions deploy notify`; nastavit secrets
   (`BREVO_API_KEY`, `SENDER_*`, `HERNA_EMAIL`, `SITE_URL`, `WEBHOOK_SECRET`); naplnit `app_settings`.
5. GitHub repo -> Pages (Source: Actions) + secrety `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
6. Doplnit reálné údaje v `src/lib/config.js` (telefon, e-mail, otevírací doba, ceny).

## 7. Verifikační checklist (až poběží naživo)

- [ ] Insert žádosti projde a trigger ji nastaví na `pending` + `cancel_token`.
- [ ] anon nepřečte cizí údaje (`select bookings` = prázdné).
- [ ] `get_busy_slots` vrací jen časy potvrzených.
- [ ] Dvě `confirmed` na překryv -> `23P01` -> hláška „termín se překrývá".
- [ ] Login herny funguje.
- [ ] E-maily: nová žádost (herna + rodič), potvrzení (rodič + odkaz na zrušení), zamítnutí.
- [ ] `#/zrusit` zruší a uvolní termín.
- [ ] Heartbeat workflow doběhne zeleně.

## 8. Otevřené / fáze 2

Placená SMS brána, tabulka `settings` (editace nastavení v adminu místo `config.js`),
lokalizace e-mailů rodiči podle jazyka žádosti (teď jen česky), modal na konflikt při
souběžném psaní do stejného termínu.
