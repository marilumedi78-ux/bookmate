import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// POST /api/auth/forgot-password
// Body: { email }
//
// Generates a password reset token and:
//   - If RESEND_API_KEY is set: sends an email with the reset link
//   - If not set (dev/no email service): returns the reset link directly
//     in the response so the user can click it manually.
//
// Always returns success (even if email doesn't exist) to prevent
// account enumeration attacks (don't reveal which emails are registered).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Escucha Libros <no-reply@resend.dev>'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Always look up the user — but if not found, we still return success
    // (don't reveal which emails exist)
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    })

    if (!user) {
      // Don't reveal that the email doesn't exist
      return NextResponse.json({
        success: true,
        message: 'Si el email existe en nuestra base de datos, recibirás un enlace de recuperación.',
      })
    }

    // Generate a secure random token (32 bytes = 64 hex chars)
    const plainToken = crypto.randomBytes(32).toString('hex')
    // Hash the token before storing — never store plain tokens in DB
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex')

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Save the hashed token + expiry on the user
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    })

    // Build the reset URL
    const resetUrl = `${APP_URL}/reset-password?token=${plainToken}`

    // Try to send email if Resend is configured
    if (RESEND_API_KEY) {
      try {
        await sendResetEmail(user.email, user.name || '', resetUrl)
      } catch (emailErr) {
        console.error('Failed to send reset email:', emailErr)
        // Fall back to returning the link in the response
        return NextResponse.json({
          success: true,
          message: 'No se pudo enviar el email, pero generamos tu enlace de recuperación. Cópialo y pégalo en tu navegador:',
          resetUrl,  // only included because email failed
          emailFailed: true,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Te enviamos un email con el enlace de recuperación. Revisa tu bandeja de entrada (y spam).',
      })
    }

    // No email service configured — return the link directly so the user
    // can use it. This is the dev/unblock flow.
    return NextResponse.json({
      success: true,
      message: 'Te generamos un enlace de recuperación. Cópialo y pégalo en tu navegador para restablecer tu contraseña:',
      resetUrl,
      emailNotConfigured: true,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}

// Send a password reset email via Resend
async function sendResetEmail(toEmail: string, toName: string, resetUrl: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: toEmail,
      subject: 'Restablece tu contraseña · Escucha Libros',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #2A9D8F 0%, #21867A 100%); padding: 16px; box-shadow: 0 10px 30px rgba(42, 157, 143, 0.3);">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 32px; height: 32px;">
                <path d="M3 18V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10"/>
                <path d="M3 18h18"/>
              </svg>
            </div>
            <h1 style="font-size: 22px; font-weight: 700; margin: 16px 0 4px;">Escucha Libros</h1>
            <p style="color: #666; font-size: 14px; margin: 0;">Restablece tu contraseña</p>
          </div>

          <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
            Hola${toName ? ` ${toName}` : ''},
          </p>
          <p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en Escucha Libros.
            Toca el botón de abajo para elegir una nueva contraseña:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #2A9D8F; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Restablecer contraseña
            </a>
          </div>

          <p style="font-size: 13px; color: #666; line-height: 1.5; margin: 24px 0 0;">
            Si no solicitaste este cambio, puedes ignorar este email — tu contraseña seguirá siendo la misma.
          </p>
          <p style="font-size: 13px; color: #666; line-height: 1.5; margin: 12px 0 0;">
            El enlace expira en 1 hora por seguridad.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            Escucha Libros · Tus PDFs convertidos en audiolibro
          </p>
        </div>
      `,
    }),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`Resend API ${resp.status}: ${errText.slice(0, 200)}`)
  }
}
