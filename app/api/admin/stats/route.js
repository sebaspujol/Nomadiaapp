// app/api/admin/stats/route.js
// Métricas para el dashboard de admin (/admin). Solo lectura, solo para
// emails en ADMIN_EMAILS (ver lib/adminAuth.js).
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { isAdminSession } from '../../../../lib/adminAuth'
import prisma from '../../../../lib/prisma'

// Esta ruta lee la sesión (cookies/headers) en cada request, así que nunca
// se puede pre-renderizar de forma estática — sin esto, Next.js tira
// "Dynamic server usage" en producción y la ruta falla.
export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(n) {
  return new Date(Date.now() - n * DAY_MS)
}

// Agrupa una lista de {createdAt} en cantidad por día, para los últimos N días.
function bucketByDay(rows, days) {
  const buckets = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(daysAgo(i))
    const key = d.toISOString().slice(0, 10)
    buckets[key] = 0
  }
  for (const row of rows) {
    const key = new Date(row.createdAt).toISOString().slice(0, 10)
    if (key in buckets) buckets[key]++
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }))
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const since7 = daysAgo(7)
    const since30 = daysAgo(30)

    const [
      totalUsers,
      newUsers7,
      newUsers30,
      usersLast30Raw,
      totalStores,
      newStores7,
      newStores30,
      storesLast30Raw,
      storesByTipo,
      storesBySource,
      storesByCiudad,
      totalCheckins,
      checkinsLast7,
      activeCheckinsNow,
      totalReviews,
      reviewsLast7,
      reviewsLast30Raw,
      topPlaces,
      mostActiveUsers,
      pointsAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since7 } } }),
      prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      prisma.user.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),

      prisma.store.count(),
      prisma.store.count({ where: { createdAt: { gte: since7 } } }),
      prisma.store.count({ where: { createdAt: { gte: since30 } } }),
      prisma.store.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
      prisma.store.groupBy({ by: ['tipo'], _count: { id: true } }),
      prisma.store.groupBy({ by: ['source'], _count: { id: true } }),
      prisma.store.groupBy({
        by: ['ciudad'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      }),

      prisma.checkin.count(),
      prisma.checkin.count({ where: { createdAt: { gte: since7 } } }),
      prisma.checkin.count({ where: { expiresAt: { gt: new Date() }, closedAt: null } }),

      prisma.review.count(),
      prisma.review.count({ where: { createdAt: { gte: since7 } } }),
      prisma.review.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),

      prisma.store.findMany({
        where: { verified: true, reviewCount: { gt: 0 } },
        orderBy: [{ ratingAvg: 'desc' }, { reviewCount: 'desc' }],
        take: 10,
        select: { id: true, nombre: true, tipo: true, ciudad: true, barrio: true, ratingAvg: true, reviewCount: true },
      }),

      prisma.user.findMany({
        orderBy: { pointsBalance: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, pointsBalance: true, createdAt: true },
      }),

      prisma.pointsTransaction.aggregate({ _sum: { amount: true } }),
    ])

    const tipoLabels = { cafe: 'Café', cowork: 'Cowork', hotel: 'Hotel lobby', biblioteca: 'Biblioteca' }

    return NextResponse.json({
      users: {
        total: totalUsers,
        last7: newUsers7,
        last30: newUsers30,
        byDay: bucketByDay(usersLast30Raw, 30),
      },
      stores: {
        total: totalStores,
        last7: newStores7,
        last30: newStores30,
        byDay: bucketByDay(storesLast30Raw, 30),
        byTipo: storesByTipo.map((s) => ({ tipo: s.tipo, label: tipoLabels[s.tipo] || s.tipo, count: s._count.id })),
        bySource: storesBySource.map((s) => ({ source: s.source, count: s._count.id })),
        byCiudad: storesByCiudad.map((s) => ({ ciudad: s.ciudad || 'Sin especificar', count: s._count.id })),
      },
      checkins: {
        total: totalCheckins,
        last7: checkinsLast7,
        activeNow: activeCheckinsNow,
      },
      reviews: {
        total: totalReviews,
        last7: reviewsLast7,
        byDay: bucketByDay(reviewsLast30Raw, 30),
      },
      topPlaces,
      mostActiveUsers,
      points: {
        totalIssued: (pointsAgg._sum.amount || 0) / 100,
      },
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json({ error: 'Error cargando métricas' }, { status: 500 })
  }
}
