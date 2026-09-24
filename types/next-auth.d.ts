import NextAuth, { DefaultSession } from "next-auth"

// Memperluas tipe bawaan NextAuth agar session.user.role dan session.user.id tersedia
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
  }
}
