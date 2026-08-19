// app/api/checkin/active/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '../../../../lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ checkin: null })
    }

    const checkin = await prisma.checkin.findFirst({
      where: { userId: session.user.id, expiresAt: { gt: new Date() }, closedAt: null },
      include: { store: true, review: true },
    })

    return NextResponse.json({ checkin })
  } catch (err) {
    console.error('Active checkin error:', err)
    return NextResponse.json({ error: 'Error consultando el check-in activo' }, { status: 500 })
  }
}
