'use client'

import { POST_STATUS_CONFIG, POST_ACTION_CONFIG, PostStatus, PostAction } from '@/types/post'
import { Button } from '@/components/ui/button'
import {
  ImageIcon,
  VideoIcon,
  PencilIcon,
  ClockIcon,
  CheckIcon,
  TrashIcon,
  EyeIcon,
  SendIcon,
  ArrowLeftIcon,
  BarChartIcon,
  ExternalLinkIcon,
  RotateCcwIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  InfoIcon,
  MoreVerticalIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'

interface PostStatusActionsProps {
  status: PostStatus
  postId: string
  onAction: (action: PostAction) => Promise<void>
  loading?: boolean
  className?: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ImageIcon: <ImageIcon className="size-4" />,
  VideoIcon: <VideoIcon className="size-4" />,
  PencilIcon: <PencilIcon className="size-4" />,
  ClockIcon: <ClockIcon className="size-4" />,
  CheckIcon: <CheckIcon className="size-4" />,
  TrashIcon: <TrashIcon className="size-4" />,
  EyeIcon: <EyeIcon className="size-4" />,
  SendIcon: <SendIcon className="size-4" />,
  ArrowLeftIcon: <ArrowLeftIcon className="size-4" />,
  BarChartIcon: <BarChartIcon className="size-4" />,
  ExternalLinkIcon: <ExternalLinkIcon className="size-4" />,
  RotateCcwIcon: <RotateCcwIcon className="size-4" />,
  ArchiveIcon: <ArchiveIcon className="size-4" />,
  ArchiveRestoreIcon: <ArchiveRestoreIcon className="size-4" />
}

export function PostStatusActions({
  status,
  postId,
  onAction,
  loading = false,
  className = ''
}: PostStatusActionsProps) {
  const [loadingAction, setLoadingAction] = useState<PostAction | null>(null)
  const config = POST_STATUS_CONFIG[status]

  const handleAction = async (action: PostAction) => {
    const actionConfig = POST_ACTION_CONFIG[action]

    if (actionConfig.requiresConfirm) {
      if (!confirm(`Tem certeza que deseja ${actionConfig.label.toLowerCase()}?`)) {
        return
      }
    }

    setLoadingAction(action)
    try {
      await onAction(action)
    } finally {
      setLoadingAction(null)
    }
  }

  const allowedActions = config.allowedActions
  const actions = allowedActions.map(action => POST_ACTION_CONFIG[action])

  // Desktop: mostrar botões
  return (
    <>
      {/* Desktop (md+): Botões visíveis */}
      <div className={`hidden md:flex flex-wrap gap-2 ${className}`}>
        {actions.map((action) => {
          const actionKey = Object.entries(POST_ACTION_CONFIG).find(
            ([_, v]) => v.label === action.label
          )?.[0] as PostAction

          return (
            <Button
              key={actionKey}
              onClick={() => handleAction(actionKey)}
              variant={action.variant}
              size="sm"
              disabled={loading || loadingAction !== null}
              className="transition-all"
              title={action.label}
            >
              {loadingAction === actionKey ? (
                <div className="size-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
              ) : (
                ICON_MAP[action.icon]
              )}
              <span className="ml-2 hidden sm:inline">{action.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Mobile: Dropdown menu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={loading}>
              <MoreVerticalIcon className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {actions.map((action) => {
              const actionKey = Object.entries(POST_ACTION_CONFIG).find(
                ([_, v]) => v.label === action.label
              )?.[0] as PostAction

              return (
                <DropdownMenuItem
                  key={actionKey}
                  onClick={() => handleAction(actionKey)}
                  disabled={loadingAction !== null}
                  className={`cursor-pointer flex items-center gap-2 ${
                    action.variant === 'destructive' ? 'text-destructive' : ''
                  }`}
                >
                  {ICON_MAP[action.icon]}
                  <span>{action.label}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
