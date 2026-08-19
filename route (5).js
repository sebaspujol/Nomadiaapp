// app/api/checkin/reviewable/route.js
// Devuelve el check-in más reciente del usuario en ese local que todavía no
// tiene una review asociada — es lo que habilita el formulario de review en
// el detalle del local (no hace falta que el check-in siga activo: podés
// escribir la review después de irte).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '../../../../lib/prisma'

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ checkin: null })
    }

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    if (!storeId) {
      return NextResponse.json({ error: 'Falta storeId' }, { status: 400 })
    }

    const checkin = await prisma.checkin.findFirst({
      where: { userId: session.user.id, storeId, review: null },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ checkin })
  } catch (err) {
    console.error('Reviewable checkin error:', err)
    return NextResponse.json({ error: 'Error consultando check-ins' }, { status: 500 })
  }
}
