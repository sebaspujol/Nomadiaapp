'use client'
// Buzón de sugerencias, ahora accesible en cualquier momento desde el botón
// del header (al lado del selector ES/EN), no solo la primera vez que alguien
// entra. Cualquiera puede mandar una, con cuenta o sin ella — se guarda en la
// base y se ve en /admin (ver app/api/suggestions/route.js).
import { useState } from 'react'
import { useLang } from '../lib/i18n'
import styles from './SuggestionModal.module.css'

export default function SuggestionModal({ onClose }) {
  const { t } = useLang()
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!texto.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || t('suggestionError'))
        return
      }
      setSent(true)
      setTexto('')
    } catch (err) {
      setError(t('suggestionError'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h3 className={styles.title}>{t('suggestionsTitle')}</h3>

        {sent ? (
          <p className={styles.sentMsg}>{t('suggestionsSuccess')}</p>
        ) : (
          <>
            <textarea
              className={styles.textarea}
              placeholder={t('suggestionsPlaceholder')}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.sendBtn} onClick={handleSend} disabled={sending || !texto.trim()}>
              {sending ? t('sending') : t('suggestionsSubmit')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
