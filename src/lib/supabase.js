import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

if (!isConfigured) {
  console.warn(
    'Supabase není nakonfigurované. Zkopíruj .env.example do .env a doplň VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY.'
  )
}

// Když chybí konfigurace, vytvoříme klienta s placeholder hodnotami, aby se appka
// nerozbila při vývoji UI bez backendu (volání pak jen selžou a zobrazí hlášku).
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key'
)
