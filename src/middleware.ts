import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenEdge } from './lib/jwt-edge'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/']

  // Check if the current route is public
  if (publicRoutes.includes(pathname)) {
    // console.log(`Middleware: Public route ${pathname}, allowing access`)
    return NextResponse.next()
  }

  // Get the JWT token from cookies
  const token = request.cookies.get('auth-token')?.value
  //  console.log(
  //   `Middleware: Checking route ${pathname}, token present: ${!!token}`,
  // )
  // console.log(`Middleware: All cookies:`, request.cookies.getAll())
  // console.log(
  //   `Middleware: auth-token cookie:`,
  //   request.cookies.get('auth-token'),
  // )

  if (!token) {
    // console.log(`Middleware: No token found, redirecting to signin`)
    // Redirect to signin if no token
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Verify the token using Edge Runtime compatible function
  const payload = verifyTokenEdge(token)
  // console.log(
  //   `Middleware: Token verification result:`,
  //   payload ? 'valid' : 'invalid',
  // )

  if (!payload) {
    // console.log(`Middleware: Invalid token, clearing cookie and redirecting`)
    // Clear invalid token and redirect to signin
    const response = NextResponse.redirect(new URL('/auth/signin', request.url))
    response.cookies.delete('auth-token')
    return response
  }

  // Token is valid, allow access
  // console.log(
  //   `Middleware: Valid token for user ${payload.userId}, allowing access`,
  // )
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
