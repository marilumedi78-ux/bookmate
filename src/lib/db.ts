import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''

  // For Neon PostgreSQL (production on Vercel), use the pooled connection URL
  // The POSTGRES_URL or POSTGRES_PRISMA_URL is typically set by the Neon integration
  const neonUrl = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_NON_POOLING

  // In production, override DATABASE_URL with the Neon URL if available
  if (process.env.NODE_ENV === 'production' && neonUrl && !neonUrl.startsWith('file:') && !neonUrl.includes('placeholder')) {
    process.env.DATABASE_URL = neonUrl
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
