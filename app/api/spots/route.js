// app/api/spots/route.js
// Reemplaza a /api/places: combina los locales propios (Store) con un import
// bajo demanda de Google Places para la zona buscada, y devuelve todo en el
// formato que ya consume la UI, pero alimentado con datos reales (rating y
// cantidad de reviews de la comunidad, verificado o no, menú publicado).

import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { ensureAreaImported } from '../../../lib/placesImport'

const EMOJI = { cafe: '☕', cowork: '🏢', biblioteca: '📚' }

const PRECIO_DEFAULT = {
  cafe: { precio: '€3–6', precioNum: 4 },
  cowork: { precio: '€15/día', precioNum: 15 },
  biblioteca: { precio: 'Gratis', precioNum: 0 },
}

function buildTags(s) {
  return [
    s.enchufes > 0 ? 'Enchufes' : null,
    s.wifi ? 'Wifi' : null,
    s.silencio ? 'Silencio' : null,
    s.gratis ? 'Gratis' : null,
    s.mesaLarga ? 'Mesa larga' : null,
  ].filter(Boolean)
}

function toPlace(s, activeCheckins) {
  const priceDefault = PRECIO_DEFAULT[s.tipo] || PRECIO_DEFAULT.cafe
  const precio = s.gratis ? 'Gratis' : s.precioMin != null ? `€${s.precioMin}` : priceDefault.precio
  const precioNum = s.gratis ? 0 : s.precioMin != null ? s.precioMin : priceDefault.precioNum

  return {
    id: s.id,
    tipo: s.tipo,
    emoji: EMOJI[s.tipo] || '📍',
    nombre: s.nombre,
    barrio: s.barrio || s.ciudad || '',
    ciudad: s.ciudad,
    direccion: s.direccion,
    lat: s.lat,
    lng: s.lng,
    descripcion: s.descripcion,
    telefono: s.telefono,
    website: s.website,
    instagram: s.instagram,
    verified: s.verified,
    rating: s.verified ? Math.round((s.ratingAvg || 0) * 10) / 10 : null,
    reviews: s.reviewCount,
    precio,
    precioNum,
    gratis: s.gratis,
    consumoMin: s.consumoMin || (s.gratis ? 'Libre y gratuito' : 'No especificado todavía'),
    enchufes: s.enchufes,
    wifi: s.wifi || 'No especificado',
    mesas: s.mesaLarga ? 'Mesa larga disponible' : 'Mesas individuales',
    silencio: s.silencio,
    abre: s.abre,
    cierra: s.cierra,
    tiempo: s.tiempoMax || 'No especificado',
    tags: buildTags(s),
    menuItems: s.menuItems,
    lastMenuUpdate: s.lastMenuUpdate,
    activeCheckins,
    photo: s.photoUrl || null,
    source: s.source,
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))
  const radius = parseInt(searchParams.get('radius') || '5000')

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat y lng son requeridos' }, { status: 400 })
  }

  try {
    await ensureAreaImported({ lat, lng, radius })
  } catch (err) {
    // Si Google Places falla o no hay API key, seguimos igual con lo que haya en la BD.
    console.error('ensureAreaImported error:', err)
  }

  const latDelta = radius / 111000
  const lngDelta = radius / (111000 * Math.cos((lat * Math.PI) / 180))

  const stores = await prisma.store.findMany({
    where: {
      active: true,
      // Sacamos "hotel" de la experiencia: casi nunca tienen un lobby pensado
      // para trabajar, así que ensuciaban más de lo que ayudaban. Quedan sin
      // borrar en la base por si algún día se reincorporan.
      tipo: { not: 'hotel' },
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
    include: {
      menuItems: true,
      _count: { select: { checkins: { where: { expiresAt: { gt: new Date() }, closedAt: null } } } },
    },
    orderBy: [{ verified: 'desc' }, { ratingAvg: 'desc' }],
  })

  const places = stores.map((s) => toPlace(s, s._count.checkins))

  return NextResponse.json({ places })
}
