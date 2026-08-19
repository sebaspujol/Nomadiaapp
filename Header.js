'use client'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import styles from './Header.module.css'

// Solo para decidir si mostramos el ícono del dashboard en el header — el
// control de acceso real pasa siempre por el servidor (ADMIN_EMAILS en
// lib/adminAuth.js), así que aunque alguien más vea este ícono no puede
// entrar a /admin sin estar en esa lista.
const ADMIN_UI_EMAILS = ['spujol@riamoneytransfer.com']

export default function Header({ onSearchCity, onAddPlace }) {
  const { data: session, status } = useSession()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [points, setPoints] = useState(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/points/balance')
      .then((res) => res.json())
      .then((data) => setPoints(data.pointsBalance))
      .catch(() => {})
  }, [status])

  const runSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (res.ok) {
        onSearchCity?.({ lat: data.lat, lng: data.lng, label: data.formattedAddress })
      }
    } catch (err) {
      console.error('Error buscando ciudad:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') runSearch()
  }

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoMark}><i /><i /><i /><i /></div>
        <div className={styles.logoWord}>nom<span>a</span>dia</div>
      </div>

      <div className={styles.searchPill}>
        <div className={styles.searchSeg}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder={searching ? 'Buscando...' : 'Buscá una ciudad...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className={styles.sub}>Cualquier zona</span>
        </div>
        <div className={styles.searchSeg}>
          Todos
          <span className={styles.sub}>Café, cowork, hotel...</span>
        </div>
        <div className={styles.searchSeg}>
          Filtros
          <span className={styles.sub}>Enchufes, wifi, silencio...</span>
        </div>
        <button className={styles.searchGo} onClick={runSearch} title="Buscar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </button>
      </div>

      <div className={styles.headRight}>
        <div className={styles.langSwitch}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 2.5 14.3 0 18M12 3c-2.5 2.7-2.5 14.3 0 18" />
          </svg>
          <b>ES</b> / EN / PT
        </div>
        {points != null && (
          <span className={styles.points} title="Tus puntos por reviews">★ {points} pts</span>
        )}
        <button
          className={styles.btnAdd}
          title="Sumar un lugar que falte en el mapa"
          onClick={() => {
            if (status !== 'authenticated') {
              window.location.href = '/login'
              return
            }
            onAddPlace?.()
          }}
        >
          + Añadir lugar
        </button>
        {status === 'authenticated' && ADMIN_UI_EMAILS.includes((session.user.email || '').toLowerCase()) && (
          <Link href="/admin" className={styles.adminLink} title="Dashboard de métricas">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" />
            </svg>
          </Link>
        )}
        {status === 'authenticated' ? (
          <div className={styles.avatar} title={session.user.name} onClick={() => signOut()}>
            {(session.user.name || 'TU').slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <Link href="/login" className={styles.avatar} title="Iniciar sesión">TU</Link>
        )}
      </div>
    </header>
  )
}
