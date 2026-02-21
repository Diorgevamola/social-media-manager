'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

const THEMES = [
  { value: 'system', label: 'Sistema', description: 'Segue o tema do dispositivo', icon: Monitor },
  { value: 'light', label: 'Claro', description: 'Sempre tema claro', icon: Sun },
  { value: 'dark', label: 'Escuro', description: 'Sempre tema escuro', icon: Moon },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-[88px] animate-pulse bg-muted rounded-lg" />
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map((t) => {
        const Icon = t.icon
        const isActive = theme === t.value
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-center ${
              isActive
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary/40 hover:bg-muted/50'
            }`}
          >
            <Icon className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
