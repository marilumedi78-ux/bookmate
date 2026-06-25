import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import { verifyResetToken } from '../forgot-password/route'

// POST /api/auth/reset-password
// Body: { token, newPassword }
//
// Validates the signed token (HMAC-SHA256 signature + not expired),
// then updates the user's password.
//
// This version is STATELESS — no DB columns needed for the token.
// The token itself contains { userId, expiresAt } signed with
// NEXTAUTH_SECRET, so we can verify it without touching the DB until
// the actual password update.

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Nueva contraseña requerida' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verify the signed token (signature + expiry check)
    const payload = verifyResetToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    // Make sure the user still exists (they might have been deleted)
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: 'La cuenta ya no existe.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12)

    // Update the password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      success: true,
      message: 'Tu contraseña fue restablecida. Ya puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Error al restablecer la contraseña. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
