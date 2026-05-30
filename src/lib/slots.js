// ----------------------------------------------------------------------------
// Generování volných začátků rezervace.
// Časy se počítají v lokálním čase prohlížeče (Europe/Prague pro hernu i rodiče).
// "Obsazenost" = jen potvrzené rezervace; pending se schválně nepočítá ("kdo dřív").
// ----------------------------------------------------------------------------

import { OPENING, SLOT_LENGTHS } from './config.js'

// Po jakém kroku nabízíme začátky (minuty).
const STEP_MINUTES = 30
const MINUTES_PER_HOUR = 60
const MS_PER_MINUTE = 60_000

function parseHm(hm) {
  const [h, m] = hm.split(':').map(Number)
  return h * MINUTES_PER_HOUR + m
}

export function slotMinutes(lengthId) {
  return SLOT_LENGTHS.find((s) => s.id === lengthId)?.minutes ?? 0
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Je daný den (Date) otevírací podle konfigurace?
export function isOpenDay(date) {
  return OPENING.openDays.includes(date.getDay())
}

// Spadá den do povoleného rozsahu (dnes .. dnes + horizont) a je otevírací?
export function isBookableDay(date, today = startOfDay(new Date())) {
  const d = startOfDay(date)
  const last = addDays(today, OPENING.horizonDays)
  return d >= today && d <= last && isOpenDay(d)
}

// První a poslední den, který lze nabídnout (pro min/max u date inputu).
export function bookingDateRange(today = startOfDay(new Date())) {
  return { min: today, max: addDays(today, OPENING.horizonDays) }
}

// Volné začátky pro daný den a délku.
// day  = Date (stačí lokální půlnoc onoho dne)
// busy = pole { starts_at, ends_at } (ISO stringy) potvrzených rezervací
// now  = aktuální čas (skryje začátky, které už proběhly, je-li to dnešek)
// Vrací pole Date (lokální časy začátků).
export function freeStarts(day, lengthId, busy, now = new Date()) {
  const minutes = slotMinutes(lengthId)
  if (!minutes || !day) return []

  const open = parseHm(OPENING.dayStart)
  const close = parseHm(OPENING.dayEnd)
  const nowMs = now.getTime()

  const busyRanges = (busy ?? []).map((b) => [
    new Date(b.starts_at).getTime(),
    new Date(b.ends_at).getTime()
  ])

  const result = []
  // setHours(0, m, ...) s minutami > 59 se v JS samo přepočítá do hodin.
  for (let m = open; m + minutes <= close; m += STEP_MINUTES) {
    const start = startOfDay(day)
    start.setHours(0, m, 0, 0)
    const startMs = start.getTime()
    const endMs = startMs + minutes * MS_PER_MINUTE

    if (startMs <= nowMs) continue

    const overlaps = busyRanges.some(([bs, be]) => startMs < be && endMs > bs)
    if (overlaps) continue

    result.push(start)
  }
  return result
}
