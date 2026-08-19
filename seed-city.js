// scripts/seed-city.js
// Precarga proactiva de una ciudad con datos de OpenStreetMap (gratis, sin
// API key), para el lanzamiento friends & family (Madrid y Buenos Aires) —
// el resto del mundo se cubre bajo demanda vía lib/placesImport.js cuando
// alguien busca esa zona.
//
// Uso:
//   node scripts/seed-city.js madrid
//   node scripts/seed-city.js "buenos aires"
//   node scripts/seed-city.js custom 40.4168 -3.7038 8000

require('dotenv').config({ path: '.env.local' })
const { importPlacesForArea } = require('../lib/placesImport')

const CITIES = {
  madrid: { lat: 40.4168, lng: -3.7038, radius: 8000 },
  'buenos aires': { lat: -34.6037, lng: -58.3816, radius: 10000 },
}

async function main() {
  const [, , cityArg, latArg, lngArg, radiusArg] = process.argv

  let area
  if (cityArg === 'custom') {
    area = { lat: parseFloat(latArg), lng: parseFloat(lngArg), radius: parseInt(radiusArg || '8000') }
  } else {
    area = CITIES[(cityArg || '').toLowerCase()]
  }

  if (!area) {
    console.error(`Ciudad desconocida: "${cityArg}". Opciones: ${Object.keys(CITIES).join(', ')}, o "custom lat lng radio".`)
    process.exit(1)
  }

  console.log(`Importando locales para ${cityArg} (${area.lat}, ${area.lng}, radio ${area.radius}m)...`)
  const result = await importPlacesForArea(area)
  console.log('Resultado:', result)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
