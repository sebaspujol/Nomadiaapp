// app/api/checkin/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '../../../lib/prisma'
import { grantPoints } from '../../../lib/points'

const CHECKIN_HOURS = 4

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { storeId } = await req.json()
    if (!storeId) {
      return NextResponse.json({ error: 'Falta storeId' }, { status: 400 })
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } })
    if (!store || !store.active) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })
    }

    const now = new Date()

    // Solo puede haber un check-in activo por vez, en cualquier local.
    const activeCheckin = await prisma.checkin.findFirst({
      where: { userId: session.user.id, expiresAt: { gt: now }, closedAt: null },
      include: { store: { select: { nombre: true } } },
    })
    if (activeCheckin) {
      if (activeCheckin.storeId === storeId) {
        return NextResponse.json({ error: 'Ya tenés un check-in activo en este local' }, { status: 409 })
      }
      return NextResponse.json(
        {
          error: `Ya tenés un check-in activo en ${activeCheckin.store.nombre}. Hacé check-out ahí primero.`,
          activeCheckin,
        },
        { status: 409 }
      )
    }

    const expiresAt = new Date(now.getTime() + CHECKIN_HOURS * 60 * 60 * 1000)
    const checkin = await prisma.checkin.create({
      data: { userId: session.user.id, storeId, expiresAt },
    })

    const pointsResult = await grantPoints({ userId: session.user.id, storeId, source: 'checkin' })

    return NextResponse.json({ checkin, points: pointsResult })
  } catch (err) {
    console.error('Checkin error:', err)
    return NextResponse.json({ error: 'Error creando el check-in' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()
    const activeCheckin = await prisma.checkin.findFirst({
      where: { userId: session.user.id, expiresAt: { gt: now }, closedAt: null },
    })
    if (!activeCheckin) {
      return NextResponse.json({ error: 'No tenés un check-in activo' }, { status: 404 })
    }

    const closed = await prisma.checkin.update({
      where: { id: activeCheckin.id },
      data: { closedAt: now },
    })

    return NextResponse.json({ checkin: closed })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Error cerrando el check-in' }, { status: 500 })
  }
}
