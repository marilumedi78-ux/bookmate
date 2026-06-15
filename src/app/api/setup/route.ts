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

    // Helper: check if a column exists in a table
    async function columnExists(table: string, column: string): Promise<boolean> {
      const result = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = ${column}
      `
      return result.length > 0
    }

    // Helper: add column if it doesn't exist
    async function addColumnIfMissing(table: string, column: string, type: string, defaultValue?: string) {
      const exists = await columnExists(table, column)
      if (!exists) {
        const defaultClause = defaultValue ? ` DEFAULT ${defaultValue}` : ''
        await sql`ALTER TABLE ${sql(table)} ADD COLUMN ${sql(column)} ${sql(type + defaultClause)}`
        console.log(`Added column ${table}.${column}`)
      }
    }

    // 1. Create User table if not exists
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
        "usageMonth" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Ensure ALL User columns exist (for databases created with older schema)
    await addColumnIfMissing('User', 'password', 'TEXT')
    await addColumnIfMissing('User', 'name', 'TEXT')
    await addColumnIfMissing('User', 'avatarUrl', 'TEXT')
    await addColumnIfMissing('User', 'plan', "TEXT", "'free'")
    await addColumnIfMissing('User', 'isVip', 'BOOLEAN', 'false')
    await addColumnIfMissing('User', 'isAdmin', 'BOOLEAN', 'false')
    await addColumnIfMissing('User', 'lsCustomerId', 'TEXT')
    await addColumnIfMissing('User', 'lsSubscriptionId', 'TEXT')
    await addColumnIfMissing('User', 'lsVariantId', 'TEXT')
    await addColumnIfMissing('User', 'streakDays', 'INTEGER', '0')
    await addColumnIfMissing('User', 'lastReadDate', 'TEXT')
    await addColumnIfMissing('User', 'totalReadMin', 'INTEGER', '0')
    await addColumnIfMissing('User', 'iaHoursUsed', 'DOUBLE PRECISION', '0')
    await addColumnIfMissing('User', 'explicaUsed', 'INTEGER', '0')
    await addColumnIfMissing('User', 'ocrUsed', 'INTEGER', '0')
    await addColumnIfMissing('User', 'usageMonth', 'TEXT')

    // 2. Create Books table if not exists
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

    await addColumnIfMissing('books', 'fileHash', 'TEXT')
    await addColumnIfMissing('books', 'coverColor', "TEXT", "'#4DB6AC'")
    await addColumnIfMissing('books', 'currentCharIdx', 'INTEGER', '0')
    await addColumnIfMissing('books', 'readChars', 'INTEGER', '0')
    await addColumnIfMissing('books', 'estimatedMin', 'INTEGER', '0')
    await addColumnIfMissing('books', 'language', "TEXT", "'es'")
    await addColumnIfMissing('books', 'textContent', 'TEXT')

    // Add foreign key for books
    try {
      await sql`ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_userId_fkey"`
      await sql`ALTER TABLE "books" ADD CONSTRAINT "books_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 3. Create Highlights table
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

    try {
      await sql`ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_userId_fkey"`
      await sql`ALTER TABLE "highlights" ADD CONSTRAINT "highlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      await sql`ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_bookId_fkey"`
      await sql`ALTER TABLE "highlights" ADD CONSTRAINT "highlights_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 4. Create Achievements table
    await sql`
      CREATE TABLE IF NOT EXISTS "achievements" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "achievements_userId_type_unique" UNIQUE ("userId", "type")
      )
    `

    try {
      await sql`ALTER TABLE "achievements" DROP CONSTRAINT IF EXISTS "achievements_userId_fkey"`
      await sql`ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 5. Create Reading logs table
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

    try {
      await sql`ALTER TABLE "reading_logs" DROP CONSTRAINT IF EXISTS "reading_logs_userId_fkey"`
      await sql`ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      await sql`ALTER TABLE "reading_logs" DROP CONSTRAINT IF EXISTS "reading_logs_bookId_fkey"`
      await sql`ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    } catch { /* ignore */ }

    // 6. Create VIP emails table
    await sql`
      CREATE TABLE IF NOT EXISTS "vip_emails" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL UNIQUE,
        "addedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Verify the User table has all expected columns
    const userColumns = await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'User'
    `
    const columnNames = userColumns.map((r: any) => r.column_name)

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created/updated successfully!',
      tables: ['User', 'books', 'highlights', 'achievements', 'reading_logs', 'vip_emails'],
      userColumns: columnNames,
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
