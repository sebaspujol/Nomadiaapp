'use client'
// Modal para sumar un lugar que falte en el mapa. Reemplaza lo que antes
// hacía el dashboard de "dueño de local": ahora cualquier usuario logueado
// puede cargarlo. La dirección se geocodifica del lado del servidor si no
// tenemos lat/lng todavía (ver app/api/store/route.js).
import { useState } from 'react'
import { useLang } from '../lib/i18n'
import styles from './AddPlaceModal.module.css'

const initialForm = { nombre: '', tipo: 'cafe', direccion: '', barrio: '', ciudad: '' }

export default function AddPlaceModal({ onClose, onCreated }) {
  const { t } = useLang()
  const TIPOS = [
    { value: 'cafe', label: t('filterCafe') },
    { value: 'cowork', label: t('filterCowork') },
    { value: 'biblioteca', label: t('filterBiblioteca') },
  ]
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.direccion.trim()) {
      setError(t('requiredError'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error guardando el local')
        setSaving(false)
        return
      }
      onCreated?.(data)
      onClose?.()
    } catch (err) {
      setError('Error del servidor')
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h3>{t('addPlaceTitle')}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className={styles.hint}>{t('addPlaceHint')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>{t('nameLabel')}</label>
            <input
              type="text"
              placeholder={t('namePlaceholder')}
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label>{t('typeLabel')}</label>
            <select value={form.tipo} onChange={(e) => update('tipo', e.target.value)}>
              {TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>{t('addressLabel')}</label>
            <input
              type="text"
              placeholder={t('addressPlaceholder')}
              value={form.direccion}
              onChange={(e) => update('direccion', e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>{t('neighborhoodLabel')} <span className={styles.opt}>{t('optional')}</span></label>
              <input type="text" value={form.barrio} onChange={(e) => update('barrio', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t('cityLabel')} <span className={styles.opt}>{t('optional')}</span></label>
              <input type="text" value={form.ciudad} onChange={(e) => update('ciudad', e.target.value)} />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        </form>
      </div>
    </div>
  )
}
