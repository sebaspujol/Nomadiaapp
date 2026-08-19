// app/api/store/route.js
// Ya no existe un rol de "dueño de local": cualquier usuario logueado puede
// sumar un lugar que falte en el mapa (normalmente vía autocompletado de
// Google Places desde el buscador). Solo quien lo creó puede editarlo después.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '../../../lib/prisma'
import { geocodeAddress } from '../../../lib/geocode'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()

    if (!body.nombre || !body.direccion) {
      return NextResponse.json({ error: 'Nombre y dirección son obligatorios' }, { status: 400 })
    }

    let lat = typeof body.lat === 'number' ? body.lat : null
    let lng = typeof body.lng === 'number' ? body.lng : null

    if (lat == null || lng == null) {
      // Si no viene de autocompletado con coordenadas ya resueltas,
      // geocodificamos la dirección server-side.
      const geo = await geocodeAddress(`${body.direccion}, ${body.barrio || ''}, ${body.ciudad || ''}`)
      if (!geo) {
        return NextResponse.json(
          { error: 'No pudimos ubicar esa dirección. Probá con una más específica.' },
          { status: 400 }
        )
      }
      lat = geo.lat
      lng = geo.lng
    }

    const data = {
      nombre: body.nombre,
      tipo: body.tipo || 'cafe',
      direccion: body.direccion,
      barrio: body.barrio || '',
      ciudad: body.ciudad || null,
      lat,
      lng,
      descripcion: body.descripcion,
      telefono: body.telefono,
      website: body.website,
      instagram: body.instagram,
      abre: body.abre ?? 8,
      cierra: body.cierra ?? 22,
      enchufes: body.enchufes ?? 0,
      wifi: body.wifi,
      gratis: body.gratis ?? false,
      silencio: body.silencio ?? false,
      mesaLarga: body.mesaLarga ?? false,
      tiempoMax: body.tiempoMax,
      consumoMin: body.consumoMin,
      googlePlaceId: body.googlePlaceId || undefined,
    }

    let store
    if (body.id) {
      // Editar: solo quien sumó el local a mano puede tocarlo (los importados
      // de Google, con ownerId null, no se editan por esta vía todavía).
      const existing = await prisma.store.findUnique({ where: { id: body.id } })
      if (!existing || existing.ownerId !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado para editar este local' }, { status: 403 })
      }
      store = await prisma.store.update({ where: { id: body.id }, data })
    } else {
      store = await prisma.store.create({
        data: { ...data, ownerId: session.user.id, source: 'user' },
      })
    }

    return NextResponse.json(store)
  } catch (err) {
    console.error('Store save error:', err)
    return NextResponse.json({ error: 'Error guardando el local' }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const store = await prisma.store.findUnique({ where: { id }, include: { menuItems: true } })
      return NextResponse.json({ store })
    }

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const stores = await prisma.store.findMany({
      where: { ownerId: session.user.id },
      include: { menuItems: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ stores })
  } catch (err) {
    console.error('Store fetch error:', err)
    return NextResponse.json({ error: 'Error cargando locales' }, { status: 500 })
  }
}
