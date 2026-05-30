# Nasazení (krok za krokem)

Vše zdarma: GitHub Pages (web) + Supabase (DB/Auth/Edge Function) + Brevo (e-maily).

## 1. Supabase

1. Založ projekt na <https://supabase.com> (region Frankfurt).
2. **SQL Editor** -> spusť postupně `supabase/migrations/0001_init.sql` a `0002_notify_trigger.sql`.
3. **Authentication -> Users -> Add user**: vytvoř login herny (e-mail + heslo).
   V *Providers -> Email* vypni "Confirm email" (jinak se nepřihlásí bez potvrzení).
4. **Project Settings -> API**: zkopíruj `Project URL` a `anon public` klíč.

## 2. Frontend lokálně (nepovinné, na vývoj)

```powershell
copy .env.example .env   # a doplň VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 3. Edge Function pro e-maily (Brevo)

1. Brevo účet na <https://www.brevo.com>, v **SMTP & API -> API Keys** vytvoř klíč;
   v **Senders** ověř odesílací e-mail.
2. Nasaď funkci (Supabase CLI):

   ```powershell
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase functions deploy notify --no-verify-jwt
   ```

   `--no-verify-jwt`, protože ji volá databázový trigger (chráníme ji `WEBHOOK_SECRET`).
3. Nastav tajemství funkce (Supabase -> Edge Functions -> Secrets, nebo CLI):

   ```powershell
   npx supabase secrets set `
     BREVO_API_KEY=xkeysib-... `
     SENDER_EMAIL=herna@tvojedomena.cz `
     SENDER_NAME="Dětská herna" `
     HERNA_EMAIL=herna@tvojedomena.cz `
     SITE_URL=https://<uzivatel>.github.io/<repo>/ `
     WEBHOOK_SECRET=<nahodny_retezec>
   ```

4. Propoj trigger s funkcí - v **SQL Editor** spusť (stejný `WEBHOOK_SECRET`):

   ```sql
   insert into private.app_settings (key, value) values
     ('notify_url',    'https://<PROJECT_REF>.functions.supabase.co/notify'),
     ('notify_secret', '<nahodny_retezec>')
   on conflict (key) do update set value = excluded.value;
   ```

## 4. Deploy webu na GitHub Pages

1. Vytvoř GitHub repo a nahraj projekt (`git push`).
2. **Settings -> Pages -> Build and deployment -> Source: GitHub Actions**.
3. **Settings -> Secrets and variables -> Actions -> New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push do `main` -> workflow `Deploy na GitHub Pages` web sestaví a nasadí.
   Web poběží na `https://<uzivatel>.github.io/<repo>/`, administrace na `.../#/admin`.

## 5. Heartbeat (proti uspání Supabase)

Workflow `Supabase heartbeat` běží automaticky každé ~4 dny (lze i ručně přes *Run workflow*).
Používá stejné secrety `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY`.

## 6. Doplnit reálné údaje

V `src/lib/config.js`: telefon herny, e-mail, otevírací doba, délky bloků, ceny balíčků.
