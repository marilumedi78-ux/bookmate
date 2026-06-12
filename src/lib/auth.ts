import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

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
      }
      // Refresh plan info from DB on each JWT refresh
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true, isVip: true, name: true },
        })
        if (dbUser) {
          token.plan = dbUser.plan
          token.isVip = dbUser.isVip
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
  secret: process.env.NEXTAUTH_SECRET,
}
