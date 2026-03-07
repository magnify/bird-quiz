'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Oversigt', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { href: '/admin/birds', label: 'Fugle', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { href: '/admin/images', label: 'Billeder', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/admin/groups', label: 'Grupper', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/admin/analytics', label: 'Analyse', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/admin/audit', label: 'Logbog', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
]

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r flex flex-col" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link href="/" className="flex items-center gap-2 no-underline" style={{ color: 'var(--accent)' }}>
            <svg viewBox="0 0 100 100" fill="none" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10C30 10 15 30 15 50C15 70 30 90 50 90C55 90 60 85 58 80C56 75 60 72 65 72C70 72 75 68 75 60C75 35 65 10 50 10Z" fill="currentColor" opacity="0.2"/>
              <path d="M25 45C25 45 35 25 55 20C55 20 45 35 50 50C55 65 40 75 30 65C20 55 25 45 25 45Z" fill="currentColor" opacity="0.4"/>
              <circle cx="38" cy="42" r="3" fill="currentColor"/>
            </svg>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Dansk Fugleviden</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors"
                style={{
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  borderLeft: isActive ? '2px solid var(--accent-dim)' : '2px solid transparent',
                }}
              >
                <NavIcon d={item.icon} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Tilbage til quiz
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
