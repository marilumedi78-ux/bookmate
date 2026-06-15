import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// GET /api/setup — Initialize database tables using Neon SQL directly
export async function GET() {
  try {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!connectionString) {
      return NextResponse.json({ 
        success: false, 
        error: 'No database connection string found. Check DATABASE_URL env variable.' 
      }, { status: 500 })
    }

    const sql = neon(connectionString)

    // 1. Users table
    await sql`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT,
        "name" TEXT,
        "avatarUrl" TEXT,
        "plan" TEXT NOT NULL DEFAULT 'free',
        "isVip" BOOLEAN NOT NULL DEFAULT false,
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "lsCustomerId" TEXT,
        "lsSubscriptionId" TEXT,
        "lsVariantId" TEXT,
        "streakDays" INTEGER NOT NULL DEFAULT 0,
        "lastReadDate" TEXT,
        "totalReadMin" INTEGER NOT NULL DEFAULT 0,
        "iaHoursUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "explicaUsed" INTEGER NOT NULL DEFAULT 0,
        "ocrUsed" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Add missing columns if they don't exist (for existing databases)
    const addColumnIfNotExists = async (table: string, column: string, type: string) => {
      try {
        await sql`ALTER TABLE ${sql(table)} ADD COLUMN IF NOT EXISTS ${sql(column)} ${sql(type)}`
      } catch {
        // Column might already exist, ignore error
      }
    }

    await addColumnIfNotExists('User', 'password', 'TEXT')
    await addColumnIfNotExists('User', 'lsCustomerId', 'TEXT')
    await addColumnIfNotExists('User', 'lsSubscriptionId', 'TEXT')
    await addColumnIfNotExists('User', 'lsVariantId', 'TEXT')
    await addColumnIfNotExists('User', 'usageMonth', 'TEXT')
    // Also try to add legacy Stripe columns (for migration compat)
    await addColumnIfNotExists('User', 'stripeCustomerId', 'TEXT')
    await addColumnIfNotExists('User', 'stripePriceId', 'TEXT')
    await addColumnIfNotExists('User', 'stripeSubId', 'TEXT')

    // 2. Books table
    await sql`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Add foreign key for books if not exists
    await sql`ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_userId_fkey"`
    await sql`ALTER TABLE "books" ADD CONSTRAINT "books_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`

    // 3. Highlights table
    await sql`
      CREATE TABLE IF NOT EXISTS "highlights" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "bookId" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "note" TEXT,
        "color" TEXT NOT NULL DEFAULT '#FBBF24',
        "charStart" INTEGER NOT NULL,
        "charEnd" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_userId_fkey"`
    await sql`ALTER TABLE "highlights" ADD CONSTRAINT "highlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    await sql`ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_bookId_fkey"`
    await sql`ALTER TABLE "highlights" ADD CONSTRAINT "highlights_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`

    // 4. Achievements table
    await sql`
      CREATE TABLE IF NOT EXISTS "achievements" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "achievements_userId_type_unique" UNIQUE ("userId", "type")
      )
    `

    await sql`ALTER TABLE "achievements" DROP CONSTRAINT IF EXISTS "achievements_userId_fkey"`
    await sql`ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`

    // 5. Reading logs table
    await sql`
      CREATE TABLE IF NOT EXISTS "reading_logs" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "bookId" TEXT NOT NULL,
        "minutes" INTEGER NOT NULL DEFAULT 0,
        "date" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`ALTER TABLE "reading_logs" DROP CONSTRAINT IF EXISTS "reading_logs_userId_fkey"`
    await sql`ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    await sql`ALTER TABLE "reading_logs" DROP CONSTRAINT IF EXISTS "reading_logs_bookId_fkey"`
    await sql`ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`

    // 6. VIP emails table
    await sql`
      CREATE TABLE IF NOT EXISTS "vip_emails" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL UNIQUE,
        "addedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created/updated successfully!',
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
