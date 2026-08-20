// app/api/suggestions/route.js
// Sugerencias dejadas desde el popup de bienvenida. Cualquiera puede mandar
// una, con cuenta o sin ella (si está logueado, guardamos su nombre/email
// automáticamente). Listar y marcar como resueltas es solo para admins,
// ver /admin.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { isAdminSession } from '../../../lib/adminAuth'
import prisma from '../../../lib/prisma'

// Lee la sesión (cookies/headers) en el GET, así que esta ruta no se puede
// pre-renderizar de forma estática — ver el mismo fix en admin/stats.
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const texto = (body.texto || '').trim()

    if (!texto) {
      return NextResponse.json({ error: 'Escribí algo antes de enviar' }, { status: 400 })
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        texto,
        userId: session?.user?.id || null,
        nombre: session?.user?.name || body.nombre || null,
        email: session?.user?.email || body.email || null,
      },
    })

    return NextResponse.json(suggestion)
  } catch (err) {
    console.error('Suggestion create error:', err)
    return NextResponse.json({ error: 'Error guardando la sugerencia' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const suggestions = await prisma.suggestion.findMany({
      orderBy: [{ resuelto: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('Suggestion list error:', err)
    return NextResponse.json({ error: 'Error cargando sugerencias' }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Falta el id' }, { status: 400 })
    }

    const updated = await prisma.suggestion.update({
      where: { id: body.id },
      data: { resuelto: !!body.resuelto },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Suggestion update error:', err)
    return NextResponse.json({ error: 'Error actualizando la sugerencia' }, { status: 500 })
  }
}
