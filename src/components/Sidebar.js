'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './Sidebar.module.css'

const TYPE_LABEL = { cafe: 'Café', cowork: 'Cowork', hotel: 'Hotel lobby', biblioteca: 'Biblioteca' }

const PASTELS = ['#FCEEDB', '#E1F2E8', '#F4E4DC', '#E3EBF3', '#F0E6F6', '#FDEAEA']

function pastelFor(id) {
  const s = String(id)
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return PASTELS[hash % PASTELS.length]
}

function TypeIcon({ tipo, className }) {
  switch (tipo) {
    case 'cowork':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
        </svg>
      )
    case 'hotel':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" /><path d="M3 18h18M5 11V7a2 2 0 0 1 2-2h3v6" />
        </svg>
      )
    case 'biblioteca':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 5v14M4 5c2 0 5-1 7 0v14c-2-1-5 0-7 0Z" /><path d="M18 5v14M18 5c-2 0-5-1-7 0v14c2-1 5 0 7 0Z" />
        </svg>
      )
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
        </svg>
      )
  }
}

const StarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7-6.2-3.4L5.8 21.2 7 14.2 2 9.3l7.1-.7L12 2Z" />
  </svg>
)

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l4 4L19 6" />
  </svg>
)

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="16" height="16">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

const PlugIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 2v4M15 2v4M7 8h10l-1 5a4 4 0 0 1-8 0L7 8Z" /><path d="M11 17v3M13 17v3" />
  </svg>
)

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2 8.5a16 16 0 0 1 20 0M5.5 12a11 11 0 0 1 13 0M9 15.5a6 6 0 0 1 6 0" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const FACTORES = [
  { key: 'comodidad', label: 'Comodidad' },
  { key: 'silencio', label: 'Silencio y concentración' },
  { key: 'enchufes', label: 'Enchufes' },
  { key: 'conectividad', label: 'Conectividad' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'comida', label: 'Comida' },
]

function isOpen(p) {
  const h = new Date().getHours()
  return h >= p.abre && h < p.cierra
}

export default function Sidebar({ places, selected, onSelect, loading, onPlaceUpdated }) {
  if (selected) {
    return (
      <div className={styles.leftPane}>
        <DetailView place={selected} onBack={() => onSelect(null)} onPlaceUpdated={onPlaceUpdated} />
      </div>
    )
  }

  return (
    <div className={styles.leftPane}>
      <div className={styles.leftPad}>
        <div className={styles.resultsHead}>
          <h2>{loading ? 'Cargando…' : `${places.length} lugares cerca`}</h2>
          <p>Ordenados por mejor puntuados</p>
        </div>
        <div className={styles.cardGrid}>
          {places.map(p => (
            <PlaceCard key={p.id} place={p} onSelect={onSelect} />
          ))}
        </div>
        {!loading && places.length === 0 && (
          <div className={styles.empty}>
            No hay lugares con estos filtros.<br />Probá ajustando los criterios.
          </div>
        )}
      </div>
    </div>
  )
}

function PlaceCard({ place: p, onSelect }) {
  const open = isOpen(p)

  let metaContent
  if (p.activeCheckins > 0) {
    metaContent = <>{p.activeCheckins} <em>trabajando ahora</em></>
  } else if (p.gratis) {
    metaContent = 'Gratis'
  } else {
    metaContent = p.precio
  }

  return (
    <div className={styles.card} onClick={() => onSelect(p)}>
      <div className={styles.photo} style={{ background: pastelFor(p.id) }}>
        {p.verified ? (
          <span className={styles.ratingBadge}><StarIcon />{p.rating}</span>
        ) : (
          <span className={`${styles.ratingBadge} ${styles.unverified}`}>Sin verificar</span>
        )}
        {p.photo
          ? <img src={p.photo} alt={p.nombre} className={styles.photoImg} />
          : <TypeIcon tipo={p.tipo} />
        }
      </div>
      <div className={styles.cName}>{p.nombre}</div>
      <div className={styles.cType}>{TYPE_LABEL[p.tipo] || p.tipo}</div>
      <div className={styles.cSub}>
        {p.barrio} · {p.gratis ? 'Gratis sentarse' : p.consumoMin}
      </div>
      <div className={styles.cMetaRow}>
        <span className={styles.cMeta}>{metaContent}</span>
        <span className={`${styles.statusDot} ${open ? styles.isOpen : styles.isClosed}`} title={open ? 'Abierto' : 'Cerrado'} />
      </div>
    </div>
  )
}

function DetailView({ place: p, onBack, onPlaceUpdated }) {
  const { data: session, status } = useSession()
  const open = isOpen(p)

  const [activeCheckin, setActiveCheckin] = useState(null)
  const [reviewableCheckin, setReviewableCheckin] = useState(null)
  const [reviews, setReviews] = useState([])
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinError, setCheckinError] = useState('')
  const [pointsMsg, setPointsMsg] = useState('')

  const loadReviews = useCallback(() => {
    fetch(`/api/reviews?storeId=${p.id}`)
      .then(res => res.json())
      .then(data => setReviews(data.reviews || []))
      .catch(() => {})
  }, [p.id])

  useEffect(() => {
    loadReviews()
    if (status !== 'authenticated') return

    fetch('/api/checkin/active').then(r => r.json()).then(d => setActiveCheckin(d.checkin || null)).catch(() => {})
    fetch(`/api/checkin/reviewable?storeId=${p.id}`).then(r => r.json()).then(d => setReviewableCheckin(d.checkin || null)).catch(() => {})
  }, [p.id, status, loadReviews])

  const iAmHere = activeCheckin?.storeId === p.id

  const handleCheckin = async () => {
    setCheckinError('')
    setCheckinLoading(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: p.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckinError(data.error || 'No pudimos hacer el check-in')
        if (data.activeCheckin) setActiveCheckin(data.activeCheckin)
        return
      }
      setActiveCheckin(data.checkin)
      setReviewableCheckin(data.checkin)
      onPlaceUpdated?.({ id: p.id, activeCheckins: (p.activeCheckins || 0) + 1 })
      if (data.points?.granted) {
        setPointsMsg(`+${data.points.amount / 100} punto por el check-in`)
      }
    } catch (err) {
      setCheckinError('Error de conexión')
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleCheckout = async () => {
    setCheckinLoading(true)
    try {
      const res = await fetch('/api/checkin', { method: 'DELETE' })
      if (res.ok) {
        setActiveCheckin(null)
        onPlaceUpdated?.({ id: p.id, activeCheckins: Math.max((p.activeCheckins || 1) - 1, 0) })
      }
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleReviewSubmitted = (result) => {
    setReviewableCheckin(null)
    loadReviews()
    const parts = []
    if (result.points?.granted) {
      parts.push(`+${result.points.amount / 100} punto por tu review`)
    } else if (result.points?.reason === 'cooldown') {
      parts.push('ya sumaste puntos acá hace poco, volvé a sumar en 14 días')
    } else if (result.points?.reason === 'daily_cap') {
      parts.push('llegaste al tope diario de puntos')
    }
    if (result.photoPoints?.granted) {
      parts.push(`+${result.photoPoints.amount / 100} punto extra por ser quien le puso la primera foto a este local`)
    }
    setPointsMsg(parts.length ? `¡Gracias! ${parts.join(' — ')}` : '¡Gracias por tu review!')
  }

  return (
    <div className={styles.detailPane}>
      <div className={styles.backRow} onClick={onBack}>
        <BackIcon />
        Volver a los resultados
      </div>
      <div className={styles.detailScroll}>
        {p.photo
          ? <img src={p.photo} alt={p.nombre} className={styles.hero} />
          : <div className={styles.hero} style={{ background: pastelFor(p.id) }}><TypeIcon tipo={p.tipo} className={styles.heroIcon} /></div>
        }

        <div className={styles.badgeRow}>
          <span className={`${styles.badge} ${styles.badgeType}`}>{TYPE_LABEL[p.tipo] || p.tipo}</span>
          {p.verified ? (
            <span className={`${styles.badge} ${styles.badgeVerified}`}><CheckIcon />Verificado</span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeUnverified}`}>Sin verificar</span>
          )}
          <span className={`${styles.badge} ${open ? styles.badgeOpen : styles.badgeClosed}`}>{open ? 'Abierto' : 'Cerrado'}</span>
        </div>
        <div className={styles.placeName}>{p.nombre}</div>
        <div className={styles.placeAddr}>{p.direccion} · {p.abre}:00–{p.cierra}:00</div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{p.verified ? `★${p.rating}` : '—'}</div>
            <div className={styles.statLabel}>{p.reviews} reseñas</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{p.enchufes}</div>
            <div className={styles.statLabel}>Enchufes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{p.precio}</div>
            <div className={styles.statLabel}>Precio</div>
          </div>
        </div>

        <div className={styles.sectionTitle}>Características</div>
        <div className={styles.tagsRow}>
          {p.enchufes > 0 && <span className={styles.tag}><PlugIcon />Enchufes</span>}
          {p.wifi && <span className={styles.tag}><WifiIcon />Wifi {p.wifi}</span>}
          {(p.tags || []).map(t => <span key={t} className={styles.tag}>{t}</span>)}
          {p.tiempo && <span className={styles.tag}>Tiempo máx {p.tiempo}</span>}
        </div>

        <MenuSection place={p} />

        <div className={styles.sectionTitle}>Check-in</div>
        <div className={styles.checkinBox}>
          <div className={styles.checkinTitle}>
            <span className={styles.dotLive} />
            {p.activeCheckins > 0 ? `${p.activeCheckins} personas trabajando ahora` : 'Nadie hizo check-in ahora'}
          </div>
          {status !== 'authenticated' ? (
            <Link href="/login" className={styles.btnMain}>Iniciá sesión para hacer check-in</Link>
          ) : iAmHere ? (
            <button className={styles.btnMain} onClick={handleCheckout} disabled={checkinLoading}>
              ✓ Hacer check-out
            </button>
          ) : (
            <button className={styles.btnMain} onClick={handleCheckin} disabled={checkinLoading}>
              {checkinLoading ? 'Procesando...' : 'Hacer check-in aquí'}
            </button>
          )}
          {checkinError && <p className={styles.errorMsg}>{checkinError}</p>}
          {pointsMsg && <p className={styles.pointsMsg}>{pointsMsg}</p>}
        </div>

        <div className={styles.sectionTitle}>Reseñas de la comunidad</div>
        {reviews.length === 0 && (
          <p className={styles.mutedNote}>Todavía no hay reviews. ¡Sé el primero!</p>
        )}
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}

        {status === 'authenticated' && reviewableCheckin && (
          <ReviewForm checkinId={reviewableCheckin.id} onSubmitted={handleReviewSubmitted} storeHasPhoto={!!p.photo} />
        )}
      </div>
    </div>
  )
}

function MenuSection({ place: p }) {
  if (!p.menuItems || p.menuItems.length === 0) {
    return (
      <>
        <div className={styles.sectionTitle}>Menú</div>
        <p className={styles.mutedNote}>Este local todavía no publicó su menú.</p>
      </>
    )
  }
  return (
    <>
      <div className={styles.sectionTitle}>Menú</div>
      <div className={styles.menuBox}>
        {p.lastMenuUpdate && (
          <div className={styles.menuMeta}>Actualizado {new Date(p.lastMenuUpdate).toLocaleDateString('es-ES')}</div>
        )}
        {p.menuItems.slice(0, 6).map((item) => (
          <div key={item.id} className={styles.menuItem}>
            <span>{item.nombre}</span>
            <span>{item.precio != null ? `€${item.precio.toFixed(2)}` : '—'}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function ReviewCard({ review: r }) {
  return (
    <div className={styles.review}>
      <div className={styles.revHead}>
        <div className={styles.revAv}>{(r.user?.name || '??').slice(0, 2).toUpperCase()}</div>
        <span className={styles.revName}>{r.user?.name || 'Nómada'}</span>
        <span className={styles.revStars}>★ {r.ratingAvg.toFixed(1)}</span>
      </div>
      <div className={styles.revFactors}>
        {FACTORES.map(f => (
          <span key={f.key}>{f.label} <b>{r[f.key]}</b></span>
        ))}
      </div>
      <div className={styles.revExtra}>
        <span>{r.tiempoMaximo ? `Tiempo máx: ${r.tiempoMaximoTxt || 'sí'}` : 'Sin tiempo máximo'}</span>
        <span>{r.consumoMinimo ? `Consumo mín: ${r.consumoMinimoTxt || 'sí'}` : 'Sin consumo mínimo'}</span>
      </div>
      {r.comentario && <p className={styles.revText}>{r.comentario}</p>}
    </div>
  )
}

const MAX_PHOTO_BYTES = 3 * 1024 * 1024 // ~3MB, alineado con el límite del servidor

function ReviewForm({ checkinId, onSubmitted, storeHasPhoto }) {
  const [scores, setScores] = useState({ comodidad: 3, silencio: 3, enchufes: 3, conectividad: 3, servicio: 3, comida: 3 })
  const [tiempoMaximo, setTiempoMaximo] = useState(false)
  const [tiempoMaximoTxt, setTiempoMaximoTxt] = useState('')
  const [consumoMinimo, setConsumoMinimo] = useState(false)
  const [consumoMinimoTxt, setConsumoMinimoTxt] = useState('')
  const [comentario, setComentario] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const setScore = (key, val) => setScores(s => ({ ...s, [key]: val }))

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    setPhotoError('')
    if (!file) { setPhotoDataUrl(null); return }
    if (!file.type.startsWith('image/')) {
      setPhotoError('Tiene que ser una imagen')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('La foto es demasiado pesada, probá con otra')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoDataUrl(reader.result)
    reader.onerror = () => setPhotoError('No pudimos leer esa imagen')
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkinId, ...scores, tiempoMaximo, tiempoMaximoTxt, consumoMinimo, consumoMinimoTxt, comentario,
          photoDataUrl: photoDataUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error guardando la review'); return }
      setDone(true)
      onSubmitted(data)
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return <p className={styles.doneMsg}>✓ ¡Gracias por tu review!</p>
  }

  return (
    <div className={styles.addReview}>
      <div className={styles.sectionTitle} style={{ marginTop: 0 }}>Dejá tu review de esta visita</div>
      {FACTORES.map(f => (
        <div key={f.key} className={styles.factorRow}>
          <span>{f.label}</span>
          <span className={styles.stars}>
            {[1, 2, 3, 4, 5].map(s => (
              <span
                key={s}
                className={scores[f.key] >= s ? styles.son : styles.soff}
                onClick={() => setScore(f.key, s)}
              >★</span>
            ))}
          </span>
        </div>
      ))}

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={tiempoMaximo} onChange={e => setTiempoMaximo(e.target.checked)} />
        ¿Había tiempo máximo de estadía?
      </label>
      {tiempoMaximo && (
        <input
          className={styles.revInput}
          placeholder="Ej: 2h"
          value={tiempoMaximoTxt}
          onChange={e => setTiempoMaximoTxt(e.target.value)}
        />
      )}

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={consumoMinimo} onChange={e => setConsumoMinimo(e.target.checked)} />
        ¿Había consumo mínimo o costo de entrada?
      </label>
      {consumoMinimo && (
        <input
          className={styles.revInput}
          placeholder="Ej: 1 café cada 2h"
          value={consumoMinimoTxt}
          onChange={e => setConsumoMinimoTxt(e.target.value)}
        />
      )}

      <label className={styles.photoUpload}>
        📷 {photoDataUrl ? 'Foto lista para subir' : storeHasPhoto ? 'Sumar otra foto (opcional)' : 'Subir una foto (+0.25 pts si es la primera del local)'}
        <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
      </label>
      {photoDataUrl && <img src={photoDataUrl} alt="Vista previa" className={styles.photoPreview} />}
      {photoError && <p className={styles.errorMsg}>{photoError}</p>}

      <textarea
        className={styles.revTextarea}
        rows={2}
        placeholder="Contá tu experiencia (opcional)..."
        value={comentario}
        onChange={e => setComentario(e.target.value)}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <button className={styles.btnPublish} onClick={handleSubmit} disabled={sending}>
        {sending ? 'Enviando...' : 'Publicar review'}
      </button>
    </div>
  )
}
