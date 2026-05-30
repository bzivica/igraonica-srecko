<script>
  import { router } from './lib/router.svelte.js'
  import { HERNA } from './lib/config.js'
  import { t } from './lib/i18n.svelte.js'
  import Public from './routes/Public.svelte'
  import Admin from './routes/Admin.svelte'
  import Cancel from './routes/Cancel.svelte'

  // Cesta bez query stringu (kvůli #/zrusit?id=...&token=...).
  const route = $derived(router.path.split('?')[0])
  const isAdmin = $derived(route.startsWith('/admin'))
  const isCancel = $derived(route.startsWith('/zrusit'))
</script>

<header class="row" style="justify-content: space-between; align-items: center;">
  <h2 style="margin: 8px 0;">{HERNA.name}</h2>
  <nav class="row">
    <a href="#/" class="ghost-link" class:active={!isAdmin}>{t('nav.book')}</a>
    <a href="#/admin" class="ghost-link" class:active={isAdmin}>{t('nav.admin')}</a>
  </nav>
</header>

<main>
  {#if isCancel}
    <Cancel />
  {:else if isAdmin}
    <Admin />
  {:else}
    <Public />
  {/if}
</main>

<style>
  .ghost-link {
    text-decoration: none;
    color: var(--muted);
    font-weight: 600;
    padding: 6px 10px;
    border-radius: 8px;
  }
  .ghost-link.active { color: var(--accent-dark); background: #ede9fe; }
</style>
