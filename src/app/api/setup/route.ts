import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// GET /api/setup — Initialize database tables and ensure all columns exist
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
      if (!columnNames.includes('usageMonth')) missingColumns.push({ name: 'usageMonth', def: 'ALTER TABLE "User" ADD COLUMN "usageMonth" TEXT' })

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
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    }

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
