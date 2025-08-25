import { useAuth } from '@/contexts/auth-context'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

interface UseSocketConnectionReturn {
  isConnected: boolean
  isAuthenticated: boolean
  socket: Socket | null
  userData: {
    userId: string
    username: string
    email: string
  } | null
}

export function useSocketConnection(): UseSocketConnectionReturn {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userData, setUserData] = useState<{
    userId: string
    username: string
    email: string
  } | null>(null)

  // Helper function to get auth token from cookies
  const getAuthToken = (): string | null => {
    if (typeof document === 'undefined') return null

    const cookies = document.cookie.split(';')
    const authCookie = cookies.find((cookie) =>
      cookie.trim().startsWith('auth-token='),
    )

    if (authCookie) {
      return authCookie.split('=')[1]
    }

    return null
  }

  // Initialize socket connection
  useEffect(() => {
    if (!user) {
      setIsConnected(false)
      setIsAuthenticated(false)
      setUserData(null)
      return
    }

    // Create socket connection to root server
    const socket = io(
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      {
        auth: {
          token: getAuthToken(),
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
      },
    )

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      // console.log('WebSocket connected')
      setIsConnected(true)

      // If we have a token, verify it manually
      const token = getAuthToken()
      if (token) {
        socket.emit('auth:verify', token)
      }
    })

    socket.on('disconnect', () => {
      // console.log('WebSocket disconnected')
      setIsConnected(false)
      setIsAuthenticated(false)
      setUserData(null)
    })

    socket.on('connect_error', (error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('WebSocket connection error:' + errorMessage)
      setIsConnected(false)
      setIsAuthenticated(false)
      setUserData(null)
    })

    socket.on('reconnect', (_attemptNumber) => {
      // console.log('WebSocket reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)

      // Re-verify authentication after reconnection
      const token = getAuthToken()
      if (token) {
        socket.emit('auth:verify', token)
      }
    })

    socket.on('reconnect_error', (error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('WebSocket reconnection error:' + errorMessage)
      setIsConnected(false)
      setIsAuthenticated(false)
      setUserData(null)
    })

    // Authentication events
    socket.on('auth:success', (userData) => {
      // console.log('WebSocket authentication successful:', userData)
      setIsAuthenticated(true)
      setUserData(userData)
    })

    socket.on('auth:error', (error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('WebSocket authentication error:' + errorMessage)
      setIsAuthenticated(false)
      setUserData(null)
    })

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.disconnect()
      }
      socketRef.current = null
      setIsConnected(false)
      setIsAuthenticated(false)
      setUserData(null)
    }
  }, [user])

  return {
    isConnected,
    isAuthenticated,
    socket: socketRef.current,
    userData,
  }
}
