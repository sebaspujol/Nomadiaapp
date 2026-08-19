// app/api/reviews/route.js
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '../../../lib/prisma'
import { grantPoints } from '../../../lib/points'

const FACTORS = ['comodidad', 'silencio', 'enchufes', 'conectividad', 'servicio', 'comida']

// Foto opcional adjunta a la review: llega como data URL (base64) desde el
// cliente. La guardamos tal cual en la review y, si el local todavía no
// tiene foto de portada, la usamos como tal. Límite generoso pero acotado
// para no inflar la base de datos con fotos gigantes.
const MAX_PHOTO_DATA_URL_LENGTH = 4_000_000 // ~3MB de imagen en base64
const PHOTO_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/

function validatePhoto(photoDataUrl) {
  if (photoDataUrl == null) return null
  if (typeof photoDataUrl !== 'string' || !PHOTO_DATA_URL_RE.test(photoDataUrl)) {
    return 'La foto debe ser una imagen válida (png, jpg, webp o gif)'
  }
  if (photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
    return 'La foto es demasiado pesada, probá con una más liviana'
  }
  return null
}

function validateFactors(body) {
  for (const f of FACTORS) {
    const v = body[f]
    if (typeof v !== 'number' || v < 1 || v > 5 || !Number.isInteger(v)) {
      return `El factor "${f}" debe ser un entero entre 1 y 5`
    }
  }
  if (typeof body.tiempoMaximo !== 'boolean' || typeof body.consumoMinimo !== 'boolean') {
    return 'Faltan las respuestas de tiempo máximo / consumo mínimo'
  }
  return null
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { checkinId } = body
    if (!checkinId) {
      return NextResponse.json({ error: 'Falta checkinId' }, { status: 400 })
    }

    const validationError = validateFactors(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const photoError = validatePhoto(body.photoDataUrl)
    if (photoError) {
      return NextResponse.json({ error: photoError }, { status: 400 })
    }

    // Solo se puede reviewar con un check-in propio (activo o pasado) que
    // todavía no tenga una review asociada.
    const checkin = await prisma.checkin.findUnique({
      where: { id: checkinId },
      include: { review: true },
    })
    if (!checkin || checkin.userId !== session.user.id) {
      return NextResponse.json({ error: 'Check-in no encontrado' }, { status: 404 })
    }
    if (checkin.review) {
      return NextResponse.json({ error: 'Esta visita ya tiene una review' }, { status: 409 })
    }

    const ratingAvg = FACTORS.reduce((sum, f) => sum + body[f], 0) / FACTORS.length
    const photoUrl = body.photoDataUrl || null

    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        storeId: checkin.storeId,
        checkinId: checkin.id,
        comodidad: body.comodidad,
        silencio: body.silencio,
        enchufes: body.enchufes,
        conectividad: body.conectividad,
        servicio: body.servicio,
        comida: body.comida,
        tiempoMaximo: body.tiempoMaximo,
        tiempoMaximoTxt: body.tiempoMaximo ? body.tiempoMaximoTxt || null : null,
        consumoMinimo: body.consumoMinimo,
        consumoMinimoTxt: body.consumoMinimo ? body.consumoMinimoTxt || null : null,
        ratingAvg,
        comentario: body.comentario || null,
        photoUrl,
      },
    })

    // Recalcular agregados del local a partir de todas sus reviews.
    const agg = await prisma.review.aggregate({
      where: { storeId: checkin.storeId },
      _avg: { ratingAvg: true },
      _count: { id: true },
    })

    // Foto de portada comunitaria: si esta review trae foto y el local
    // todavía no tiene una, la usamos como portada. Los locales importados
    // de Google arrancan sin foto a propósito (no usamos la Photo API de
    // Google, tiene la cuota gratis más chica y cobra por cada vista) — así
    // que casi siempre va a ser la primera foto real que ve ese local.
    const storeUpdateData = {
      ratingAvg: agg._avg.ratingAvg || 0,
      reviewCount: agg._count.id,
      verified: agg._count.id > 0,
    }
    let becameNewCoverPhoto = false
    if (photoUrl) {
      const store = await prisma.store.findUnique({
        where: { id: checkin.storeId },
        select: { photoUrl: true },
      })
      if (!store?.photoUrl) {
        storeUpdateData.photoUrl = photoUrl
        becameNewCoverPhoto = true
      }
    }

    await prisma.store.update({
      where: { id: checkin.storeId },
      data: storeUpdateData,
    })

    const pointsResult = await grantPoints({ userId: session.user.id, storeId: checkin.storeId, source: 'review' })

    // Puntito extra, una sola vez por local, para quien le puso la primera
    // foto de portada real (ver ONCE_PER_STORE_SOURCES en lib/points.js:
    // no importa cuántas fotos se suban después, esto se paga una única vez).
    let photoPointsResult = null
    if (becameNewCoverPhoto) {
      photoPointsResult = await grantPoints({ userId: session.user.id, storeId: checkin.storeId, source: 'photo' })
    }

    return NextResponse.json({ review, points: pointsResult, photoPoints: photoPointsResult })
  } catch (err) {
    console.error('Review create error:', err)
    return NextResponse.json({ error: 'Error guardando la review' }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    if (!storeId) {
      return NextResponse.json({ error: 'Falta storeId' }, { status: 400 })
    }

    const reviews = await prisma.review.findMany({
      where: { storeId },
      include: { user: { select: { name: true, image: true, jobRole: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ reviews })
  } catch (err) {
    console.error('Reviews fetch error:', err)
    return NextResponse.json({ error: 'Error cargando reviews' }, { status: 500 })
  }
}
