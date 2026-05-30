// ----------------------------------------------------------------------------
// Edge Function "notify" - rozesílá e-maily přes Brevo.
// Spouští ji DB webhook (trigger private.notify_booking, viz migrace 0002).
//
// Události:
//   INSERT (pending)            -> herně notifikace o nové žádosti + rodiči potvrzení přijetí
//   UPDATE pending -> confirmed -> rodiči potvrzení termínu + odkaz na zrušení
//   UPDATE -> rejected          -> rodiči omluva, že termín nelze potvrdit
//
// Tajemství (Supabase -> Edge Functions -> Secrets, NE do gitu):
//   BREVO_API_KEY    - API klíč z Brevo (SMTP & API -> API Keys)
//   SENDER_EMAIL     - ověřený odesílatel v Brevo (Senders)
//   SENDER_NAME      - jméno odesílatele (např. "Dětská herna")
//   HERNA_EMAIL      - kam chodí notifikace o nových žádostech
//   SITE_URL         - veřejná URL appky (pro odkaz na zrušení), např.
//                      https://uzivatel.github.io/herna-rezervace/
//   WEBHOOK_SECRET   - musí se shodovat s private.app_settings.notify_secret
// ----------------------------------------------------------------------------

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'
const TZ = 'Europe/Prague'

interface Booking {
  id: string
  starts_at: string
  ends_at: string
  package: string
  child_count: number | null
  customer_name: string
  customer_phone: string
  customer_email: string
  note: string | null
  status: string
  cancel_token: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  record: Booking | null
  old_record: Booking | null
}

const PACKAGE_NAME: Record<string, string> = {
  none: 'Bez jídla a pití',
  food: 'S jídlem a pitím',
  food_animator: 'S jídlem a animátorem',
}

function env(name: string): string {
  return Deno.env.get(name) ?? ''
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso))
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso))
}

function packageName(id: string): string {
  return PACKAGE_NAME[id] ?? id
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function cancelUrl(b: Booking): string {
  const base = env('SITE_URL').replace(/\/+$/, '')
  return `${base}/#/zrusit?id=${encodeURIComponent(b.id)}&token=${encodeURIComponent(b.cancel_token)}`
}

function whenLine(b: Booking): string {
  return `${fmtDate(b.starts_at)}, ${fmtTime(b.starts_at)} - ${fmtTime(b.ends_at)}`
}

async function sendEmail(
  to: { email: string; name?: string },
  subject: string,
  html: string,
): Promise<void> {
  const apiKey = env('BREVO_API_KEY')
  if (!apiKey) {
    console.error('BREVO_API_KEY není nastaven, e-mail se neodeslal.')
    return
  }
  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: env('SENDER_EMAIL'), name: env('SENDER_NAME') },
      to: [to],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    console.error('Brevo chyba:', res.status, await res.text())
  }
}

function detailsHtml(b: Booking): string {
  const rows = [
    ['Termín', whenLine(b)],
    ['Balíček', packageName(b.package)],
    ['Jméno', b.customer_name],
    ['Telefon', b.customer_phone],
    ['E-mail', b.customer_email],
  ]
  if (b.child_count) rows.push(['Počet dětí', String(b.child_count)])
  if (b.note) rows.push(['Poznámka', b.note])
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">${escapeHtml(k)}</td><td style="padding:4px 0;"><strong>${escapeHtml(v)}</strong></td></tr>`,
    )
    .join('')
  return `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;">${trs}</table>`
}

async function onInsert(b: Booking): Promise<void> {
  const hernaEmail = env('HERNA_EMAIL')
  if (hernaEmail) {
    await sendEmail(
      { email: hernaEmail },
      `Nová žádost o rezervaci: ${whenLine(b)}`,
      `<p>Přišla nová žádost o rezervaci.</p>${detailsHtml(b)}
       <p style="color:#6b7280;font-size:0.9em;">Pozn.: termín je závazný až po potvrzení ve správě.</p>`,
    )
  }
  await sendEmail(
    { email: b.customer_email, name: b.customer_name },
    'Přijali jsme vaši žádost o rezervaci',
    `<p>Dobrý den,</p>
     <p>děkujeme za vaši žádost. Brzy se vám ozveme s potvrzením.</p>
     ${detailsHtml(b)}
     <p style="color:#d97706;"><strong>Pozor:</strong> odeslání žádosti zatím není závazná
     rezervace. Termín potvrdíme, pokud bude volný.</p>`,
  )
}

async function onConfirmed(b: Booking): Promise<void> {
  await sendEmail(
    { email: b.customer_email, name: b.customer_name },
    'Vaše rezervace je potvrzena',
    `<p>Dobrý den,</p>
     <p>vaše rezervace je <strong>potvrzená</strong>. Těšíme se na vás!</p>
     ${detailsHtml(b)}
     <p>Pokud termín nestihnete, dejte nám prosím vědět nebo rezervaci zrušte zde:<br>
     <a href="${cancelUrl(b)}">${cancelUrl(b)}</a></p>`,
  )
}

async function onRejected(b: Booking): Promise<void> {
  await sendEmail(
    { email: b.customer_email, name: b.customer_name },
    'K vaší žádosti o rezervaci',
    `<p>Dobrý den,</p>
     <p>je nám líto, ale požadovaný termín (${whenLine(b)}) bohužel nemůžeme potvrdit.
     Rádi vám nabídneme jiný - ozvěte se nám prosím.</p>`,
  )
}

Deno.serve(async (req) => {
  const expected = env('WEBHOOK_SECRET')
  if (expected && req.headers.get('x-webhook-secret') !== expected) {
    return new Response('forbidden', { status: 403 })
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const b = payload.record
  if (!b) return new Response('ok')

  try {
    if (payload.type === 'INSERT' && b.status === 'pending') {
      await onInsert(b)
    } else if (payload.type === 'UPDATE') {
      const wasConfirmed = payload.old_record?.status === 'confirmed'
      if (b.status === 'confirmed' && !wasConfirmed) {
        await onConfirmed(b)
      } else if (b.status === 'rejected' && payload.old_record?.status !== 'rejected') {
        await onRejected(b)
      }
    }
  } catch (e) {
    console.error('notify selhalo:', e)
  }

  return new Response('ok')
})
