import jwt from 'jsonwebtoken'
import { toast } from 'sonner'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// console.log('JWT_SECRET loaded:', JWT_SECRET ? 'YES' : 'NO')
// console.log('JWT_SECRET length:', JWT_SECRET?.length || 0)

export interface JWTPayload {
  userId: string
  email: string
  username: string
}

export function generateToken(payload: JWTPayload): string {
  // console.log('Generating JWT token for user:', payload.userId)
  // console.log('Using JWT_SECRET:', JWT_SECRET ? 'SET' : 'NOT SET')
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  // console.log('Generated token length:', token.length)
  return token
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    // console.log('Verifying JWT token, length:', token.length)
    // console.log('Using JWT_SECRET:', JWT_SECRET ? 'SET' : 'NOT SET')
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    // console.log('Token verification successful for user:', payload.userId)
    return payload
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    toast.error('Token verification failed:' + errorMessage)
    return null
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    toast.error('Token decoding failed:' + errorMessage)
    return null
  }
}
