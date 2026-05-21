import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { getErrorMessage } from '../lib/api'

const STATES = ['Karnataka','Maharashtra','Tamil Nadu','Delhi NCR','Telangana','West Bengal','Gujarat','Rajasthan','Uttar Pradesh','Pune']

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
]

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', city: '', state: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Check your email to verify.')
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
        <h1 className="font-serif text-3xl font-medium mb-2">Create your account</h1>
        <p className="text-sm text-ink-3">Start free — 2 analyses included</p>
      </div>

      <div className="bg-white border border-border rounded-2xl p-7 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name" type="text" value={form.name} onChange={set('name')} placeholder="Your name" required autoFocus />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" required />

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                placeholder="Min 8 characters" required
                className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password && (
              <div className="mt-2 space-y-1">
                {PASSWORD_RULES.map(r => (
                  <div key={r.label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${r.test(form.password) ? 'text-success' : 'text-ink-4'}`}>
                    <CheckCircle className="w-3 h-3" />
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City" type="text" value={form.city} onChange={set('city')} placeholder="Bengaluru" />
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">State</label>
              <select value={form.state} onChange={set('state')}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent transition-all text-ink">
                <option value="">Select…</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-px disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-[12px] text-ink-3 mt-4">
          By signing up you agree to our{' '}
          <Link to="/terms" className="text-accent hover:underline">Terms</Link> &amp;{' '}
          <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
        </p>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative text-center"><span className="bg-white px-3 text-xs text-ink-3">already have an account?</span></div>
        </div>
        <Link to="/login" className="block w-full text-center py-2.5 border border-border rounded-xl text-sm font-medium text-ink-2 hover:bg-paper transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">{label}</label>
      <input {...props}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all" />
    </div>
  )
}
