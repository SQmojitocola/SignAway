import nextAuth from "next-auth"
import credentialsProvider from "next-auth/providers/credentials"
import {prisma} from "./prisma"
import {verifyPassword} from "./password"

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
                
                if (!user) {
                    return null
                }

                const isValid = await verifyPassword(password, user.passwordHash)
                if (!isValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name
                }
            },
        }),
    ],
    session: { strategy: "jwt" },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user}) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
            }
            return session
        },
    },
})