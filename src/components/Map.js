'use client'
// Mapa real con Leaflet + tiles de OpenStreetMap — gratis para siempre, sin
// API key ni tarjeta de crédito (a diferencia de Google Maps JS API). La
// atribución "© OpenStreetMap contributors" que se ve abajo a la derecha es
// obligatoria por la licencia de los datos, no se puede ocultar.
//
// Con muchos lugares cerca (ciudades grandes, zonas densas), mostrar un pin
// por lugar generaba una alfombra ilegible de chips superpuestos. Ahora los
// pines cercanos se agrupan en "clusters" (círculo con un número) que se
// separan solos a medida que hacés zoom o los tocás — el mismo patrón que
// Google Maps o Airbnb usan para esto (vía leaflet.markercluster, también
// gratis y open-source). Cada pin individual quedó reducido a un círculo
// con el emoji de la categoría, sin precio ni texto — el detalle completo
// se ve en el panel lateral al hacer click.
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n'
import styles from './Map.module.css'

// Sacamos "hotel" de las categorías: casi nunca tienen un lobby pensado para
// trabajar, así que ensuciaban más de lo que ayudaban. Quedan Cafés, Coworks
// y Bibliotecas por ahora.
const TYPE_COLORS = {
  cafe: '#F0A93E',
  cowork: '#0F9D6E',
  biblioteca: '#C0574F',
}

const TYPE_EMOJI = {
  cafe: '☕',
  cowork: '🧑‍💻',
  biblioteca: '📚',
}

const LEGEND_KEYS = [
  { tipo: 'cafe', key: 'cafes' },
  { tipo: 'cowork', key: 'coworks' },
  { tipo: 'biblioteca', key: 'bibliotecas' },
]

// A partir de qué nivel de zoom de Leaflet mostramos el puntaje encima de
// los pines. Con menos zoom los pines quedan muy juntos y el numerito se
// superpone con el de al lado — a partir de este nivel (más o menos calle/
// cuadra) ya hay lugar de sobra para que se lea bien.
const RATING_ZOOM_THRESHOLD = 16

function pinEmoji(place) {
  return place.emoji || TYPE_EMOJI[place.tipo] || '📍'
}

// Pin individual: círculo chico con el emoji de la categoría. Los verificados
// (con reviews reales de la comunidad) llevan el borde del color de su
// categoría; los importados de OpenStreetMap sin verificar todavía, un
// borde gris neutro. Si el lugar ya tiene reviews propias de la app, se le
// suma una etiqueta con el puntaje arriba del pin — pero queda oculta por
// CSS (".ratingPinBadge") hasta que el mapa está suficientemente zoomeado
// (ver RATING_ZOOM_THRESHOLD y la clase "ratings-visible" en el mapa).
function pinHtml(place) {
  const bg = place.verified === false ? '#fff' : '#111827'
  const border = place.verified === false ? '2px solid #D8D5CC' : `2px solid ${TYPE_COLORS[place.tipo] || '#888'}`
  const hasRating = place.verified !== false && place.reviews > 0
  const badge = hasRating
    ? `<div class="ratingPinBadge" style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#fff;color:#111827;border-radius:999px;padding:1px 6px;font-size:10.5px;font-weight:700;font-family:'JetBrains Mono',monospace;box-shadow:0 2px 6px rgba(0,0,0,.28);white-space:nowrap;align-items:center;gap:2px;">★${place.rating}</div>`
    : ''
  return `
    <div style="position:relative;width:32px;height:32px;border-radius:50%;background:${bg};border:${border};display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 3px 10px rgba(0,0,0,.22);">
      ${pinEmoji(place)}
      ${badge}
    </div>
  `
}

// Ícono de un cluster (grupo de pines cercanos): círculo oscuro con la
// cantidad de lugares que agrupa. Crece un poco con la cantidad para que se
// note la diferencia entre una zona con 5 lugares y una con 80.
function clusterIconHtml(count) {
  const size = count < 10 ? 34 : count < 50 ? 42 : 50
  return {
    size,
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#111827;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.3);border:2px solid #fff;">${count}</div>`,
  }
}

export default function Map({ places, selected, onSelect, userLocation, accuracy, loading, onLocateMe, locating }) {
  const { t } = useLang()
  const LEGEND = LEGEND_KEYS.map((l) => ({ tipo: l.tipo, label: t(l.key) }))
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const leafletRef = useRef(null)
  const clusterGroup = useRef(null)
  const userMarker = useRef(null)
  const userAccuracyCircle = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  // Controla si se muestra el puntaje encima de los pines — solo con zoom
  // suficiente (ver RATING_ZOOM_THRESHOLD). Arranca en false porque el mapa
  // abre con zoom 14, por debajo del umbral.
  const [ratingsVisible, setRatingsVisible] = useState(false)

  // Cargar Leaflet + el plugin de clustering dinámicamente (no funcionan en
  // SSR, necesitan `window`). El plugin se engancha al mismo objeto L de
  // leaflet, por eso hay que cargar los dos juntos antes de usar cualquiera.
  useEffect(() => {
    let cancelled = false
    // Importante: leaflet.markercluster busca el objeto de Leaflet como
    // variable global `window.L` (no como algo que se le pase por import) —
    // por eso hay que cargar 'leaflet' primero, colgarlo de window.L, y
    // SOLO DESPUÉS importar el plugin. Si no, tira "L is not defined".
    import('leaflet')
      .then((leafletModule) => {
        if (cancelled) return
        const L = leafletModule.default || leafletModule
        window.L = L
        return import('leaflet.markercluster').then(() => L)
      })
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

    // El puntaje sobre los pines aparece/desaparece según el zoom actual —
    // "zoomend" dispara tanto con el gesto de pellizco/scroll como con los
    // botones +/- (zoomBy usa setZoom, que también emite este evento).
    const updateRatingsVisible = () => setRatingsVisible(map.getZoom() >= RATING_ZOOM_THRESHOLD)
    updateRatingsVisible()
    map.on('zoomend', updateRatingsVisible)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Marcador de usuario (+ círculo de precisión, si el navegador la reportó)
  useEffect(() => {
    if (!mapInstance.current || !ready) return
    const L = leafletRef.current
    if (userMarker.current) userMarker.current.remove()
    if (userAccuracyCircle.current) userAccuracyCircle.current.remove()

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,.2);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    userMarker.current = L.marker([userLocation.lat, userLocation.lng], { icon, zIndexOffset: 999 }).addTo(mapInstance.current)

    // El círculo muestra el margen de error real del GPS/wifi del dispositivo
    // (accuracy viene en metros) — así se ve honestamente qué tan preciso es,
    // en vez de fingir una precisión exacta que a veces no es real.
    if (accuracy && accuracy > 0) {
      userAccuracyCircle.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: accuracy,
        color: '#3B82F6',
        weight: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.08,
      }).addTo(mapInstance.current)
    }

    mapInstance.current.setView([userLocation.lat, userLocation.lng])
  }, [userLocation, accuracy, ready])

  // Markers de lugares, agrupados en clusters
  useEffect(() => {
    if (!mapInstance.current || !ready) return
    const L = leafletRef.current

    if (clusterGroup.current) {
      clusterGroup.current.clearLayers()
      mapInstance.current.removeLayer(clusterGroup.current)
    }

    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 55,
      iconCreateFunction: (cluster) => {
        const { size, html } = clusterIconHtml(cluster.getChildCount())
        return L.divIcon({ html, className: '', iconSize: [size, size] })
      },
    })

    places.forEach((place) => {
      const icon = L.divIcon({
        className: '',
        html: pinHtml(place),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([place.lat, place.lng], { icon, title: place.nombre })
      marker.on('click', () => onSelect(place))
      group.addLayer(marker)
    })

    group.addTo(mapInstance.current)
    clusterGroup.current = group
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
      <div ref={mapRef} className={`${styles.map} ${ratingsVisible ? 'ratings-visible' : ''}`} />
      <div className={styles.legend}>
        {LEGEND.map((l) => (
          <div key={l.tipo}><span className={styles.catDot} style={{ background: TYPE_COLORS[l.tipo] }} />{l.label}</div>
        ))}
      </div>
      <button
        className={`${styles.locateCtl} ${locating ? styles.active : ''}`}
        onClick={onLocateMe}
        disabled={locating}
        title={t('locateMe')}
        aria-label={t('locateMe')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>
      <div className={styles.zoomCtl}>
        <button onClick={() => zoomBy(1)}>+</button>
        <button onClick={() => zoomBy(-1)}>−</button>
      </div>
    </div>
  )
}

// Mapa estático SVG de respaldo, solo por si Leaflet no pudo cargar.
function StaticMap({ places, selected, onSelect, loading }) {
  const { t } = useLang()
  const LEGEND = LEGEND_KEYS.map((l) => ({ tipo: l.tipo, label: t(l.key) }))
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
              {pinEmoji(p)}
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
