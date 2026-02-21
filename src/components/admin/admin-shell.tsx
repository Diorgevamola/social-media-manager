'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin',          icon: LayoutDashboard, label: 'Dashboard',  exact: true },
  { href: '/admin/users',    icon: Users,           label: 'Usuários',   exact: false },
  { href: '/admin/financial', icon: DollarSign,     label: 'Financeiro', exact: false },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex bg-background">

      {/* Sidebar */}
      <aside className="w-60 bg-zinc-950 border-r border-white/5 flex flex-col shrink-0">

        {/* Header */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-white/5">
          <div className="size-8 bg-zinc-900 border border-white/10 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4 text-white/70" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Admin</p>
            <p className="text-xs text-white/30 mt-0.5">Painel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Back to app */}
        <div className="p-3 border-t border-white/5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="size-4 shrink-0" />
            Voltar ao app
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
