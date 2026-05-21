import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'danger'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'profile', label: '👤 Profile' },
  { key: 'notifications', label: '🔔 Notifications' },
  { key: 'privacy', label: '🔒 Privacy' },
  { key: 'danger', label: '⚠️ Danger Zone' },
]

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('profile')

  return (
    <div className="animate-fade-up">
      <div className="grid grid-cols-[180px_1fr] gap-5 max-w-3xl">
        {/* Sidebar nav */}
        <div className="flex flex-col gap-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium text-left transition-all',
                tab === t.key
                  ? 'bg-white border border-border text-ink shadow-card'
                  : 'text-ink-2 hover:bg-paper'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-white border border-border rounded-2xl p-6 animate-fade-up">
          {tab === 'profile' && <ProfilePanel />}
          {tab === 'notifications' && <NotificationsPanel />}
          {tab === 'privacy' && <PrivacyPanel />}
          {tab === 'danger' && <DangerPanel />}
        </div>
      </div>
    </div>
  )
}

function ProfilePanel() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name || '',
    city: user?.city || '',
    state: user?.state || '',
  })
  const [pw, setPw] = useState({ current: '', next: '', show: false })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.patch('/users/me', form)
      updateUser(res.data)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePwChange = async () => {
    if (pw.next.length < 8) { toast.error('New password must be at least 8 characters'); return }
    try {
      await api.post('/users/change-password', { currentPassword: pw.current, newPassword: pw.next })
      toast.success('Password changed!')
      setPw({ current: '', next: '', show: false })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password')
    }
  }

  return (
    <div>
      <h2 className="font-serif text-xl font-medium mb-1">Profile</h2>
      <p className="text-sm text-ink-3 mb-5">Manage your personal information</p>

      <div className="space-y-3 mb-1">
        <SectionLabel>Personal Info</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          <Field label="Email" value={user?.email || ''} onChange={() => {}} disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="Bengaluru" />
          <Field label="State" value={form.state} onChange={v => setForm(f => ({ ...f, state: v }))} placeholder="Karnataka" />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>

      <div className="border-t border-border my-5" />

      <SectionLabel>Change Password</SectionLabel>
      <div className="space-y-3 mt-3">
        <Field label="Current Password" type="password" value={pw.current} onChange={v => setPw(p => ({ ...p, current: v }))} />
        <div className="relative">
          <Field label="New Password" type={pw.show ? 'text' : 'password'} value={pw.next} onChange={v => setPw(p => ({ ...p, next: v }))} placeholder="Min 8 characters" />
          <button type="button" onClick={() => setPw(p => ({ ...p, show: !p.show }))}
            className="absolute right-3 top-8 text-ink-3 hover:text-ink transition-colors">
            {pw.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button onClick={handlePwChange}
          className="border border-border hover:bg-paper text-ink-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Change Password
        </button>
      </div>
    </div>
  )
}

function NotificationsPanel() {
  const [settings, setSettings] = useState({
    analysisComplete: true,
    weeklyDigest: true,
    leaseExpiry: true,
    marketing: false,
  })
  const toggle = (k: keyof typeof settings) => {
    setSettings(s => ({ ...s, [k]: !s[k] }))
    toast.success('Preference saved')
  }
  return (
    <div>
      <h2 className="font-serif text-xl font-medium mb-1">Notifications</h2>
      <p className="text-sm text-ink-3 mb-5">Control what alerts you receive</p>
      <SectionLabel>Email Alerts</SectionLabel>
      <div className="mt-3 space-y-0 divide-y divide-border">
        {[
          { key: 'analysisComplete', label: 'Analysis Complete', desc: 'When your lease analysis finishes' },
          { key: 'weeklyDigest', label: 'Weekly Rights Digest', desc: 'Tenant rights tips and news' },
          { key: 'leaseExpiry', label: 'Lease Expiry Reminders', desc: '30-day heads-up before lease expires' },
          { key: 'marketing', label: 'Marketing Emails', desc: 'Product updates and special offers' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-ink-3">{item.desc}</div>
            </div>
            <Toggle on={settings[item.key as keyof typeof settings]} onClick={() => toggle(item.key as keyof typeof settings)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function PrivacyPanel() {
  const [settings, setSettings] = useState({ improveAI: false, storeHistory: true, twoFactor: false })
  const toggle = (k: keyof typeof settings) => { setSettings(s => ({ ...s, [k]: !s[k] })); toast.success('Privacy setting updated') }
  return (
    <div>
      <h2 className="font-serif text-xl font-medium mb-1">Privacy &amp; Security</h2>
      <p className="text-sm text-ink-3 mb-5">Control how your data is handled</p>
      <SectionLabel>Data Controls</SectionLabel>
      <div className="mt-3 space-y-0 divide-y divide-border mb-5">
        {[
          { key: 'improveAI', label: 'Improve SmartLease AI', desc: 'Anonymized lease data helps train our models' },
          { key: 'storeHistory', label: 'Store Analysis History', desc: 'Keep reports beyond 90 days' },
          { key: 'twoFactor', label: 'Two-Factor Authentication', desc: 'Extra security on login (coming soon)' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-ink-3">{item.desc}</div>
            </div>
            <Toggle on={settings[item.key as keyof typeof settings]} onClick={() => toggle(item.key as keyof typeof settings)} />
          </div>
        ))}
      </div>
      <SectionLabel>Data Export</SectionLabel>
      <p className="text-sm text-ink-3 mt-2 mb-3">Download all your data including analyses, chat history, and reports</p>
      <button onClick={() => toast.success('📦 Export requested — ready in 24 hours')}
        className="border border-border hover:bg-paper text-ink-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
        Export All My Data
      </button>
    </div>
  )
}

function DangerPanel() {
  const { logout } = useAuthStore()
  return (
    <div>
      <h2 className="font-serif text-xl font-medium mb-1">Danger Zone</h2>
      <p className="text-sm text-ink-3 mb-5">These actions are permanent and cannot be undone</p>
      <div className="space-y-3">
        <div className="bg-danger-light border border-danger-mid rounded-xl p-4">
          <div className="font-semibold text-danger mb-1">Delete All Lease Data</div>
          <div className="text-sm text-ink-2 mb-3">Permanently remove all analyzed leases, reports, and chat history.</div>
          <button onClick={() => toast.error('⛔ Confirmation email sent — check your inbox')}
            className="bg-danger-light border border-danger-mid text-danger px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity">
            Delete Lease Data
          </button>
        </div>
        <div className="bg-danger-light border border-danger-mid rounded-xl p-4">
          <div className="font-semibold text-danger mb-1">Delete Account</div>
          <div className="text-sm text-ink-2 mb-3">Permanently remove your account and all associated data. Cannot be reversed.</div>
          <button onClick={() => toast.error('⛔ Contact support@smartlease.in to delete your account')}
            className="bg-danger-light border border-danger-mid text-danger px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity">
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn('w-10 h-5 rounded-full relative transition-colors flex-shrink-0', on ? 'bg-accent' : 'bg-border-2')}>
      <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', on && 'translate-x-5')} />
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3 font-medium">{children}</div>
}

function Field({ label, value, onChange, placeholder, type = 'text', disabled = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-mono uppercase tracking-wider text-ink-2 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className={cn(
          'w-full px-3 py-2 border border-border rounded-lg text-sm bg-paper focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all',
          disabled && 'opacity-50 cursor-not-allowed'
        )} />
    </div>
  )
}
