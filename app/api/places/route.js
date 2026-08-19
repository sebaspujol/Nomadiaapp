// app/api/places/route.js
// Llama a Google Places API y normaliza los datos para Nomadia

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

const SEARCH_TYPES = [
  { query: 'cafe coworking Madrid', tipo: 'cafe' },
  { query: 'coworking space Madrid', tipo: 'cowork' },
  { query: 'biblioteca publica Madrid', tipo: 'biblioteca' },
  { query: 'hotel lobby trabajo Madrid', tipo: 'hotel' },
  { query: 'cafeteria trabajo laptop Madrid', tipo: 'cafe' },
]

// Mapa de palabras clave → tipo
function inferTipo(name, types) {
  const n = (name || '').toLowerCase()
  if (n.includes('cowork') || n.includes('hub') || n.includes('espacio de trabajo')) return 'cowork'
  if (n.includes('biblioteca') || n.includes('library')) return 'biblioteca'
  if (n.includes('hotel') || n.includes('hostel')) return 'hotel'
  return 'cafe'
}

// Estima precio según price_level de Google (0-4)
function precioFromLevel(level, tipo) {
  const map = {
    cafe: [null, '€2–4', '€4–8', '€8–15', '€15+'],
    cowork: [null, '€10/día', '€15/día', '€25/día', '€40+/día'],
    hotel: [null, '€5', '€8', '€12', '€20+'],
    biblioteca: ['Gratis', 'Gratis', 'Gratis', 'Gratis', 'Gratis'],
  }
  const num = { cafe: [0,3,6,12,20], cowork: [0,10,15,25,40], hotel: [0,5,8,12,20], biblioteca: [0,0,0,0,0] }
  const l = level ?? 1
  return {
    precio: (map[tipo] || map.cafe)[l] || '€5',
    precioNum: (num[tipo] || num.cafe)[l] || 5,
    gratis: tipo === 'biblioteca',
  }
}

function buildOcupacion(tipo) {
  // Curvas realistas de afluencia por hora (índice 0 = 8h, 11 = 19h)
  const curves = {
    cafe:       [20, 35, 55, 70, 80, 75, 60, 50, 45, 40, 30, 20],
    cowork:     [10, 30, 60, 80, 85, 80, 75, 65, 55, 40, 25, 10],
    biblioteca: [15, 40, 65, 75, 70, 65, 60, 55, 50, 40, 30, 10],
    hotel:      [10, 20, 35, 45, 50, 55, 50, 40, 35, 30, 20, 15],
  }
  return (curves[tipo] || curves.cafe).map(v => v + Math.round((Math.random() - 0.5) * 10))
}

function enrichPlace(place, tipo) {
  const { precio, precioNum, gratis } = precioFromLevel(place.price_level, tipo)
  return {
    id: place.place_id,
    tipo,
    emoji: { cafe: '☕', cowork: '🏢', biblioteca: '📚', hotel: '🏨' }[tipo] || '☕',
    nombre: place.name,
    barrio: place.vicinity?.split(',').pop()?.trim() || 'Madrid',
    direccion: place.vicinity || '',
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    rating: place.rating || 4.0,
    reviews: place.user_ratings_total || 0,
    precio,
    precioNum,
    gratis,
    consumoMin: gratis ? 'Libre y gratuito' : `Consumo mín. ${precio}`,
    enchufes: tipo === 'cowork' ? 40 : tipo === 'biblioteca' ? 30 : 8,
    wifi: tipo === 'cowork' ? '300 Mbps' : '80 Mbps',
    mesas: tipo === 'biblioteca' || tipo === 'cowork' ? 'Mesa larga disponible' : 'Mesas individuales',
    silencio: tipo === 'biblioteca' || tipo === 'cowork',
    abre: tipo === 'biblioteca' ? 9 : 7,
    cierra: tipo === 'biblioteca' ? 20 : 22,
    tiempo: tipo === 'biblioteca' ? 'Horario oficial' : tipo === 'cowork' ? 'Horario libre' : 'Sin límite',
    food: tipo === 'cafe' ? ['Café', 'Brunch'] : tipo === 'cowork' ? ['Café ilimitado'] : [],
    tags: [
      tipo === 'cowork' || tipo === 'biblioteca' ? 'Enchufes' : null,
      'Wifi',
      tipo === 'biblioteca' || tipo === 'cowork' ? 'Silencio' : null,
      gratis ? 'Gratis' : null,
      tipo === 'cowork' ? 'Sala reuniones' : null,
    ].filter(Boolean),
    ocupacion: buildOcupacion(tipo),
    checkins: [],
    resenas: [],
    photo: place.photos?.[0]
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
      : null,
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat') || '40.4168'
  const lng = searchParams.get('lng') || '-3.7038'

  if (!GOOGLE_API_KEY) {
    // Modo demo: devuelve datos de muestra si no hay API key
    return Response.json({ places: getDemoPlaces(), demo: true })
  }

  try {
    const allPlaces = []
    const seen = new Set()

    for (const { query, tipo } of SEARCH_TYPES) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=5000&language=es&key=${GOOGLE_API_KEY}`
      const res = await fetch(url)
      const data = await res.json()

      for (const place of (data.results || []).slice(0, 8)) {
        if (!seen.has(place.place_id)) {
          seen.add(place.place_id)
          const tipoInferido = inferTipo(place.name, place.types)
          allPlaces.push(enrichPlace(place, tipoInferido))
        }
      }
    }

    return Response.json({ places: allPlaces })
  } catch (err) {
    console.error('Google Places error:', err)
    return Response.json({ places: getDemoPlaces(), demo: true })
  }
}

// Datos de muestra para cuando no hay API key configurada
function getDemoPlaces() {
  return [
    { id:'1', tipo:'cafe', emoji:'☕', nombre:'Café Comercial', barrio:'Chueca', direccion:'Glorieta de Bilbao, 7', lat:40.4272, lng:-3.7034, rating:4.7, reviews:312, precio:'€3–6', precioNum:4, gratis:false, consumoMin:'Sin consumo mínimo', enchufes:8, wifi:'85 Mbps', mesas:'Mesa larga disponible', silencio:false, abre:7, cierra:22, tiempo:'Sin límite', food:['Brunch','Bocadillos'], tags:['Enchufes','Wifi','Mesa larga','Terraza'], ocupacion:[10,15,25,40,60,75,85,70,60,45,30,20], checkins:[{ini:'MR',nombre:'María R.',rol:'Diseñadora UX',color:'#E8F5EE',tc:'#2D6A4F'}], resenas:[{ini:'AL',nombre:'Ana L.',texto:'Ambiente increíble para trabajar por las mañanas.',stars:5,hasImg:false}], photo:null },
    { id:'2', tipo:'cafe', emoji:'☕', nombre:'Federal Café', barrio:'Malasaña', direccion:'Plaza de Comendadoras, 9', lat:40.4251, lng:-3.7098, rating:4.5, reviews:189, precio:'€4–8', precioNum:6, gratis:false, consumoMin:'Consumo mín. €4', enchufes:12, wifi:'120 Mbps', mesas:'Varias mesas largas', silencio:true, abre:9, cierra:18, tiempo:'3h máx', food:['Brunch','Specialty coffee','Sin gluten','Vegano'], tags:['Enchufes','Wifi','Mesa larga','Silencio'], ocupacion:[5,8,20,50,80,90,70,55,40,30,15,10], checkins:[{ini:'AL',nombre:'Ana L.',rol:'Founder',color:'#FEF3E2',tc:'#C9841A'}], resenas:[{ini:'PR',nombre:'Pablo R.',texto:'El mejor para trabajar en silencio.',stars:5,hasImg:false}], photo:null },
    { id:'3', tipo:'cowork', emoji:'🏢', nombre:'Utopicus Fuencarral', barrio:'Chueca', direccion:'C/ Fuencarral, 138', lat:40.4285, lng:-3.7012, rating:4.8, reviews:94, precio:'€15/día', precioNum:15, gratis:false, consumoMin:'Día completo o medio día', enchufes:40, wifi:'300 Mbps', mesas:'2 salas mesa larga', silencio:true, abre:8, cierra:21, tiempo:'Horario libre', food:['Café ilimitado'], tags:['Enchufes','Wifi','Mesa larga','Silencio','Sala reuniones','Impresora'], ocupacion:[0,0,5,40,70,85,80,75,60,50,30,10], checkins:[{ini:'SF',nombre:'Sara F.',rol:'Founder',color:'#FEF3E2',tc:'#C9841A'},{ini:'IG',nombre:'Ignacio G.',rol:'Dev fullstack',color:'#E8F4FD',tc:'#1A5276'}], resenas:[{ini:'MM',nombre:'Miguel M.',texto:'Instalaciones perfectas. El café de cortesía es un plus.',stars:5,hasImg:false}], photo:null },
    { id:'4', tipo:'cowork', emoji:'🏢', nombre:'WeWork Castellana', barrio:'Salamanca', direccion:'P. de la Castellana, 77', lat:40.4378, lng:-3.6923, rating:4.6, reviews:201, precio:'€25/día', precioNum:25, gratis:false, consumoMin:'Membresía o día suelto', enchufes:60, wifi:'500 Mbps', mesas:'Open space + privados', silencio:false, abre:8, cierra:22, tiempo:'Horario libre', food:['Café ilimitado','Bocadillos'], tags:['Enchufes','Wifi','Sala reuniones','Café ilimitado'], ocupacion:[0,0,10,55,80,90,85,75,65,40,20,5], checkins:[{ini:'TC',nombre:'Tomás C.',rol:'Diseñador',color:'#E8F5EE',tc:'#2D6A4F'},{ini:'RG',nombre:'Rodrigo G.',rol:'CTO',color:'#FAECE7',tc:'#C04B2D'}], resenas:[{ini:'DM',nombre:'Diego M.',texto:'Buenas instalaciones aunque algo ruidoso.',stars:4,hasImg:false}], photo:null },
    { id:'5', tipo:'biblioteca', emoji:'📚', nombre:'Biblioteca Retiro', barrio:'Retiro', direccion:'C/ Páez de la Cadena, 9', lat:40.4089, lng:-3.6893, rating:4.9, reviews:445, precio:'Gratis', precioNum:0, gratis:true, consumoMin:'Libre y gratuito', enchufes:30, wifi:'50 Mbps', mesas:'Mesas largas con separadores', silencio:true, abre:9, cierra:20, tiempo:'Horario oficial', food:[], tags:['Enchufes','Silencio','Gratis','Mesa larga'], ocupacion:[0,0,0,20,60,80,75,70,65,50,30,0], checkins:[{ini:'IG',nombre:'Isabel G.',rol:'Estudiante PhD',color:'#FEF3E2',tc:'#C9841A'}], resenas:[{ini:'AL',nombre:'Ana L.',texto:'La mejor biblioteca para estudiar. Silencio total.',stars:5,hasImg:false}], photo:null },
    { id:'6', tipo:'hotel', emoji:'🏨', nombre:'Lobby — Hotel Catalonia', barrio:'Salamanca', direccion:'C/ Alcalá, 93', lat:40.4195, lng:-3.6890, rating:4.3, reviews:67, precio:'€8 (consumición)', precioNum:8, gratis:false, consumoMin:'1 consumición mín.', enchufes:15, wifi:'80 Mbps', mesas:'Sofás + mesas bajas', silencio:true, abre:7, cierra:23, tiempo:'4h máx', food:['Bocadillos'], tags:['Enchufes','Silencio','AC'], ocupacion:[5,10,20,35,45,55,50,40,30,25,15,10], checkins:[], resenas:[{ini:'RM',nombre:'Rodrigo M.',texto:'Perfecto para llamadas tranquilas.',stars:4,hasImg:false}], photo:null },
    { id:'7', tipo:'cafe', emoji:'☕', nombre:'Misión Café', barrio:'Lavapiés', direccion:'C/ Relatores, 7', lat:40.4127, lng:-3.7023, rating:4.6, reviews:158, precio:'€3–7', precioNum:5, gratis:false, consumoMin:'Sin mínimo establecido', enchufes:6, wifi:'90 Mbps', mesas:'Mesas pequeñas', silencio:false, abre:8, cierra:19, tiempo:'2h máx hora punta', food:['Specialty coffee','Vegano','Sin gluten'], tags:['Enchufes','Wifi','Specialty coffee'], ocupacion:[0,5,15,45,70,85,80,65,50,35,20,10], checkins:[{ini:'VR',nombre:'Valeria R.',rol:'UX researcher',color:'#E8F5EE',tc:'#2D6A4F'}], resenas:[{ini:'TC',nombre:'Tomás C.',texto:'El mejor specialty coffee de Madrid.',stars:5,hasImg:false}], photo:null },
  ]
}
