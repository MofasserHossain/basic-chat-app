'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserMinus, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  username: string
}

interface GroupCreationPopupProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (groupName: string, memberIds: string[]) => void
  currentUserId: string
}

export function GroupCreationPopup({
  isOpen,
  onClose,
  onCreateGroup,
  currentUserId,
}: GroupCreationPopupProps) {
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [_isSearching, setIsSearching] = useState(false)

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
          (user: User) => !selectedUsers.find((su) => su.id === user.id),
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

  // Add user to selection
  const addUser = (user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
      setSearchResults([])
      setSearchQuery('')
    }
  }

  // Remove user from selection
  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId))
  }

  // Handle group creation
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name')
      return
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one member')
      return
    }

    setIsLoading(true)
    try {
      const memberIds = selectedUsers.map((u) => u.id)
      await onCreateGroup(groupName.trim(), memberIds)

      // Reset form
      setGroupName('')
      setSelectedUsers([])
      setSearchQuery('')
      setSearchResults([])
      onClose()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error creating group: ' + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form when popup closes
  useEffect(() => {
    if (!isOpen) {
      setGroupName('')
      setSelectedUsers([])
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create New Group</h2>
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
          {/* Group Name Input */}
          <div>
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="mt-1"
            />
          </div>

          {/* User Search */}
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
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded border p-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex cursor-pointer items-center justify-between rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => addUser(user)}
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                  <UserPlus className="h-4 w-4 text-blue-500" />
                </div>
              ))}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <Label className="mb-2 block">
                Selected Members ({selectedUsers.length})
              </Label>
              <div className="space-y-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUser(user.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              className="flex-1"
              disabled={
                !groupName.trim() || selectedUsers.length === 0 || isLoading
              }
            >
              {isLoading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
