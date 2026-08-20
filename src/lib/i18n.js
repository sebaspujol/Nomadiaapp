'use client'
// Sistema de idioma simple: ES/EN por ahora (como pidió Sebastian — "por el
// momento ES/EN"). Guarda la preferencia en localStorage para que quede
// elegida entre visitas. No cubre TODAVÍA cada texto de la app (reviews,
// detalle de un lugar) — esos siguen en español por ahora; esto traduce el
// "chrome" principal: header, filtros, mapa, y el modal de sumar lugar.
import { createContext, useContext, useEffect, useState } from 'react'

const STRINGS = {
  es: {
    searchPlaceholder: 'Buscá una ciudad...',
    searching: 'Buscando...',
    anyZone: 'Cualquier zona',
    allTypes: 'Todos',
    typeSub: 'Café, cowork, hotel...',
    filtersWord: 'Filtros',
    filtersSub: 'Enchufes, wifi, silencio...',
    addPlace: '+ Añadir lugar',
    pts: 'pts',
    locateMe: 'Usar mi ubicación actual',
    cafes: 'Cafés',
    coworks: 'Coworks',
    hoteles: 'Hoteles',
    bibliotecas: 'Bibliotecas',
    filterCafe: 'Café',
    filterCowork: 'Cowork',
    filterHotel: 'Hotel',
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
    addPlaceHint: '¿Falta un café, cowork, biblioteca u hotel con buen lugar para trabajar? Cargalo y quedará visible para toda la comunidad. Vas a poder dejar la primera review en cuanto hagas check-in ahí.',
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
  },
  en: {
    searchPlaceholder: 'Search a city...',
    searching: 'Searching...',
    anyZone: 'Any area',
    allTypes: 'All',
    typeSub: 'Cafe, cowork, hotel...',
    filtersWord: 'Filters',
    filtersSub: 'Outlets, wifi, quiet...',
    addPlace: '+ Add place',
    pts: 'pts',
    locateMe: 'Use my current location',
    cafes: 'Cafes',
    coworks: 'Coworks',
    hoteles: 'Hotels',
    bibliotecas: 'Libraries',
    filterCafe: 'Cafe',
    filterCowork: 'Cowork',
    filterHotel: 'Hotel',
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
    addPlaceHint: "Missing a cafe, cowork, library or hotel with a good spot to work? Add it and it'll be visible to the whole community. You'll be able to leave the first review once you check in there.",
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
