'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Heart, MessageCircle, Send, Bookmark, Image, Film, Images } from 'lucide-react'
import type { PostType } from '@/types/database'

interface ContentPreviewProps {
  postType: PostType
  caption: string
  hashtags: string[]
  username?: string
}

const typeIcons: Record<PostType, typeof Image> = {
  post: Image,
  carousel: Images,
  reel: Film,
}

const typeLabels: Record<PostType, string> = {
  post: 'Imagem',
  carousel: 'Carrossel',
  reel: 'Reel',
}

export function ContentPreview({ postType, caption, hashtags, username = 'seu_perfil' }: ContentPreviewProps) {
  const TypeIcon = typeIcons[postType]

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-medium">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-background">
          {/* Header */}
          <div className="flex items-center gap-2 p-3">
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px]">
                {username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold">{username}</span>
          </div>

          {/* Media placeholder */}
          <div className="aspect-square bg-muted flex flex-col items-center justify-center gap-2 relative">
            <TypeIcon className="size-12 text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/50">{typeLabels[postType]}</span>
            {postType === 'carousel' && (
              <div className="absolute bottom-3 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`size-1.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Heart className="size-5 text-muted-foreground" />
              <MessageCircle className="size-5 text-muted-foreground" />
              <Send className="size-5 text-muted-foreground" />
            </div>
            <Bookmark className="size-5 text-muted-foreground" />
          </div>

          {/* Caption */}
          <div className="px-3 pb-3">
            {caption ? (
              <p className="text-xs leading-relaxed">
                <span className="font-semibold mr-1">{username}</span>
                {caption.length > 150 ? `${caption.slice(0, 150)}...` : caption}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sem legenda</p>
            )}
            {hashtags.length > 0 && (
              <p className="text-xs text-primary/80 mt-1">
                {hashtags.slice(0, 10).join(' ')}
                {hashtags.length > 10 ? ` +${hashtags.length - 10}` : ''}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
