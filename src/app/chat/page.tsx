'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuth } from '@/contexts/auth-context'
import { useSocketConnection } from '@/hooks/use-socket-connection'
import { cn } from '@/lib/utils'
import { ChatMessage } from '@/types/websocket'
import { Loader2, LogOut, Plus, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  username: string
}

interface Conversation {
  id: string
  participants: Array<{
    user: User
  }>
  messages: ChatMessage[]
  updatedAt: string
}

export default function ChatPage() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize WebSocket
  const { isConnected, isAuthenticated, userData, socket } =
    useSocketConnection()

  // Create notification sound
  const playNotificationSound = () => {
    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        audioContextRef.current = new AudioContextClass()
      }

      const audioContext = audioContextRef.current

      // Create oscillator for the sound
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Configure sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 800Hz tone
      oscillator.frequency.exponentialRampToValueAtTime(
        600,
        audioContext.currentTime + 0.1,
      ) // Slide down

      // Configure volume
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime) // Start at 30% volume
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1,
      ) // Fade out

      // Play sound
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (_error) {
      // Silently handle audio errors
    }
  }

  // WebSocket event handlers
  useEffect(() => {
    if (!socket || !isAuthenticated) return

    // Join conversation room when conversation is selected
    if (selectedConversation) {
      socket.emit('join:conversation', selectedConversation.id)
      // console.log('Joined conversation room:', selectedConversation.id)
    }

    // Listen for new messages from OTHER users only
    socket.on('message:received', (message: ChatMessage) => {
      // console.log('New message received from other user:', message)

      // Only add message if it's from another user in the current conversation
      if (
        message.conversationId === selectedConversation?.id &&
        message.senderId !== user?.id
      ) {
        setMessages((prev) => [...prev, message])
      }
    })

    // Listen for conversation updates
    socket.on(
      'conversation:updated',
      (data: { conversationId: string; message: ChatMessage }) => {
        // Play sound for ALL incoming messages from other users
        if (data.message.senderId !== user?.id) {
          playNotificationSound()
        }
        // Update conversation list with new message
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === data.conversationId) {
              // Add the new message to the conversation
              const updatedMessages = [data.message, ...(conv.messages || [])]
              // Sort messages by creation time (newest first)
              updatedMessages.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              )

              return {
                ...conv,
                messages: updatedMessages,
                updatedAt: data.message.createdAt,
              }
            }
            return conv
          }),
        )
      },
    )

    // Listen for typing indicators
    socket.on(
      'user:typing',
      (conversationId: string, userId: string, username: string) => {
        if (
          conversationId === selectedConversation?.id &&
          userId !== user?.id
        ) {
          setTypingUsers((prev) => new Set([...prev, username]))
        }
      },
    )

    socket.on(
      'user:stopped_typing',
      (conversationId: string, userId: string) => {
        if (
          conversationId === selectedConversation?.id &&
          userId !== user?.id
        ) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev)
            // Find username by userId from conversations
            const conversation = conversations.find(
              (c) => c.id === conversationId,
            )
            const participant = conversation?.participants.find(
              (p) => p.user.id === userId,
            )
            if (participant) {
              newSet.delete(participant.user.username)
            }
            return newSet
          })
        }
      },
    )

    // Cleanup event listeners
    return () => {
      socket.off('message:received')
      socket.off('conversation:updated')
      socket.off('user:typing')
      socket.off('user:stopped_typing')

      // Leave conversation room
      if (selectedConversation) {
        socket.emit('leave:conversation', selectedConversation.id)
        // console.log('Left conversation room:', selectedConversation.id)
      }
    }
  }, [socket, isAuthenticated, selectedConversation, user?.id, conversations])

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !selectedConversation || !isAuthenticated) return

    if (!isTyping) {
      setIsTyping(true)
      socket.emit('message:typing', selectedConversation.id)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socket.emit('message:stop_typing', selectedConversation.id)
    }, 1000)
  }

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('.messages-container')
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  useEffect(() => {
    if (user?.id) {
      fetchConversations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Join conversation rooms when conversations are loaded (only once)
  useEffect(() => {
    if (socket && isAuthenticated && conversations.length > 0) {
      // Join all conversation rooms (this will be called once when conversations are loaded)
      conversations.forEach((conversation) => {
        socket.emit('join:conversation', conversation.id)
        // console.log('Joined conversation room:', conversation.id)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isAuthenticated, conversations.length > 0]) // Only depend on conversations.length > 0

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      // Small delay to ensure conversation is loaded before focusing
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus()
        }
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation])

  // Keep input focused after messages update
  useEffect(() => {
    if (messages.length > 0 && messageInputRef.current) {
      // Only focus if we're not currently typing (to avoid interrupting user)
      if (document.activeElement !== messageInputRef.current) {
        setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.focus()
          }
        }, 50)
      }
    }
  }, [messages.length])

  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true)
      const response = await fetch(`/api/conversations?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        // Sort conversations by latest message time (newest first)
        const sortedConversations = data.sort(
          (a: Conversation, b: Conversation) => {
            const aTime = a.messages?.[0]?.createdAt || a.updatedAt
            const bTime = b.messages?.[0]?.createdAt || b.updatedAt
            return new Date(bTime).getTime() - new Date(aTime).getTime()
          },
        )
        setConversations(sortedConversations)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error fetching conversations:' + errorMessage)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      setIsLoadingConversation(true)
      const response = await fetch(
        `/api/conversations/${conversationId}/messages?userId=${user?.id}`,
      )
      if (response.ok) {
        const data = await response.json()
        // Sort messages by creation time (oldest first for display)
        const sortedMessages = data.sort(
          (a: ChatMessage, b: ChatMessage) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        setMessages(sortedMessages)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error fetching messages:' + errorMessage)
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(
        `/api/users/search?q=${query}&currentUserId=${user?.id}`,
      )
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error searching users:' + errorMessage)
    }
  }

  const startConversation = async (otherUser: User) => {
    try {
      setIsLoadingConversation(true)
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          otherUserId: otherUser.id,
        }),
      })

      if (response.ok) {
        const conversation = await response.json()
        setConversations((prev) => [conversation, ...prev])
        setSelectedConversation(conversation)
        setIsSearchOpen(false)
        setSearchQuery('')
        setSearchResults([])

        // Join the conversation room immediately
        if (socket && isAuthenticated) {
          socket.emit('join:conversation', conversation.id)
          // console.log('Joined new conversation room:', conversation.id)
        }

        // Focus input when starting new conversation
        setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.focus()
          }
        }, 100)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error starting conversation:' + errorMessage)
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return

    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      socket?.emit('message:stop_typing', selectedConversation.id)
    }

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: messageContent,
            senderId: user.id,
          }),
        },
      )

      if (response.ok) {
        const message = await response.json()

        // Add message to current conversation immediately for instant feedback
        // This message is from the current user, so we add it locally
        setMessages((prev) => [...prev, message])

        // Update conversation list with new message and resort
        setConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv.id === selectedConversation.id) {
              // Add the new message to the conversation
              const updatedMessages = [message, ...(conv.messages || [])]
              // Sort messages by creation time (newest first)
              updatedMessages.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              )

              return {
                ...conv,
                messages: updatedMessages,
                updatedAt: message.createdAt,
              }
            }
            return conv
          })

          // Resort conversations by latest message time
          return updated.sort((a, b) => {
            const aTime = a.messages?.[0]?.createdAt || a.updatedAt
            const bTime = b.messages?.[0]?.createdAt || b.updatedAt
            return new Date(bTime).getTime() - new Date(aTime).getTime()
          })
        })

        // Keep focus on input after sending message
        setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.focus()
          }
        }, 0)
      } else {
        // If sending failed, restore the message
        setNewMessage(messageContent)
        toast.error('Failed to send message')
      }
    } catch (error) {
      // If sending failed, restore the message
      setNewMessage(messageContent)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error sending message:' + errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth/signin')
  }

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.user.id !== user?.id)?.user
  }

  const handleConversationSelect = (conversation: Conversation) => {
    setIsLoadingConversation(true)
    setSelectedConversation(conversation)
    setMessages([]) // Clear messages while loading
    setTypingUsers(new Set()) // Clear typing indicators

    // Ensure we're in the conversation room
    if (socket && isAuthenticated) {
      socket.emit('join:conversation', conversation.id)
      // console.log('Joined conversation room:', conversation.id)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Conversations */}
      <div className="flex w-80 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Chats</h1>
            <div className="flex items-center gap-2">
              <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h3 className="font-medium">Start a new conversation</h3>
                    <Input
                      placeholder="Search by username or name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        searchUsers(e.target.value)
                      }}
                    />
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex cursor-pointer items-center justify-between rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => startConversation(user)}
                        >
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button size="sm" variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Socket Status Debug */}
          <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-600">
            <div className="flex items-center justify-between text-xs">
              {userData ? (
                <div className="mt-1 text-xs text-gray-500">
                  User: {userData.username}
                </div>
              ) : (
                <div className="mt-1 text-xs text-gray-500"></div>
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
                <span
                  className={isConnected ? 'text-green-600' : 'text-red-600'}
                >
                  {isConnected ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            {/* <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-gray-500">Auth Status:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className={isAuthenticated ? 'text-green-600' : 'text-yellow-600'}>
                  {isAuthenticated ? 'OK' : 'PENDING'}
                </span>
              </div>
            </div> */}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-blue-500 dark:text-blue-400">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 dark:bg-blue-500"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 delay-100 dark:bg-blue-500"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 delay-200 dark:bg-blue-500"></div>
                </div>
                <span className="text-sm">Loading conversations...</span>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No conversations yet</p>
                <p className="mt-1 text-xs">
                  Start a new chat to begin messaging
                </p>
              </div>
            </div>
          ) : (
            conversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation)
              const lastMessage = conversation?.messages?.[0] || null
              return (
                <div
                  key={conversation.id}
                  className={`cursor-pointer border-b border-gray-100 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                  onClick={() => handleConversationSelect(conversation)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{otherUser?.name}</p>
                      <p className="text-sm text-gray-500">
                        @{otherUser?.username}
                      </p>
                    </div>
                    {lastMessage && (
                      <span className="text-xs text-gray-400">
                        {new Date(lastMessage.createdAt).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <div className="mt-1">
                      <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                        {lastMessage.sender.id === user?.id ? 'You: ' : ''}
                        {lastMessage.content}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(lastMessage.createdAt).toLocaleDateString(
                          [],
                          {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Side - Messages */}
      <div className="relative flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-lg font-semibold">
                {getOtherParticipant(selectedConversation)?.name}
              </h2>
              <p className="text-sm text-gray-500">
                @{getOtherParticipant(selectedConversation)?.username}
              </p>
              {/* WebSocket connection and authentication status */}
              {/* <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
                {userData && (
                  <div className="text-xs text-gray-500">
                    Logged in as: {userData.username}
                  </div>
                )}
              </div> */}
            </div>

            {/* Messages */}
            <div className="messages-container relative flex flex-1 flex-col-reverse space-y-4 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Loading indicator */}
                {isLoadingConversation && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2 text-blue-500 dark:text-blue-400">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 dark:bg-blue-500"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 delay-100 dark:bg-blue-500"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 delay-200 dark:bg-blue-500"></div>
                      </div>
                      <span>Loading conversation...</span>
                    </div>
                  </div>
                )}

                {!isLoadingConversation &&
                  messages.map((message, index) => (
                    <div
                      key={message.id + index}
                      className={cn(
                        'flex',
                        message.senderId === user?.id
                          ? 'justify-end'
                          : 'justify-start',
                      )}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
                          message.senderId === user?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="mt-1 text-xs opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}

                {/* Typing indicators */}
                {typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-xs rounded-lg bg-gray-200 px-4 py-2 text-gray-900 dark:bg-gray-700 dark:text-gray-100 lg:max-w-md">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500"></div>
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 delay-100"></div>
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 delay-200"></div>
                        </div>
                        <span className="text-xs opacity-70">
                          {Array.from(typingUsers).join(', ')} typing...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sending indicator */}
                {isSending && (
                  <div className="flex justify-end">
                    <div className="max-w-xs rounded-lg bg-blue-500 px-4 py-2 text-white opacity-70 lg:max-w-md">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"></div>
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white delay-100"></div>
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white delay-200"></div>
                        </div>
                        <span className="text-xs opacity-70">Sending...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex gap-2">
                <Input
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping() // Trigger typing indicator
                  }}
                  onFocus={() => {
                    // Ensure input stays focused
                    if (messageInputRef.current) {
                      messageInputRef.current.focus()
                    }
                  }}
                  placeholder={
                    isSending ? 'Sending message...' : 'Type a message...'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  className="flex-1"
                  autoFocus
                  disabled={isSending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Select a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a chat from the left sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
