import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { applyReferralCode } from '@/lib/referrals'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, referralCode } = await req.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este email' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Check if this email is in the VIP list (resilient: if table doesn't exist, skip check)
    let isVip = false
    try {
      const vipEmail = await db.vipEmail.findUnique({
        where: { email: normalizedEmail },
      })
      isVip = !!vipEmail
    } catch (vipError) {
      // VIP table might not exist yet — that's OK, just treat as non-VIP
      console.warn('VIP check failed (table may not exist):', vipError instanceof Error ? vipError.message : vipError)
    }

    // Create user
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || normalizedEmail.split('@')[0],
        plan: isVip ? 'pro' : 'free',
        isVip,
      },
    })

    // ─── Apply referral code (if provided) ───
    // This is best-effort: if the code is invalid or fails, the user is still
    // created successfully. We don't want a referral bug to block signup.
    let referralApplied = false
    if (referralCode && typeof referralCode === 'string') {
      try {
        referralApplied = await applyReferralCode(user.id, referralCode)
      } catch (refError) {
        console.warn('Referral code application failed (non-fatal):', refError)
      }
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isVip: user.isVip,
      },
      referralApplied,
    })
  } catch (error) {
    console.error('Registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Registration error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.constructor.name : undefined,
    })
    return NextResponse.json(
      { error: 'Error al crear la cuenta. Inténtalo de nuevo.', details: errorMessage },
      { status: 500 }
    )
  }
}
