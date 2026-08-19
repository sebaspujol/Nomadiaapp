// lib/geocode.js
// Convierte una dirección de texto en lat/lng. Usa Nominatim, el geocoder
// gratuito y sin API key de OpenStreetMap — reemplaza a la Geocoding API de
// Google. Es gratis para siempre, pero tiene una política de uso que hay que
// respetar para no que nos bloqueen: máximo 1 request/segundo y un User-Agent
// descriptivo (no el genérico de fetch). Como esto corre del lado del
// servidor (nunca desde el navegador de cada usuario), un único límite acá
// alcanza para cumplirla sin importar cuánta gente use la app a la vez.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'Nomadia/1.0 (app de lugares para trabajar remoto; contacto: spujol@riamoneytransfer.com)'
const MIN_INTERVAL_MS = 1100 // un poco más de 1 seg, con margen

let lastRequestAt = 0

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()
}

export async function geocodeAddress(address) {
  if (!address) return null

  try {
    await throttle()
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null
    const results = await res.json()
    const result = results?.[0]
    if (!result) return null

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      formattedAddress: result.display_name,
    }
  } catch (err) {
    console.error('Geocode error (Nominatim):', err)
    return null
  }
}
