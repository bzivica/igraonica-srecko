<script>
  import { HERNA } from '../lib/config.js'
  import { packageName } from '../lib/config.js'
  import {
    isConfigured,
    signIn,
    signOut,
    getSession,
    onAuthChange,
    listBookings,
    listPendingWithCompetition,
    confirmBooking,
    rejectBooking,
    cancelBookingAdmin
  } from '../lib/bookings.js'

  const FILTERS = [
    { id: 'pending', label: 'Čekající' },
    { id: 'confirmed', label: 'Potvrzené' },
    { id: 'all', label: 'Vše' }
  ]

  const STATUS_LABEL = {
    pending: 'Čeká',
    confirmed: 'Potvrzeno',
    rejected: 'Zamítnuto',
    cancelled: 'Zrušeno'
  }

  let session = $state(null)
  let authReady = $state(false)

  let email = $state('')
  let password = $state('')
  let loginError = $state('')
  let loggingIn = $state(false)

  let filter = $state('pending')
  let items = $state([])
  let loading = $state(false)
  let actionError = $state('')
  let busyId = $state(null)

  $effect(() => {
    let unsub = () => {}
    ;(async () => {
      session = await getSession()
      authReady = true
      unsub = onAuthChange((s) => {
        session = s
      })
    })()
    return () => unsub()
  })

  // Při změně přihlášení / filtru znovu načti seznam.
  $effect(() => {
    if (session) {
      void load(filter)
    } else {
      items = []
    }
  })

  async function load(which) {
    loading = true
    actionError = ''
    try {
      items = which === 'pending' ? await listPendingWithCompetition() : await listBookings(which)
    } catch (e) {
      actionError = e?.message ?? 'Načtení selhalo.'
      items = []
    } finally {
      loading = false
    }
  }

  function setFilter(id) {
    filter = id
  }

  async function doLogin(event) {
    event.preventDefault()
    loginError = ''
    loggingIn = true
    try {
      await signIn(email.trim(), password)
      password = ''
    } catch (e) {
      loginError = e?.message ?? 'Přihlášení selhalo.'
    } finally {
      loggingIn = false
    }
  }

  async function doLogout() {
    await signOut()
    session = null
  }

  async function runAction(action, id) {
    busyId = id
    actionError = ''
    try {
      await action(id)
      await load(filter)
    } catch (e) {
      actionError = e?.message ?? 'Akce selhala.'
    } finally {
      busyId = null
    }
  }

  // --- formátování ---
  function fmtDate(iso) {
    return new Intl.DateTimeFormat('cs-CZ', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).format(new Date(iso))
  }

  function fmtTime(iso) {
    return new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso)
    )
  }

  // --- kontaktní odkazy ---
  function waDigits(phone) {
    return (phone ?? '').replace(/\D/g, '')
  }

  function confirmMsg(b) {
    return `Dobrý den, potvrzuji Vaši rezervaci v ${HERNA.name} dne ${fmtDate(b.starts_at)} od ${fmtTime(b.starts_at)} do ${fmtTime(b.ends_at)}. Těšíme se na Vás!`
  }

  function telHref(b) {
    return `tel:${b.customer_phone}`
  }
  function waHref(b) {
    return `https://wa.me/${waDigits(b.customer_phone)}?text=${encodeURIComponent(confirmMsg(b))}`
  }
  function smsHref(b) {
    return `sms:${b.customer_phone}?body=${encodeURIComponent(confirmMsg(b))}`
  }
  function mailHref(b) {
    const subject = `Rezervace ${HERNA.name}`
    return `mailto:${b.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(confirmMsg(b))}`
  }
</script>

<h1>Správa rezervací</h1>

{#if !isConfigured}
  <div class="notice info">
    Rezervační systém zatím není připojený k databázi (chybí <code>.env</code>).
  </div>
{/if}

{#if !authReady}
  <p class="muted">Načítám…</p>
{:else if !session}
  <form class="card" onsubmit={doLogin}>
    <h3>Přihlášení herny</h3>
    <label for="adm-email">E-mail</label>
    <input id="adm-email" type="email" bind:value={email} autocomplete="username" />
    <label for="adm-pass">Heslo</label>
    <input id="adm-pass" type="password" bind:value={password} autocomplete="current-password" />
    {#if loginError}
      <div class="notice error">{loginError}</div>
    {/if}
    <button type="submit" disabled={loggingIn || !email || !password} style="margin-top: 12px;">
      {loggingIn ? 'Přihlašuji…' : 'Přihlásit'}
    </button>
  </form>
{:else}
  <div class="row" style="justify-content: space-between; align-items: center;">
    <div class="row">
      {#each FILTERS as f (f.id)}
        <button class="secondary" class:active={filter === f.id} onclick={() => setFilter(f.id)}>
          {f.label}
        </button>
      {/each}
    </div>
    <button class="ghost" onclick={doLogout}>Odhlásit</button>
  </div>

  {#if actionError}
    <div class="notice error">{actionError}</div>
  {/if}

  {#if loading}
    <p class="muted">Načítám…</p>
  {:else if items.length === 0}
    <p class="muted">Žádné žádosti v této kategorii.</p>
  {:else}
    {#each items as b (b.id)}
      <div class="card">
        <div class="row" style="justify-content: space-between; align-items: baseline;">
          <strong>{fmtDate(b.starts_at)}</strong>
          <span class="badge {b.status}">{STATUS_LABEL[b.status] ?? b.status}</span>
        </div>
        <div class="muted">{fmtTime(b.starts_at)} - {fmtTime(b.ends_at)} · {packageName(b.package)}</div>

        <div class="who">
          <div><strong>{b.customer_name}</strong></div>
          <div class="muted">
            {b.customer_phone} · {b.customer_email}
            {#if b.child_count}· dětí: {b.child_count}{/if}
          </div>
          {#if b.note}<div class="note">„{b.note}"</div>{/if}
          {#if b.status === 'pending' && b.competing_count > 0}
            <div class="notice info" style="margin: 8px 0;">
              Na překrývající se termín čeká dalších {b.competing_count} žádostí.
            </div>
          {/if}
        </div>

        <div class="row contact">
          <a class="chip" href={telHref(b)}>Zavolat</a>
          <a class="chip" href={waHref(b)} target="_blank" rel="noopener">WhatsApp</a>
          <a class="chip" href={smsHref(b)}>SMS</a>
          <a class="chip" href={mailHref(b)}>E-mail</a>
        </div>

        <div class="row" style="margin-top: 8px;">
          {#if b.status === 'pending'}
            <button class="ok" disabled={busyId === b.id} onclick={() => runAction(confirmBooking, b.id)}>
              Potvrdit
            </button>
            <button class="secondary" disabled={busyId === b.id} onclick={() => runAction(rejectBooking, b.id)}>
              Zamítnout
            </button>
          {:else if b.status === 'confirmed'}
            <button class="danger" disabled={busyId === b.id} onclick={() => runAction(cancelBookingAdmin, b.id)}>
              Zrušit
            </button>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
{/if}

<style>
  button.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .who {
    margin: 10px 0;
    line-height: 1.5;
  }
  .note {
    margin-top: 4px;
    font-style: italic;
  }
  .contact {
    margin-top: 8px;
  }
  .chip {
    text-decoration: none;
    padding: 8px 12px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--accent-dark);
    font-weight: 600;
    font-size: 0.9em;
  }
</style>
