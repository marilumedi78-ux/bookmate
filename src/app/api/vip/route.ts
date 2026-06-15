import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Helper: check if the current user is an admin
async function getAdminUser(request?: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isVip: true },
  })

  // Must be admin OR VIP to manage VIP emails
  if (!user || (!user.isAdmin && !user.isVip)) return null
  return session.user
}

// GET /api/vip — list all VIP emails (admin/VIP only)
export async function GET() {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const vipEmails = await db.vipEmail.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ vipEmails })
  } catch {
    return NextResponse.json({ vipEmails: [] }, { status: 200 })
  }
}

// POST /api/vip — add a VIP email (admin/VIP only)
export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
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
    return NextResponse.json({ error: 'Failed to add VIP email' }, { status: 500 })
  }
}

// DELETE /api/vip — remove a VIP email (admin/VIP only)
export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
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
    return NextResponse.json({ error: 'Failed to delete VIP email' }, { status: 500 })
  }
}
