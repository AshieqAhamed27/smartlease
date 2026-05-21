import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Scale, Zap, FileText, Settings,
  Bell, LogOut, Plus, ChevronDown, X, Check, ArrowRight,
  Upload, Home, CreditCard
} from 'lucide-react'

import { useAuthStore } from '../../store/auth'
import { notificationsApi, leasesApi } from '../../lib/api'
import { UploadModal } from '../UploadModal'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/compare', label: 'Compare Leases', icon: Scale },
]
const RESOURCE_ITEMS = [
  { to: '/dashboard/rights', label: 'Tenant Rights', icon: Zap },
  { to: '/dashboard/templates', label: 'Templates', icon: FileText, badge: '3' },
]
const ACCOUNT_ITEMS = [
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationsApi.list()
      return res.data
    },
    refetchInterval: 30000,
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifs.filter((n: any) => !n.read).length
  const usagePercent = user ? Math.round((user.analysesUsed / user.analysesLimit) * 100) : 0

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* ── SIDEBAR ── */}
      <aside className="w-60 bg-dark-2 flex flex-col flex-shrink-0 overflow-hidden relative">
        {/* Decorative blob */}
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-accent/5 -translate-x-8 translate-y-8 pointer-events-none" />

        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/7">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent-light rounded-lg flex items-center justify-center text-sm flex-shrink-0">🏠</div>
            <div>
              <div className="font-serif text-[18px] text-white font-medium leading-none">SmartLease</div>
              <div className="text-[10px] text-white/30 font-mono mt-1 tracking-wider">LEASE INTELLIGENCE</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <NavSection label="Workspace">
            {NAV_ITEMS.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </NavSection>

          <NavSection label="Resources">
            {RESOURCE_ITEMS.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </NavSection>

          <NavSection label="Account">
            {ACCOUNT_ITEMS.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </NavSection>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/6">
          {/* Usage bar */}
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">Analyses</span>
              <span className="text-[10px] text-white/40 font-mono">
                {user?.analysesUsed}/{user?.analysesLimit}
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-light rounded-full transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/6 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="text-[13px] text-white/75 font-medium truncate">{user?.name}</div>
                <div className="text-[11px] text-white/30 font-mono">{user?.plan} Plan</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-border rounded-xl shadow-card-lg overflow-hidden z-50">
                <div className="p-3 border-b border-border">
                  <div className="text-sm font-medium text-ink">{user?.name}</div>
                  <div className="text-xs text-ink-3 mt-0.5">{user?.email}</div>
                </div>
                <div className="p-1">
                  <button onClick={() => { navigate('/dashboard/settings'); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-2 hover:bg-paper rounded-lg transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button onClick={() => { navigate('/dashboard/billing'); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-2 hover:bg-paper rounded-lg transition-colors">
                    <CreditCard className="w-4 h-4" /> Billing
                  </button>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-light rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 px-6 border-b border-border bg-white flex items-center justify-between flex-shrink-0">
          <PageTitle />

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative w-9 h-9 flex items-center justify-center border border-border rounded-lg bg-white hover:bg-paper transition-colors"
              >
                <Bell className="w-4 h-4 text-ink-3" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-white" />
                )}
              </button>

              {showNotifs && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-border-2 rounded-2xl shadow-card-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="font-medium text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllRead.mutate()}
                        className="text-xs text-accent hover:text-accent-dark font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="p-8 text-center text-ink-3 text-sm">No notifications yet</div>
                    ) : notifs.map((n: any) => (
                      <NotifItem key={n.id} notif={n} onClose={() => setShowNotifs(false)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-all hover:-translate-y-px"
            >
              <Plus className="w-4 h-4" />
              Analyze Lease
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-cream">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] text-white/25 uppercase tracking-widest font-mono px-2 mb-1">{label}</div>
      {children}
    </div>
  )
}

function SidebarLink({ to, label, icon: Icon, badge, exact }: {
  to: string; label: string; icon: any; badge?: string; exact?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all mb-0.5 group',
        isActive
          ? 'bg-accent/20 text-accent-3'
          : 'text-white/50 hover:bg-white/6 hover:text-white/80'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function PageTitle() {
  const location = useLocation()
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/compare': 'Compare Leases',
    '/dashboard/rights': 'Tenant Rights',
    '/dashboard/templates': 'Templates',
    '/dashboard/billing': 'Billing',
    '/dashboard/settings': 'Settings',
  }
  const path = location.pathname
  const title = path.includes('/dashboard/leases/') ? 'Lease Analysis'
    : titles[path] || 'SmartLease'
  return <h1 className="font-serif text-xl font-medium text-ink tracking-tight">{title}</h1>
}

function NotifItem({ notif, onClose }: { notif: any; onClose: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const markRead = useMutation({
    mutationFn: () => notificationsApi.markRead(notif.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleClick = () => {
    markRead.mutate()
    if (notif.link) {
      navigate(notif.link)
      onClose()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-paper transition-colors',
        !notif.read && 'bg-success-light'
      )}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-paper">
        {notif.icon || '🔔'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink leading-snug">{notif.title}</div>
        <div className="text-xs text-ink-3 mt-0.5 leading-snug">{notif.body}</div>
        <div className="text-[10px] text-ink-4 font-mono mt-1">
          {new Date(notif.createdAt).toLocaleTimeString?.() || notif.time || 'recently'}
        </div>
      </div>
      {!notif.read && <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />}
    </div>
  )
}
