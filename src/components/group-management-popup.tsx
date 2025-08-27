'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChatMessage } from '@/types/websocket'
import { Edit, Save, UserMinus, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  username: string
}

interface Conversation {
  id: string
  groupName?: string
  isGroup: boolean
  adminId?: string
  participants: Array<{
    user: User
    role?: string
  }>
  messages: ChatMessage[]
  updatedAt: string
}

interface GroupManagementPopupProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation | null
  currentUserId: string
  onGroupUpdated: (conversation: Conversation) => void
}

export function GroupManagementPopup({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  onGroupUpdated,
}: GroupManagementPopupProps) {
  const [groupName, setGroupName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [_isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const isAdmin = conversation?.adminId === currentUserId

  // Initialize group name
  useEffect(() => {
    if (conversation) {
      setGroupName(conversation.groupName || '')
    }
  }, [conversation])

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const response = await fetch(
        `/api/users/search?q=${query}&currentUserId=${currentUserId}`,
      )
      if (response.ok) {
        const data = await response.json()
        // Filter out already selected users
        const filteredData = data.filter(
          (user: User) =>
            !conversation?.participants.find((p) => p.user.id === user.id),
        )
        setSearchResults(filteredData)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error searching users: ' + errorMessage)
    } finally {
      setIsSearching(false)
    }
  }

  // Add members to group
  const addMembers = async (userIds: string[]) => {
    if (!conversation || !isAdmin) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/conversations/group', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          action: 'add_members',
          data: { memberIds: userIds },
          userId: currentUserId,
        }),
      })

      if (response.ok) {
        const updatedConversation = await response.json()
        onGroupUpdated(updatedConversation)
        toast.success('Members added successfully')
        setSearchQuery('')
        setSearchResults([])
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add members')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error adding members: ' + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Remove members from group
  const removeMember = async (userId: string) => {
    if (!conversation || !isAdmin) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/conversations/group', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          action: 'remove_members',
          data: { removeMemberIds: [userId] },
          userId: currentUserId,
        }),
      })

      if (response.ok) {
        const updatedConversation = await response.json()
        onGroupUpdated(updatedConversation)
        toast.success('Member removed successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove member')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error removing member: ' + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Update group name
  const updateGroupName = async () => {
    if (!conversation || !isAdmin) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/conversations/group', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          action: 'update_name',
          data: { newGroupName: groupName },
          userId: currentUserId,
        }),
      })

      if (response.ok) {
        const updatedConversation = await response.json()
        onGroupUpdated(updatedConversation)
        toast.success('Group name updated successfully')
        setIsEditingName(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update group name')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error updating group name: ' + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Add user to selection
  const addUser = (user: User) => {
    addMembers([user.id])
  }

  if (!isOpen || !conversation) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Group Settings</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Group Name */}
          <div>
            <Label htmlFor="groupName">Group Name</Label>
            <div className="mt-1 flex gap-2">
              {isEditingName ? (
                <>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={updateGroupName}
                    disabled={isLoading || !groupName.trim()}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    id="groupName"
                    value={groupName}
                    readOnly
                    className="flex-1"
                  />
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Current Members */}
          <div>
            <Label className="mb-2 block">
              Members ({conversation.participants.length})
            </Label>
            <div className="max-h-32 space-y-2 overflow-y-auto rounded border p-2">
              {conversation.participants.map((participant) => (
                <div
                  key={participant.user.id}
                  className="flex items-center justify-between rounded p-2"
                >
                  <div>
                    <p className="font-medium">{participant.user.name}</p>
                    <p className="text-sm text-gray-500">
                      @{participant.user.username}
                      {participant.role === 'admin' && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                          (Admin)
                        </span>
                      )}
                    </p>
                  </div>
                  {isAdmin && participant.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(participant.user.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      disabled={isLoading}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Members (Admin only) */}
          {isAdmin && (
            <div>
              <Label htmlFor="userSearch">Add Members</Label>
              <Input
                id="userSearch"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchUsers(e.target.value)
                }}
                placeholder="Search by username or name..."
                className="mt-1"
              />

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded border p-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex cursor-pointer items-center justify-between rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => addUser(user)}
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">
                          @{user.username}
                        </p>
                      </div>
                      <UserPlus className="h-4 w-4 text-blue-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="pt-4">
            <Button onClick={onClose} className="w-full" variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
