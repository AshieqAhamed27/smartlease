// ─── Auth Layout ─────────────────────────────────────────────
// src/components/layouts/AuthLayout.tsx

import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <nav className="px-8 py-4 border-b border-border bg-white">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center text-sm">🏠</div>
          <span className="font-serif text-lg font-medium">SmartLease</span>
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Outlet />
      </div>
    </div>
  )
}
