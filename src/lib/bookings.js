// ----------------------------------------------------------------------------
// API vrstva nad Supabase. Veřejné funkce (anon) + administrace (authenticated).
// ----------------------------------------------------------------------------

import { supabase, isConfigured } from './supabase.js'

export { isConfigured }

// Postgres kód porušení EXCLUDE constraintu (překryv potvrzených rezervací).
const PG_EXCLUSION_VIOLATION = '23P01'

// ----------------------------------------------------------------------------
// Veřejné (rodič / anon)
// ----------------------------------------------------------------------------

// Potvrzené (obsazené) sloty v rozsahu - jen časy, žádné osobní údaje.
export async function getBusySlots(from, to) {
  const { data, error } = await supabase.rpc('get_busy_slots', {
    p_from: from.toISOString(),
    p_to: to.toISOString()
  })
  if (error) throw error
  return data ?? []
}

// Vloží žádost ve stavu pending. Záměrně bez .select() - anon nemá SELECT
// politiku, takže by čtení vloženého řádku selhalo. cancel_token rozešle
// rodiči až e-mailová Edge Function (service role).
export async function createBooking(input) {
  const { error } = await supabase.from('bookings').insert({
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    package: input.package,
    child_count: input.child_count ?? null,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email,
    note: input.note ?? null
  })
  if (error) throw error
}

// Zrušení rezervace rodičem přes odkaz s tokenem (RPC cancel_booking).
// Vrací true, pokud se něco zrušilo.
export async function cancelByToken(id, token) {
  const { data, error } = await supabase.rpc('cancel_booking', { p_id: id, p_token: token })
  if (error) throw error
  return data === true
}

// ----------------------------------------------------------------------------
// Autentizace herny
// ----------------------------------------------------------------------------

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Zaregistruje callback na změnu přihlášení. Vrací funkci pro odhlášení listeneru.
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

// ----------------------------------------------------------------------------
// Administrace (authenticated)
// ----------------------------------------------------------------------------

// Žádosti dle stavu. status = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'all'
export async function listBookings(status = 'pending') {
  let query = supabase.from('bookings').select('*').order('starts_at', { ascending: true })
  if (status !== 'all') query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// Čekající žádosti seřazené "kdo dřív" + počet konkurenčních žádostí na překrývající se termín.
export async function listPendingWithCompetition() {
  const { data, error } = await supabase
    .from('pending_with_competition')
    .select('*')
  if (error) throw error
  return data ?? []
}

export async function confirmBooking(id) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    if (error.code === PG_EXCLUSION_VIOLATION) {
      throw new Error('Termín se překrývá s jinou už potvrzenou rezervací.')
    }
    throw error
  }
}

export async function rejectBooking(id) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'rejected' })
    .eq('id', id)
  if (error) throw error
}

export async function cancelBookingAdmin(id) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
