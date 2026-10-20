import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role?: 'ADMIN' | 'KARYAWAN' | string
      jobLevel?: 'GENERAL_MANAGER' | 'HEAD_SECTION' | 'STAFF' | string | null
      position?: string | null
    } & DefaultSession['user']
  }

  interface User {
    role?: 'ADMIN' | 'KARYAWAN' | string
    jobLevel?: 'GENERAL_MANAGER' | 'HEAD_SECTION' | 'STAFF' | string | null
    position?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'ADMIN' | 'KARYAWAN' | string
    jobLevel?: 'GENERAL_MANAGER' | 'HEAD_SECTION' | 'STAFF' | string | null
    position?: string | null
  }
}
