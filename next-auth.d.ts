import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: 'ADMIN' | 'KARYAWAN' | string
    } & DefaultSession['user']
  }

  interface User {
    role?: 'ADMIN' | 'KARYAWAN' | string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'ADMIN' | 'KARYAWAN' | string
  }
}
