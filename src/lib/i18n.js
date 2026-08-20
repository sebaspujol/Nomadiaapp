'use client'
// Sistema de idioma simple: ES/EN por ahora (como pidió Sebastian — "por el
// momento ES/EN"). Guarda la preferencia en localStorage para que quede
// elegida entre visitas. No cubre TODAVÍA cada texto de la app (reviews,
// detalle de un lugar) — esos siguen en español por ahora; esto traduce el
// "chrome" principal: header, filtros, mapa, y el modal de sumar lugar.
import { createContext, useContext, useEffect, useState } from 'react'

// Versión del popup de bienvenida. Subí este número (v2, v3...) cada vez que
// agregues algo a `changelogItems` más abajo y quieras que el popup vuelva a
// aparecer una vez más para quienes ya lo habían cerrado — así se enteran de
// lo nuevo sin que les moleste cada visita. Si no lo tocás, cada persona lo
// ve una sola vez por navegador.
export const WELCOME_VERSION = 'v2'

const STRINGS = {
  es: {
    searchPlaceholder: 'Buscá una ciudad...',
    searching: 'Buscando...',
    anyZone: 'Cualquier zona',
    allTypes: 'Todos',
    typeSub: 'Café, cowork, biblioteca...',
    filtersWord: 'Filtros',
    filtersSub: 'Enchufes, wifi, silencio...',
    addPlace: '+ Añadir lugar',
    pts: 'pts',
    locateMe: 'Usar mi ubicación actual',
    cafes: 'Cafés',
    coworks: 'Coworks',
    bibliotecas: 'Bibliotecas',
    filterCafe: 'Café',
    filterCowork: 'Cowork',
    filterBiblioteca: 'Biblioteca',
    filterEnchufes: 'Enchufes',
    filterWifi: 'Wifi rápido',
    filterSilencio: 'Silencio y concentración',
    filterMesa: 'Mesa larga',
    filterGratis: 'Gratis sentarse',
    priceMax: 'Precio máx:',
    priceAny: 'Cualquiera',
    priceUpTo: (n) => `hasta €${n}`,
    onlyOpenNow: 'Solo abiertos ahora',
    addPlaceTitle: 'Sumar un lugar',
    addPlaceHint: '¿Falta un café, cowork o biblioteca con buen lugar para trabajar? Cargalo y quedará visible para toda la comunidad. Vas a poder dejar la primera review en cuanto hagas check-in ahí.',
    nameLabel: 'Nombre del lugar',
    namePlaceholder: 'Ej: Federal Café',
    typeLabel: 'Tipo',
    addressLabel: 'Dirección',
    addressPlaceholder: 'Calle y número',
    neighborhoodLabel: 'Barrio',
    cityLabel: 'Ciudad',
    optional: '(opcional)',
    save: 'Sumar lugar',
    saving: 'Guardando...',
    requiredError: 'Nombre y dirección son obligatorios',

    // Popup de bienvenida
    welcomeTitle: 'Bienvenido a nomadia 👋',
    welcomeIntro: 'Encontrá cafés, coworks y bibliotecas con buen lugar para trabajar cerca de donde estés, o en cualquier ciudad que busques.',
    welcomeHowTitle: '¿Cómo funciona?',
    welcomeHowText: 'Movete por el mapa o buscá una ciudad arriba. Filtrá por tipo de lugar, wifi, enchufes o silencio. Hacé click en un pin para ver el detalle, y si vas, dejá tu review para sumar puntos.',
    changelogTitle: 'Novedades',
    // Cada elemento es una línea del changelog. Para agregar una novedad
    // nueva, sumá un string acá (y su traducción abajo en "en") y subí
    // WELCOME_VERSION arriba de este archivo.
    changelogItems: [
      'Sacamos los hoteles de la lista: casi nunca tienen un buen lugar para trabajar. Quedan Cafés, Coworks y Bibliotecas',
      'Mapa más claro: los lugares se agrupan en burbujas con número, y cada pin muestra un emoji según el tipo de lugar',
      'Nuevo botón para ubicarte con precisión en el mapa (abajo a la derecha)',
      'Podés cambiar el idioma del sitio a inglés desde el botón ES/EN, arriba a la derecha',
    ],
    suggestionsTitle: '¿Se te ocurre algo para mejorar?',
    suggestionsPlaceholder: 'Contanos qué agregarías o qué no te cerró...',
    suggestionsSubmit: 'Enviar sugerencia',
    sending: 'Enviando...',
    suggestionsSuccess: '¡Gracias! La recibimos.',
    suggestionError: 'No pudimos guardar tu sugerencia, probá de nuevo',
    loginPrompt: '¿Ya tenés cuenta?',
    loginButton: 'Iniciar sesión',
    continueButton: 'Seguir explorando',
    close: 'Cerrar',
  },
  en: {
    searchPlaceholder: 'Search a city...',
    searching: 'Searching...',
    anyZone: 'Any area',
    allTypes: 'All',
    typeSub: 'Cafe, cowork, library...',
    filtersWord: 'Filters',
    filtersSub: 'Outlets, wifi, quiet...',
    addPlace: '+ Add place',
    pts: 'pts',
    locateMe: 'Use my current location',
    cafes: 'Cafes',
    coworks: 'Coworks',
    bibliotecas: 'Libraries',
    filterCafe: 'Cafe',
    filterCowork: 'Cowork',
    filterBiblioteca: 'Library',
    filterEnchufes: 'Outlets',
    filterWifi: 'Fast wifi',
    filterSilencio: 'Quiet & focus',
    filterMesa: 'Long table',
    filterGratis: 'Free to sit',
    priceMax: 'Max price:',
    priceAny: 'Any',
    priceUpTo: (n) => `up to €${n}`,
    onlyOpenNow: 'Open now only',
    addPlaceTitle: 'Add a place',
    addPlaceHint: "Missing a cafe, cowork or library with a good spot to work? Add it and it'll be visible to the whole community. You'll be able to leave the first review once you check in there.",
    nameLabel: 'Place name',
    namePlaceholder: 'E.g: Federal Cafe',
    typeLabel: 'Type',
    addressLabel: 'Address',
    addressPlaceholder: 'Street and number',
    neighborhoodLabel: 'Neighborhood',
    cityLabel: 'City',
    optional: '(optional)',
    save: 'Add place',
    saving: 'Saving...',
    requiredError: 'Name and address are required',

    // Welcome popup
    welcomeTitle: 'Welcome to nomadia 👋',
    welcomeIntro: 'Find cafes, coworks and libraries with a good spot to work near you, or in any city you search for.',
    welcomeHowTitle: 'How does it work?',
    welcomeHowText: 'Move around the map or search a city above. Filter by place type, wifi, outlets or quiet. Click a pin to see the details, and if you go, leave a review to earn points.',
    changelogTitle: "What's new",
    changelogItems: [
      "Removed hotels from the list: they almost never have a good spot to work. Cafes, Coworks and Libraries only for now",
      'Clearer map: places now group into numbered bubbles, and each pin shows an emoji for its category',
      'New button to precisely locate yourself on the map (bottom right)',
      'You can switch the site to English from the ES/EN button, top right',
    ],
    suggestionsTitle: 'Got an idea to improve this?',
    suggestionsPlaceholder: "Tell us what you'd add or what didn't work for you...",
    suggestionsSubmit: 'Send suggestion',
    sending: 'Sending...',
    suggestionsSuccess: 'Thanks! We got it.',
    suggestionError: "We couldn't save your suggestion, try again",
    loginPrompt: 'Already have an account?',
    loginButton: 'Log in',
    continueButton: 'Keep exploring',
    close: 'Close',
  },
}

const LangContext = createContext({ lang: 'es', setLang: () => {}, t: (k) => STRINGS.es[k] })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState('es')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('nomadia_lang')
      if (saved === 'en' || saved === 'es') setLangState(saved)
    } catch {}
  }, [])

  const setLang = (l) => {
    setLangState(l)
    try { window.localStorage.setItem('nomadia_lang', l) } catch {}
  }

  const t = (key) => STRINGS[lang]?.[key] ?? STRINGS.es[key] ?? key

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
