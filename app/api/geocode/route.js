// app/api/geocode/route.js
// Usado por el buscador de ciudad del Header: convierte "Buenos Aires" o
// "Lisboa, Portugal" en lat/lng para recentrar el mapa de descubrimiento
// en cualquier parte del mundo (cobertura global bajo demanda).

import { NextResponse } from 'next/server'
import { geocodeAddress } from '../../../lib/geocode'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) {
    return NextResponse.json({ error: 'Falta address' }, { status: 400 })
  }

  const geo = await geocodeAddress(address)
  if (!geo) {
    return NextResponse.json({ error: 'No pudimos encontrar esa ubicación' }, { status: 404 })
  }

  return NextResponse.json(geo)
}
