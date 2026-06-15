import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string; details?: string }> = {}

  // 1. Check database connection
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = { ok: true }
  } catch (error) {
    checks.database = { 
      ok: false, 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // 2. Check User table exists and has expected columns
  try {
    const userCount = await db.user.count()
    checks.userTable = { ok: true, details: `${userCount} users` }
  } catch (error) {
    checks.userTable = { 
      ok: false, 
      error: 'User table query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // 3. Check VipEmail table exists
  try {
    const vipCount = await db.vipEmail.count()
    checks.vipTable = { ok: true, details: `${vipCount} VIP emails` }
  } catch (error) {
    checks.vipTable = { 
      ok: false, 
      error: 'VipEmail table query failed',
      details: error instanceof Error ? error.message : 'Unknown Error'
    }
  }

  // 4. Check Book table exists
  try {
    const bookCount = await db.book.count()
    checks.bookTable = { ok: true, details: `${bookCount} books` }
  } catch (error) {
    checks.bookTable = { 
      ok: false, 
      error: 'Book table query failed',
      details: error instanceof Error ? error.message : 'Unknown Error'
    }
  }

  // 5. Check env vars (without revealing values)
  checks.envVars = {
    ok: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    details: [
      `DATABASE_URL: ${process.env.DATABASE_URL ? '✓' : '✗'}`,
      `POSTGRES_URL: ${process.env.POSTGRES_URL ? '✓' : '✗'}`,
      `POSTGRES_PRISMA_URL: ${process.env.POSTGRES_PRISMA_URL ? '✓' : '✗'}`,
      `NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✓' : '✗'}`,
    ].join(', ')
  }

  const allOk = Object.values(checks).every(c => c.ok)

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allOk ? 200 : 503 })
}
