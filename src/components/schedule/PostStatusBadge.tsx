'use client'

import { Badge } from '@/components/ui/badge'
import type { PostStatus } from '@/types/post'
import { POST_STATUS_CONFIG } from '@/types/post'
import { Check, Calendar, PencilIcon } from 'lucide-react'

interface PostStatusBadgeProps {
  status: PostStatus
  size?: 'sm' | 'md'
  showEmoji?: boolean
  showIcon?: boolean
}

const STATUS_ICONS: Record<PostStatus, typeof Check> = {
  draft: PencilIcon,
  planned: Calendar,
  published: Check,
}

export function PostStatusBadge({
  status,
  size = 'md',
  showEmoji = false,
  showIcon = false,
}: PostStatusBadgeProps) {
  const config = POST_STATUS_CONFIG[status]
  const Icon = STATUS_ICONS[status]

  const isSmall = size === 'sm'
  const iconSize = isSmall ? 'size-3' : 'size-4'
  const textSize = isSmall ? 'text-xs' : 'text-sm'

  return (
    <Badge
      className={`${config.color.bg} ${config.color.border} ${config.color.text} border gap-1.5`}
    >
      {showEmoji && <span>{config.emoji}</span>}
      {showIcon && <Icon className={iconSize} />}
      <span className={textSize}>{config.label}</span>
    </Badge>
  )
}
