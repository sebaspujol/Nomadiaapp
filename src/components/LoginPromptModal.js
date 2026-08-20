'use client'
// Se muestra justo después de cerrar el popup de bienvenida, solo si la
// persona no está logueada — invita a crear cuenta sin bloquear: se puede
// cerrar y seguir navegando sin cuenta. Como se dispara al cerrar el popup
// de bienvenida (que ya de por sí aparece una sola vez por navegador, salvo
// que subamos WELCOME_VERSION), no hace falta un control de frecuencia propio.
import Link from 'next/link'
import { useLang } from '../lib/i18n'
import styles from './LoginPromptModal.module.css'

export default function LoginPromptModal({ onClose }) {
  const { t } = useLang()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <h3 className={styles.title}>{t('loginPromptTitle')}</h3>
        <p className={styles.text}>{t('loginPromptText')}</p>

        <Link href="/login" className={styles.loginBtn}>{t('loginButton')}</Link>
        <button className={styles.continueBtn} onClick={onClose}>{t('continueWithoutAccount')}</button>
      </div>
    </div>
  )
}
