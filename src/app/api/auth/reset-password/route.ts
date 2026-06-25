import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

// POST /api/auth/reset-password
// Body: { token, newPassword }
//
// Validates the reset token (hash match + not expired), then updates
// the user's password and clears the reset token so it can't be reused.

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

    // Hash the plain token to compare with the stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Find user by token (must not be expired)
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12)

    // Update the password + clear the reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
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
