// ----------------------------------------------------------------------------
// Konfigurace herny. Tohle je jediné místo, kde se mění provozní nastavení.
// (V další fázi může část přejít do tabulky `settings` a editovat se v adminu.)
// ----------------------------------------------------------------------------

export const HERNA = {
  // Vlastní jméno podniku (srbsky; herna = Igraonica). Stejné v obou jazycích.
  name: 'Igraonica Srećko',
  // Telefon ve formátu pro odkazy tel:/sms:/wa.me (mezinárodní, bez mezer).
  // Např. '+420777123456'. wa.me chce číslo bez '+' a bez mezer.
  phone: '+420000000000',
  // Facebook stránka pro odkaz m.me/<handle> (volitelné).
  facebookHandle: '',
  // E-mail herny (kam chodí notifikace o nových žádostech) - nastav i v Edge Function.
  email: 'herna@example.com'
}

// Otevírací doba a délky bloků. Časy jsou lokální (Europe/Prague).
export const OPENING = {
  // Dny v týdnu, kdy lze rezervovat (0 = neděle ... 6 = sobota).
  openDays: [1, 2, 3, 4, 5, 6, 0],
  // Od kdy do kdy se nabízejí začátky bloků.
  dayStart: '09:00',
  dayEnd: '19:00',
  // Kolik dní dopředu lze rezervovat.
  horizonDays: 60
}

// Pevné délky bloků (v minutách). Herna upřesní - prozatím 2 h a 4 h.
export const SLOT_LENGTHS = [
  { id: '2h', label: '2 hodiny', minutes: 120 },
  { id: '4h', label: '4 hodiny', minutes: 240 }
]

// Balíčky. Cena je informativní (číslo v Kč, 0 = bez ceny / na dotaz).
export const PACKAGES = [
  { id: 'none', name: 'Bez jídla a pití', description: 'Pronájem herny.', price: 0 },
  { id: 'food', name: 'S jídlem a pitím', description: 'Pronájem + občerstvení.', price: 0 },
  { id: 'food_animator', name: 'S jídlem a animátorem', description: 'Pronájem + občerstvení + animátor.', price: 0 }
]

export function packageName(id) {
  return PACKAGES.find((p) => p.id === id)?.name ?? id
}

export function slotLengthLabel(id) {
  return SLOT_LENGTHS.find((s) => s.id === id)?.label ?? id
}
