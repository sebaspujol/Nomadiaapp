'use client'
// Mapa real con Leaflet + tiles de OpenStreetMap — gratis para siempre, sin
// API key ni tarjeta de crédito (a diferencia de Google Maps JS API). La
// atribución "© OpenStreetMap contributors" que se ve abajo a la derecha es
// obligatoria por la licencia de los datos, no se puede ocultar.
import { useEffect, useRef, useState } from 'react'
import styles from './Map.module.css'

const TYPE_COLORS = {
  cafe: '#F0A93E',
  cowork: '#0F9D6E',
  hotel: '#3B82F6',
  biblioteca: '#C0574F',
}

const LEGEND = [
  { tipo: 'cafe', label: 'Cafés' },
  { tipo: 'cowork', label: 'Coworks' },
  { tipo: 'hotel', label: 'Hoteles' },
  { tipo: 'biblioteca', label: 'Bibliotecas' },
]

function pinLabel(place) {
  if (!place.verified) return place.precio || 'Sin verificar'
  if (place.rating) return `★${place.rating}`
  if (place.gratis) return 'Gratis'
  return place.precio || ''
}

function pinHtml(place) {
  const color = place.verified === false ? '#fff' : (TYPE_COLORS[place.tipo] || '#888')
  const bg = place.verified === false ? '#fff' : '#111827'
  const textColor = place.verified === false ? '#6B7280' : '#fff'
  const border = place.verified === false ? '1.5px solid #EAE8E3' : 'none'
  return `
    <div style="position:relative;display:flex;align-items:center;gap:7px;background:${bg};color:${textColor};border:${border};border-radius:999px;padding:8px 13px 8px 10px;font-size:12.5px;font-weight:700;font-family:'JetBrains Mono',monospace;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.2);">
      <span style="width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0;${place.verified === false ? 'border:1px solid #ccc;' : ''}"></span>
      ${pinLabel(place)}
    </div>
  `
}

export default function Map({ places, selected, onSelect, userLocation, loading }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const leafletRef = useRef(null)
  const markers = useRef([])
  const userMarker = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  // Cargar Leaflet dinámicamente (no funciona en SSR, necesita `window`).
  useEffect(() => {
    let cancelled = false
    import('leaflet')
      .then((L) => {
        if (cancelled) return
        leafletRef.current = L
        setReady(true)
      })
      .catch((err) => {
        console.error('Error cargando Leaflet:', err)
        setFailed(true)
      })
    return () => { cancelled = true }
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return
    const L = leafletRef.current

    const map = L.map(mapRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstance.current = map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Marcador de usuario
  useEffect(() => {
    if (!mapInstance.current || !ready) return
    const L = leafletRef.current
    if (userMarker.current) userMarker.current.remove()

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,.2);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    userMarker.current = L.marker([userLocation.lat, userLocation.lng], { icon, zIndexOffset: 999 }).addTo(mapInstance.current)
    mapInstance.current.setView([userLocation.lat, userLocation.lng])
  }, [userLocation, ready])

  // Markers de lugares
  useEffect(() => {
    if (!mapInstance.current || !ready) return
    const L = leafletRef.current
    markers.current.forEach((m) => m.remove())
    markers.current = []

    places.forEach((place) => {
      const icon = L.divIcon({
        className: '',
        html: pinHtml(place),
        iconSize: null,
        iconAnchor: [20, 34],
      })
      const marker = L.marker([place.lat, place.lng], { icon, title: place.nombre })
      marker.on('click', () => onSelect(place))
      marker.addTo(mapInstance.current)
      markers.current.push(marker)
    })
  }, [places, ready])

  // Centrar en seleccionado
  useEffect(() => {
    if (selected && mapInstance.current) {
      mapInstance.current.panTo([selected.lat, selected.lng])
    }
  }, [selected])

  const zoomBy = (delta) => {
    if (!mapInstance.current) return
    mapInstance.current.setZoom((mapInstance.current.getZoom() || 14) + delta)
  }

  // Si por lo que sea Leaflet no pudo cargar (ej. sin conexión), mostramos un
  // mapa estático de respaldo en vez de romper la página.
  if (failed) {
    return <StaticMap places={places} selected={selected} onSelect={onSelect} loading={loading} />
  }

  return (
    <div className={styles.mapPane}>
      {loading && <div className={styles.loading}>Cargando lugares...</div>}
      <div ref={mapRef} className={styles.map} />
      <div className={styles.legend}>
        {LEGEND.map((l) => (
          <div key={l.tipo}><span className={styles.catDot} style={{ background: TYPE_COLORS[l.tipo] }} />{l.label}</div>
        ))}
      </div>
      <div className={styles.zoomCtl}>
        <button onClick={() => zoomBy(1)}>+</button>
        <button onClick={() => zoomBy(-1)}>−</button>
      </div>
    </div>
  )
}

// Mapa estático SVG de respaldo, solo por si Leaflet no pudo cargar.
function StaticMap({ places, selected, onSelect, loading }) {
  const fallbackPositions = [
    { left: 30, top: 28 }, { left: 46, top: 44 }, { left: 62, top: 32 },
    { left: 38, top: 60 }, { left: 70, top: 55 }, { left: 22, top: 48 },
  ]

  return (
    <div className={styles.mapPane}>
      {loading && <div className={styles.loading}>Cargando lugares...</div>}
      <svg className={styles.bg} viewBox="0 0 900 700" preserveAspectRatio="xMidYMid slice">
        <rect width="900" height="700" fill="#EEF0EA" />
        <g opacity=".55" fill="#DEE1D6">
          <rect x="80" y="60" width="140" height="90" rx="10" /><rect x="260" y="40" width="100" height="70" rx="10" />
          <rect x="400" y="70" width="160" height="100" rx="10" /><rect x="600" y="50" width="120" height="80" rx="10" />
          <rect x="100" y="220" width="150" height="100" rx="10" /><rect x="300" y="240" width="110" height="80" rx="10" />
          <rect x="480" y="220" width="170" height="110" rx="10" /><rect x="700" y="240" width="130" height="90" rx="10" />
          <rect x="80" y="400" width="140" height="100" rx="10" /><rect x="280" y="410" width="160" height="90" rx="10" />
          <rect x="500" y="390" width="130" height="110" rx="10" /><rect x="680" y="410" width="150" height="90" rx="10" />
        </g>
        <path d="M0,350 Q450,300 900,380" stroke="#F8F8F4" strokeWidth="20" fill="none" />
        <path d="M300,0 Q380,350 320,700" stroke="#F8F8F4" strokeWidth="16" fill="none" />
        <ellipse cx="720" cy="560" rx="80" ry="46" fill="#CFE0C0" />
      </svg>
      <div className={styles.userDot} />
      {places.map((p, i) => {
        const pos = fallbackPositions[i % fallbackPositions.length]
        const isSelected = selected?.id === p.id
        const color = p.verified === false ? '#3B82F6' : (TYPE_COLORS[p.tipo] || '#888')
        return (
          <div
            key={p.id}
            className={`${styles.pin} ${isSelected ? styles.active : ''} ${p.verified === false ? styles.unverified : ''}`}
            style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            onClick={() => onSelect(p)}
          >
            <div className={styles.bubble}>
              <span className={styles.catDot} style={{ background: color }} />
              {pinLabel(p)}
            </div>
          </div>
        )
      })}
      <div className={styles.legend}>
        {LEGEND.map((l) => (
          <div key={l.tipo}><span className={styles.catDot} style={{ background: TYPE_COLORS[l.tipo] }} />{l.label}</div>
        ))}
      </div>
      <div className={styles.zoomCtl}>
        <button>+</button>
        <button>−</button>
      </div>
    </div>
  )
}
