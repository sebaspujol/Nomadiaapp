'use client'
import { useState } from 'react'
import InfoForm from './InfoForm'
import MenuScanner from './MenuScanner'
import styles from './dashboard.module.css'

const TABS = [
  { key: 'info', label: 'Información del local' },
  { key: 'menu', label: 'Menú con IA' },
  { key: 'stats', label: 'Estadísticas' },
]

export default function StoreDashboard() {
  const [tab, setTab] = useState('info')
  const [savedData, setSavedData] = useState(null)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>nom<span>a</span>dia</div>
        <span className={styles.headerSub}>Panel de tu espacio</span>
      </header>

      <div className={styles.layout}>
        <nav className={styles.nav}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.navBtn} ${tab === t.key ? styles.navActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
          <div className={styles.navSeparator} />
          <a href="/" className={styles.navBtn}>← Ver el mapa</a>
        </nav>

        <main className={styles.main}>
          {tab === 'info' && <InfoForm savedData={savedData} onSave={setSavedData} />}
          {tab === 'menu' && <MenuScanner storeId={savedData?.id} />}
          {tab === 'stats' && <StatsPlaceholder />}
        </main>
      </div>
    </div>
  )
}

function StatsPlaceholder() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid)' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
      <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Estadísticas próximamente</p>
      <p style={{ fontSize: 14 }}>Podrás ver visitas, check-ins por hora, y tendencias de tu espacio.</p>
    </div>
  )
}
