'use client'
// Popup de bienvenida: se muestra una vez por navegador (o de nuevo cuando
// subimos WELCOME_VERSION en lib/i18n.js, para avisar de novedades). Explica
// qué es la app, cómo se usa, y lista los últimos cambios. El buzón de
// sugerencias se movió a su propio botón en el header (ver SuggestionModal) y
// el pedido de login pasó a mostrarse después de cerrar este popup (ver
// LoginPromptModal en app/page.js) — este popup en sí se puede cerrar y
// seguir usando el sitio sin cuenta.
import { useLang } from '../lib/i18n'
import styles from './WelcomeModal.module.css'

export default function WelcomeModal({ onClose }) {
  const { t } = useLang()
  const changelog = t('changelogItems')

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

        <button className={styles.continueBtn} onClick={onClose}>{t('continueButton')}</button>
      </div>
    </div>
  )
}
