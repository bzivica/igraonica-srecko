<script>
  import { router } from '../lib/router.svelte.js'
  import { cancelByToken, isConfigured } from '../lib/bookings.js'
  import { t, setLocale, i18n, LOCALES } from '../lib/i18n.svelte.js'

  // router.path je '/zrusit?id=...&token=...' - dotaz odřízneme a rozparsujeme.
  const params = $derived(new URLSearchParams(router.path.split('?')[1] ?? ''))
  const id = $derived(params.get('id'))
  const token = $derived(params.get('token'))

  // idle | working | done | fail | invalid
  let phase = $state('idle')

  async function doCancel() {
    if (!id || !token) {
      phase = 'invalid'
      return
    }
    if (!isConfigured) {
      phase = 'fail'
      return
    }
    phase = 'working'
    try {
      const ok = await cancelByToken(id, token)
      phase = ok ? 'done' : 'fail'
    } catch {
      phase = 'fail'
    }
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

<div class="card center">
  <h1>{t('cancel.title')}</h1>

  {#if phase === 'done'}
    <div class="notice ok">{t('cancel.done')}</div>
  {:else if phase === 'fail'}
    <div class="notice error">{t('cancel.fail')}</div>
  {:else if phase === 'invalid' || !id || !token}
    <div class="notice error">{t('cancel.invalid')}</div>
  {:else}
    <p>{t('cancel.intro')}</p>
    <button class="danger" disabled={phase === 'working'} onclick={doCancel}>
      {phase === 'working' ? t('cancel.working') : t('cancel.button')}
    </button>
  {/if}
</div>

<style>
  button.lang {
    padding: 4px 10px;
    font-size: 0.9em;
  }
  button.lang.active {
    background: var(--accent);
    color: #fff;
  }
</style>
