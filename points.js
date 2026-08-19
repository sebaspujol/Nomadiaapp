// lib/points.js
// Otorgamiento de puntos por check-in, review y foto, con las reglas acordadas:
//   - Check-in: 0.25 puntos. Review: 1 punto. Foto de portada: 0.25 puntos.
//   - El check-in y la review siempre se pueden hacer (mantienen la data fresca),
//     pero el PUNTO solo se otorga si pasaron 14 días desde la última vez que
//     ese usuario ganó puntos por esa misma acción en ese mismo local.
//   - La foto es distinta: se paga UNA sola vez por local, para siempre, sin
//     importar quién la suba ni cuántas fotos se suban después (evita pagar
//     puntos repetidos por subir la "misma" portada una y otra vez).
//   - Tope diario: 2.00 puntos totales por usuario, contando todas las fuentes.
//     Se reinicia a las 00:00 UTC.
//   - Los montos se guardan en centésimas de punto (enteros) para evitar
//     errores de redondeo: 25 = 0.25, 100 = 1.00.

import prisma from './prisma'

export const POINTS_AMOUNTS = {
  checkin: 25,
  review: 100,
  photo: 25,
}

const COOLDOWN_DAYS = 14
const DAILY_CAP_CENTS = 200 // 2.00 puntos

// Fuentes que se pagan una única vez por local (no por usuario, no por
// ventana de tiempo): la primera persona en dejarle una foto de portada a
// un local se gana el punto; el resto de las fotos que se suban después
// (de ese local) no vuelven a pagar.
const ONCE_PER_STORE_SOURCES = new Set(['photo'])

export async function grantPoints({ userId, storeId, source }) {
  const amount = POINTS_AMOUNTS[source]
  if (!amount) return { granted: false, amount: 0, reason: 'invalid_source' }

  if (ONCE_PER_STORE_SOURCES.has(source)) {
    const alreadyPaidForStore = await prisma.pointsTransaction.findFirst({
      where: { storeId, source },
    })
    if (alreadyPaidForStore) {
      return { granted: false, amount: 0, reason: 'already_rewarded' }
    }
  } else {
    const cooldownSince = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    const recentAtStore = await prisma.pointsTransaction.findFirst({
      where: { userId, storeId, source, createdAt: { gte: cooldownSince } },
    })
    if (recentAtStore) {
      return { granted: false, amount: 0, reason: 'cooldown' }
    }
  }

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayTx = await prisma.pointsTransaction.findMany({
    where: { userId, createdAt: { gte: todayStart } },
    select: { amount: true },
  })
  const todayTotal = todayTx.reduce((sum, t) => sum + t.amount, 0)
  if (todayTotal + amount > DAILY_CAP_CENTS) {
    return { granted: false, amount: 0, reason: 'daily_cap' }
  }

  await prisma.$transaction([
    prisma.pointsTransaction.create({ data: { userId, storeId, source, amount } }),
    prisma.user.update({ where: { id: userId }, data: { pointsBalance: { increment: amount } } }),
  ])

  return { granted: true, amount }
}

// Utilidad para mostrar en la UI: centésimas → puntos con hasta 2 decimales
export function centsToPoints(cents) {
  return Math.round((cents / 100) * 100) / 100
}
