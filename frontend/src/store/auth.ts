import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'

export type Plan = 'FREE' | 'PRO' | 'BUSINESS'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  city?: string
  state?: string
  emailVerified: boolean
  plan: Plan
  analysesUsed: number
  analysesLimit: number
  createdAt: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean

  setUser: (user: User) => void
  setAccessToken: (token: string) => void
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<boolean>
  updateUser: (data: Partial<User>) => void
  clearAuth: () => void
}

interface RegisterData {
  email: string
  password: string
  name: string
  city?: string
  state?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setAccessToken: (token) => set({ accessToken: token }),
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login', { email, password })
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/register', data)
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {}
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      refreshAuth: async () => {
        try {
          const res = await api.post('/auth/refresh')
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            isAuthenticated: true,
          })
          return true
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false })
          return false
        }
      },

      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'smartlease-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
)
