// scripts/seed-cities.js
// Precarga proactiva de VARIAS ciudades de una — usado para sumar cobertura
// más allá de Madrid/Buenos Aires (ej: capitales de provincia de Argentina,
// capitales de Europa). Usa OpenStreetMap (gratis, sin API key), igual que
// scripts/seed-city.js, pero recorre una lista entera con una pausa chica
// entre cada ciudad para no saturar el servicio público de Overpass.
//
// Uso:
//   node scripts/seed-cities.js argentina
//   node scripts/seed-cities.js europa
//   node scripts/seed-cities.js all

require('dotenv').config({ path: '.env.local' })
const { importPlacesForArea } = require('../lib/placesImport.js')

// Capitales de provincia de Argentina (23 provincias + CABA, que ya está
// sembrada como "Buenos Aires" con scripts/seed-city.js — no se repite acá).
const ARGENTINA = [
  { name: 'La Plata', lat: -34.9215, lng: -57.9545, radius: 9000 },
  { name: 'San Fernando del Valle de Catamarca', lat: -28.4696, lng: -65.7852, radius: 7000 },
  { name: 'Resistencia', lat: -27.4514, lng: -58.9867, radius: 8000 },
  { name: 'Rawson', lat: -43.3002, lng: -65.1023, radius: 6000 },
  { name: 'Córdoba', lat: -31.4201, lng: -64.1888, radius: 12000 },
  { name: 'Corrientes', lat: -27.4692, lng: -58.8306, radius: 8000 },
  { name: 'Paraná', lat: -31.7333, lng: -60.5238, radius: 8000 },
  { name: 'Formosa', lat: -26.1775, lng: -58.1781, radius: 7000 },
  { name: 'San Salvador de Jujuy', lat: -24.1858, lng: -65.2995, radius: 7000 },
  { name: 'Santa Rosa', lat: -36.6167, lng: -64.2833, radius: 6000 },
  { name: 'La Rioja', lat: -29.4131, lng: -66.8558, radius: 7000 },
  { name: 'Mendoza', lat: -32.8895, lng: -68.8458, radius: 10000 },
  { name: 'Posadas', lat: -27.3671, lng: -55.8961, radius: 8000 },
  { name: 'Neuquén', lat: -38.9516, lng: -68.0591, radius: 8000 },
  { name: 'Viedma', lat: -40.8135, lng: -62.9967, radius: 6000 },
  { name: 'Salta', lat: -24.7859, lng: -65.4117, radius: 9000 },
  { name: 'San Juan', lat: -31.5375, lng: -68.5364, radius: 8000 },
  { name: 'San Luis', lat: -33.295, lng: -66.3356, radius: 7000 },
  { name: 'Río Gallegos', lat: -51.623, lng: -69.2168, radius: 6000 },
  { name: 'Santa Fe', lat: -31.6333, lng: -60.7, radius: 9000 },
  { name: 'Santiago del Estero', lat: -27.7834, lng: -64.2642, radius: 7000 },
  { name: 'Ushuaia', lat: -54.8019, lng: -68.303, radius: 6000 },
  { name: 'San Miguel de Tucumán', lat: -26.8083, lng: -65.2176, radius: 9000 },
  { name: 'San Carlos de Bariloche', lat: -41.1335, lng: -71.3103, radius: 8000 },
]

// Capitales de países de Europa (Madrid ya está sembrada con seed-city.js —
// no se repite acá). Lista de estados soberanos comúnmente reconocidos como
// europeos; se puede ajustar según lo que te interese cubrir.
const EUROPA = [
  { name: 'Lisboa (Portugal)', lat: 38.7223, lng: -9.1393, radius: 10000 },
  { name: 'París (Francia)', lat: 48.8566, lng: 2.3522, radius: 14000 },
  { name: 'Berlín (Alemania)', lat: 52.52, lng: 13.405, radius: 13000 },
  { name: 'Roma (Italia)', lat: 41.9028, lng: 12.4964, radius: 12000 },
  { name: 'Londres (Reino Unido)', lat: 51.5074, lng: -0.1278, radius: 15000 },
  { name: 'Dublín (Irlanda)', lat: 53.3498, lng: -6.2603, radius: 9000 },
  { name: 'Ámsterdam (Países Bajos)', lat: 52.3676, lng: 4.9041, radius: 9000 },
  { name: 'Bruselas (Bélgica)', lat: 50.8503, lng: 4.3517, radius: 9000 },
  { name: 'Luxemburgo (Luxemburgo)', lat: 49.6116, lng: 6.1319, radius: 6000 },
  { name: 'Berna (Suiza)', lat: 46.948, lng: 7.4474, radius: 7000 },
  { name: 'Viena (Austria)', lat: 48.2082, lng: 16.3738, radius: 10000 },
  { name: 'Copenhague (Dinamarca)', lat: 55.6761, lng: 12.5683, radius: 9000 },
  { name: 'Oslo (Noruega)', lat: 59.9139, lng: 10.7522, radius: 9000 },
  { name: 'Estocolmo (Suecia)', lat: 59.3293, lng: 18.0686, radius: 10000 },
  { name: 'Helsinki (Finlandia)', lat: 60.1699, lng: 24.9384, radius: 9000 },
  { name: 'Reikiavik (Islandia)', lat: 64.1466, lng: -21.9426, radius: 6000 },
  { name: 'Varsovia (Polonia)', lat: 52.2297, lng: 21.0122, radius: 10000 },
  { name: 'Praga (Chequia)', lat: 50.0755, lng: 14.4378, radius: 9000 },
  { name: 'Bratislava (Eslovaquia)', lat: 48.1486, lng: 17.1077, radius: 7000 },
  { name: 'Budapest (Hungría)', lat: 47.4979, lng: 19.0402, radius: 10000 },
  { name: 'Liubliana (Eslovenia)', lat: 46.0569, lng: 14.5058, radius: 6000 },
  { name: 'Zagreb (Croacia)', lat: 45.815, lng: 15.9819, radius: 8000 },
  { name: 'Sarajevo (Bosnia y Herzegovina)', lat: 43.8563, lng: 18.4131, radius: 7000 },
  { name: 'Belgrado (Serbia)', lat: 44.7866, lng: 20.4489, radius: 9000 },
  { name: 'Podgorica (Montenegro)', lat: 42.4304, lng: 19.2594, radius: 6000 },
  { name: 'Skopie (Macedonia del Norte)', lat: 41.9981, lng: 21.4254, radius: 6000 },
  { name: 'Tirana (Albania)', lat: 41.3275, lng: 19.8187, radius: 7000 },
  { name: 'Atenas (Grecia)', lat: 37.9838, lng: 23.7275, radius: 10000 },
  { name: 'Sofía (Bulgaria)', lat: 42.6977, lng: 23.3219, radius: 9000 },
  { name: 'Bucarest (Rumania)', lat: 44.4268, lng: 26.1025, radius: 10000 },
  { name: 'Chisináu (Moldavia)', lat: 47.0105, lng: 28.8638, radius: 7000 },
  { name: 'Kiev (Ucrania)', lat: 50.4501, lng: 30.5234, radius: 10000 },
  { name: 'Vilna (Lituania)', lat: 54.6872, lng: 25.2797, radius: 7000 },
  { name: 'Riga (Letonia)', lat: 56.9496, lng: 24.1052, radius: 8000 },
  { name: 'Tallin (Estonia)', lat: 59.437, lng: 24.7536, radius: 7000 },
  { name: 'Andorra la Vella (Andorra)', lat: 42.5063, lng: 1.5218, radius: 4000 },
  { name: 'Mónaco (Mónaco)', lat: 43.7384, lng: 7.4246, radius: 3000 },
  { name: 'La Valeta (Malta)', lat: 35.8989, lng: 14.5146, radius: 5000 },
  { name: 'Nicosia (Chipre)', lat: 35.1856, lng: 33.3823, radius: 7000 },
]

const LISTS = { argentina: ARGENTINA, europa: EUROPA, all: [...ARGENTINA, ...EUROPA] }

// Pausa entre ciudades para no golpear el servicio público de Overpass de
// forma agresiva — es gratis, pero hay que usarlo con buenos modales.
const DELAY_MS = 2000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const listArg = (process.argv[2] || '').toLowerCase()
  const list = LISTS[listArg]

  if (!list) {
    console.error(`Lista desconocida: "${listArg}". Opciones: ${Object.keys(LISTS).join(', ')}.`)
    process.exit(1)
  }

  console.log(`Sembrando ${list.length} ciudades (${listArg})...\n`)
  let totalImported = 0

  for (const [i, city] of list.entries()) {
    process.stdout.write(`[${i + 1}/${list.length}] ${city.name}... `)
    try {
      const result = await importPlacesForArea(city)
      const imported = result.imported || 0
      totalImported += imported
      console.log(`${imported} lugares`)
    } catch (err) {
      console.log(`error: ${err.message}`)
    }
    if (i < list.length - 1) await sleep(DELAY_MS)
  }

  console.log(`\nListo. Total importado: ${totalImported} lugares en ${list.length} ciudades.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
