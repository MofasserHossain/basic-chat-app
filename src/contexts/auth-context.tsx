'use client'

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string
  username: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  login: (userData: User) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated by calling the API
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // console.log('AuthContext: Checking auth status...')
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        // console.log('AuthContext: User authenticated:', userData.user)
        setUser(userData.user)
      } else {
        // console.log('AuthContext: No valid session found')
        setUser(null)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error checking auth status:' + errorMessage)
      // console.error('AuthContext: Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (userData: User) => {
    try {
      // console.log('AuthContext: Logging in user:', userData)
      // Set user immediately for immediate UI update
      setUser(userData)

      // Verify the auth status to ensure everything is working
      await checkAuthStatus()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error logging in:' + errorMessage)
      setUser(null)
      throw error
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      toast.error('Error logging out:' + errorMessage)
      // Even if the API call fails, clear the local state
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
