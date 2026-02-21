'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Instagram,
  CalendarDays,
  BarChart2,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/ui/logo'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/accounts', icon: Instagram, label: 'Contas' },
  { href: '/dashboard/schedule', icon: CalendarDays, label: 'Cronograma' },
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-card border-r flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-4 border-b">
        <div className="size-8 bg-black rounded-lg flex items-center justify-center shrink-0 border border-white/10">
          <LogoMark size={20} />
        </div>
        <span className="font-semibold text-sm">Social Manager</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/dashboard/settings')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <Settings className="size-4 shrink-0" />
          Configurações
        </Link>
      </div>
    </aside>
  )
}
