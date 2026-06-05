import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/setup — Initialize database tables using raw SQL
export async function GET() {
  try {
    // Create tables in order (respecting foreign key dependencies)
    
    // 1. Users table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "avatarUrl" TEXT,
        "plan" TEXT NOT NULL DEFAULT 'free',
        "isVip" BOOLEAN NOT NULL DEFAULT false,
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "streakDays" INTEGER NOT NULL DEFAULT 0,
        "lastReadDate" TEXT,
        "totalReadMin" INTEGER NOT NULL DEFAULT 0,
        "iaHoursUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "explicaUsed" INTEGER NOT NULL DEFAULT 0,
        "ocrUsed" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 2. Books table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "books" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "author" TEXT,
        "fileName" TEXT NOT NULL,
        "filePath" TEXT NOT NULL DEFAULT '',
        "fileHash" TEXT,
        "coverColor" TEXT NOT NULL DEFAULT '#4DB6AC',
        "totalPages" INTEGER NOT NULL DEFAULT 0,
        "currentPage" INTEGER NOT NULL DEFAULT 0,
        "currentCharIdx" INTEGER NOT NULL DEFAULT 0,
        "totalChars" INTEGER NOT NULL DEFAULT 0,
        "readChars" INTEGER NOT NULL DEFAULT 0,
        "estimatedMin" INTEGER NOT NULL DEFAULT 0,
        "isFinished" BOOLEAN NOT NULL DEFAULT false,
        "language" TEXT NOT NULL DEFAULT 'es',
        "textContent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "books_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `)

    // 3. Highlights table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "highlights" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "bookId" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "note" TEXT,
        "color" TEXT NOT NULL DEFAULT '#FBBF24',
        "charStart" INTEGER NOT NULL,
        "charEnd" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "highlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "highlights_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `)

    // 4. Achievements table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "achievements" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "achievements_userId_type_unique" UNIQUE ("userId", "type")
      )
    `)

    // 5. Reading logs table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "reading_logs" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "bookId" TEXT NOT NULL,
        "minutes" INTEGER NOT NULL DEFAULT 0,
        "date" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "reading_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "reading_logs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `)

    // 6. VIP emails table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "vip_emails" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL UNIQUE,
        "addedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create demo user
    const existingUser = await db.user.findUnique({ where: { email: 'demo@bookmate.app' } })
    if (!existingUser) {
      await db.user.create({
        data: { email: 'demo@bookmate.app', name: 'Usuario Demo', plan: 'pro', isVip: true }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created successfully!',
      tables: ['User', 'books', 'highlights', 'achievements', 'reading_logs', 'vip_emails']
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
