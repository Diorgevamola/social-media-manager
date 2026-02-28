'use client'

import { useState } from 'react'
import { PostStatus, PostAction } from '@/types/post'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PostStatusBadge } from './PostStatusBadge'
import { PostStatusIndicator } from './PostStatusIndicator'
import { PostStatusActions } from './PostStatusActions'
import { PostStatusTooltip } from './PostStatusTooltip'
import { usePostState } from '@/hooks/usePostState'
import { Heart, MessageCircle, Share2 } from 'lucide-react'

interface SchedulePostCardProps {
  post: {
    id: string
    status: PostStatus
    caption: string
    imageUrl: string | null
    scheduledDate?: Date | string
    engagementMetrics?: {
      likes: number
      comments: number
      shares: number
    }
  }
  onAction?: (action: PostAction, postId: string) => Promise<void>
  onStatusChange?: (newStatus: PostStatus, postId: string) => Promise<void>
}

export function SchedulePostCard({
  post,
  onAction,
  onStatusChange
}: SchedulePostCardProps) {
  const [showActions, setShowActions] = useState(false)

  const postState = usePostState({
    initialStatus: post.status,
    postId: post.id,
    onStatusChange: async (newStatus) => {
      if (onStatusChange) {
        await onStatusChange(newStatus, post.id)
      }
    }
  })

  const handleAction = async (action: PostAction) => {
    try {
      if (onAction) {
        await onAction(action, post.id)
      }

      switch (action) {
        case 'confirm':
          await postState.confirm()
          break
        case 'publishNow':
          await postState.publishNow()
          break
        case 'revertPublish':
        case 'revertToDraft':
          await postState.revert()
          break
      }
    } catch (error) {
      console.error('Erro ao executar acao:', error)
    }
  }

  return (
    <Card className="py-0 overflow-hidden hover:shadow-md transition-shadow duration-200 state-change-glow">
      {/* Image Preview */}
      {post.imageUrl && (
        <div className="relative h-48 bg-muted overflow-hidden group">
          <img
            src={post.imageUrl}
            alt="Post preview"
            className="w-full h-full object-cover"
          />

          {/* Status Badge Overlay */}
          <div className="absolute top-3 right-3">
            <PostStatusBadge status={postState.status} size="sm" showEmoji />
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            {postState.status === 'published' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction('viewMetrics')}
              >
                Ver Metricas
              </Button>
            )}
            {postState.status === 'planned' && (
              <Button
                size="sm"
                onClick={() => handleAction('publishNow')}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                Publicar Agora
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <CardContent className="p-4 space-y-4">
        {/* Caption */}
        <p className="text-sm text-foreground line-clamp-2">
          {post.caption || 'Sem caption'}
        </p>

        {/* Status Indicator */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <PostStatusIndicator
              status={postState.status}
              scheduledDate={post.scheduledDate}
              showProgress
            />
          </div>
          <PostStatusTooltip status={postState.status} />
        </div>

        {/* Metrics (if published) */}
        {postState.status === 'published' && post.engagementMetrics && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-destructive font-semibold">
                <Heart className="size-4 fill-current" />
                <span className="text-lg">{post.engagementMetrics.likes}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Curtidas
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-info font-semibold">
                <MessageCircle className="size-4" />
                <span className="text-lg">{post.engagementMetrics.comments}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Comentarios
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-success font-semibold">
                <Share2 className="size-4" />
                <span className="text-lg">{post.engagementMetrics.shares}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Compartilhamentos
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {postState.error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {postState.error}
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-4">
          <PostStatusActions
            status={postState.status}
            postId={post.id}
            onAction={handleAction}
            loading={postState.isLoading}
          />
        </div>
      </CardContent>
    </Card>
  )
}
