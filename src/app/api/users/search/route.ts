import { verifyToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users/search - Search for users by name or username
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const currentUserId = searchParams.get('currentUserId')

    if (!query || !currentUserId) {
      return NextResponse.json(
        { error: 'Query and current user ID are required' },
        { status: 400 },
      )
    }

    // Search for users by name or username, excluding the current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ],
          },
          { id: { not: currentUserId } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
      take: 10,
    })

    return NextResponse.json(users)
  } catch (error) {
    // console.error('Error searching users:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
