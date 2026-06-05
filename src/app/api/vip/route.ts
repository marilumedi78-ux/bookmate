import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vip — list all VIP emails (admin only)
export async function GET() {
  try {
    const vipEmails = await db.vipEmail.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ vipEmails })
  } catch {
    return NextResponse.json({ vipEmails: [] }, { status: 200 })
  }
}

// POST /api/vip — add a VIP email
export async function POST(req: NextRequest) {
  try {
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
      data: { email: normalizedEmail, addedBy: 'admin' },
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

// DELETE /api/vip — remove a VIP email
export async function DELETE(req: NextRequest) {
  try {
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
