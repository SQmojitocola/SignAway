import nextAuth from "next-auth"
import credentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { verifyPassword } from "./password"

export const { handlers, signIn, signOut, auth } = nextAuth({
  providers: [
    credentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email }
        })
        
        if (!user || !user.isActive || user.status !== 'ACTIVE') {
          return null
        }

        const isValid = await verifyPassword(password, user.passwordHash)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          jobLevel: user.jobLevel,
          position: user.position,
          image: user.avatarUrl,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.jobLevel = (user as { jobLevel?: string | null }).jobLevel
        token.position = (user as { position?: string | null }).position
        token.picture = (user as { image?: string | null }).image ?? (user as { avatarUrl?: string | null }).avatarUrl
      }

      // 📍 Selalu pastikan role, jobLevel, position & avatar paling fresh dari DB jika token dibaca
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, jobLevel: true, position: true, avatarUrl: true }
        })
        if (dbUser) {
          token.role = dbUser.role
          token.jobLevel = dbUser.jobLevel
          token.position = dbUser.position
          token.picture = dbUser.avatarUrl
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'ADMIN' | 'KARYAWAN'
        session.user.jobLevel = (token.jobLevel as 'GENERAL_MANAGER' | 'HEAD_SECTION' | 'STAFF' | null) ?? null
        session.user.position = (token.position as string) ?? null
        session.user.image = (token.picture as string) ?? null
      }
      return session
    },
  },
})