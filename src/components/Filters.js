'use client'
import { useLang } from '../lib/i18n'
import styles from './Filters.module.css'

const ICONS = {
  all: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l1.8 5.5H19l-4.6 3.3 1.8 5.5L12 14l-4.6 3.3 1.8-5.5L4.6 8.5H10L12 3Z" /></svg>
  ),
  cafe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 3c0 1-1 1-1 2M12 3c0 1-1 1-1 2" /></svg>
  ),
  cowork: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" /></svg>
  ),
  biblioteca: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5v14M4 5c2 0 5-1 7 0v14c-2-1-5 0-7 0Z" /><path d="M18 5v14M18 5c-2 0-5-1-7 0v14c2-1 5 0 7 0Z" /></svg>
  ),
  enchufes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 2v4M15 2v4M7 8h10l-1 5a4 4 0 0 1-8 0L7 8Z" /><path d="M11 17v3M13 17v3" /></svg>
  ),
  wifi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 8.5a16 16 0 0 1 20 0M5.5 12a11 11 0 0 1 13 0M9 15.5a6 6 0 0 1 6 0" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></svg>
  ),
}

export default function Filters({ filters, setFilters }) {
  const { t } = useLang()
  const update = (key, value) => setFilters(f => ({ ...f, [key]: value }))

  const toggleBool = (key) => update(key, !filters[key])

  const TIPOS = [
    { key: 'all', label: t('allTypes') },
    { key: 'cafe', label: t('cafes') },
    { key: 'cowork', label: t('coworks') },
    { key: 'biblioteca', label: t('bibliotecas') },
  ]

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        {TIPOS.map(tipo => (
          <button
            key={tipo.key}
            className={`${styles.chip} ${filters.tipo === tipo.key ? styles.active : ''}`}
            onClick={() => update('tipo', tipo.key)}
          >
            {ICONS[tipo.key]}
            {tipo.label}
          </button>
        ))}
        <div className={styles.divider} />
        <button className={`${styles.chip} ${filters.enchufes ? styles.active : ''}`} onClick={() => toggleBool('enchufes')}>
          {ICONS.enchufes}{t('filterEnchufes')}
        </button>
        <button className={`${styles.chip} ${filters.wifi ? styles.active : ''}`} onClick={() => toggleBool('wifi')}>
          {ICONS.wifi}{t('filterWifi')}
        </button>
        <button className={`${styles.chip} ${filters.silencio ? styles.active : ''}`} onClick={() => toggleBool('silencio')}>
          {t('filterSilencio')}
        </button>
        <button className={`${styles.chip} ${filters.mesa ? styles.active : ''}`} onClick={() => toggleBool('mesa')}>
          {t('filterMesa')}
        </button>
        <button className={`${styles.chip} ${filters.gratis ? styles.active : ''}`} onClick={() => toggleBool('gratis')}>
          {t('filterGratis')}
        </button>
      </div>

      <div className={styles.priceRow}>
        <span className={styles.label}>{t('priceMax')}</span>
        <input
          type="range" min="0" max="30" step="1"
          value={filters.maxPrice}
          className={styles.range}
          onChange={e => update('maxPrice', parseInt(e.target.value))}
        />
        <span className={styles.priceVal}>
          {filters.maxPrice >= 30 ? t('priceAny') : t('priceUpTo')(filters.maxPrice)}
        </span>
        <label className={styles.toggle}>
          <input type="checkbox" checked={filters.onlyOpen} onChange={() => toggleBool('onlyOpen')} />
          {t('onlyOpenNow')}
        </label>
      </div>
    </div>
  )
}
