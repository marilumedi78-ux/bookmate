import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    plan: string
    isVip: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      plan: string
      isVip: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    plan: string
    isVip: boolean
  }
}
