'use client'
// Popup de bienvenida: se muestra una vez por navegador (o de nuevo cuando
// subimos WELCOME_VERSION en lib/i18n.js, para avisar de novedades). Explica
// qué es la app, cómo se usa, lista los últimos cambios, deja mandar una
// sugerencia (se guarda en la base y se ve en /admin) y ofrece iniciar
// sesión sin bloquear — se puede cerrar y seguir usando el sitio sin cuenta.
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLang } from '../lib/i18n'
import styles from './WelcomeModal.module.css'

export default function WelcomeModal({ onClose }) {
  const { t } = useLang()
  const { status } = useSession()
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const changelog = t('changelogItems')

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

        <h3 className={styles.title}>{t('welcomeTitle')}</h3>
        <p className={styles.intro}>{t('welcomeIntro')}</p>

        <div className={styles.section}>
          <h4>{t('welcomeHowTitle')}</h4>
          <p className={styles.howText}>{t('welcomeHowText')}</p>
        </div>

        {Array.isArray(changelog) && changelog.length > 0 && (
          <div className={styles.section}>
            <h4>{t('changelogTitle')}</h4>
            <ul className={styles.changelogList}>
              {changelog.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.section}>
          <h4>{t('suggestionsTitle')}</h4>
          {sent ? (
            <p className={styles.sentMsg}>{t('suggestionsSuccess')}</p>
          ) : (
            <>
              <textarea
                className={styles.textarea}
                placeholder={t('suggestionsPlaceholder')}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={3}
              />
              {error && <p className={styles.error}>{error}</p>}
              <button className={styles.sendBtn} onClick={handleSend} disabled={sending || !texto.trim()}>
                {sending ? t('sending') : t('suggestionsSubmit')}
              </button>
            </>
          )}
        </div>

        {status !== 'authenticated' && (
          <div className={styles.loginRow}>
            <span>{t('loginPrompt')}</span>
            <Link href="/login" className={styles.loginBtn}>{t('loginButton')}</Link>
          </div>
        )}

        <button className={styles.continueBtn} onClick={onClose}>{t('continueButton')}</button>
      </div>
    </div>
  )
}
