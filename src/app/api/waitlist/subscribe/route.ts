import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/waitlist/subscribe
// Body: { email, name?, referralCode? }
// Adds an email to the launch waitlist. Returns success even if already
// subscribed (to avoid leaking who's on the list).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = (body?.email || '').toString().toLowerCase().trim()
    const name = (body?.name || '').toString().trim() || null
    const referralCode = (body?.referralCode || '').toString().trim() || null

    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Upsert: if email exists, do nothing (idempotent). If not, create it.
    try {
      await db.waitlistEmail.upsert({
        where: { email },
        update: {}, // no updates if exists
        create: {
          email,
          name,
          referralCode,
          source: 'landing',
        },
      })
    } catch (err: any) {
      // If the table doesn't exist yet (setup hasn't run), fall back to
      // a generic success so the UX doesn't break.
      if (err?.code === 'P2021' /* table does not exist */) {
        console.warn('Waitlist table does not exist yet — accept email anyway')
      } else if (err?.code === 'P2002' /* unique constraint */) {
        // Already subscribed — that's fine
      } else {
        throw err
      }
    }

    return NextResponse.json({
      success: true,
      message: '¡Estás en la lista! Te avisaremos cuando lancemos.',
    })
  } catch (error) {
    console.error('Waitlist subscribe error:', error)
    return NextResponse.json(
      { error: 'Error al suscribir. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}

// GET /api/waitlist/subscribe — returns the count of subscribers (public, for social proof)
export async function GET() {
  try {
    const count = await db.waitlistEmail.count()
    return NextResponse.json({ count })
  } catch {
    // If table doesn't exist, return 0
    return NextResponse.json({ count: 0 })
  }
}
