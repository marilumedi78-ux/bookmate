import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Helper: check if the current user is an admin (strict: isAdmin flag only)
async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) return null
  return session.user
}

// Helper: check if the current user is admin or VIP (read-only access)
async function getAdminOrVipUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isVip: true },
  })

  if (!user || (!user.isAdmin && !user.isVip)) return null
  return session.user
}

// GET /api/vip — list all VIP emails (admin/VIP can view)
export async function GET() {
  try {
    const user = await getAdminOrVipUser()
    if (!user) {
      return NextResponse.json({ error: 'Acceso denegado. Requiere ser administrador o VIP.' }, { status: 403 })
    }

    const vipEmails = await db.vipEmail.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ vipEmails })
  } catch {
    return NextResponse.json({ vipEmails: [] }, { status: 200 })
  }
}

// POST /api/vip — add a VIP email (ADMIN ONLY)
export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores pueden agregar VIPs.' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if already exists
    const existing = await db.vipEmail.findUnique({
      where: { email: normalizedEmail },
    })
    if (existing) {
      return NextResponse.json({ vip: existing, alreadyExists: true })
    }

    const vip = await db.vipEmail.create({
      data: { email: normalizedEmail, addedBy: adminUser.email || 'admin' },
    })

    // Also mark any existing user with this email as VIP
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (user) {
      await db.user.update({
        where: { email: normalizedEmail },
        data: { isVip: true, plan: 'pro' },
      })
    }

    return NextResponse.json({ vip, created: true })
  } catch {
    return NextResponse.json({ error: 'Error al agregar email VIP' }, { status: 500 })
  }
}

// DELETE /api/vip — remove a VIP email (ADMIN ONLY)
export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores pueden eliminar VIPs.' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    await db.vipEmail.deleteMany({
      where: { email: normalizedEmail },
    })

    // Remove VIP status from user if exists
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (user) {
      await db.user.update({
        where: { email: normalizedEmail },
        data: { isVip: false, plan: 'free' },
      })
    }

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar email VIP' }, { status: 500 })
  }
}
