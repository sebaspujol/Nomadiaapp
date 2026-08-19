// app/api/points/balance/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '../../../../lib/prisma'
import { centsToPoints } from '../../../../lib/points'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pointsBalance: true },
    })

    const transactions = await prisma.pointsTransaction.findMany({
      where: { userId: session.user.id },
      include: { store: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      pointsBalance: centsToPoints(user?.pointsBalance || 0),
      transactions: transactions.map((t) => ({
        id: t.id,
        source: t.source,
        amount: centsToPoints(t.amount),
        storeName: t.store.nombre,
        createdAt: t.createdAt,
      })),
    })
  } catch (err) {
    console.error('Points balance error:', err)
    return NextResponse.json({ error: 'Error consultando el saldo de puntos' }, { status: 500 })
  }
}
