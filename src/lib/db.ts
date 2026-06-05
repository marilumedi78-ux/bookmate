import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use Neon adapter when DATABASE_URL is a Neon connection string
  const connectionString = process.env.DATABASE_URL
  
  if (connectionString && (connectionString.includes('neon.tech') || connectionString.includes('neondb'))) {
    const pool = new Pool({ connectionString })
    const adapter = new PrismaNeon(pool)
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  
  // Fallback to standard Prisma client (for local dev or other PostgreSQL)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
