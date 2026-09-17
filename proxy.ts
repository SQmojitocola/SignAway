import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const protectedPaths = ['/dashboard', '/upload', '/documents']
  const isProtected = protectedPaths.some(
    (path) => nextUrl.pathname === path || nextUrl.pathname.startsWith(`${path}/`),
  )

  const authOnlyPaths = ['/login', '/register']
  const isAuthOnlyPath = authOnlyPaths.includes(nextUrl.pathname)

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl.origin))
  }

  if (isAuthOnlyPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/upload/:path*', '/documents/:path*', '/login', '/register'],
}
