import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { getErrorMessage } from '../lib/api'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-medium mb-2">Welcome back</h1>
        <p className="text-sm text-ink-3">Sign in to your SmartLease account</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-7 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" required autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password" required
                className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-right mt-1">
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-px disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative text-center"><span className="bg-white px-3 text-xs text-ink-3">or</span></div>
        </div>

        <p className="text-center text-sm text-ink-3">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:underline font-medium">Create one free</Link>
        </p>
      </div>
    </div>
  )
}
