import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// GET /api/setup — Initialize database tables and ensure all columns exist
// GET /api/setup?makeAdmin=email@example.com&key=BOOKMATE_ADMIN_2024 — Promote a user to admin (one-time use)
export async function GET(req: NextRequest) {
  try {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!connectionString) {
      return NextResponse.json({
        success: false,
        error: 'No database connection string found. Check DATABASE_URL env variable.'
      }, { status: 500 })
    }

    const sql = neon(connectionString)

    // ── ADMIN PROMOTION ENDPOINT (one-time secret) ──
    // Usage: /api/setup?makeAdmin=youremail@gmail.com&key=BOOKMATE_ADMIN_2024
    const url = new URL(req.url)
    const makeAdminEmail = url.searchParams.get('makeAdmin')
    const adminKey = url.searchParams.get('key')

    if (makeAdminEmail && adminKey) {
      // Verify the secret key (change this before deploying!)
      const EXPECTED_KEY = 'BOOKMATE_ADMIN_2024'
      if (adminKey !== EXPECTED_KEY) {
        return NextResponse.json({
          success: false,
          error: 'Clave de administrador inválida'
        }, { status: 403 })
      }

      const normalizedEmail = makeAdminEmail.trim().toLowerCase()

      // Check if user exists
      const existing = await sql`
        SELECT id, email, "isAdmin", "isVip", plan FROM "User" WHERE email = ${normalizedEmail}
      `

      if (existing.length === 0) {
        return NextResponse.json({
          success: false,
          error: `No existe usuario con email: ${normalizedEmail}. Regístrate primero en la app.`
        }, { status: 404 })
      }

      // Promote to admin + VIP + pro plan
      await sql`
        UPDATE "User"
        SET "isAdmin" = true, "isVip" = true, plan = 'pro'
        WHERE email = ${normalizedEmail}
      `

      const updated = await sql`
        SELECT email, "isAdmin", "isVip", plan FROM "User" WHERE email = ${normalizedEmail}
      `

      return NextResponse.json({
        success: true,
        message: `¡Usuario ${normalizedEmail} promovido a admin + VIP + Pro!`,
        user: updated[0],
        instructions: 'Inicia sesión en la app, ve a la pestaña Pro, toca 7 veces "Versión de la app: 1.0.0" para abrir el panel de admin y agrega el email de tu hija como VIP.'
      })
    }
    // ── END ADMIN PROMOTION ──

    // 1. Drop and recreate User table with ALL columns (clean approach)
    // This is safe for initial setup. For existing databases, we add columns individually.
    
    // First, check if User table exists and has the password column
    const userColumns = await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position
    `
    const columnNames = userColumns.map((r: any) => r.column_name)
    const hasPassword = columnNames.includes('password')
    const hasUsageMonth = columnNames.includes('usageMonth')
    const hasLsFields = columnNames.includes('lsCustomerId')

    // If the User table exists but is missing critical columns, add them with direct SQL
    if (columnNames.length > 0) {
      // Add missing columns one by one with direct ALTER TABLE
      const missingColumns: { name: string; def: string }[] = []
      
      if (!columnNames.includes('password')) missingColumns.push({ name: 'password', def: 'ALTER TABLE "User" ADD COLUMN "password" TEXT' })
      if (!columnNames.includes('avatarUrl')) missingColumns.push({ name: 'avatarUrl', def: 'ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT' })
      if (!columnNames.includes('isAdmin')) missingColumns.push({ name: 'isAdmin', def: 'ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false' })
      if (!columnNames.includes('lsCustomerId')) missingColumns.push({ name: 'lsCustomerId', def: 'ALTER TABLE "User" ADD COLUMN "lsCustomerId" TEXT' })
      if (!columnNames.includes('lsSubscriptionId')) missingColumns.push({ name: 'lsSubscriptionId', def: 'ALTER TABLE "User" ADD COLUMN "lsSubscriptionId" TEXT' })
      if (!columnNames.includes('lsVariantId')) missingColumns.push({ name: 'lsVariantId', def: 'ALTER TABLE "User" ADD COLUMN "lsVariantId" TEXT' })
      if (!columnNames.includes('streakDays')) missingColumns.push({ name: 'streakDays', def: 'ALTER TABLE "User" ADD COLUMN "streakDays" INTEGER NOT NULL DEFAULT 0' })
      if (!columnNames.includes('lastReadDate')) missingColumns.push({ name: 'lastReadDate', def: 'ALTER TABLE "User" ADD COLUMN "lastReadDate" TEXT' })
      if (!columnNames.includes('totalReadMin')) missingColumns.push({ name: 'totalReadMin', def: 'ALTER TABLE "User" ADD COLUMN "totalReadMin" INTEGER NOT NULL DEFAULT 0' })
      if (!columnNames.includes('iaHoursUsed')) missingColumns.push({ name: 'iaHoursUsed', def: 'ALTER TABLE "User" ADD COLUMN "iaHoursUsed" DOUBLE PRECISION NOT NULL DEFAULT 0' })
      if (!columnNames.includes('explicaUsed')) missingColumns.push({ name: 'explicaUsed', def: 'ALTER TABLE "User" ADD COLUMN "explicaUsed" INTEGER NOT NULL DEFAULT 0' })
      if (!columnNames.includes('ocrUsed')) missingColumns.push({ name: 'ocrUsed', def: 'ALTER TABLE "User" ADD COLUMN "ocrUsed" INTEGER NOT NULL DEFAULT 0' })
      if (!columnNames.includes('audiobookHoursUsed')) missingColumns.push({ name: 'audiobookHoursUsed', def: 'ALTER TABLE "User" ADD COLUMN "audiobookHoursUsed" DOUBLE PRECISION NOT NULL DEFAULT 0' })
      if (!columnNames.includes('usageMonth')) missingColumns.push({ name: 'usageMonth', def: 'ALTER TABLE "User" ADD COLUMN "usageMonth" TEXT' })
      if (!columnNames.includes('dailyGoalMin')) missingColumns.push({ name: 'dailyGoalMin', def: 'ALTER TABLE "User" ADD COLUMN "dailyGoalMin" INTEGER NOT NULL DEFAULT 20' })
      if (!columnNames.includes('weeklyGoalDays')) missingColumns.push({ name: 'weeklyGoalDays', def: 'ALTER TABLE "User" ADD COLUMN "weeklyGoalDays" INTEGER NOT NULL DEFAULT 5' })

      for (const col of missingColumns) {
        try {
          await sql.query(col.def)
          console.log(`Added column User.${col.name}`)
        } catch (e: any) {
          // Column might already exist
          if (!e?.message?.includes('already exists')) {
            console.error(`Failed to add column User.${col.name}:`, e?.message)
          }
        }
      }
    } else {
      // User table doesn't exist yet - create it with all columns
      await sql`
        CREATE TABLE "User" (
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
          "usageMonth" TEXT,
          "dailyGoalMin" INTEGER NOT NULL DEFAULT 20,
          "weeklyGoalDays" INTEGER NOT NULL DEFAULT 5,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    }

    // 7. Book summaries table (AI-generated summaries)
    const summariesExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'book_summaries'
    `
    if (Number(summariesExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "book_summaries" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
          "bookId" TEXT NOT NULL UNIQUE,
          "keyPoints" TEXT NOT NULL,
          "quotes" TEXT NOT NULL,
          "targetReader" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
    try {
      await sql`ALTER TABLE "book_summaries" DROP CONSTRAINT IF EXISTS "book_summaries_bookId_fkey"`
      await sql`ALTER TABLE "book_summaries" ADD CONSTRAINT "book_summaries_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 8. Book emotions table (emotion graph per chapter)
    const emotionsExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'book_emotions'
    `
    if (Number(emotionsExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "book_emotions" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
          "bookId" TEXT NOT NULL UNIQUE,
          "data" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
    try {
      await sql`ALTER TABLE "book_emotions" DROP CONSTRAINT IF EXISTS "book_emotions_bookId_fkey"`
      await sql`ALTER TABLE "book_emotions" ADD CONSTRAINT "book_emotions_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 2. Books table
    const booksExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'books'
    `
    if (Number(booksExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "books" (
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
    }

    // Add foreign key for books
    try {
      await sql`ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_userId_fkey"`
      await sql`ALTER TABLE "books" ADD CONSTRAINT "books_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 3. Highlights table
    const highlightsExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'highlights'
    `
    if (Number(highlightsExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "highlights" (
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
    }

    try {
      await sql`ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_userId_fkey"`
      await sql`ALTER TABLE "highlights" ADD CONSTRAINT "highlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      await sql`ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_bookId_fkey"`
      await sql`ALTER TABLE "highlights" ADD CONSTRAINT "highlights_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 4. Achievements table
    const achievementsExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'achievements'
    `
    if (Number(achievementsExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "achievements" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "achievements_userId_type_unique" UNIQUE ("userId", "type")
        )
      `
    }

    try {
      await sql`ALTER TABLE "achievements" DROP CONSTRAINT IF EXISTS "achievements_userId_fkey"`
      await sql`ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 5. Reading logs table
    const readingLogsExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'reading_logs'
    `
    if (Number(readingLogsExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "reading_logs" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "bookId" TEXT NOT NULL,
          "minutes" INTEGER NOT NULL DEFAULT 0,
          "date" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    }

    try {
      await sql`ALTER TABLE "reading_logs" DROP CONSTRAINT IF EXISTS "reading_logs_userId_fkey"`
      await sql`ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      await sql`ALTER TABLE "reading_logs" DROP CONSTRAINT IF EXISTS "reading_logs_bookId_fkey"`
      await sql`ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 6. VIP emails table
    const vipEmailsExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'vip_emails'
    `
    if (Number(vipEmailsExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "vip_emails" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
          "email" TEXT NOT NULL UNIQUE,
          "addedBy" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    }

    // ─── audiobooks table (for MP3 downloads) ───
    const audiobooksExist = await sql`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'audiobooks'
    `
    if (Number(audiobooksExist[0]?.count) === 0) {
      await sql`
        CREATE TABLE "audiobooks" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "bookId" TEXT NOT NULL,
          "voiceId" TEXT NOT NULL,
          "contentHash" TEXT NOT NULL,
          "storageKey" TEXT NOT NULL,
          "durationSec" INTEGER NOT NULL DEFAULT 0,
          "sizeBytes" INTEGER NOT NULL DEFAULT 0,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "errorMessage" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "audiobooks_bookId_voiceId_key" UNIQUE ("bookId", "voiceId")
        )
      `
      await sql`CREATE INDEX "audiobooks_contentHash_idx" ON "audiobooks"("contentHash")`
      await sql`CREATE INDEX "audiobooks_userId_idx" ON "audiobooks"("userId")`
      await sql`ALTER TABLE "audiobooks" ADD CONSTRAINT "audiobooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      await sql`ALTER TABLE "audiobooks" ADD CONSTRAINT "audiobooks_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    }

    // Verify the User table now has all expected columns
    const finalColumns = await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position
    `
    const finalColumnNames = finalColumns.map((r: any) => r.column_name)

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created/updated successfully!',
      tables: ['User', 'books', 'highlights', 'achievements', 'reading_logs', 'vip_emails'],
      userColumns: finalColumnNames,
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
