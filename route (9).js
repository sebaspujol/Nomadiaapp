// app/api/menu-scan/route.js
// Recibe una imagen de menú, la manda a Claude con visión,
// y devuelve items estructurados (nombre, precio, categoría).
// Ya no hace falta ser "dueño" del local: cualquiera que haya hecho check-in
// ahí puede escanear y actualizar el menú, igual que puede dejar una review.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import prisma from '../../../lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rate limit básico en memoria: 1 escaneo cada 5 minutos por store.
const lastScanByStore = new Map()
const RATE_LIMIT_MS = 5 * 60 * 1000

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('menu')
    const storeId = formData.get('storeId')

    if (!file) {
      return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })
    }
    if (!storeId) {
      return NextResponse.json({ error: 'Falta storeId' }, { status: 400 })
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

    const lastScan = lastScanByStore.get(storeId)
    if (lastScan && Date.now() - lastScan < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Ya escaneaste un menú hace poco. Esperá unos minutos antes de volver a intentar.' },
        { status: 429 }
      )
    }

    // Convertir a base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type || 'image/jpeg'

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Analizá esta imagen de menú de un café/restaurante.
Extraé TODOS los items que puedas leer: nombre del plato/bebida y precio.
Agregalos en categorías lógicas (Bebidas calientes, Bebidas frías, Comida, Postres, etc.)

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, en este formato exacto:
{
  "items": [
    { "nombre": "Café con leche", "precio": 2.50, "categoria": "Bebidas calientes" },
    { "nombre": "Tostada con tomate", "precio": 3.00, "categoria": "Comida" }
  ]
}

Si no podés leer el precio, usá null. Si no hay precio visible en ningún item, igual extraé los nombres.`,
            },
          ],
        },
      ],
    })

    lastScanByStore.set(storeId, Date.now())

    const raw = response.content[0]?.text || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({ ok: true, items: parsed.items || [] })
  } catch (err) {
    console.error('Menu scan error:', err)
    return NextResponse.json({ error: 'Error procesando la imagen' }, { status: 500 })
  }
}
