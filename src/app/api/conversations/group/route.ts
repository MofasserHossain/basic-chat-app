import { verifyToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Type declaration for global io instance
declare global {
  var io:
    | {
        to: (room: string) => {
          emit: (event: string, data: unknown) => void
        }
      }
    | undefined
}

// POST /api/conversations/group - Create a new group conversation
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { groupName, memberIds, creatorId } = body

    if (
      !groupName ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0 ||
      !creatorId
    ) {
      return NextResponse.json(
        { error: 'Group name, member IDs array, and creator ID are required' },
        { status: 400 },
      )
    }

    // Check if creator is in the member list
    if (!memberIds.includes(creatorId)) {
      memberIds.push(creatorId)
    }

    // Create new group conversation
    const conversation = await prisma.conversation.create({
      data: {
        groupName: groupName,
        isGroup: true,
        adminId: creatorId,
        participants: {
          create: memberIds.map((userId: string) => ({
            userId: userId,
            role: userId === creatorId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    })

    // Emit WebSocket events for all participants
    if (global.io) {
      memberIds.forEach((userId: string) => {
        global.io
          ?.to(`user:${userId}`)
          .emit('conversation:created', conversation)
      })
    }

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// PUT /api/conversations/group - Update group (add/remove members, change name)
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, action, data, userId } = body

    if (!conversationId || !action || !userId) {
      return NextResponse.json(
        { error: 'Conversation ID, action, and user ID are required' },
        { status: 400 },
      )
    }

    // Check if user is admin of this group
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isGroup: true,
        adminId: userId,
      },
      include: {
        participants: true,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Access denied or conversation not found' },
        { status: 403 },
      )
    }

    let updatedConversation

    switch (action) {
      case 'add_members':
        const { memberIds } = data
        if (!Array.isArray(memberIds) || memberIds.length === 0) {
          return NextResponse.json(
            { error: 'Member IDs array is required' },
            { status: 400 },
          )
        }

        // Add new members
        await prisma.userConversation.createMany({
          data: memberIds.map((memberId: string) => ({
            userId: memberId,
            conversationId: conversationId,
            role: 'member',
          })),
          skipDuplicates: true,
        })

        // Emit WebSocket events for new members
        if (global.io) {
          memberIds.forEach((memberId: string) => {
            global.io
              ?.to(`user:${memberId}`)
              .emit('conversation:member_added', {
                conversationId,
                memberIds,
              })
          })
        }
        break

      case 'remove_members':
        const { removeMemberIds } = data
        if (!Array.isArray(removeMemberIds) || removeMemberIds.length === 0) {
          return NextResponse.json(
            { error: 'Remove member IDs array is required' },
            { status: 400 },
          )
        }

        // Remove members (but not the admin)
        await prisma.userConversation.deleteMany({
          where: {
            userId: { in: removeMemberIds },
            conversationId: conversationId,
            role: { not: 'admin' }, // Prevent removing admin
          },
        })

        // Emit WebSocket events for removed members
        if (global.io) {
          removeMemberIds.forEach((memberId: string) => {
            global
              .io!.to(`user:${memberId}`)
              .emit('conversation:member_removed', {
                conversationId,
                memberId,
              })
          })
        }
        break

      case 'update_name':
        const { newGroupName } = data
        if (!newGroupName || typeof newGroupName !== 'string') {
          return NextResponse.json(
            { error: 'New group name is required' },
            { status: 400 },
          )
        }

        updatedConversation = await prisma.conversation.update({
          where: { id: conversationId },
          data: { groupName: newGroupName },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  },
                },
              },
            },
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  },
                },
              },
            },
            admin: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        })

        // Emit WebSocket event for name update
        if (global.io) {
          global
            .io!.to(`conversation:${conversationId}`)
            .emit('conversation:name_updated', {
              conversationId,
              newGroupName,
            })
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get updated conversation if not already fetched
    if (!updatedConversation) {
      updatedConversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                },
              },
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                },
              },
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      })
    }

    return NextResponse.json(updatedConversation)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
