'use client'

import { cn } from '@/lib/utils'
import { User, Users } from 'lucide-react'

interface ProfileAvatarProps {
  conversation: {
    id: string
    groupName?: string
    isGroup: boolean
    participants: Array<{
      user: {
        id: string
        name: string
        username: string
      }
    }>
  }
  currentUserId?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProfileAvatar({
  conversation,
  currentUserId,
  size = 'md',
  className,
}: ProfileAvatarProps) {
  const getOtherParticipant = () => {
    return conversation.participants.find((p) => p.user.id !== currentUserId)
      ?.user
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRandomColor = (id: string) => {
    const colors = [
      'bg-red-500',
      'bg-pink-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-blue-500',
      'bg-cyan-500',
      'bg-teal-500',
      'bg-green-500',
      'bg-lime-500',
      'bg-yellow-500',
      'bg-orange-500',
      'bg-amber-500',
    ]

    // Generate a consistent color based on the ID
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff
      return a
    }, 0)

    return colors[Math.abs(hash) % colors.length]
  }

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }

  if (conversation.isGroup) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-blue-500 text-white',
          sizeClasses[size],
          className,
        )}
      >
        <Users className="h-4 w-4" />
      </div>
    )
  }

  const otherUser = getOtherParticipant()
  if (!otherUser) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-400 text-white',
          sizeClasses[size],
          className,
        )}
      >
        <User className="h-4 w-4" />
      </div>
    )
  }

  const initials = getInitials(otherUser.name)
  const bgColor = getRandomColor(otherUser.id)

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium text-white',
        bgColor,
        sizeClasses[size],
        className,
      )}
    >
      {initials}
    </div>
  )
}
