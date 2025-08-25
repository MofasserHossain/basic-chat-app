import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out successfully' })

  // Clear the auth token cookie
  response.cookies.delete('auth-token')

  return response
}
