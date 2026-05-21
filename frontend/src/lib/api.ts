import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // for httpOnly cookie refresh token
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Attach access token from Zustand store
  // We import directly to avoid circular deps
  const stored = localStorage.getItem('smartlease-auth')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${state.accessToken}`
      }
    } catch {}
  }
  return config
})

// ─── RESPONSE INTERCEPTOR (auto-refresh) ─────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any

    // If 401 and not already retrying and not the refresh endpoint itself
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        // Queue request until token refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const res = await api.post('/auth/refresh')
        const newToken = res.data.accessToken

        // Update stored token
        const stored = localStorage.getItem('smartlease-auth')
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.state.accessToken = newToken
          localStorage.setItem('smartlease-auth', JSON.stringify(parsed))
        }

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)

        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        // Clear auth and redirect to login
        localStorage.removeItem('smartlease-auth')
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── TYPED API HELPERS ────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
}

export const leasesApi = {
  list: (params?: any) => api.get('/leases', { params }),
  get: (id: string) => api.get(`/leases/${id}`),
  upload: (formData: FormData) => api.post('/leases/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      // can track progress
    }
  }),
  update: (id: string, data: any) => api.patch(`/leases/${id}`, data),
  delete: (id: string) => api.delete(`/leases/${id}`),
  status: (id: string) => api.get(`/leases/${id}/status`),
  download: (id: string) => api.get(`/leases/${id}/download`),
}

export const chatApi = {
  send: (leaseId: string, content: string) => api.post(`/chat/${leaseId}`, { content }),
  history: (leaseId: string) => api.get(`/chat/${leaseId}`),
  clear: (leaseId: string) => api.delete(`/chat/${leaseId}`),
}

export const billingApi = {
  info: () => api.get('/billing'),
  checkout: (plan: string) => api.post('/billing/checkout', { plan }),
  verify: (data: any) => api.post('/billing/verify', data),
  cancel: () => api.post('/billing/cancel'),
  invoices: () => api.get('/billing/invoices'),
}

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
}

export const templatesApi = {
  generate: (type: string, context: any) => api.post('/templates/generate', { type, context }),
}

// Error helper
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.response?.data?.error || err.message
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}
