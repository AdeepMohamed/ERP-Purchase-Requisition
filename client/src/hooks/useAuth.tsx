import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import api from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'admin'
  department: string
  isDeptHead: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('erp_token')
    const savedUser = localStorage.getItem('erp_user')
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User
        setToken(savedToken)
        setUser(parsedUser)
        // Re-establish socket connection on session restore
        connectSocket({ role: parsedUser.role, department: parsedUser.department })
      } catch {
        // Corrupt stored data — clear it
        localStorage.removeItem('erp_token')
        localStorage.removeItem('erp_user')
      }
    }
    setIsLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('erp_token', data.token)
    localStorage.setItem('erp_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    connectSocket({ role: data.user.role, department: data.user.department })
  }

  function logout() {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setToken(null)
    setUser(null)
    disconnectSocket()
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
