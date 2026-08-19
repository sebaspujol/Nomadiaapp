// app/api/auth/register/route.js
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '../../../../lib/prisma'

export async function POST(req) {
  try {
    const { name, email, password, jobRole } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    // Una sola cuenta para todos — no hay un rol separado de "dueño de local".
    // Cualquier usuario logueado puede sumar un lugar y, con un check-in real,
    // dejar reviews, subir el menú o actualizar la foto de portada.
    const user = await prisma.user.create({
      data: { name, email, password: hashed, jobRole: jobRole || null },
    })

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
