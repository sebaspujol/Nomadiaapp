'use client'
import { useState, useEffect, useCallback } from 'react'
import Map from '../src/components/Map'
import Sidebar from '../src/components/Sidebar'
import Header from '../src/components/Header'
import Filters from '../src/components/Filters'
import AddPlaceModal from '../src/components/AddPlaceModal'
import styles from './page.module.css'

export default function Home() {
  const [places, setPlaces] = useState([])
  const [filtered, setFiltered] = useState([])
  const [selected, setSelected] = useState(null)
  const [userLocation, setUserLocation] = useState({ lat: 40.4168, lng: -3.7038 }) // Madrid centro default
  const [loading, setLoading] = useState(false)
  const [showAddPlace, setShowAddPlace] = useState(false)
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

  // Geolocalización del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {} // fallback silencioso a Madrid centro
      )
    }
  }, [])

  // Cargar lugares reales (Store propio + import bajo demanda de Google Places)
  useEffect(() => {
    fetchPlaces(userLocation)
  }, [userLocation])

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
          loading={loading}
        />
      </div>
    </div>
  )
}
