// ----------------------------------------------------------------------------
// Lehká i18n vrstva. Přidání jazyka = nový klíč do LOCALES + do DICT.
// Veřejná (rodičovská) část je překládaná; administrace zůstává česky.
// ----------------------------------------------------------------------------

export const LOCALES = [
  { id: 'cs', label: 'Čeština', bcp47: 'cs-CZ' },
  { id: 'sr', label: 'Srpski', bcp47: 'sr-Latn-RS' }
]

const DEFAULT_LOCALE = 'cs'
const STORAGE_KEY = 'herna.locale'

function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LOCALES.some((l) => l.id === saved)) return saved
  } catch {
    // localStorage nemusí být dostupné
  }
  return DEFAULT_LOCALE
}

export const i18n = $state({ locale: initialLocale() })

export function setLocale(id) {
  if (!LOCALES.some((l) => l.id === id)) return
  i18n.locale = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignorujeme
  }
}

export function localeBcp47() {
  return LOCALES.find((l) => l.id === i18n.locale)?.bcp47 ?? 'cs-CZ'
}

function bcp47() {
  return localeBcp47()
}

// Překlad podle tečkového klíče. Druhý argument = náhrady {jmeno}.
export function t(key, params) {
  const dict = DICT[i18n.locale] ?? DICT[DEFAULT_LOCALE]
  let str = dict[key] ?? DICT[DEFAULT_LOCALE][key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v))
    }
  }
  return str
}

// Formátování data/času podle aktuálního jazyka (Intl řeší názvy dnů/měsíců sám).
export function fmtDate(date, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat(bcp47(), opts).format(date)
}

export function fmtTime(date) {
  return new Intl.DateTimeFormat(bcp47(), { hour: '2-digit', minute: '2-digit' }).format(date)
}

// ----------------------------------------------------------------------------
// Slovníky
// ----------------------------------------------------------------------------
const DICT = {
  cs: {
    'nav.book': 'Rezervace',
    'nav.admin': 'Správa',

    'public.title': 'Rezervace termínu',
    'public.intro': 'Vyberte si délku, termín a balíček. Žádost potvrdíme co nejdříve.',

    'step.length': 'Délka pobytu',
    'step.date': 'Datum',
    'step.time': 'Čas začátku',
    'step.package': 'Balíček',
    'step.contact': 'Kontakt',

    'time.none': 'V tento den už nejsou volné začátky.',
    'time.loading': 'Hledám volné časy…',
    'date.pickFirst': 'Nejprve vyberte délku pobytu.',
    'date.closed': 'V tento den máme zavřeno nebo je mimo rozsah rezervací.',
    'date.label': 'Vyberte datum',
    'date.change': 'Změnit datum',
    'date.dayDetail': 'Termín {date}',

    'len.2h': '2 hodiny',
    'len.4h': '4 hodiny',

    'price.onRequest': 'Cena na dotaz',
    'cal.full': 'Obsazeno',
    'form.privacy': 'Zásady zpracování osobních údajů',

    'pkg.none.name': 'Bez jídla a pití',
    'pkg.none.desc': 'Pronájem herny.',
    'pkg.food.name': 'S jídlem a pitím',
    'pkg.food.desc': 'Pronájem + občerstvení.',
    'pkg.food_animator.name': 'S jídlem a animátorem',
    'pkg.food_animator.desc': 'Pronájem + občerstvení + animátor.',

    'form.name': 'Jméno a příjmení',
    'form.phone': 'Telefon',
    'form.email': 'E-mail',
    'form.children': 'Počet dětí (nepovinné)',
    'form.note': 'Poznámka (nepovinné)',
    'form.consent': 'Souhlasím se zpracováním kontaktních údajů pro vyřízení této rezervace.',
    'form.submit': 'Odeslat žádost',
    'form.sending': 'Odesílám…',
    'form.required': 'Vyplňte prosím povinná pole a souhlas.',

    'notice.notBinding':
      'Odeslání žádosti zatím není závazná rezervace. Termín potvrdíme, pokud bude volný.',

    'summary.title': 'Souhrn žádosti',
    'summary.when': 'Termín',
    'summary.package': 'Balíček',

    'success.title': 'Žádost odeslána ✅',
    'success.body':
      'Děkujeme! Ozveme se vám s potvrzením. Pokud by byl termín mezitím obsazen, nabídneme jiný.',
    'success.again': 'Vytvořit další rezervaci',

    'error.generic': 'Něco se nepovedlo. Zkuste to prosím znovu, nebo nám zavolejte.',
    'error.notConfigured': 'Rezervační systém zatím není připojený k databázi.',

    'cancel.title': 'Zrušení rezervace',
    'cancel.intro': 'Opravdu chcete zrušit tuto rezervaci? Termín se tím uvolní.',
    'cancel.button': 'Zrušit rezervaci',
    'cancel.working': 'Ruším…',
    'cancel.done': 'Rezervace byla zrušena. Děkujeme za zprávu.',
    'cancel.fail': 'Rezervaci se nepodařilo zrušit. Možná už byla zrušena. Zkuste nás kontaktovat.',
    'cancel.invalid': 'Odkaz na zrušení je neplatný nebo neúplný.'
  },

  sr: {
    'nav.book': 'Rezervacija',
    'nav.admin': 'Administracija',

    'public.title': 'Rezervacija termina',
    'public.intro': 'Izaberite dužinu, termin i paket. Zahtev ćemo potvrditi što pre.',

    'step.length': 'Dužina boravka',
    'step.date': 'Datum',
    'step.time': 'Vreme početka',
    'step.package': 'Paket',
    'step.contact': 'Kontakt',

    'time.none': 'Za ovaj dan nema slobodnih termina.',
    'time.loading': 'Tražim slobodne termine…',
    'date.pickFirst': 'Prvo izaberite dužinu boravka.',
    'date.closed': 'Tog dana ne radimo ili je van perioda rezervacija.',
    'date.label': 'Izaberite datum',
    'date.change': 'Promeni datum',
    'date.dayDetail': 'Termin {date}',

    'len.2h': '2 sata',
    'len.4h': '4 sata',

    'price.onRequest': 'Cena na upit',
    'cal.full': 'Zauzeto',
    'form.privacy': 'Pravila obrade ličnih podataka',

    'pkg.none.name': 'Bez hrane i pića',
    'pkg.none.desc': 'Iznajmljivanje igraonice.',
    'pkg.food.name': 'Sa hranom i pićem',
    'pkg.food.desc': 'Iznajmljivanje + posluženje.',
    'pkg.food_animator.name': 'Sa hranom i animatorom',
    'pkg.food_animator.desc': 'Iznajmljivanje + posluženje + animator.',

    'form.name': 'Ime i prezime',
    'form.phone': 'Telefon',
    'form.email': 'E-mail',
    'form.children': 'Broj dece (opciono)',
    'form.note': 'Napomena (opciono)',
    'form.consent': 'Slažem se sa obradom kontakt podataka radi obrade ove rezervacije.',
    'form.submit': 'Pošalji zahtev',
    'form.sending': 'Šaljem…',
    'form.required': 'Popunite obavezna polja i saglasnost.',

    'notice.notBinding':
      'Slanje zahteva još nije obavezujuća rezervacija. Termin ćemo potvrditi ako bude slobodan.',

    'summary.title': 'Pregled zahteva',
    'summary.when': 'Termin',
    'summary.package': 'Paket',

    'success.title': 'Zahtev poslat ✅',
    'success.body':
      'Hvala! Javićemo vam se sa potvrdom. Ako termin u međuvremenu bude zauzet, ponudićemo drugi.',
    'success.again': 'Napravi novu rezervaciju',

    'error.generic': 'Nešto nije uspelo. Pokušajte ponovo ili nas pozovite.',
    'error.notConfigured': 'Sistem za rezervacije još nije povezan sa bazom.',

    'cancel.title': 'Otkazivanje rezervacije',
    'cancel.intro': 'Da li zaista želite da otkažete ovu rezervaciju? Termin će se osloboditi.',
    'cancel.button': 'Otkaži rezervaciju',
    'cancel.working': 'Otkazujem…',
    'cancel.done': 'Rezervacija je otkazana. Hvala na obaveštenju.',
    'cancel.fail': 'Otkazivanje nije uspelo. Možda je već otkazana. Kontaktirajte nas.',
    'cancel.invalid': 'Link za otkazivanje je nevažeći ili nepotpun.'
  }
}
