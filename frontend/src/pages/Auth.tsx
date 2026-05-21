import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle } from 'lucide-react'
import { authApi, getErrorMessage } from '../lib/api'

// ── Forgot Password ───────────────────────────────────────────
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-medium mb-2">Reset Password</h1>
        <p className="text-sm text-ink-3">Enter your email to receive a reset link</p>
      </div>
      <div className="bg-white border border-border rounded-2xl p-7 shadow-card">
        {sent ? (
          <div className="text-center py-4">
            <CheckCircle className="w-14 h-14 text-success mx-auto mb-4" />
            <div className="font-serif text-lg mb-2">Check your inbox</div>
            <p className="text-sm text-ink-3 mb-5">If this email is registered, you'll receive a password reset link shortly.</p>
            <Link to="/login" className="text-sm text-accent hover:underline">← Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" required autoFocus
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Reset Link
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-ink-3 hover:text-ink transition-colors">← Back to login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Reset Password ────────────────────────────────────────────
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      toast.success('Password reset! Please log in.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">❌</div>
      <div className="font-serif text-lg mb-2">Invalid reset link</div>
      <Link to="/forgot-password" className="text-sm text-accent hover:underline">Request a new one</Link>
    </div>
  )

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-medium mb-2">New Password</h1>
        <p className="text-sm text-ink-3">Choose a strong password</p>
      </div>
      <div className="bg-white border border-border rounded-2xl p-7 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters" required autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Reset Password
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Verify Email ──────────────────────────────────────────────
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useState(() => {
    if (!token) { setStatus('error'); return }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  })

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center max-w-sm px-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
            <div className="font-serif text-lg">Verifying your email…</div>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <div className="font-serif text-2xl mb-2">Email Verified!</div>
            <p className="text-sm text-ink-3 mb-6">Your account is fully activated.</p>
            <button onClick={() => navigate('/dashboard')}
              className="bg-accent hover:bg-accent-dark text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Open Dashboard →
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <div className="font-serif text-2xl mb-2">Verification Failed</div>
            <p className="text-sm text-ink-3 mb-6">This link may have expired. Please request a new one.</p>
            <button onClick={() => navigate('/login')}
              className="bg-accent hover:bg-accent-dark text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
