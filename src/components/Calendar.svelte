<script>
  import { localeBcp47 } from '../lib/i18n.svelte.js'

  // min/max = Date (lokální půlnoc), enabled = predikát (Date) -> bool, selected = Date | null
  let { min, max, enabled = () => true, selected = null, onselect } = $props()

  const DAYS_IN_WEEK = 7
  // 1. 1. 2024 byl pondělí - referenční týden pro názvy dnů (pondělím počínaje).
  const REF_MONDAY = new Date(2024, 0, 1)

  let view = $state(startOfMonth(selected ?? min ?? new Date()))

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }
  function startOfDay(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }
  // Pondělí = 0 ... neděle = 6
  function mondayIndex(d) {
    return (d.getDay() + 6) % 7
  }

  const weekdays = $derived(buildWeekdays(localeBcp47()))
  const title = $derived(
    new Intl.DateTimeFormat(localeBcp47(), { month: 'long', year: 'numeric' }).format(view)
  )
  const cells = $derived(buildCells(view))
  const canPrev = $derived(startOfMonth(view) > startOfMonth(min))
  const canNext = $derived(startOfMonth(view) < startOfMonth(max))

  function buildWeekdays(tag) {
    const fmt = new Intl.DateTimeFormat(tag, { weekday: 'short' })
    const out = []
    for (let i = 0; i < DAYS_IN_WEEK; i++) {
      const d = new Date(REF_MONDAY)
      d.setDate(REF_MONDAY.getDate() + i)
      out.push(fmt.format(d))
    }
    return out
  }

  // Pole buněk: null pro úvodní prázdná místa + dny v měsíci.
  function buildCells(v) {
    const first = startOfMonth(v)
    const lead = mondayIndex(first)
    const daysInMonth = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate()
    const out = []
    for (let i = 0; i < lead; i++) out.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(new Date(v.getFullYear(), v.getMonth(), day))
    }
    return out
  }

  function isEnabled(d) {
    const day = startOfDay(d)
    return day >= startOfDay(min) && day <= startOfDay(max) && enabled(day)
  }

  function prev() {
    if (canPrev) view = new Date(view.getFullYear(), view.getMonth() - 1, 1)
  }
  function next() {
    if (canNext) view = new Date(view.getFullYear(), view.getMonth() + 1, 1)
  }
  function pick(d) {
    if (isEnabled(d)) onselect?.(d)
  }
</script>

<div class="cal">
  <div class="cal-head">
    <button class="nav" type="button" onclick={prev} disabled={!canPrev} aria-label="Předchozí měsíc">‹</button>
    <strong class="cal-title">{title}</strong>
    <button class="nav" type="button" onclick={next} disabled={!canNext} aria-label="Další měsíc">›</button>
  </div>

  <div class="cal-grid cal-weekdays">
    {#each weekdays as wd (wd)}
      <div class="wd">{wd}</div>
    {/each}
  </div>

  <div class="cal-grid">
    {#each cells as cell, i (i)}
      {#if cell === null}
        <div></div>
      {:else}
        <button
          type="button"
          class="day"
          class:selected={selected && sameDay(cell, selected)}
          disabled={!isEnabled(cell)}
          onclick={() => pick(cell)}
        >
          {cell.getDate()}
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .cal-title {
    text-transform: capitalize;
    color: var(--accent-dark);
  }
  button.nav {
    background: var(--surface);
    color: var(--accent-dark);
    border: 1px solid var(--border);
    padding: 6px 14px;
    font-size: 1.2em;
    line-height: 1;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .cal-weekdays {
    margin-bottom: 4px;
  }
  .wd {
    text-align: center;
    font-size: 0.75em;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    padding: 4px 0;
  }
  button.day {
    aspect-ratio: 1 / 1;
    padding: 0;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    font-weight: 600;
  }
  button.day:disabled {
    background: transparent;
    color: #d1d5db;
    border-color: transparent;
    opacity: 1;
  }
  button.day.selected {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
</style>
