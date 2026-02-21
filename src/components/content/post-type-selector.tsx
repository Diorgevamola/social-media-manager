'use client'

import { cn } from '@/lib/utils'
import type { PostType } from '@/types/database'
import { ImageIcon, LayoutGrid, Video } from 'lucide-react'

interface PostTypeSelectorProps {
  value: PostType
  onChange: (type: PostType) => void
}

const types = [
  {
    value: 'post' as PostType,
    label: 'Post',
    description: 'Imagem única',
    icon: ImageIcon,
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    value: 'carousel' as PostType,
    label: 'Carrossel',
    description: 'Múltiplas imagens',
    icon: LayoutGrid,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    value: 'reel' as PostType,
    label: 'Reel',
    description: 'Vídeo curto',
    icon: Video,
    gradient: 'from-orange-500 to-pink-500',
  },
]

export function PostTypeSelector({ value, onChange }: PostTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {types.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={cn(
            'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
            value === type.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/30 hover:bg-accent/50',
          )}
        >
          <div
            className={cn(
              'size-10 rounded-lg flex items-center justify-center bg-gradient-to-br',
              type.gradient,
            )}
          >
            <type.icon className="size-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-sm">{type.label}</p>
            <p className="text-xs text-muted-foreground">{type.description}</p>
          </div>
          {value === type.value && (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  )
}
