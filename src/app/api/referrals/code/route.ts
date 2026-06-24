import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureReferralCode } from '@/lib/referrals'

// GET /api/referrals/code
// Returns the current user's referral code, generating one if they don't have it yet.
// Also returns the full referral link (e.g. https://escuchalibros.app/?ref=MARILU-7K3X)
// so the UI can show a "copy link" button.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }
    const userId = session.user.id

    // Use the user's name first, fall back to email
    const seed = session.user.name || session.user.email || 'USER'
    const code = await ensureReferralCode(userId, seed)

    // Build the shareable link. We use VERCEL_URL env (set by Vercel) for prod,
    // fall back to localhost for dev. The link includes ?ref=CODE so the
    // signup page can pre-fill the referral code.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const link = `${baseUrl}/?ref=${code}`

    return NextResponse.json({
      code,
      link,
      // Sharing suggestions for the UI
      shareText: `¡Estoy leyendo audiolibros en Escucha Libros! Te invito a probarlo. Usa mi código ${code} y obtienes 1 mes de Pro gratis cuando te suscribas. ${link}`,
    })
  } catch (error) {
    console.error('Get referral code error:', error)
    return NextResponse.json({ error: 'Error al obtener código de referido' }, { status: 500 })
  }
}
