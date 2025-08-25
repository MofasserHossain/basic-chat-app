import { generateToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // console.log('Login route - email:', email)
    // console.log('Login route - password:', password)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // console.log('Login route - user:', user)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      )
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    // console.log('Login route - token:', token)
    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user

    // Create response with user data
    const response = NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword,
    })

    // console.log('Login route - response:', response)

    // Set JWT token in HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/', // Ensure cookie is accessible from all paths
    })

    // console.log(
    //   'Login route - cookie set with token:',
    //   token.substring(0, 50) + '...',
    // )
    // console.log('Login route - response cookies:', response.cookies.getAll())
    // console.log('Login route - response after setting cookie:', response)

    return response
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
