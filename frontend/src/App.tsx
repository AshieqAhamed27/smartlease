import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { useAuthStore } from './store/auth'

// Layouts
import { DashboardLayout } from './components/layouts/DashboardLayout'
import { AuthLayout } from './components/layouts/AuthLayout'

// Public pages
import { LandingPage } from './pages/Landing'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { ForgotPasswordPage } from './pages/ForgotPassword'
import { ResetPasswordPage } from './pages/ResetPassword'
import { VerifyEmailPage } from './pages/VerifyEmail'

// Dashboard pages
import { DashboardHome } from './pages/dashboard/Home'
import { LeaseDetailPage } from './pages/dashboard/LeaseDetail'
import { ComparePage } from './pages/dashboard/Compare'
import { RightsPage } from './pages/dashboard/Rights'
import { TemplatesPage } from './pages/dashboard/Templates'
import { BillingPage } from './pages/dashboard/Billing'
import { SettingsPage } from './pages/dashboard/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes
      retry: (count, err: any) => {
        if (err?.response?.status === 401) return false
        return count < 2
      },
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Auth (redirect if logged in) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Dashboard (protected) */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="leases/:id" element={<LeaseDetailPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="rights" element={<RightsPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a2e1a',
            color: '#a8e6aa',
            fontFamily: 'DM Mono, monospace',
            fontSize: '13px',
            borderRadius: '10px',
            border: '1px solid #243424',
          },
          success: { iconTheme: { primary: '#7ecf81', secondary: '#1a2e1a' } },
          error: {
            style: { background: '#fdf0ee', color: '#c0392b', border: '1px solid #f5c0bb' },
            iconTheme: { primary: '#c0392b', secondary: '#fdf0ee' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
