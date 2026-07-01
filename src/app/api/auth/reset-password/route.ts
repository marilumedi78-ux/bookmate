import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import { verifyResetToken } from '@/lib/auth-tokens'

// POST /api/auth/reset-password
// Body: { token, newPassword }
//
// Validates the signed token (HMAC-SHA256 signature + not expired),
// then updates the user's password. Stateless — no DB columns needed
// for the token itself; the token carries { userId, expiresAt } signed
// with NEXTAUTH_SECRET.

export async function POST(req: NextRequest) {
  let token: string
  let newPassword: string

  try {
    const body = await req.json().catch(() => ({}))
    token = body?.token
    newPassword = body?.newPassword
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // Basic validation with specific, helpful error messages
  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { error: 'Token requerido. Solicita un nuevo enlace de recuperación.' },
      { status: 400 }
    )
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return NextResponse.json(
      { error: 'Nueva contraseña requerida' },
      { status: 400 }
    )
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres' },
      { status: 400 }
    )
  }

  // ─── Verify the signed token ───
  const payload = verifyResetToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.' },
      { status: 400 }
    )
  }

  // ─── Look up the user (must still exist) ───
  let user: { id: string } | null = null
  try {
    user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    })
  } catch (dbErr) {
    console.error('Reset password: DB lookup failed:', dbErr)
    return NextResponse.json(
      { error: 'Error de base de datos. Intenta de nuevo en unos minutos.' },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json(
      { error: 'La cuenta ya no existe.' },
      { status: 400 }
    )
  }

  // ─── Hash the new password ───
  let hashedPassword: string
  try {
    hashedPassword = await hash(newPassword, 12)
  } catch (hashErr) {
    console.error('Reset password: bcrypt failed:', hashErr)
    return NextResponse.json(
      { error: 'Error al procesar la contraseña. Intenta de nuevo.' },
      { status: 500 }
    )
  }

  // ─── Update the password in the DB ───
  // Use `select` to only return the id (avoids any issue if other columns
  // in the schema don't exist yet in the production DB).
  try {
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
      select: { id: true },
    })
  } catch (updateErr) {
    console.error('Reset password: DB update failed:', updateErr)
    return NextResponse.json(
      { error: 'No se pudo actualizar la contraseña. Intenta de nuevo.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Tu contraseña fue restablecida. Ya puedes iniciar sesión.',
  })
}
