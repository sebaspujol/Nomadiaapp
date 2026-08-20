'use client'
// Dashboard de métricas para Sebastian (y quien más agreguemos a ADMIN_EMAILS).
// Pura lectura: usuarios nuevos, locales nuevos, check-ins, reviews, top
// locales, usuarios más activos y puntos otorgados. Nada de esto es visible
// para el resto de la comunidad.
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './admin.module.css'

const TIPO_COLORS = { cafe: '#F0A93E', cowork: '#0F9D6E', biblioteca: '#C0574F' }

export default function AdminPage() {
  const { status } = useSession()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsError, setSuggestionsError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      setError('Tenés que iniciar sesión para ver esto.')
      setLoading(false)
      return
    }
    fetch('/api/admin/stats')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'No autorizado')
          return
        }
        setStats(data)
      })
      .catch(() => setError('Error cargando métricas'))
      .finally(() => setLoading(false))

    fetch('/api/suggestions')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setSuggestionsError(data.error || 'No autorizado')
          return
        }
        setSuggestions(data.suggestions || [])
      })
      .catch(() => setSuggestionsError('Error cargando sugerencias'))
  }, [status])

  const toggleResuelto = async (s) => {
    setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, resuelto: !x.resuelto } : x)))
    try {
      const res = await fetch('/api/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, resuelto: !s.resuelto }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Si falla, revertimos el cambio visual.
      setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, resuelto: s.resuelto } : x)))
    }
  }

  if (loading) {
    return <div className={styles.centerMsg}>Cargando métricas...</div>
  }

  if (error) {
    return (
      <div className={styles.centerMsg}>
        <p>{error}</p>
        <Link href="/" className={styles.backLink}>← Volver a Nomadia</Link>
      </div>
    )
  }

  const maxByDay = (arr) => Math.max(1, ...arr.map((d) => d.count))

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <div>
          <h1>Dashboard de Nomadia</h1>
          <p className={styles.sub}>Métricas de la comunidad, actualizadas en vivo.</p>
        </div>
        <Link href="/" className={styles.backLink}>← Volver a la app</Link>
      </div>

      <div className={styles.cardsGrid}>
        <StatCard label="Usuarios totales" value={stats.users.total} sub={`+${stats.users.last7} en 7 días`} />
        <StatCard label="Usuarios nuevos (30d)" value={stats.users.last30} />
        <StatCard label="Locales totales" value={stats.stores.total} sub={`+${stats.stores.last7} en 7 días`} />
        <StatCard label="Locales nuevos (30d)" value={stats.stores.last30} />
        <StatCard label="Check-ins activos ahora" value={stats.checkins.activeNow} accent />
        <StatCard label="Check-ins totales" value={stats.checkins.total} sub={`+${stats.checkins.last7} en 7 días`} />
        <StatCard label="Reviews totales" value={stats.reviews.total} sub={`+${stats.reviews.last7} en 7 días`} />
        <StatCard label="Puntos otorgados" value={stats.points.totalIssued.toFixed(2)} />
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h2>Usuarios nuevos — últimos 30 días</h2>
          <MiniBars data={stats.users.byDay} max={maxByDay(stats.users.byDay)} />
        </div>
        <div className={styles.panel}>
          <h2>Reviews — últimos 30 días</h2>
          <MiniBars data={stats.reviews.byDay} max={maxByDay(stats.reviews.byDay)} />
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h2>Locales por tipo</h2>
          <BreakdownList
            items={stats.stores.byTipo.map((t) => ({ label: t.label, count: t.count, color: TIPO_COLORS[t.tipo] || '#999' }))}
          />
        </div>
        <div className={styles.panel}>
          <h2>Locales por origen</h2>
          <BreakdownList
            items={stats.stores.bySource.map((s) => ({
              label: s.source === 'osm' ? 'Importados de OpenStreetMap' : 'Cargados por la comunidad',
              count: s.count,
              color: s.source === 'osm' ? '#3B82F6' : '#0F9D6E',
            }))}
          />
        </div>
      </div>

      <div className={styles.panel}>
        <h2>Ciudades con más locales</h2>
        <BreakdownList
          items={stats.stores.byCiudad.map((c) => ({ label: c.ciudad, count: c.count, color: '#0F9D6E' }))}
        />
      </div>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h2>Top 10 locales mejor puntuados</h2>
          <table className={styles.table}>
            <thead>
              <tr><th>Local</th><th>Tipo</th><th>Ciudad</th><th>★</th><th>Reviews</th></tr>
            </thead>
            <tbody>
              {stats.topPlaces.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.tipo}</td>
                  <td>{p.ciudad || p.barrio || '—'}</td>
                  <td className={styles.mono}>{p.ratingAvg?.toFixed(1)}</td>
                  <td className={styles.mono}>{p.reviewCount}</td>
                </tr>
              ))}
              {stats.topPlaces.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>Todavía no hay locales verificados con reviews.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.panel}>
          <h2>Usuarios más activos (por puntos)</h2>
          <table className={styles.table}>
            <thead>
              <tr><th>Usuario</th><th>Email</th><th>Pts</th></tr>
            </thead>
            <tbody>
              {stats.mostActiveUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || '—'}</td>
                  <td>{u.email}</td>
                  <td className={styles.mono}>{(u.pointsBalance / 100).toFixed(2)}</td>
                </tr>
              ))}
              {stats.mostActiveUsers.length === 0 && (
                <tr><td colSpan={3} className={styles.empty}>Todavía no hay puntos otorgados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.panel}>
        <h2>Sugerencias de la comunidad {suggestions.length > 0 && `(${suggestions.filter((s) => !s.resuelto).length} pendientes)`}</h2>
        {suggestionsError && <p className={styles.empty}>{suggestionsError}</p>}
        {!suggestionsError && suggestions.length === 0 && (
          <p className={styles.empty}>Todavía no llegó ninguna sugerencia.</p>
        )}
        {!suggestionsError && suggestions.length > 0 && (
          <div className={styles.suggestionList}>
            {suggestions.map((s) => (
              <div key={s.id} className={styles.suggestionRow}>
                <div className={styles.suggestionMain}>
                  <p className={styles.suggestionText}>{s.texto}</p>
                  <p className={styles.suggestionMeta}>
                    {(s.nombre || s.email) ? (s.nombre || s.email) : 'Anónimo'}
                    {' · '}
                    {new Date(s.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                <button
                  className={s.resuelto ? styles.badgeResolved : styles.badgePending}
                  onClick={() => toggleResuelto(s)}
                >
                  {s.resuelto ? 'Resuelta ✓' : 'Pendiente'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.statCardAccent : ''}`}>
      <div className={styles.statVal}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

function MiniBars({ data, max }) {
  return (
    <div className={styles.bars}>
      {data.map((d) => (
        <div key={d.date} className={styles.barCol} title={`${d.date}: ${d.count}`}>
          <div className={styles.bar} style={{ height: `${(d.count / max) * 100}%` }} />
        </div>
      ))}
    </div>
  )
}

function BreakdownList({ items }) {
  const total = Math.max(1, items.reduce((s, i) => s + i.count, 0))
  return (
    <div className={styles.breakdown}>
      {items.map((i) => (
        <div key={i.label} className={styles.breakdownRow}>
          <span className={styles.breakdownLabel}>{i.label}</span>
          <div className={styles.breakdownBarTrack}>
            <div className={styles.breakdownBarFill} style={{ width: `${(i.count / total) * 100}%`, background: i.color }} />
          </div>
          <span className={styles.breakdownCount}>{i.count}</span>
        </div>
      ))}
      {items.length === 0 && <p className={styles.empty}>Sin datos todavía.</p>}
    </div>
  )
}
