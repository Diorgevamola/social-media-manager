'use client'

import { POST_STATUS_CONFIG, PostStatus } from '@/types/post'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PostStatusIndicatorProps {
  status: PostStatus
  scheduledDate?: Date | string
  showProgress?: boolean
  className?: string
}

export function PostStatusIndicator({
  status,
  scheduledDate,
  showProgress = true,
  className = ''
}: PostStatusIndicatorProps) {
  const config = POST_STATUS_CONFIG[status]

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, "dd 'de' MMMM, HH:mm", { locale: ptBR })
  }

  const progressColor = {
    draft: 'bg-muted-foreground',
    planned: 'bg-info',
    published: 'bg-success',
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Label + Data */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{config.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {config.progress}%
          </span>
        </div>
        {scheduledDate && (
          <span className="text-xs text-muted-foreground">
            {formatDate(scheduledDate)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${progressColor[status]} transition-all duration-500 ease-out status-update`}
            style={{ width: `${config.progress}%` }}
            role="progressbar"
            aria-valuenow={config.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${config.label}: ${config.progress}% completo`}
          />
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground">{config.description}</p>
    </div>
  )
}
