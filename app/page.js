'use client'
import { useState, useEffect, useCallback } from 'react'
import Map from '../src/components/Map'
import Sidebar from '../src/components/Sidebar'
import Header from '../src/components/Header'
import Filters from '../src/components/Filters'
import AddPlaceModal from '../src/components/AddPlaceModal'
import WelcomeModal from '../src/components/WelcomeModal'
import { WELCOME_VERSION } from '../src/lib/i18n'
import styles from './page.module.css'

export default function Home() {
  const [places, setPlaces] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selected, setSelected] = useState(null)
  const [userLocation, setUserLocation] = useState({ lat: 40.4168, lng: -3.7038 }) // Madrid centro default
  const [accuracy, setAccuracy] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [filters, setFilters] = useState({
    tipo: 'all',
    maxPrice: 30,
    onlyOpen: false,
    gratis: false,
    silencio: false,
    enchufes: false,
    wifi: false,
    mesa: false,
  })

  // Geolocalización del usuario. enableHighAccuracy le pide al dispositivo
  // que use GPS en vez de solo wifi/torres de celular cuando esté disponible
  // — tarda un poco más en responder, pero ubica a la persona en su cuadra
  // real y no "en algún lugar del barrio". accuracy (metros) queda guardada
  // para dibujar el círculo de margen de error real en el mapa.
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setAccuracy(pos.coords.accuracy || null)
        },
        () => {}, // fallback silencioso a Madrid centro
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    }
  }, [])

  // Cargar lugares reales (Store propio + import bajo demanda de Google Places)
  useEffect(() => {
    fetchPlaces(userLocation)
  }, [userLocation])

  // Popup de bienvenida: se muestra una vez por navegador. Si en el futuro
  // subimos WELCOME_VERSION (lib/i18n.js) para avisar de novedades, vuelve
  // a aparecer una vez más aunque ya lo hayan cerrado antes.
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem('nomadia_welcome_version')
      if (seen !== WELCOME_VERSION) setShowWelcome(true)
    } catch {
      setShowWelcome(true)
    }
  }, [])

  const dismissWelcome = () => {
    setShowWelcome(false)
    try {
      window.localStorage.setItem('nomadia_welcome_version', WELCOME_VERSION)
    } catch {}
  }

  const fetchPlaces = async (location) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/spots?lat=${location.lat}&lng=${location.lng}`
      )
      const data = await res.json()
      setPlaces(data.places || [])
    } catch (e) {
      console.error('Error cargando lugares:', e)
    } finally {
      setLoading(false)
    }
  }

  // Buscador de ciudad del Header — recentra el mapa en cualquier parte del mundo
  const handleSearchCity = useCallback(({ lat, lng }) => {
    setSelected(null)
    setUserLocation({ lat, lng })
  }, [])

  // Botón "ubicarme" del mapa: vuelve a pedirle al navegador la posición
  // exacta (por si la primera vez el usuario todavía no había aceptado el
  // permiso, o se movió de lugar) y centra el mapa ahí. Si el navegador
  // niega el permiso o falla, se avisa en vez de quedar en silencio.
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError('Tu navegador no admite geolocalización')
      return
    }
    setLocating(true)
    setLocateError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelected(null)
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setAccuracy(pos.coords.accuracy || null)
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setLocateError(
          err.code === 1
            ? 'Le negaste el permiso de ubicación al navegador — habilitalo desde la configuración del sitio para usar esto'
            : 'No pudimos obtener tu ubicación, probá de nuevo'
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  // Aplicar filtros
  useEffect(() => {
    const now = new Date()
    const curH = now.getHours()

    const result = places.filter((p) => {
      if (filters.tipo !== 'all' && p.tipo !== filters.tipo) return false
      if (filters.maxPrice < 30 && p.precioNum > filters.maxPrice) return false
      if (filters.onlyOpen && !(curH >= p.abre && curH < p.cierra)) return false
      if (filters.gratis && !p.gratis) return false
      if (filters.silencio && !p.silencio) return false
      if (filters.enchufes && p.enchufes < 8) return false
      if (filters.wifi && parseInt(p.wifi) < 80) return false
      if (filters.mesa && !p.mesas?.includes('larga')) return false
      return true
    })
    setFiltered(result)
  }, [places, filters])

  return (
    <div className={styles.app}>
      <Header onSearchCity={handleSearchCity} onAddPlace={() => setShowAddPlace(true)} />
      <Filters filters={filters} setFilters={setFilters} />
      {showAddPlace && (
        <AddPlaceModal
          onClose={() => setShowAddPlace(false)}
          onCreated={() => fetchPlaces(userLocation)}
        />
      )}
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
      <div className={styles.main}>
        <Sidebar
          places={filtered}
          selected={selected}
          onSelect={setSelected}
          loading={loading}
          onPlaceUpdated={(updated) => {
            setPlaces((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
            setSelected((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
          }}
        />
        <Map
          places={filtered}
          selected={selected}
          onSelect={setSelected}
          userLocation={userLocation}
          accuracy={accuracy}
          loading={loading}
          onLocateMe={handleLocateMe}
          locating={locating}
        />
        {locateError && (
          <div className={styles.locateError} role="alert">{locateError}</div>
        )}
      </div>
    </div>
  )
}
