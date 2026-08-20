// lib/placesImport.js
// Importa locales desde OpenStreetMap (vía Overpass API) bajo demanda para
// una zona (lat/lng + radio) y los guarda en la tabla Store como "sin
// verificar" (source: "osm"). No es una carga masiva de continentes enteros:
// se dispara solo cuando alguien busca una zona sin datos propios recientes
// (ver ensureAreaImported / /api/spots).
//
// Por qué OpenStreetMap y no Google Places: es 100% gratis, sin límite de
// gasto ni tarjeta de crédito — clave mientras no sepamos si el proyecto es
// rentable. La contra es que la cobertura de datos es un poco más despareja
// que Google en algunas zonas (puede faltar algún café chico), pero en
// centros de ciudades grandes como Madrid o Buenos Aires funciona bien.

import prisma from './prisma.js'

const CACHE_DAYS = 30 // a partir de cuántos días se considera "vieja" una zona ya importada

// Con Google Places, este interruptor existía para no arriesgar gasto.
// Overpass es gratis, así que por defecto lo dejamos activado — pero lo
// mantenemos configurable por si alguna vez el servicio público de Overpass
// está lento/caído y preferís depender solo de lo ya sembrado a mano.
const LIVE_IMPORT_ENABLED = process.env.ENABLE_LIVE_PLACE_IMPORT !== 'false'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter', // mirror de respaldo
]
const USER_AGENT = 'Nomadia/1.0 (app de lugares para trabajar remoto; contacto: spujol@riamoneytransfer.com)'

// Tags de OpenStreetMap que representan cada categoría nuestra.
// https://wiki.openstreetmap.org/wiki/Map_features
// Sacamos los hoteles del import: casi nunca tienen un lobby pensado para
// trabajar como sí lo tiene un café o un cowork, así que solo ensuciaban la
// experiencia. Quedan Cafés, Coworks y Bibliotecas por ahora.
const CATEGORY_FILTERS = [
  { filter: 'node["amenity"="cafe"](around:{radius},{lat},{lng});', tipoDefault: 'cafe' },
  { filter: 'node["office"="coworking"](around:{radius},{lat},{lng});', tipoDefault: 'cowork' },
  { filter: 'node["amenity"="library"](around:{radius},{lat},{lng});', tipoDefault: 'biblioteca' },
]

function buildOverpassQuery({ lat, lng, radius }) {
  const filters = CATEGORY_FILTERS.map((c) =>
    c.filter.replace('{radius}', radius).replace('{lat}', lat).replace('{lng}', lng)
  ).join('\n  ')
  return `[out:json][timeout:25];\n(\n  ${filters}\n);\nout body;`
}

// El servidor público de Overpass a veces se cuelga en vez de responder con
// error — sin esto, un `fetch` que nunca resuelve deja el import trabado
// para siempre. 30 segundos alcanza de sobra en un uso normal, y si se pasa,
// pasamos al mirror de respaldo en vez de quedarnos esperando.
const REQUEST_TIMEOUT_MS = 30000

async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function runOverpassQuery(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'User-Agent': USER_AGENT },
        body: query,
      })
      if (!res.ok) continue
      return await res.json()
    } catch (err) {
      console.error(`Overpass endpoint ${endpoint} falló o tardó demasiado, probando el siguiente:`, err.message)
    }
  }
  return null
}

function tipoFromTags(tags = {}) {
  if (tags.office === 'coworking' || (tags.name || '').toLowerCase().includes('cowork')) return 'cowork'
  if (tags.amenity === 'library') return 'biblioteca'
  return 'cafe'
}

// Trae y guarda (upsert por googlePlaceId, que ahora usamos como "osm:<id>")
// los locales de una zona.
export async function importPlacesForArea({ lat, lng, radius = 5000 }) {
  const query = buildOverpassQuery({ lat, lng, radius })
  const data = await runOverpassQuery(query)
  if (!data) return { imported: 0, skipped: 'overpass_unavailable' }

  let imported = 0
  const seen = new Set()

  for (const el of data.elements || []) {
    if (el.type !== 'node' || el.lat == null || el.lon == null) continue
    const tags = el.tags || {}
    const nombre = tags.name
    if (!nombre) continue // sin nombre no sirve mostrarlo en la lista

    const osmId = `osm:${el.id}`
    if (seen.has(osmId)) continue
    seen.add(osmId)

    const tipo = tipoFromTags(tags)
    const direccion = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || tags['addr:full'] || ''
    const barrio = tags['addr:suburb'] || tags['addr:neighbourhood'] || ''
    const ciudad = tags['addr:city'] || null

    await prisma.store.upsert({
      where: { googlePlaceId: osmId },
      update: {
        nombre,
        direccion: direccion || undefined,
        lat: el.lat,
        lng: el.lon,
      },
      create: {
        ownerId: null,
        nombre,
        tipo,
        direccion: direccion || 'Dirección no especificada',
        barrio,
        ciudad,
        lat: el.lat,
        lng: el.lon,
        source: 'osm',
        googlePlaceId: osmId,
        // Sin foto al importar — la primera foto real la sube la comunidad
        // (ver app/api/reviews/route.js).
        verified: false,
      },
    })
    imported++
  }

  return { imported }
}

// Antes de servir resultados de una zona, se fija si ya hay datos propios
// razonablemente frescos ahí; si no, dispara el import bajo demanda desde
// OpenStreetMap. Como es gratis, queda activado por defecto — pero respeta
// el mismo caché de 30 días para no golpear el servicio público de Overpass
// más de lo necesario (buena práctica, no por costo).
export async function ensureAreaImported({ lat, lng, radius = 5000 }) {
  if (!LIVE_IMPORT_ENABLED) return { skipped: 'live_import_disabled' }

  const cutoff = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000)
  const latDelta = radius / 111000
  const lngDelta = radius / (111000 * Math.cos((lat * Math.PI) / 180))

  const recentCount = await prisma.store.count({
    where: {
      updatedAt: { gte: cutoff },
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
  })

  if (recentCount > 0) return { skipped: 'has_recent_data', recentCount }

  return importPlacesForArea({ lat, lng, radius })
}
