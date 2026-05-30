<script>
  import { t, fmtDate, fmtTime, setLocale, i18n, LOCALES } from '../lib/i18n.svelte.js'
  import { SLOT_LENGTHS, PACKAGES } from '../lib/config.js'
  import { freeStarts, slotMinutes, isBookableDay, bookingDateRange, startOfDay } from '../lib/slots.js'
  import { getBusySlots, createBooking, isConfigured } from '../lib/bookings.js'
  import Calendar from '../components/Calendar.svelte'

  const MS_PER_MINUTE = 60_000

  let day = $state(null) // Date vybraného dne
  let lengthId = $state(null)
  let startsAt = $state(null) // Date začátku
  let pkg = $state(null)

  let busy = $state([])
  let loadingTimes = $state(false)

  let form = $state({ name: '', phone: '', email: '', children: '', note: '', consent: false })
  let submitting = $state(false)
  let submitted = $state(false)
  let errorKey = $state(null)

  const range = bookingDateRange()

  const times = $derived(day && lengthId ? freeStarts(day, lengthId, busy) : [])
  const minutes = $derived(slotMinutes(lengthId))

  const canSubmit = $derived(
    Boolean(
      startsAt &&
        pkg &&
        form.name.trim() &&
        form.phone.trim() &&
        form.email.trim() &&
        form.consent
    )
  )

  async function selectDay(d) {
    day = d
    startsAt = null
    await loadBusy(d)
  }

  function selectLength(id) {
    lengthId = id
    startsAt = null
  }

  async function loadBusy(d) {
    if (!isConfigured) {
      busy = []
      return
    }
    loadingTimes = true
    try {
      const from = startOfDay(d)
      const to = startOfDay(d)
      to.setHours(23, 59, 59, 999)
      busy = await getBusySlots(from, to)
    } catch {
      busy = []
    } finally {
      loadingTimes = false
    }
  }

  function lengthLabel(id) {
    return t(`len.${id}`)
  }

  async function submit() {
    if (!canSubmit) {
      errorKey = 'form.required'
      return
    }
    if (!isConfigured) {
      errorKey = 'error.notConfigured'
      return
    }
    submitting = true
    errorKey = null
    try {
      const ends = new Date(startsAt.getTime() + minutes * MS_PER_MINUTE)
      await createBooking({
        starts_at: startsAt.toISOString(),
        ends_at: ends.toISOString(),
        package: pkg,
        child_count: form.children ? Number(form.children) : null,
        customer_name: form.name.trim(),
        customer_phone: form.phone.trim(),
        customer_email: form.email.trim(),
        note: form.note.trim() || null
      })
      submitted = true
    } catch {
      errorKey = 'error.generic'
    } finally {
      submitting = false
    }
  }

  function reset() {
    day = null
    lengthId = null
    startsAt = null
    pkg = null
    busy = []
    form = { name: '', phone: '', email: '', children: '', note: '', consent: false }
    submitted = false
    errorKey = null
  }
</script>

<div class="row" style="justify-content: flex-end;">
  {#each LOCALES as loc (loc.id)}
    <button
      class="ghost lang"
      class:active={i18n.locale === loc.id}
      onclick={() => setLocale(loc.id)}
    >
      {loc.label}
    </button>
  {/each}
</div>

{#if submitted}
  <div class="card center">
    <h1>{t('success.title')}</h1>
    <p>{t('success.body')}</p>
    <button onclick={reset}>{t('success.again')}</button>
  </div>
{:else}
  <h1>{t('public.title')}</h1>
  <p class="muted">{t('public.intro')}</p>

  {#if !isConfigured}
    <div class="notice info">{t('error.notConfigured')}</div>
  {/if}

  <!-- 1. Datum z kalendáře -->
  <section class="card">
    <h3>{t('step.date')}</h3>
    <Calendar
      min={range.min}
      max={range.max}
      enabled={isBookableDay}
      selected={day}
      onselect={selectDay}
    />
  </section>

  <!-- 2. Detail dne: délka + volné časy -->
  {#if day}
    <section class="card">
      <h3>{t('date.dayDetail', { date: fmtDate(day) })}</h3>

      <label>{t('step.length')}</label>
      <div class="row">
        {#each SLOT_LENGTHS as len (len.id)}
          <button
            class="secondary"
            class:active={lengthId === len.id}
            onclick={() => selectLength(len.id)}
          >
            {lengthLabel(len.id)}
          </button>
        {/each}
      </div>

      {#if lengthId}
        <label>{t('step.time')}</label>
        {#if loadingTimes}
          <p class="muted">{t('time.loading')}</p>
        {:else if times.length === 0}
          <p class="muted">{t('time.none')}</p>
        {:else}
          <div class="time-grid">
            {#each times as time (time.getTime())}
              <button
                class="secondary"
                class:active={startsAt && startsAt.getTime() === time.getTime()}
                onclick={() => (startsAt = time)}
              >
                {fmtTime(time)}
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </section>
  {/if}

  <!-- 3. Balíček -->
  {#if startsAt}
    <section class="card">
      <h3>{t('step.package')}</h3>
      <div class="pkg-list">
        {#each PACKAGES as p (p.id)}
          <button
            class="secondary pkg"
            class:active={pkg === p.id}
            onclick={() => (pkg = p.id)}
          >
            <strong>{t(`pkg.${p.id}.name`)}</strong>
            <span class="muted">{t(`pkg.${p.id}.desc`)}</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <!-- 4. Kontakt -->
  {#if startsAt && pkg}
    <section class="card">
      <h3>{t('step.contact')}</h3>

      <div class="summary muted">
        <div><strong>{t('summary.when')}:</strong> {fmtDate(startsAt)} {fmtTime(startsAt)} ({lengthLabel(lengthId)})</div>
        <div><strong>{t('summary.package')}:</strong> {t(`pkg.${pkg}.name`)}</div>
      </div>

      <label for="name">{t('form.name')}</label>
      <input id="name" type="text" bind:value={form.name} autocomplete="name" />

      <label for="phone">{t('form.phone')}</label>
      <input id="phone" type="tel" bind:value={form.phone} autocomplete="tel" />

      <label for="email">{t('form.email')}</label>
      <input id="email" type="email" bind:value={form.email} autocomplete="email" />

      <label for="children">{t('form.children')}</label>
      <input id="children" type="number" min="0" bind:value={form.children} />

      <label for="note">{t('form.note')}</label>
      <textarea id="note" rows="2" bind:value={form.note}></textarea>

      <label class="consent">
        <input type="checkbox" bind:checked={form.consent} />
        <span>{t('form.consent')}</span>
      </label>

      <div class="notice info">{t('notice.notBinding')}</div>

      {#if errorKey}
        <div class="notice error">{t(errorKey)}</div>
      {/if}

      <button onclick={submit} disabled={!canSubmit || submitting}>
        {submitting ? t('form.sending') : t('form.submit')}
      </button>
    </section>
  {/if}
{/if}

<style>
  button.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  button.lang {
    padding: 4px 10px;
    font-size: 0.9em;
  }
  .time-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
    gap: 8px;
  }
  .pkg-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  button.pkg {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
  }
  button.pkg.active span {
    color: #ede9fe;
  }
  .consent {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-weight: 400;
  }
  .consent input {
    width: auto;
    margin-top: 3px;
  }
  .summary {
    margin-bottom: 8px;
    line-height: 1.5;
  }
</style>
