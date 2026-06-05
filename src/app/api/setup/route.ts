import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

// GET /api/setup — Initialize database tables
// This route creates all tables in the database using Prisma
export async function GET() {
  try {
    console.log('Running prisma db push...')
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'pipe',
      timeout: 30000,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created successfully!' 
    })
  } catch (error) {
    console.error('Setup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to setup database',
      details: errorMessage 
    }, { status: 500 })
  }
}
