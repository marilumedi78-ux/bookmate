import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''
  const neonUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL_NON_POOLING || ''

  // In production (Vercel serverless) or when a Neon URL is available,
  // use the Neon serverless adapter for PostgreSQL connections
  if (neonUrl && !neonUrl.startsWith('file:') && !neonUrl.includes('placeholder')) {
    try {
      const sql = neon(neonUrl)
      const adapter = new PrismaNeon(sql)
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
    } catch (e) {
      console.error('Failed to create Neon adapter, falling back to direct connection:', e)
    }
  }

  // Fallback: direct PrismaClient connection (works with any DATABASE_URL)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
