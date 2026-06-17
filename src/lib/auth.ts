import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

// Fallback secret for development — Vercel should set NEXTAUTH_SECRET in production
const FALLBACK_SECRET = 'bookmate-dev-secret-do-not-use-in-prod-7f8a9b2c3e1d'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user || !user.password) {
          throw new Error('Email o contraseña incorrectos')
        }

        const isValid = await compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Email o contraseña incorrectos')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          isVip: user.isVip,
          isAdmin: user.isAdmin,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.plan = (user as any).plan
        token.isVip = (user as any).isVip
        token.isAdmin = (user as any).isAdmin
      }
      // Refresh plan info from DB on each JWT refresh
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true, isVip: true, isAdmin: true, name: true },
        })
        if (dbUser) {
          token.plan = dbUser.plan
          token.isVip = dbUser.isVip
          token.isAdmin = dbUser.isAdmin
          token.name = dbUser.name
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.plan = token.plan as string
        session.user.isVip = token.isVip as boolean
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/', // We handle login in the main page
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Use env secret if available, otherwise fallback (for dev only)
  secret: process.env.NEXTAUTH_SECRET || FALLBACK_SECRET,
}
