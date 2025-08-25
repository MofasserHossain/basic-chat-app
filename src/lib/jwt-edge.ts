// JWT utilities for Edge Runtime (middleware)
// Uses Web Crypto API instead of Node.js crypto

import { toast } from 'sonner'

// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface JWTPayload {
  userId: string
  email: string
  username: string
}

// Simple JWT verification for Edge Runtime
// Note: This is a basic implementation. For production, consider using jose library
export function verifyTokenEdge(token: string): JWTPayload | null {
  try {
    // console.log(
    //   'Edge Runtime: Starting JWT verification for token length:',
    //   token.length,
    // )

    // Split the JWT token
    const parts = token.split('.')
    if (parts.length !== 3) {
      // console.log('Edge Runtime: Invalid JWT format - wrong number of parts')
      return null
    }

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]))
    // console.log('Edge Runtime: Decoded payload:', payload)

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      // console.log('Edge Runtime: JWT token expired')
      return null
    }

    // For now, we'll trust the token without signature verification in Edge Runtime
    // In production, you should implement proper signature verification or use jose library
    // console.log(
    //   'Edge Runtime: JWT token verified successfully for user:',
    //   payload.userId,
    // )

    return {
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    toast.error('Edge Runtime: JWT verification failed:' + errorMessage)
    return null
  }
}
