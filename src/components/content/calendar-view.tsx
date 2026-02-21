'use client'

import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, ImageIcon, LayoutGrid, Video, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { ContentPost, PostType } from '@/types/database'

const postTypeIcons: Record<string, typeof ImageIcon> = {
  post: ImageIcon,
  carousel: LayoutGrid,
  reel: Video,
}

const postTypeColors: Record<string, string> = {
  post: 'bg-pink-100 text-pink-700 border-pink-200',
  carousel: 'bg-purple-100 text-purple-700 border-purple-200',
  reel: 'bg-orange-100 text-orange-700 border-orange-200',
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-400',
  planned: 'bg-green-400',
  published: 'bg-blue-400',
}

interface CalendarViewProps {
  posts: ContentPost[]
}

export function CalendarView({ posts }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  function getPostsForDay(date: Date) {
    return posts.filter((p) => {
      const postDate = p.scheduled_at ? new Date(p.scheduled_at) : new Date(p.created_at)
      return isSameDay(postDate, date)
    })
  }

  const selectedPosts = selectedDate ? getPostsForDay(selectedDate) : []

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Week headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const dayPosts = getPostsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              const isCurrentDay = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                  className={cn(
                    'min-h-16 p-1 rounded-lg text-left transition-colors relative',
                    isCurrentMonth ? 'hover:bg-accent' : 'opacity-40',
                    isSelected && 'bg-primary/10 ring-1 ring-primary',
                    !isSelected && 'hover:bg-accent/50',
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium inline-flex size-5 items-center justify-center rounded-full',
                      isCurrentDay && 'bg-primary text-primary-foreground',
                      !isCurrentDay && isCurrentMonth && 'text-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Post dots */}
                  <div className="mt-0.5 space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        className={cn(
                          'text-[9px] px-1 rounded truncate border',
                          postTypeColors[post.post_type as PostType],
                        )}
                      >
                        {post.post_type === 'post' ? '📷' : post.post_type === 'carousel' ? '🎴' : '🎬'}
                        {' '}
                        {post.caption?.slice(0, 8) || post.post_type}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <div className="text-[9px] text-muted-foreground pl-1">
                        +{dayPosts.length - 2}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            <span className="text-xs text-muted-foreground">Legenda:</span>
            {Object.entries(postTypeColors).map(([type, cls]) => (
              <div key={type} className="flex items-center gap-1">
                <div className={cn('size-2.5 rounded border', cls)} />
                <span className="text-xs text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day detail */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2 px-4">
            <h3 className="font-semibold text-sm">
              {selectedDate
                ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                : 'Selecione um dia'}
            </h3>
          </CardHeader>
          <CardContent className="px-4">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">
                Clique em um dia no calendário para ver os posts.
              </p>
            ) : selectedPosts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Nenhum post para este dia</p>
                <Link href="/dashboard/content/create">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="size-3.5" />
                    Criar post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPosts.map((post, i) => {
                  const Icon = postTypeIcons[post.post_type as PostType]
                  return (
                    <div key={post.id}>
                      {i > 0 && <Separator className="my-3" />}
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            'size-8 rounded-lg flex items-center justify-center shrink-0 border',
                            postTypeColors[post.post_type as PostType],
                          )}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-medium capitalize">
                              {post.post_type}
                            </span>
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                statusColors[post.status],
                              )}
                            />
                            <span className="text-xs text-muted-foreground">
                              {post.status === 'draft'
                                ? 'Rascunho'
                                : post.status === 'planned'
                                ? 'Planejado'
                                : 'Publicado'}
                            </span>
                          </div>
                          <p className="text-xs line-clamp-3 text-muted-foreground">
                            {post.caption || 'Sem legenda'}
                          </p>
                          {post.hashtags && post.hashtags.length > 0 && (
                            <p className="text-[10px] text-blue-600 mt-1 truncate">
                              {post.hashtags.slice(0, 3).map((h) => `#${h}`).join(' ')}
                              {post.hashtags.length > 3 && ` +${post.hashtags.length - 3}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h3 className="text-sm font-medium">Este mês</h3>
            {['post', 'carousel', 'reel'].map((type) => {
              const Icon = postTypeIcons[type as PostType]
              const count = posts.filter((p) => {
                const d = p.scheduled_at ? new Date(p.scheduled_at) : new Date(p.created_at)
                return p.post_type === type && isSameMonth(d, currentDate)
              }).length
              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'size-6 rounded flex items-center justify-center border',
                      postTypeColors[type as PostType],
                    )}
                  >
                    <Icon className="size-3" />
                  </div>
                  <span className="text-sm flex-1 capitalize">{type}s</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
