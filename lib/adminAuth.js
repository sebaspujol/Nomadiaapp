// lib/adminAuth.js
// Acceso al dashboard de métricas (/admin): no es un rol más en la tabla
// User, es simplemente una lista de emails autorizados vía env var. Así
// Sebastian puede sumar o sacar admins sin tocar la base de datos.
const DEFAULT_ADMINS = ['spujol@riamoneytransfer.com']

function adminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return fromEnv.length ? fromEnv : DEFAULT_ADMINS.map((e) => e.toLowerCase())
}

export function isAdminEmail(email) {
  if (!email) return false
  return adminEmails().includes(email.toLowerCase())
}

export function isAdminSession(session) {
  return isAdminEmail(session?.user?.email)
}
