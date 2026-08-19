// app/api/store/menu/route.js
// Persiste el menú revisado/editado por la comunidad. Reemplaza todos los
// MenuItem del store y actualiza lastMenuUpdate (la fecha que se muestra
// en la ficha del local). Habilitado por check-in, no por ser "dueño".
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import prisma from '../../../../lib/prisma'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { storeId, items } = await req.json()
    if (!storeId || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Faltan storeId o items' }, { status: 400 })
    }

    const checkin = await prisma.checkin.findFirst({
      where: { userId: session.user.id, storeId },
    })
    if (!checkin) {
      return NextResponse.json(
        { error: 'Solo podés actualizar el menú de un local donde hiciste check-in' },
        { status: 403 }
      )
    }

    const cleanItems = items
      .filter((i) => i.nombre && i.nombre.trim())
      .map((i) => ({
        storeId,
        nombre: i.nombre.trim(),
        precio: i.precio != null ? Number(i.precio) : null,
        categoria: i.categoria || 'Sin categoría',
      }))

    await prisma.$transaction([
      prisma.menuItem.deleteMany({ where: { storeId } }),
      prisma.menuItem.createMany({ data: cleanItems }),
      prisma.store.update({ where: { id: storeId }, data: { lastMenuUpdate: new Date() } }),
    ])

    const updated = await prisma.store.findUnique({
      where: { id: storeId },
      include: { menuItems: true },
    })

    return NextResponse.json({ ok: true, store: updated })
  } catch (err) {
    console.error('Menu save error:', err)
    return NextResponse.json({ error: 'Error guardando el menú' }, { status: 500 })
  }
}
