'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Image, Film, Images, BookOpen, GalleryHorizontal, ChevronLeft, ChevronRight,
  Clock, Palette, Type, Camera, Clapperboard, Sparkles, X, Loader2, PlusCircle,
  Download, Plus, Trash2, FolderArchive, CheckCircle2, Send, Calendar, Pencil, RefreshCw,
} from 'lucide-react'
import type { GeneratedSchedule, SchedulePost, ScheduleDay } from '@/types/schedule'
import type { MediaMap } from '@/app/dashboard/schedule/page'
import { AddPostDialog } from '@/components/schedule/add-post-dialog'

type PostType = 'post' | 'reel' | 'carousel' | 'story' | 'story_sequence'

const TYPE_COLORS: Record<PostType, string> = {
  post: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  reel: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  carousel: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  story: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  story_sequence: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

const TYPE_DOT_COLORS: Record<PostType, string> = {
  post: 'bg-blue-500',
  reel: 'bg-pink-500',
  carousel: 'bg-purple-500',
  story: 'bg-orange-500',
  story_sequence: 'bg-amber-500',
}

const TYPE_ICONS: Record<PostType, typeof Image> = {
  post: Image,
  reel: Film,
  carousel: Images,
  story: BookOpen,
  story_sequence: GalleryHorizontal,
}

const TYPE_LABELS: Record<PostType, string> = {
  post: 'Post',
  reel: 'Reel',
  carousel: 'Carrossel',
  story: 'Story',
  story_sequence: 'Seq. Stories',
}

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const PT_DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function safePostType(type: string): PostType {
  return (type as PostType) in TYPE_ICONS ? (type as PostType) : 'post'
}

interface SelectedPost {
  post: SchedulePost
  day: ScheduleDay
}

interface ScheduleCalendarProps {
  schedule: GeneratedSchedule
  onRegenerate: () => void
  regenerating: boolean
  isStreaming?: boolean
  scheduleId?: string | null
  accountId?: string | null
  accountConnected?: boolean
  mediaMap?: MediaMap
  onMediaSaved?: (key: string, imageUrl: string | null, videoUrl: string | null) => void
  onPostAdded?: (date: string, post: SchedulePost, postId: string) => void
  onPostDeleted?: (date: string, postId: string, theme: string) => void
  onPostRescheduled?: (oldDate: string, newDate: string, postId: string, theme: string, newTime: string | null) => void
  onPostConfirmed?: (postId: string, confirmed: boolean) => void
}

export function ScheduleCalendar({ schedule, onRegenerate, regenerating: _regenerating, isStreaming, scheduleId, accountId, accountConnected = false, mediaMap = {}, onMediaSaved, onPostAdded, onPostDeleted, onPostRescheduled, onPostConfirmed }: ScheduleCalendarProps) {
  const firstDateStr = schedule.schedule[0]?.date
  const firstDate = firstDateStr ? new Date(firstDateStr + 'T12:00:00') : new Date()

  const [viewYear, setViewYear] = useState(firstDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(firstDate.getMonth())
  const [selected, setSelected] = useState<SelectedPost | null>(null)
  const [addingPostDate, setAddingPostDate] = useState<string | null>(null)
  const [sessionMedia, setSessionMedia] = useState<Record<string, SessionMediaEntry>>({})
  const [draggingPost, setDraggingPost] = useState<{ date: string; post: SchedulePost } | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  // Zera sessionMedia apenas quando o cronograma muda de fato (geração nova ou troca de conta),
  // NÃO quando scheduleId é atribuído após o save de um cronograma já exibido.
  useEffect(() => {
    setSessionMedia({})
  }, [schedule.generated_at])

  function handleSessionMediaAdded(key: string, src: string, mimeType: string) {
    setSessionMedia(prev => ({ ...prev, [key]: { src, mimeType } }))
  }

  function handleSessionMediaCleared(key: string) {
    setSessionMedia(prev => {
      const n = { ...prev }
      // Clear the main key and any sub-keys (slides, scenes)
      Object.keys(n).forEach(k => { if (k === key || k.startsWith(`${key}::`)) delete n[k] })
      return n
    })
  }

  // Build a map: "yyyy-MM-dd" → ScheduleDay
  const dayMap = new Map<string, ScheduleDay>()
  for (const day of schedule.schedule) {
    dayMap.set(day.date, day)
  }

  // Build calendar grid
  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const startDow = firstOfMonth.getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function cellDateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const totalPosts = schedule.schedule.reduce((s, d) => s + d.posts.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {isStreaming && <Loader2 className="size-4 animate-spin text-primary" />}
            {isStreaming ? 'Cronograma sendo gerado...' : 'Cronograma gerado'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {schedule.schedule.length} {isStreaming ? 'dias prontos' : 'dias'} · {totalPosts} conteúdos
            {!isStreaming && ` · @${schedule.account.username}`}
          </p>
        </div>
        {!isStreaming && (
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <PlusCircle className="size-3.5" />
            Novo cronograma
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <ChevronLeft className="size-4" />
              </button>
              <h3 className="text-sm font-semibold">
                {PT_MONTHS[viewMonth]} {viewYear}
              </h3>
              <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {PT_DAYS_SHORT.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="bg-muted/20 min-h-[72px]" />
                }
                const dateStr = cellDateStr(day)
                const schedDay = dayMap.get(dateStr)
                const isToday = dateStr === new Date().toISOString().slice(0, 10)

                return (
                  <div
                    key={dateStr}
                    className={`relative group bg-background min-h-[72px] p-1.5 flex flex-col gap-1 transition-colors ${
                      dragOverDate === dateStr && draggingPost && draggingPost.date !== dateStr
                        ? 'bg-primary/10 ring-inset ring-1 ring-primary/40'
                        : schedDay ? 'hover:bg-muted/40' : 'hover:bg-muted/20'
                    }`}
                    onDragOver={(e) => {
                      if (!draggingPost || !scheduleId) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverDate(dateStr)
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDate(null)
                    }}
                    onDrop={async (e) => {
                      e.preventDefault()
                      if (!draggingPost || !scheduleId) { setDraggingPost(null); setDragOverDate(null); return }
                      const { date: oldDate, post: draggedPost } = draggingPost
                      setDraggingPost(null)
                      setDragOverDate(null)
                      if (oldDate === dateStr) return
                      const postId = mediaMap[`${oldDate}::${draggedPost.theme}`]?.postId
                      if (!postId) return
                      const res = await fetch(`/api/schedule/posts/${postId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: dateStr }),
                      })
                      if (res.ok) {
                        onPostRescheduled?.(oldDate, dateStr, postId, draggedPost.theme, draggedPost.time || null)
                        if (selected?.post.theme === draggedPost.theme && selected?.day.date === oldDate) {
                          setSelected(null)
                        }
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-medium ${
                        isToday
                          ? 'size-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center'
                          : 'text-muted-foreground'
                      }`}>
                        {day}
                      </span>
                      {scheduleId && accountId && !isStreaming && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setAddingPostDate(dateStr) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                          title="Adicionar post"
                        >
                          <Plus className="size-3" />
                        </button>
                      )}
                    </div>
                    {schedDay && (
                      <div className="flex flex-col gap-0.5">
                        {schedDay.posts.map((post, i) => {
                          const type = safePostType(post.type)
                          const Icon = TYPE_ICONS[type]
                          const postKey = `${dateStr}::${post.theme}`
                          const isPostPublished = mediaMap[postKey]?.status === 'published'
                          return (
                            <button
                              key={i}
                              draggable={!!scheduleId && !isStreaming && !isPostPublished}
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move'
                                setDraggingPost({ date: dateStr, post })
                              }}
                              onDragEnd={() => { setDraggingPost(null); setDragOverDate(null) }}
                              onClick={() => setSelected({ post, day: schedDay })}
                              className={`flex items-center gap-1 text-[9px] px-1 py-0.5 rounded font-medium w-full text-left truncate ${
                                isPostPublished
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 cursor-default opacity-70'
                                  : `cursor-grab active:cursor-grabbing ${TYPE_COLORS[type]}`
                              } ${
                                draggingPost?.post.theme === post.theme && draggingPost?.date === dateStr ? 'opacity-40' : ''
                              }`}
                            >
                              {isPostPublished
                                ? <CheckCircle2 className="size-2.5 shrink-0" />
                                : <Icon className="size-2.5 shrink-0" />
                              }
                              <span className="truncate">{post.time || ''} {post.theme}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 justify-center flex-wrap">
              {(Object.entries(TYPE_LABELS) as [PostType, string][]).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className={`size-2 rounded-full ${TYPE_DOT_COLORS[type]}`} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Post detail panel */}
        {selected ? (
          <PostDetailCard
            key={`${selected.day.date}-${selected.post.type}-${selected.post.time ?? ''}-${selected.post.theme}`}
            post={selected.post}
            day={selected.day}
            onClose={() => setSelected(null)}
            scheduleId={scheduleId}
            mediaEntry={mediaMap[`${selected.day.date}::${selected.post.theme}`] ?? null}
            persistedSceneUrls={Array.from(
              { length: selected.post.script?.scenes?.length ?? 0 },
              (_, i) => mediaMap[`${selected.day.date}::${selected.post.theme}::scene${i}`]?.videoUrl ?? null
            )}
            onMediaSaved={onMediaSaved}
            onMediaGenerated={handleSessionMediaAdded}
            onRescheduled={onPostRescheduled}
            onConfirmed={onPostConfirmed}
            accountConnected={accountConnected}
            onDeleted={() => {
              const { day, post } = selected
              const postId = mediaMap[`${day.date}::${post.theme}`]?.postId
              setSelected(null)
              if (postId) onPostDeleted?.(day.date, postId, post.theme)
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
            <Sparkles className="size-8 mb-3 opacity-30" />
            <p className="text-sm font-medium">Selecione um post no calendário</p>
            <p className="text-xs mt-1 opacity-70">para ver o briefing completo</p>
          </div>
        )}
      </div>

      {/* AddPostDialog */}
      {addingPostDate && scheduleId && accountId && (
        <AddPostDialog
          open={true}
          date={addingPostDate}
          scheduleId={scheduleId}
          accountId={accountId}
          onClose={() => setAddingPostDate(null)}
          onSaved={(post, postId) => {
            const savedDate = addingPostDate
            setAddingPostDate(null)
            if (savedDate) onPostAdded?.(savedDate, post, postId)
          }}
        />
      )}

      {/* Gallery view below */}
      <PostGallerySection
        schedule={schedule}
        mediaMap={mediaMap}
        scheduleId={scheduleId}
        accountConnected={accountConnected}
        onMediaSaved={onMediaSaved}
        onPostDeleted={onPostDeleted}
        onPostRescheduled={onPostRescheduled}
        onPostConfirmed={onPostConfirmed}
        onSelectPost={(post, day) => setSelected({ post, day })}
        sessionMedia={sessionMedia}
        onSessionMediaAdded={handleSessionMediaAdded}
        onSessionMediaCleared={handleSessionMediaCleared}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PostGallerySection
// ─────────────────────────────────────────────────────────────────────────────

interface SessionMediaEntry {
  src: string
  mimeType: string
}

interface PostGallerySectionProps {
  schedule: GeneratedSchedule
  mediaMap: MediaMap
  scheduleId?: string | null
  accountConnected?: boolean
  onMediaSaved?: (key: string, imageUrl: string | null, videoUrl: string | null) => void
  onPostDeleted?: (date: string, postId: string, theme: string) => void
  onPostRescheduled?: (oldDate: string, newDate: string, postId: string, theme: string, newTime: string | null) => void
  onPostConfirmed?: (postId: string, confirmed: boolean) => void
  onSelectPost?: (post: SchedulePost, day: ScheduleDay) => void
  sessionMedia: Record<string, SessionMediaEntry>
  onSessionMediaAdded: (key: string, src: string, mimeType: string) => void
  onSessionMediaCleared: (key: string) => void
}

function PostGallerySection({
  schedule,
  mediaMap,
  scheduleId,
  accountConnected = false,
  onMediaSaved,
  onPostDeleted,
  onPostRescheduled,
  onPostConfirmed,
  onSelectPost: _onSelectPost,
  sessionMedia,
  onSessionMediaAdded,
  onSessionMediaCleared,
}: PostGallerySectionProps) {
  // Ref sempre atualizado com o scheduleId mais recente, evitando closure stale em uploadForPost
  // (ex: save do cronograma chega após a geração de imagem ter começado)
  const scheduleIdRef = useRef(scheduleId)
  scheduleIdRef.current = scheduleId

  const [expandedPost, setExpandedPost] = useState<{ day: ScheduleDay; post: SchedulePost } | null>(null)
  const [approved, setApproved] = useState<Set<string>>(new Set())
  // confirmed: initialized from mediaMap prop
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(() => {
    const s = new Set<string>()
    Object.entries(mediaMap).forEach(([k, v]) => { if (v.confirmed) s.add(k) })
    return s
  })
  const [confirmingKeys, setConfirmingKeys] = useState<Set<string>>(new Set())
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, label: '' })
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [videoProgress, setVideoProgress] = useState<Record<string, string>>({})
  const [confirmingDelete, setConfirmingDelete] = useState<{ key: string; day: ScheduleDay; post: SchedulePost } | null>(null)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ done: 0, total: 0 })
  const [publishing, setPublishing] = useState<Set<string>>(new Set())
  const [publishedKeys, setPublishedKeys] = useState<Set<string>>(new Set())
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({})
  const [calendarReelDuration, setCalendarReelDuration] = useState<4 | 6 | 8>(8)
  const [showDurationPicker, setShowDurationPicker] = useState<string | null>(null)
  const [regeneratingPost, setRegeneratingPost] = useState<Set<string>>(new Set())
  const [confirmRegeneratePost, setConfirmRegeneratePost] = useState<{ key: string; postId: string; day: ScheduleDay; post: SchedulePost } | null>(null)
  const [localCaptions, setLocalCaptions] = useState<Record<string, string>>({})

  const allPosts = schedule.schedule.flatMap(day => day.posts.map(post => ({ day, post })))

  // Auto-poll cron quando há posts planejados com horário vencido e conta conectada
  useEffect(() => {
    if (!accountConnected) return
    const now = new Date()
    const hasPending = allPosts.some(({ day, post }) => {
      const key = `${day.date}::${post.theme}`
      const mapEntry = mediaMap[key]
      if (!mapEntry?.postId) return false
      const timeStr = post.time ?? '00:00'
      const scheduledAt = new Date(`${day.date}T${timeStr}:00`)
      const hasMedia = mapEntry.imageUrl || mapEntry.videoUrl
      return hasMedia && scheduledAt <= now && !publishedKeys.has(key)
    })
    if (!hasPending) return

    const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET
    if (!cronSecret) return

    const interval = setInterval(async () => {
      try {
        await fetch(`/api/cron/publish-pending?secret=${encodeURIComponent(cronSecret)}`)
      } catch { /* silencioso */ }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountConnected, schedule.generated_at])

  const approvedCount = approved.size

  async function handlePublishNow(key: string, postId: string) {
    setPublishing(prev => new Set(prev).add(key))
    setPublishErrors(prev => { const n = { ...prev }; delete n[key]; return n })
    try {
      const res = await fetch(`/api/instagram/publish/${postId}`, { method: 'POST' })
      if (res.ok) {
        setPublishedKeys(prev => new Set(prev).add(key))
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setPublishErrors(prev => ({ ...prev, [key]: data.error ?? 'Erro ao publicar' }))
      }
    } catch {
      setPublishErrors(prev => ({ ...prev, [key]: 'Erro de rede' }))
    } finally {
      setPublishing(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  async function uploadForPost(
    day: ScheduleDay,
    post: SchedulePost,
    base64: string,
    mimeType: 'image/png' | 'image/jpeg' | 'video/mp4',
    slideIndex?: number,
    sceneIndex?: number,
  ) {
    // Lê do ref para garantir o valor mais recente mesmo em closures assíncronos
    const currentScheduleId = scheduleIdRef.current
    if (!currentScheduleId) return
    const key = `${day.date}::${post.theme}`
    try {
      let postId = mediaMap[key]?.postId
      if (!postId) {
        const lookupRes = await fetch(
          `/api/schedule/post-id?scheduleId=${encodeURIComponent(currentScheduleId)}&date=${encodeURIComponent(day.date)}&theme=${encodeURIComponent(post.theme)}`
        )
        if (!lookupRes.ok) return
        const data = await lookupRes.json() as { postId: string }
        postId = data.postId
      }
      if (!postId) return
      const body: Record<string, unknown> = {
        postId,
        mediaType: mimeType === 'video/mp4' ? 'video' : 'image',
        data: base64,
        mimeType,
      }
      if (slideIndex !== undefined) body.slideIndex = slideIndex
      if (sceneIndex !== undefined) body.sceneIndex = sceneIndex
      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (uploadRes.ok) {
        const { url } = await uploadRes.json() as { url: string }
        if (sceneIndex !== undefined) {
          onMediaSaved?.(`${key}::scene${sceneIndex}`, null, url)
          if (sceneIndex === 0) onMediaSaved?.(key, null, url)
        } else {
          const slideKey = slideIndex !== undefined ? `${key}::slide${slideIndex}` : key
          onMediaSaved?.(slideKey, mimeType !== 'video/mp4' ? url : null, mimeType === 'video/mp4' ? url : null)
          if (slideIndex === 0) onMediaSaved?.(key, url, null)
        }
      }
    } catch (err) {
      console.error('[PostGallery] upload falhou:', err)
    }
  }

  async function generateForPost(day: ScheduleDay, post: SchedulePost) {
    const key = `${day.date}::${post.theme}`
    const type = safePostType(post.type)

    setGenerating(prev => new Set(prev).add(key))

    try {
      if (type === 'reel') {
        const sceneCnt = post.script?.scenes?.length ?? 0
        if (sceneCnt > 0) {
          // Scene-based: one Veo clip per scene
          for (let sceneIdx = 0; sceneIdx < sceneCnt; sceneIdx++) {
            const scene = post.script!.scenes[sceneIdx]
            const dur = toVeoDuration(parseSceneDurationSeconds(scene.time))
            setVideoProgress(prev => ({ ...prev, [key]: `Gerando cena ${sceneIdx + 1}/${sceneCnt}...` }))
            try {
              const res = await fetch('/api/media/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: buildSceneVideoPrompt(post, sceneIdx), targetDuration: dur }),
              })
              if (!res.ok || !res.body) continue
              const reader = res.body.getReader()
              const decoder = new TextDecoder()
              let buf = ''
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buf += decoder.decode(value, { stream: true })
                const parts = buf.split('\n\n')
                buf = parts.pop() ?? ''
                for (const part of parts) {
                  const line = part.replace(/^data: /, '').trim()
                  if (!line) continue
                  let evt: { type: string; message?: string; videoData?: string; mimeType?: string }
                  try { evt = JSON.parse(line) } catch { continue }
                  if (evt.type === 'start' || evt.type === 'progress') {
                    setVideoProgress(prev => ({ ...prev, [key]: `Cena ${sceneIdx + 1}/${sceneCnt}: ${evt.message ?? ''}` }))
                  } else if (evt.type === 'complete' && evt.videoData) {
                    onSessionMediaAdded(`${key}::scene${sceneIdx}`, evt.videoData, 'video/mp4')
                    if (sceneIdx === 0) onSessionMediaAdded(key, evt.videoData, 'video/mp4')
                    uploadForPost(day, post, evt.videoData, 'video/mp4', undefined, sceneIdx)
                  } else if (evt.type === 'error') {
                    throw new Error(evt.message ?? 'Erro')
                  }
                }
              }
            } catch (sceneErr) {
              console.error(`[generateForPost] cena ${sceneIdx} falhou:`, sceneErr)
            }
          }
          setVideoProgress(prev => { const n = { ...prev }; delete n[key]; return n })
        } else {
          // Fallback: single video for the whole reel
          setVideoProgress(prev => ({ ...prev, [key]: 'Iniciando geração do vídeo...' }))
          const res = await fetch('/api/media/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: buildVideoPrompt(post), targetDuration: calendarReelDuration }),
          })
          if (!res.ok || !res.body) throw new Error('Falha ao conectar')
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const parts = buf.split('\n\n')
            buf = parts.pop() ?? ''
            for (const part of parts) {
              const line = part.replace(/^data: /, '').trim()
              if (!line) continue
              try {
                const evt = JSON.parse(line) as { type: string; message?: string; videoData?: string; mimeType?: string }
                if (evt.type === 'start' || evt.type === 'progress') {
                  setVideoProgress(prev => ({ ...prev, [key]: evt.message ?? '' }))
                } else if (evt.type === 'complete' && evt.videoData) {
                  onSessionMediaAdded(key, evt.videoData!, 'video/mp4')
                  setVideoProgress(prev => { const n = { ...prev }; delete n[key]; return n })
                  uploadForPost(day, post, evt.videoData, 'video/mp4')
                } else if (evt.type === 'error') {
                  throw new Error(evt.message ?? 'Erro ao gerar vídeo')
                }
              } catch {
                // ignore parse errors on partial chunks
              }
            }
          }
        }
      } else if (type === 'carousel') {
        // Carrossel: gera TODOS os slides sequencialmente e persiste cada um
        const slideCount = post.visual?.slides?.length ?? 1
        for (let slideIdx = 0; slideIdx < slideCount; slideIdx++) {
          try {
            const res = await fetch('/api/media/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: buildCarouselSlidePrompt(post, slideIdx), aspectRatio: '4:5' }),
            })
            const data = await res.json()
            if (!res.ok || data.error) continue
            const mime = (data.mimeType as string) || 'image/jpeg'
            onSessionMediaAdded(`${key}::slide${slideIdx}`, data.imageData as string, mime)
            if (slideIdx === 0) onSessionMediaAdded(key, data.imageData as string, mime)
            uploadForPost(day, post, data.imageData as string, mime as 'image/png' | 'image/jpeg', slideIdx)
          } catch { /* ignora slide com falha individual */ }
        }
      } else if (type === 'story_sequence') {
        // Sequência de stories: gera cada frame em 9:16 sequencialmente
        const frameCount = post.visual?.slides?.length ?? 1
        for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
          try {
            const res = await fetch('/api/media/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: buildStorySequenceFramePrompt(post, frameIdx), aspectRatio: '9:16' }),
            })
            const data = await res.json()
            if (!res.ok || data.error) continue
            const mime = (data.mimeType as string) || 'image/jpeg'
            onSessionMediaAdded(`${key}::slide${frameIdx}`, data.imageData as string, mime)
            if (frameIdx === 0) onSessionMediaAdded(key, data.imageData as string, mime)
            uploadForPost(day, post, data.imageData as string, mime as 'image/png' | 'image/jpeg', frameIdx)
          } catch { /* ignora frame com falha individual */ }
        }
      } else {
        const prompt = buildImagePrompt(post)
        const aspectRatio = type === 'story' ? '9:16' : '1:1'
        const res = await fetch('/api/media/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aspectRatio }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao gerar imagem')
        const mime = (data.mimeType as string) || 'image/jpeg'
        onSessionMediaAdded(key, data.imageData as string, mime)
        uploadForPost(day, post, data.imageData as string, mime as 'image/png' | 'image/jpeg')
      }
    } catch (err) {
      console.error('[PostGallery] geração falhou para', key, err)
      setVideoProgress(prev => { const n = { ...prev }; delete n[key]; return n })
    } finally {
      setGenerating(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  async function handleBulkGenerate() {
    const toGenerate = allPosts.filter(({ day, post }) => {
      const key = `${day.date}::${post.theme}`
      return !sessionMedia[key] && !mediaMap[key]?.imageUrl && !mediaMap[key]?.videoUrl
    })
    if (toGenerate.length === 0) return

    setBulkGenerating(true)
    setBulkProgress({ done: 0, total: toGenerate.length, label: '' })

    // Process non-reels first, then reels
    const nonReels = toGenerate.filter(({ post }) => safePostType(post.type) !== 'reel')
    const reels = toGenerate.filter(({ post }) => safePostType(post.type) === 'reel')
    const ordered = [...nonReels, ...reels]

    for (let i = 0; i < ordered.length; i++) {
      const { day, post } = ordered[i]
      setBulkProgress({ done: i, total: ordered.length, label: post.theme })
      await generateForPost(day, post)
    }

    setBulkProgress(prev => ({ ...prev, done: prev.total, label: '' }))
    setBulkGenerating(false)
  }

  async function handleDeletePost(day: ScheduleDay, post: SchedulePost) {
    const key = `${day.date}::${post.theme}`
    setDeleting(prev => new Set(prev).add(key))
    try {
      // Resolve postId: from mediaMap first, then via API lookup
      let postId: string | undefined = mediaMap[key]?.postId
      const currentScheduleId = scheduleIdRef.current
      if (!postId && currentScheduleId) {
        const lookup = await fetch(
          `/api/schedule/post-id?scheduleId=${encodeURIComponent(currentScheduleId)}&date=${encodeURIComponent(day.date)}&theme=${encodeURIComponent(post.theme)}`
        )
        if (lookup.ok) {
          const data = await lookup.json() as { postId: string | null }
          postId = data.postId ?? undefined
        }
      }
      if (!postId) throw new Error('Post não encontrado no banco de dados')

      const res = await fetch(`/api/schedule/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir')
      }
      onPostDeleted?.(day.date, postId, post.theme)
      setConfirmingDelete(null)
    } catch (err) {
      console.error('[PostGallery] delete falhou:', err)
    } finally {
      setDeleting(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  function toggleSelection(key: string) {
    setSelectedKeys(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }

  function toggleSelectAll() {
    if (selectedKeys.size === allPosts.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(allPosts.map(({ day, post }) => `${day.date}::${post.theme}`)))
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedKeys(new Set())
    setConfirmBulkDelete(false)
  }

  async function handleBulkDelete() {
    const keys = Array.from(selectedKeys)
    setBulkDeleting(true)
    setBulkDeleteProgress({ done: 0, total: keys.length })
    setConfirmBulkDelete(false)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const entry = allPosts.find(({ day, post }) => `${day.date}::${post.theme}` === key)
      if (!entry) continue

      const { day, post } = entry
      try {
        let postId: string | undefined = mediaMap[key]?.postId
        const currentScheduleId = scheduleIdRef.current
        if (!postId && currentScheduleId) {
          const r = await fetch(`/api/schedule/post-id?scheduleId=${currentScheduleId}&date=${day.date}&theme=${encodeURIComponent(post.theme)}`)
          if (r.ok) { const d = await r.json(); postId = d.postId }
        }
        if (!postId) continue

        const res = await fetch(`/api/schedule/posts/${postId}`, { method: 'DELETE' })
        if (res.ok) {
          onPostDeleted?.(day.date, postId, post.theme)
        }
      } catch {
        // Silently continue — partial failures are ok for bulk ops
      }
      setBulkDeleteProgress({ done: i + 1, total: keys.length })
    }

    setBulkDeleting(false)
    exitSelectionMode()
  }

  async function handleToggleConfirmGallery(key: string, postId: string, newValue: boolean) {
    setConfirmingKeys(prev => new Set(prev).add(key))
    try {
      const res = await fetch(`/api/schedule/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: newValue }),
      })
      if (res.ok) {
        setConfirmedKeys(prev => {
          const n = new Set(prev)
          if (newValue) n.add(key); else n.delete(key)
          return n
        })
        onPostConfirmed?.(postId, newValue)
      }
    } catch {
      // silently ignore
    } finally {
      setConfirmingKeys(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  async function handleBulkConfirm(newValue: boolean) {
    const keys = Array.from(selectedKeys)
    const postIds = keys.map(k => mediaMap[k]?.postId).filter(Boolean) as string[]
    if (postIds.length === 0) return
    setBulkConfirming(true)
    try {
      const res = await fetch('/api/schedule/posts/bulk-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds, confirmed: newValue }),
      })
      if (res.ok) {
        setConfirmedKeys(prev => {
          const n = new Set(prev)
          keys.forEach(k => { if (newValue) n.add(k); else n.delete(k) })
          return n
        })
        postIds.forEach(id => onPostConfirmed?.(id, newValue))
      }
    } catch {
      // silently ignore
    } finally {
      setBulkConfirming(false)
      exitSelectionMode()
    }
  }

  async function handleConfirmAll() {
    const allKeys = allPosts.map(({ day, post }) => `${day.date}::${post.theme}`)
    const allPostIds = allKeys.map(k => mediaMap[k]?.postId).filter(Boolean) as string[]
    if (allPostIds.length === 0) return
    setBulkConfirming(true)
    try {
      const res = await fetch('/api/schedule/posts/bulk-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: allPostIds, confirmed: true }),
      })
      if (res.ok) {
        setConfirmedKeys(new Set(allKeys))
        allPostIds.forEach(id => onPostConfirmed?.(id, true))
      }
    } catch {
      // silently ignore
    } finally {
      setBulkConfirming(false)
    }
  }

  async function handleRegeneratePost(key: string, postId: string) {
    setRegeneratingPost(prev => new Set(prev).add(key))
    try {
      const res = await fetch(`/api/schedule/posts/${postId}/regenerate-post`, { method: 'POST' })
      const data = await res.json() as { caption?: string; error?: string }
      if (res.ok && data.caption) {
        setLocalCaptions(prev => ({ ...prev, [key]: data.caption! }))
        // Clear media from DB state and session media
        onMediaSaved?.(key, null, null)
        onSessionMediaCleared(key)
      }
    } catch {
      // silently ignore
    } finally {
      setRegeneratingPost(prev => { const n = new Set(prev); n.delete(key); return n })
      setConfirmRegeneratePost(null)
    }
  }

  const pendingCount = allPosts.filter(({ day, post }) => {
    const key = `${day.date}::${post.theme}`
    return !sessionMedia[key] && !mediaMap[key]?.imageUrl && !mediaMap[key]?.videoUrl
  }).length

  const confirmedCount = allPosts.filter(({ day, post }) =>
    confirmedKeys.has(`${day.date}::${post.theme}`)
  ).length

  return (
    <div className="space-y-3">
      {/* Regenerate post confirmation modal */}
      {confirmRegeneratePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl border shadow-xl p-5 max-w-sm w-full space-y-4">
            <div>
              <h4 className="font-semibold text-sm">Refazer post completo?</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                O post <span className="font-medium text-foreground">&ldquo;{confirmRegeneratePost.post.theme}&rdquo;</span> terá a legenda regenerada pelo Gemini e <strong className="text-destructive">toda a mídia gerada (imagem/vídeo) será apagada</strong> permanentemente.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRegeneratePost(null)}
                disabled={regeneratingPost.has(confirmRegeneratePost.key)}
                className="flex-1 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRegeneratePost(confirmRegeneratePost.key, confirmRegeneratePost.postId)}
                disabled={regeneratingPost.has(confirmRegeneratePost.key)}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {regeneratingPost.has(confirmRegeneratePost.key) ? (
                  <><Loader2 className="size-3.5 animate-spin" />Refazendo...</>
                ) : (
                  <><RefreshCw className="size-3.5" />Refazer tudo</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl border shadow-xl p-5 max-w-sm w-full space-y-4">
            <div>
              <h4 className="font-semibold text-sm">Apagar post?</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                O post <span className="font-medium text-foreground">&ldquo;{confirmingDelete.post.theme}&rdquo;</span> e toda a mídia gerada serão apagados permanentemente.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(null)}
                disabled={deleting.has(confirmingDelete.key)}
                className="flex-1 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePost(confirmingDelete.day, confirmingDelete.post)}
                disabled={deleting.has(confirmingDelete.key)}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting.has(confirmingDelete.key) ? (
                  <><Loader2 className="size-3.5 animate-spin" />Apagando...</>
                ) : (
                  <><Trash2 className="size-3.5" />Apagar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl border shadow-xl p-5 max-w-sm w-full space-y-4">
            <div>
              <h4 className="font-semibold text-sm">Apagar {selectedKeys.size} post{selectedKeys.size !== 1 ? 's' : ''}?</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Os posts selecionados e toda a mídia gerada serão apagados permanentemente. Esta ação não pode ser desfeita.
              </p>
            </div>
            {bulkDeleting && (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-destructive transition-all duration-300"
                    style={{ width: bulkDeleteProgress.total > 0 ? `${(bulkDeleteProgress.done / bulkDeleteProgress.total) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Apagando {bulkDeleteProgress.done}/{bulkDeleteProgress.total}...</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkDeleting}
                className="flex-1 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {bulkDeleting
                  ? <><Loader2 className="size-3.5 animate-spin" />Apagando...</>
                  : <><Trash2 className="size-3.5" />Apagar tudo</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Todos os posts</h3>
          {selectionMode && (
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedKeys.size}</span> selecionado{selectedKeys.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg border transition-colors"
              >
                {selectedKeys.size === allPosts.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              {selectedKeys.size > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    disabled={bulkConfirming}
                    onClick={() => handleBulkConfirm(true)}
                  >
                    {bulkConfirming ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                    Confirmar {selectedKeys.size}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 gap-1.5 text-xs"
                    disabled={bulkDeleting}
                    onClick={() => setConfirmBulkDelete(true)}
                  >
                    <Trash2 className="size-3" />
                    Apagar {selectedKeys.size}
                  </Button>
                </>
              )}
              <button
                onClick={exitSelectionMode}
                className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg border transition-colors"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {confirmedCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-emerald-600">{confirmedCount}</span>/{allPosts.length} confirmados
                </span>
              )}
              {approvedCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-green-600">{approvedCount}</span>/{allPosts.length} aprovados
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                disabled={bulkConfirming || confirmedCount === allPosts.length}
                onClick={handleConfirmAll}
              >
                {bulkConfirming ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                Confirmar todos
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSelectionMode(true)}
              >
                <CheckCircle2 className="size-3" />
                Selecionar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                disabled={bulkGenerating || pendingCount === 0}
                onClick={handleBulkGenerate}
              >
                {bulkGenerating ? (
                  <><Loader2 className="size-3 animate-spin" />Gerando {bulkProgress.done}/{bulkProgress.total}...</>
                ) : (
                  <><Sparkles className="size-3" />Gerar todas as mídias</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk progress bar */}
      {bulkGenerating && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: bulkProgress.total > 0 ? `${(bulkProgress.done / bulkProgress.total) * 100}%` : '0%' }}
            />
          </div>
          {bulkProgress.label && (
            <p className="text-[10px] text-muted-foreground truncate">
              Gerando {bulkProgress.done + 1}/{bulkProgress.total}: {bulkProgress.label}
            </p>
          )}
        </div>
      )}

      {/* Modal expandido */}
      {expandedPost && (
        <PostExpandedModal
          post={expandedPost.post}
          day={expandedPost.day}
          mediaKey={`${expandedPost.day.date}::${expandedPost.post.theme}`}
          sessionMedia={sessionMedia}
          onSessionMediaAdded={onSessionMediaAdded}
          mediaEntry={mediaMap[`${expandedPost.day.date}::${expandedPost.post.theme}`] ?? null}
          persistedSlideUrls={Array.from(
            { length: expandedPost.post.visual?.slides?.length ?? 0 },
            (_, i) => mediaMap[`${expandedPost.day.date}::${expandedPost.post.theme}::slide${i}`]?.imageUrl ?? null
          )}
          persistedSceneUrls={Array.from(
            { length: expandedPost.post.script?.scenes?.length ?? 0 },
            (_, i) => mediaMap[`${expandedPost.day.date}::${expandedPost.post.theme}::scene${i}`]?.videoUrl ?? null
          )}
          onMediaSaved={onMediaSaved}
          scheduleId={scheduleId}
          isApproved={approved.has(`${expandedPost.day.date}::${expandedPost.post.theme}`)}
          initialCaption={localCaptions[`${expandedPost.day.date}::${expandedPost.post.theme}`] ?? undefined}
          onCaptionUpdated={(newCaption) => {
            const key = `${expandedPost.day.date}::${expandedPost.post.theme}`
            setLocalCaptions(prev => ({ ...prev, [key]: newCaption }))
          }}
          onApproveToggle={() => {
            const key = `${expandedPost.day.date}::${expandedPost.post.theme}`
            setApproved(prev => {
              const n = new Set(prev)
              if (n.has(key)) n.delete(key); else n.add(key)
              return n
            })
          }}
          onDeleteRequest={() => {
            const key = `${expandedPost.day.date}::${expandedPost.post.theme}`
            setConfirmingDelete({ key, day: expandedPost.day, post: expandedPost.post })
            setExpandedPost(null)
          }}
          onRescheduled={onPostRescheduled}
          onConfirmed={(postId, confirmed) => {
            const key = `${expandedPost.day.date}::${expandedPost.post.theme}`
            setConfirmedKeys(prev => {
              const n = new Set(prev)
              if (confirmed) n.add(key); else n.delete(key)
              return n
            })
            onPostConfirmed?.(postId, confirmed)
          }}
          accountConnected={accountConnected}
          onClose={() => setExpandedPost(null)}
        />
      )}

      {/* Cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allPosts.map(({ day, post }) => {
          const key = `${day.date}::${post.theme}`
          const type = safePostType(post.type)
          const Icon = TYPE_ICONS[type]
          const isGenerating = generating.has(key)
          const isApproved = approved.has(key)
          const isConfirmedCard = confirmedKeys.has(key)
          const isConfirmingCard = confirmingKeys.has(key)
          const isDeleting = deleting.has(key)
          const isPublishing = publishing.has(key)
          const mapEntry = mediaMap[key]
          const sessionEntry = sessionMedia[key]
          const isPublished = publishedKeys.has(key) || mapEntry?.status === 'published'
          const publishError = publishErrors[key] ?? mapEntry?.publishError ?? null
          const progress = videoProgress[key]

          // Resolve thumbnail source
          let thumbSrc: string | null = null
          let thumbIsVideo = false
          if (sessionEntry) {
            thumbSrc = sessionEntry.mimeType === 'video/mp4'
              ? `data:video/mp4;base64,${sessionEntry.src}`
              : `data:${sessionEntry.mimeType};base64,${sessionEntry.src}`
            thumbIsVideo = sessionEntry.mimeType === 'video/mp4'
          } else if (mapEntry?.imageUrl) {
            thumbSrc = mapEntry.imageUrl
          } else if (mapEntry?.videoUrl) {
            thumbSrc = mapEntry.videoUrl
            thumbIsVideo = true
          }

          const hasMedia = thumbSrc !== null

          const isSelected = selectedKeys.has(key)

          return (
            <div
              key={key}
              className={`rounded-xl border-2 overflow-hidden flex flex-col transition-colors ${
                selectionMode && isSelected
                  ? 'border-primary ring-2 ring-primary/30'
                  : isPublished ? 'border-green-500 ring-1 ring-green-500/30 opacity-80'
                  : isConfirmedCard ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                  : isApproved ? 'border-green-500' : 'border-border'
              }`}
            >
              {/* Thumbnail area */}
              <div
                className="relative aspect-[4/5] bg-muted/30 cursor-pointer group/thumb"
                onClick={() => {
                  if (selectionMode) { toggleSelection(key); return }
                  setExpandedPost({ day, post })
                }}
              >
                {isGenerating ? (
                  <>
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      {progress && (
                        <p className="text-[10px] text-muted-foreground text-center px-3 leading-snug">{progress}</p>
                      )}
                    </div>
                  </>
                ) : hasMedia ? (
                  <>
                    {thumbIsVideo ? (
                      <video src={thumbSrc!} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbSrc!} alt={post.theme} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                    <Icon className="size-8" />
                    <span className="text-[10px] text-muted-foreground/50">{TYPE_LABELS[type]}</span>
                  </div>
                )}

                {/* Selection checkbox */}
                {selectionMode && (
                  <div className={`absolute top-2 left-2 size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background/80 border-muted-foreground/50'
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 10 8" className="size-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Published overlay */}
                {isPublished && !selectionMode && (
                  <div className="absolute inset-0 bg-black/30 flex items-end">
                    <div className="w-full bg-green-500/90 text-white text-[10px] font-semibold flex items-center justify-center gap-1 py-1">
                      <CheckCircle2 className="size-3" />
                      Publicado
                    </div>
                  </div>
                )}

                {/* Approved badge */}
                {isApproved && !isPublished && !selectionMode && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                )}
              </div>

              {/* Info area */}
              <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[type]}`}>
                    <Icon className="size-2.5" />
                    {TYPE_LABELS[type]}
                  </span>
                  {post.time && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="size-2.5" />{post.time}
                    </span>
                  )}
                  {/* Badges de publicação / confirmação */}
                  {isPublished && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-medium">
                      Publicado
                    </span>
                  )}
                  {isConfirmedCard && !isPublished && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="size-2.5" />Agendado
                    </span>
                  )}
                  {publishError && !isPublished && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-medium" title={publishError}>
                      Erro
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">{post.theme}</p>
                <p className="text-[10px] text-muted-foreground">{day.day_label}</p>
              </div>

              {/* Action buttons — hidden in selection mode */}
              <div className={`px-2 pb-2 flex flex-col gap-1 ${selectionMode ? 'invisible' : ''}`}>
                {isPublished ? (
                  /* Post publicado: só download e delete */
                  <div className="flex items-center gap-1">
                    {hasMedia && (
                      <button
                        onClick={() => {
                          const slug = post.theme.slice(0, 40).replace(/\s+/g, '-')
                          const a = document.createElement('a')
                          a.href = thumbSrc!
                          a.download = thumbIsVideo ? `${slug}.mp4` : `${slug}.png`
                          a.click()
                        }}
                        className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Baixar mídia"
                      >
                        <Download className="size-3.5" />
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => setConfirmingDelete({ key, day, post })}
                      disabled={!scheduleId || isDeleting}
                      className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Apagar post"
                    >
                      {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                ) : (
                  /* Post não publicado: ações completas */
                  <>
                    {/* Linha 1: 3 ações principais com label */}
                    <div className="grid grid-cols-3 gap-1">
                      {/* Refazer mídia */}
                      {post.type === 'reel' && showDurationPicker === key ? (
                        <div className="col-span-3 flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground mr-0.5">Duração:</span>
                          {([4, 6, 8] as const).map(d => (
                            <button
                              key={d}
                              onClick={() => {
                                setCalendarReelDuration(d)
                                setShowDurationPicker(null)
                                generateForPost(day, post)
                              }}
                              className={`text-[10px] px-1.5 py-1 rounded border transition-colors ${
                                calendarReelDuration === d
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-input hover:border-primary/60 text-muted-foreground bg-background'
                              }`}
                            >
                              {d}s
                            </button>
                          ))}
                          <button
                            onClick={() => setShowDurationPicker(null)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground text-[10px]"
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (post.type === 'reel') setShowDurationPicker(key)
                            else generateForPost(day, post)
                          }}
                          disabled={isGenerating || bulkGenerating}
                          className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Refazer mídia"
                        >
                          {isGenerating
                            ? <Loader2 className="size-3.5 animate-spin" />
                            : <Camera className="size-3.5" />
                          }
                          <span className="text-[9px] font-medium leading-none">
                            {isGenerating ? 'Gerando...' : 'Refazer mídia'}
                          </span>
                        </button>
                      )}

                      {/* Refazer post completo */}
                      <button
                        onClick={() => {
                          if (mapEntry?.postId) {
                            setConfirmRegeneratePost({ key, postId: mapEntry.postId, day, post })
                          } else {
                            setExpandedPost({ day, post })
                          }
                        }}
                        disabled={regeneratingPost.has(key)}
                        className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Refazer post completo (apaga mídia e regenera legenda)"
                      >
                        {regeneratingPost.has(key)
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <RefreshCw className="size-3.5" />
                        }
                        <span className="text-[9px] font-medium leading-none">
                          {regeneratingPost.has(key) ? 'Refazendo...' : 'Refazer post'}
                        </span>
                      </button>

                      {/* Editar post */}
                      <button
                        onClick={() => setExpandedPost({ day, post })}
                        className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Editar post"
                      >
                        <Pencil className="size-3.5" />
                        <span className="text-[9px] font-medium leading-none">Editar post</span>
                      </button>
                    </div>

                    {/* Linha 2: ações secundárias */}
                    <div className="flex items-center gap-1">
                      {/* Publicar agora */}
                      {accountConnected && mapEntry?.postId && (
                        <button
                          onClick={() => handlePublishNow(key, mapEntry.postId)}
                          disabled={isPublishing}
                          className={`flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 px-2 rounded-lg transition-colors flex-1 ${
                            hasMedia
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                          title="Publicar agora no Instagram"
                        >
                          {isPublishing ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                          {isPublishing ? 'Publicando...' : 'Publicar'}
                        </button>
                      )}

                      {/* Download */}
                      {hasMedia && (
                        <button
                          onClick={() => {
                            const slug = post.theme.slice(0, 40).replace(/\s+/g, '-')
                            const a = document.createElement('a')
                            a.href = thumbSrc!
                            a.download = thumbIsVideo ? `${slug}.mp4` : `${slug}.png`
                            a.click()
                          }}
                          className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Baixar mídia"
                        >
                          <Download className="size-3.5" />
                        </button>
                      )}

                      {/* Confirmar agendamento */}
                      {mapEntry?.postId && (
                        <button
                          onClick={() => handleToggleConfirmGallery(key, mapEntry.postId, !isConfirmedCard)}
                          disabled={isConfirmingCard}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isConfirmedCard
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-emerald-600'
                          }`}
                          title={isConfirmedCard ? 'Cancelar confirmação de agendamento' : 'Confirmar agendamento'}
                        >
                          {isConfirmingCard
                            ? <Loader2 className="size-3.5 animate-spin" />
                            : <CheckCircle2 className="size-3.5" />
                          }
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmingDelete({ key, day, post })}
                        disabled={!scheduleId || isDeleting}
                        className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={scheduleId ? 'Apagar post' : 'Salve o cronograma para apagar posts'}
                      >
                        {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PostExpandedModal — modal completo ao clicar num post da galeria
// ─────────────────────────────────────────────────────────────────────────────

function PostExpandedModal({
  post,
  day,
  mediaKey,
  sessionMedia,
  onSessionMediaAdded,
  mediaEntry,
  persistedSlideUrls,
  persistedSceneUrls,
  onMediaSaved,
  scheduleId,
  isApproved: _isApproved,
  onApproveToggle: _onApproveToggle,
  onDeleteRequest,
  onRescheduled,
  onConfirmed,
  accountConnected,
  initialCaption,
  onCaptionUpdated,
  onClose,
}: {
  post: SchedulePost
  day: ScheduleDay
  mediaKey: string
  sessionMedia: Record<string, SessionMediaEntry>
  onSessionMediaAdded: (key: string, src: string, mimeType: string) => void
  mediaEntry?: { imageUrl: string | null; videoUrl: string | null; postId: string; confirmed?: boolean; status?: string } | null
  persistedSlideUrls?: (string | null)[]
  persistedSceneUrls?: (string | null)[]
  onMediaSaved?: (key: string, imageUrl: string | null, videoUrl: string | null) => void
  scheduleId?: string | null
  isApproved: boolean
  onApproveToggle: () => void
  onDeleteRequest: () => void
  onRescheduled?: (oldDate: string, newDate: string, postId: string, theme: string, newTime: string | null) => void
  onConfirmed?: (postId: string, confirmed: boolean) => void
  accountConnected?: boolean
  initialCaption?: string
  onCaptionUpdated?: (newCaption: string) => void
  onClose: () => void
}) {
  const type = safePostType(post.type)
  const Icon = TYPE_ICONS[type]
  const isCarousel = type === 'carousel'
  const isStorySeq = type === 'story_sequence'
  const isMultiFrameModal = isCarousel || isStorySeq
  const carouselSlideCount = post.visual?.slides?.length ?? 0
  const sceneCount = type === 'reel' ? (post.script?.scenes?.length ?? 0) : 0

  const [activeSlide, setActiveSlide] = useState(0)
  const [activeScene, setActiveScene] = useState(0)

  // Bloqueia scroll do container principal enquanto o modal está aberto
  useEffect(() => {
    // O scroll real é no <main>, não no body
    const mainEl = document.querySelector('main') as HTMLElement | null
    const prevMain = mainEl?.style.overflow ?? ''
    const prevBody = document.body.style.overflow
    if (mainEl) mainEl.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      if (mainEl) mainEl.style.overflow = prevMain
      document.body.style.overflow = prevBody
    }
  }, [])

  const [generating, setGenerating] = useState(false)
  const [generatingSlide, setGeneratingSlide] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState<string | null>(null)
  const [modalReelDuration] = useState<4 | 6 | 8>(8)
  const [sceneVideoGenerating, setSceneVideoGenerating] = useState<boolean[]>(() => Array(sceneCount).fill(false))
  const [sceneVideoProgress, setSceneVideoProgress] = useState<(string | null)[]>(() => Array(sceneCount).fill(null))
  const [generatingAllScenes, setGeneratingAllScenes] = useState(false)

  const scheduleIdRef = useRef(scheduleId)
  scheduleIdRef.current = scheduleId

  // Caption editing
  const [localCaption, setLocalCaption] = useState<string>(initialCaption ?? post.caption ?? '')
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionEdit, setCaptionEdit] = useState(localCaption)
  const [captionSaving, setCaptionSaving] = useState(false)
  const [captionError, setCaptionError] = useState<string | null>(null)
  const [modalRegeneratingCaption, setModalRegeneratingCaption] = useState(false)

  // Sync localCaption if initialCaption changes (e.g., regenerated from gallery)
  const prevInitialCaption = useRef(initialCaption)
  if (initialCaption !== undefined && initialCaption !== prevInitialCaption.current) {
    prevInitialCaption.current = initialCaption
    setLocalCaption(initialCaption)
    if (!editingCaption) setCaptionEdit(initialCaption)
  }

  async function handleSaveCaption() {
    const postId = mediaEntry?.postId
    if (!postId) return
    setCaptionSaving(true)
    setCaptionError(null)
    try {
      const res = await fetch(`/api/schedule/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: captionEdit }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao salvar')
      }
      setLocalCaption(captionEdit)
      onCaptionUpdated?.(captionEdit)
      setEditingCaption(false)
    } catch (err) {
      setCaptionError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setCaptionSaving(false)
    }
  }

  async function handleModalRegenerateCaption() {
    const postId = mediaEntry?.postId
    if (!postId) return
    setModalRegeneratingCaption(true)
    setCaptionError(null)
    try {
      const res = await fetch(`/api/schedule/posts/${postId}/regenerate-caption`, { method: 'POST' })
      const data = await res.json() as { caption?: string; error?: string }
      if (res.ok && data.caption) {
        setLocalCaption(data.caption)
        setCaptionEdit(data.caption)
        onCaptionUpdated?.(data.caption)
      } else {
        setCaptionError(data.error ?? 'Erro ao regenerar')
      }
    } catch {
      setCaptionError('Erro de rede')
    } finally {
      setModalRegeneratingCaption(false)
    }
  }

  const [modalEditingSchedule, setModalEditingSchedule] = useState(false)
  const [modalRescheduleDate, setModalRescheduleDate] = useState(day.date)
  const [modalRescheduleTime, setModalRescheduleTime] = useState(post.time ?? '')
  const [modalRescheduleSaving, setModalRescheduleSaving] = useState(false)
  const [modalRescheduleError, setModalRescheduleError] = useState<string | null>(null)

  const [modalConfirmed, setModalConfirmed] = useState(mediaEntry?.confirmed ?? false)
  const [modalConfirmingSave, setModalConfirmingSave] = useState(false)
  const modalIsPublished = mediaEntry?.status === 'published'
  const [modalPublishedLocal, setModalPublishedLocal] = useState(false)
  const [modalPublishingNow, setModalPublishingNow] = useState(false)
  const [modalPublishError, setModalPublishError] = useState<string | null>(null)
  const modalIsFullyPublished = modalIsPublished || modalPublishedLocal

  async function handleModalPublishNow() {
    const postId = mediaEntry?.postId
    if (!postId) return
    setModalPublishingNow(true)
    setModalPublishError(null)
    try {
      const res = await fetch(`/api/instagram/publish/${postId}`, { method: 'POST' })
      if (res.ok) {
        setModalPublishedLocal(true)
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setModalPublishError(data.error ?? 'Erro ao publicar')
      }
    } catch {
      setModalPublishError('Erro de rede')
    } finally {
      setModalPublishingNow(false)
    }
  }

  async function handleModalToggleConfirm() {
    const postId = mediaEntry?.postId
    if (!postId) return
    const newValue = !modalConfirmed
    setModalConfirmingSave(true)
    try {
      const res = await fetch(`/api/schedule/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: newValue }),
      })
      if (res.ok) {
        setModalConfirmed(newValue)
        onConfirmed?.(postId, newValue)
      }
    } catch {
      // silently ignore
    } finally {
      setModalConfirmingSave(false)
    }
  }

  async function handleModalReschedule() {
    if (!modalRescheduleDate) return
    const postId = mediaEntry?.postId
    if (!postId) return
    setModalRescheduleSaving(true)
    setModalRescheduleError(null)
    try {
      const res = await fetch(`/api/schedule/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: modalRescheduleDate, time: modalRescheduleTime || null }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao reagendar')
      }
      onRescheduled?.(day.date, modalRescheduleDate, postId, post.theme, modalRescheduleTime || null)
      setModalEditingSchedule(false)
      onClose()
    } catch (err) {
      setModalRescheduleError(err instanceof Error ? err.message : 'Erro ao reagendar')
    } finally {
      setModalRescheduleSaving(false)
    }
  }

  // Upload silencioso após gerar
  async function uploadMedia(base64: string, mimeType: 'image/png' | 'image/jpeg' | 'video/mp4') {
    const currentScheduleId = scheduleIdRef.current
    if (!currentScheduleId) return
    try {
      let postId = mediaEntry?.postId
      if (!postId) {
        const res = await fetch(
          `/api/schedule/post-id?scheduleId=${encodeURIComponent(currentScheduleId)}&date=${encodeURIComponent(day.date)}&theme=${encodeURIComponent(post.theme)}`
        )
        if (!res.ok) return
        const data = await res.json() as { postId: string }
        postId = data.postId
      }
      if (!postId) return
      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, mediaType: mimeType === 'video/mp4' ? 'video' : 'image', data: base64, mimeType }),
      })
      if (uploadRes.ok) {
        const { url } = await uploadRes.json() as { url: string }
        onMediaSaved?.(mediaKey, mimeType !== 'video/mp4' ? url : null, mimeType === 'video/mp4' ? url : null)
      }
    } catch { /* silencioso */ }
  }

  // Gera um slide/frame específico
  async function generateSlide(slideIdx: number) {
    setGeneratingSlide(slideIdx)
    setError(null)
    try {
      const framePrompt = isStorySeq
        ? buildStorySequenceFramePrompt(post, slideIdx)
        : buildCarouselSlidePrompt(post, slideIdx)
      const frameAspect = isStorySeq ? '9:16' : '4:5'
      const res = await fetch('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: framePrompt, aspectRatio: frameAspect }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao gerar frame')
      const slideKey = `${mediaKey}::slide${slideIdx}`
      onSessionMediaAdded(slideKey, data.imageData as string, 'image/png')
      if (slideIdx === 0) {
        onSessionMediaAdded(mediaKey, data.imageData as string, 'image/png')
        uploadMedia(data.imageData as string, 'image/png')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar frame')
    } finally {
      setGeneratingSlide(null)
    }
  }

  // Gera todos os slides sequencialmente
  async function generateAllSlides() {
    setGenerating(true)
    setError(null)
    for (let i = 0; i < carouselSlideCount; i++) {
      await generateSlide(i)
    }
    setGenerating(false)
  }

  // Resolve vídeo de uma cena (session ou persistido)
  function getSceneVideo(idx: number): string | null {
    const sceneKey = `${mediaKey}::scene${idx}`
    const entry = sessionMedia[sceneKey]
    if (entry) return `data:${entry.mimeType};base64,${entry.src}`
    const persisted = persistedSceneUrls?.[idx]
    if (persisted) return persisted
    return null
  }

  // Upload silencioso de vídeo de cena
  async function uploadSceneVideo(base64: string, sceneIdx: number) {
    const currentScheduleId = scheduleIdRef.current
    if (!currentScheduleId) return
    try {
      let postId = mediaEntry?.postId
      if (!postId) {
        const res = await fetch(
          `/api/schedule/post-id?scheduleId=${encodeURIComponent(currentScheduleId)}&date=${encodeURIComponent(day.date)}&theme=${encodeURIComponent(post.theme)}`
        )
        if (!res.ok) return
        const data = await res.json() as { postId: string }
        postId = data.postId
      }
      if (!postId) return
      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, mediaType: 'video', data: base64, mimeType: 'video/mp4', sceneIndex: sceneIdx }),
      })
      if (uploadRes.ok) {
        const { url } = await uploadRes.json() as { url: string }
        onMediaSaved?.(`${mediaKey}::scene${sceneIdx}`, null, url)
        if (sceneIdx === 0) onMediaSaved?.(mediaKey, null, url)
      }
    } catch { /* silencioso */ }
  }

  // Gera vídeo de uma cena específica
  async function generateScene(sceneIdx: number) {
    setSceneVideoGenerating(prev => prev.map((v, i) => i === sceneIdx ? true : v))
    setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? 'Iniciando...' : v))
    setError(null)
    try {
      const scene = post.script!.scenes[sceneIdx]
      const dur = toVeoDuration(parseSceneDurationSeconds(scene.time))
      const res = await fetch('/api/media/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildSceneVideoPrompt(post, sceneIdx), targetDuration: dur }),
      })
      if (!res.ok || !res.body) throw new Error('Falha ao conectar')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          let evt: { type: string; message?: string; videoData?: string }
          try { evt = JSON.parse(line) } catch { continue }
          if (evt.type === 'start' || evt.type === 'progress') {
            setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? (evt.message ?? '') : v))
          } else if (evt.type === 'complete' && evt.videoData) {
            onSessionMediaAdded(`${mediaKey}::scene${sceneIdx}`, evt.videoData, 'video/mp4')
            if (sceneIdx === 0) onSessionMediaAdded(mediaKey, evt.videoData, 'video/mp4')
            setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? null : v))
            uploadSceneVideo(evt.videoData, sceneIdx)
          } else if (evt.type === 'error') {
            throw new Error(evt.message ?? 'Erro')
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar cena')
      setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? null : v))
    } finally {
      setSceneVideoGenerating(prev => prev.map((v, i) => i === sceneIdx ? false : v))
    }
  }

  // Gera todas as cenas sequencialmente
  async function generateAllScenes() {
    setGeneratingAllScenes(true)
    setError(null)
    for (let i = 0; i < sceneCount; i++) {
      await generateScene(i)
    }
    setGeneratingAllScenes(false)
  }

  // Gera mídia principal (post / story / reel)
  async function generateMain() {
    setGenerating(true)
    setError(null)
    try {
      if (type === 'reel') {
        setVideoProgress('Iniciando geração do vídeo...')
        const res = await fetch('/api/media/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: buildVideoPrompt(post), targetDuration: modalReelDuration }),
        })
        if (!res.ok || !res.body) throw new Error('Falha ao conectar')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split('\n\n')
          buf = parts.pop() ?? ''
          for (const part of parts) {
            const line = part.replace(/^data: /, '').trim()
            if (!line) continue
            let evt: { type: string; message?: string; videoData?: string }
            try { evt = JSON.parse(line) } catch { continue }
            if (evt.type === 'start' || evt.type === 'progress') {
              setVideoProgress(evt.message ?? '')
            } else if (evt.type === 'complete' && evt.videoData) {
              onSessionMediaAdded(mediaKey, evt.videoData, 'video/mp4')
              setVideoProgress(null)
              uploadMedia(evt.videoData, 'video/mp4')
            } else if (evt.type === 'error') {
              throw new Error(evt.message ?? 'Erro ao gerar vídeo')
            }
          }
        }
      } else {
        const aspectRatio = type === 'story' ? '9:16' : '1:1'
        const res = await fetch('/api/media/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: buildImagePrompt(post), aspectRatio }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao gerar imagem')
        const mime = (data.mimeType as string) || 'image/jpeg'
        onSessionMediaAdded(mediaKey, data.imageData as string, mime)
        uploadMedia(data.imageData as string, mime as 'image/png' | 'image/jpeg')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar')
      setVideoProgress(null)
    } finally {
      setGenerating(false)
    }
  }

  // Auto-gera vídeo de reel ao abrir modal se ainda não há vídeo
  // (desabilitado para reels com cenas — usuário gera cada cena manualmente)
  useEffect(() => {
    if (type === 'reel' && sceneCount > 0) return
    const hasVideo = !!(sessionMedia[mediaKey]) || !!mediaEntry?.videoUrl
    if (type === 'reel' && !hasVideo) {
      generateMain()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve fonte de imagem de um slide
  function getSlideImage(idx: number): string | null {
    // 1. Gerado nesta sessão (prioridade máxima)
    const slideKey = `${mediaKey}::slide${idx}`
    const slideEntry = sessionMedia[slideKey]
    if (slideEntry) return `data:${slideEntry.mimeType};base64,${slideEntry.src}`

    // 2. URL persistida no banco (slide individual)
    const persistedUrl = persistedSlideUrls?.[idx]
    if (persistedUrl) return persistedUrl

    // 3. Fallbacks para slide 0
    if (idx === 0) {
      const main = sessionMedia[mediaKey]
      if (main && main.mimeType !== 'video/mp4') return `data:${main.mimeType};base64,${main.src}`
      if (mediaEntry?.imageUrl) return mediaEntry.imageUrl
    }
    return null
  }

  // Resolve mídia principal (não-carrossel)
  const mainEntry = sessionMedia[mediaKey]
  let mainSrc: string | null = null
  let mainIsVideo = false
  if (mainEntry) {
    mainSrc = `data:${mainEntry.mimeType};base64,${mainEntry.src}`
    mainIsVideo = mainEntry.mimeType === 'video/mp4'
  } else if (mediaEntry?.imageUrl) {
    mainSrc = mediaEntry.imageUrl
  } else if (mediaEntry?.videoUrl) {
    mainSrc = mediaEntry.videoUrl
    mainIsVideo = true
  }

  function handleDownloadMain() {
    if (!mainSrc) return
    const slug = post.theme.slice(0, 40).replace(/\s+/g, '-')
    const a = document.createElement('a')
    a.href = mainSrc
    a.download = mainIsVideo ? `${slug}.mp4` : `${slug}.png`
    a.click()
  }

  function handleDownloadSlide(idx: number) {
    const src = getSlideImage(idx)
    if (!src) return
    const slug = post.theme.slice(0, 30).replace(/\s+/g, '-')
    const a = document.createElement('a')
    a.href = src
    a.download = `${slug}-slide-${idx + 1}.png`
    a.click()
  }

  const currentSlideImg = isMultiFrameModal ? getSlideImage(activeSlide) : null
  const hasMedia = isMultiFrameModal ? currentSlideImg !== null : mainSrc !== null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      onWheel={e => e.stopPropagation()}
    >
      <div
        className={`bg-background rounded-2xl border shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden ${isMultiFrameModal ? 'max-w-5xl' : 'max-w-4xl'}`}
        onClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[type]}`}>
              <Icon className="size-3.5" />
              {TYPE_LABELS[type]}
            </span>
            {post.time && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />{post.time}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{day.day_label}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-3 shrink-0">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="grid lg:grid-cols-[1fr_320px] h-full min-h-0">

            {/* Left: Mídia */}
            <div className="flex flex-col gap-3 p-5 border-r overflow-y-auto">
              <div>
                <h3 className="font-semibold text-base leading-snug">{post.theme}</h3>
                {post.content_pillar && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">{post.content_pillar}</span>
                )}
              </div>

              {/* Carrossel / Sequência de Stories — visualizador de frames */}
              {isMultiFrameModal && carouselSlideCount > 0 ? (
                <div className="flex flex-col gap-3">
                  {/* Viewer principal do slide ativo */}
                  <div className="relative bg-muted/30 rounded-xl overflow-hidden" style={{ height: 'min(45vh, 420px)' }}>
                    {generatingSlide === activeSlide ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Gerando {isStorySeq ? 'frame' : 'slide'} {activeSlide + 1}...</p>
                      </div>
                    ) : currentSlideImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={currentSlideImg} alt={`Slide ${activeSlide + 1}`} className="absolute inset-0 w-full h-full object-contain" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/40 p-6 text-center">
                        <Images className="size-12" />
                        <p className="text-[11px] text-muted-foreground/70 leading-snug max-w-[240px]">
                          {post.visual?.slides?.[activeSlide]?.image_description ?? 'Slide não gerado'}
                        </p>
                      </div>
                    )}

                    {/* Setas de navegação */}
                    {carouselSlideCount > 1 && (
                      <>
                        <button
                          onClick={() => setActiveSlide(s => Math.max(0, s - 1))}
                          disabled={activeSlide === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 size-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-20 transition-colors"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                        <button
                          onClick={() => setActiveSlide(s => Math.min(carouselSlideCount - 1, s + 1))}
                          disabled={activeSlide === carouselSlideCount - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 size-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-20 transition-colors"
                        >
                          <ChevronRight className="size-5" />
                        </button>
                      </>
                    )}

                    {/* Contador */}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {activeSlide + 1}/{carouselSlideCount}
                    </div>
                  </div>

                  {/* Info do slide ativo */}
                  {post.visual?.slides?.[activeSlide] && (
                    <div className="bg-muted/30 rounded-lg p-3 shrink-0">
                      <p className="text-xs font-semibold">{post.visual.slides[activeSlide].headline}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {post.visual.slides[activeSlide].description}
                      </p>
                    </div>
                  )}

                  {/* Faixa de thumbnails — todos os slides visíveis */}
                  <div className="shrink-0">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1.5">{isStorySeq ? 'Todos os frames' : 'Todos os slides'}</p>
                    <div className="overflow-x-auto pb-1">
                      <div className="flex gap-2">
                        {Array.from({ length: carouselSlideCount }).map((_, i) => {
                          const img = getSlideImage(i)
                          const isActive = i === activeSlide
                          const isGen = generatingSlide === i
                          const frameLabel = isStorySeq ? 'Frame' : 'Slide'
                          return (
                            <button
                              key={i}
                              onClick={() => setActiveSlide(i)}
                              className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                                isActive
                                  ? 'border-primary ring-2 ring-primary/30'
                                  : img
                                    ? 'border-border hover:border-primary/60'
                                    : 'border-dashed border-muted-foreground/30 hover:border-primary/40'
                              }`}
                              style={{ width: isStorySeq ? '42px' : '52px', aspectRatio: isStorySeq ? '9/16' : '4/5' }}
                              title={`${frameLabel} ${i + 1}${img ? '' : ' — não gerado'}`}
                            >
                              {isGen ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                                </div>
                              ) : img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={img} alt={`${frameLabel} ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                                  <span className="text-[9px] font-bold text-muted-foreground/50">{i + 1}</span>
                                </div>
                              )}
                              {/* Badge com número */}
                              <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded leading-tight">
                                {i + 1}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Ações do slide */}
                  <div className="flex gap-2 shrink-0">
                    {currentSlideImg && (
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 shrink-0" onClick={() => handleDownloadSlide(activeSlide)}>
                        <Download className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={currentSlideImg ? 'outline' : 'default'}
                      className="flex-1 gap-1.5 h-8"
                      disabled={generatingSlide !== null || generating}
                      onClick={() => generateSlide(activeSlide)}
                    >
                      {generatingSlide === activeSlide
                        ? <><Loader2 className="size-3.5 animate-spin" />Gerando slide {activeSlide + 1}...</>
                        : <><Sparkles className="size-3.5" />{currentSlideImg ? 'Regerar slide' : 'Gerar este slide'}</>
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 shrink-0"
                      disabled={generatingSlide !== null || generating}
                      onClick={generateAllSlides}
                      title="Gerar todos os slides"
                    >
                      {generating
                        ? <><Loader2 className="size-3.5 animate-spin" />Gerando...</>
                        : <><Sparkles className="size-3.5" />Gerar todos</>
                      }
                    </Button>
                  </div>
                </div>
              ) : type === 'reel' && sceneCount > 0 ? (
                /* Reel com cenas: viewer por cena */
                <div className="flex flex-col gap-3">
                  {/* Player principal da cena ativa */}
                  <div className="relative bg-muted/30 rounded-xl overflow-hidden" style={{ height: 'min(45vh, 420px)' }}>
                    {sceneVideoGenerating[activeScene] ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground px-4 text-center">
                          {sceneVideoProgress[activeScene] ?? `Gerando cena ${activeScene + 1}...`}
                        </p>
                      </div>
                    ) : getSceneVideo(activeScene) ? (
                      <video
                        key={activeScene}
                        src={getSceneVideo(activeScene)!}
                        controls
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/40 p-6 text-center">
                        <Clapperboard className="size-12" />
                        <p className="text-[11px] text-muted-foreground/70 leading-snug max-w-[240px]">
                          {post.script?.scenes?.[activeScene]?.visual ?? 'Cena não gerada'}
                        </p>
                      </div>
                    )}
                    {sceneCount > 1 && (
                      <>
                        <button
                          onClick={() => setActiveScene(s => Math.max(0, s - 1))}
                          disabled={activeScene === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 size-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-20 transition-colors"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                        <button
                          onClick={() => setActiveScene(s => Math.min(sceneCount - 1, s + 1))}
                          disabled={activeScene === sceneCount - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 size-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center disabled:opacity-20 transition-colors"
                        >
                          <ChevronRight className="size-5" />
                        </button>
                      </>
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Cena {activeScene + 1}/{sceneCount}
                    </div>
                    {post.script?.scenes?.[activeScene]?.time && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                        {post.script.scenes[activeScene].time}
                      </div>
                    )}
                  </div>

                  {/* Info da cena ativa */}
                  {post.script?.scenes?.[activeScene] && (
                    <div className="bg-muted/30 rounded-lg p-3 shrink-0 space-y-1.5">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Visual</p>
                        <p className="text-xs">{post.script.scenes[activeScene].visual}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Narração</p>
                        <p className="text-xs text-muted-foreground">{post.script.scenes[activeScene].narration}</p>
                      </div>
                      {post.script.scenes[activeScene].text_overlay && (
                        <div className="bg-black/80 text-white rounded px-2 py-1 inline-block">
                          <p className="text-[9px] font-bold">{post.script.scenes[activeScene].text_overlay}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Faixa de thumbnails das cenas */}
                  <div className="shrink-0">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1.5">Todas as cenas</p>
                    <div className="overflow-x-auto pb-1">
                      <div className="flex gap-2">
                        {Array.from({ length: sceneCount }).map((_, i) => {
                          const vid = getSceneVideo(i)
                          const isActive = i === activeScene
                          const isGen = sceneVideoGenerating[i]
                          const scene = post.script?.scenes?.[i]
                          return (
                            <button
                              key={i}
                              onClick={() => setActiveScene(i)}
                              className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                                isActive
                                  ? 'border-primary ring-2 ring-primary/30'
                                  : vid
                                    ? 'border-border hover:border-primary/60'
                                    : 'border-dashed border-muted-foreground/30 hover:border-primary/40'
                              }`}
                              style={{ width: '48px', aspectRatio: '9/16' }}
                              title={`Cena ${i + 1}${scene ? ` — ${scene.time}` : ''}`}
                            >
                              {isGen ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                                </div>
                              ) : vid ? (
                                <video src={vid} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 gap-0.5 p-1">
                                  <Clapperboard className="size-3 text-muted-foreground/50" />
                                  <span className="text-[7px] text-muted-foreground/50 leading-tight text-center">{scene?.time ?? i + 1}</span>
                                </div>
                              )}
                              <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded leading-tight">
                                {i + 1}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 shrink-0">
                    {getSceneVideo(activeScene) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 shrink-0"
                        onClick={() => {
                          const vid = getSceneVideo(activeScene)!
                          const slug = post.theme.slice(0, 40).replace(/\s+/g, '-')
                          const a = document.createElement('a')
                          a.href = vid
                          a.download = `${slug}-cena-${activeScene + 1}.mp4`
                          a.click()
                        }}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={getSceneVideo(activeScene) ? 'outline' : 'default'}
                      className="flex-1 gap-1.5 h-8"
                      disabled={sceneVideoGenerating[activeScene] || generatingAllScenes}
                      onClick={() => generateScene(activeScene)}
                    >
                      {sceneVideoGenerating[activeScene]
                        ? <><Loader2 className="size-3.5 animate-spin" />Gerando cena {activeScene + 1}...</>
                        : <><Sparkles className="size-3.5" />{getSceneVideo(activeScene) ? 'Regerar cena' : 'Gerar esta cena'}</>
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 shrink-0"
                      disabled={sceneVideoGenerating.some(Boolean) || generatingAllScenes}
                      onClick={generateAllScenes}
                      title="Gerar todas as cenas"
                    >
                      {generatingAllScenes
                        ? <><Loader2 className="size-3.5 animate-spin" />Gerando...</>
                        : <><Sparkles className="size-3.5" />Gerar todas</>
                      }
                    </Button>
                  </div>
                </div>
              ) : (
                /* Não-carrossel: imagem/vídeo */
                <div className="space-y-3">
                  <div className={`relative bg-muted/30 rounded-xl overflow-hidden ${
                    type === 'story' ? 'aspect-[9/16] max-h-[55vh]' : 'aspect-square max-h-[55vh]'
                  }`}>
                    {generating ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : mainSrc ? (
                      mainIsVideo ? (
                        <video src={mainSrc} controls className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mainSrc} alt={post.theme} className="absolute inset-0 w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                        <Icon className="size-12" />
                        <span className="text-sm">{TYPE_LABELS[type]}</span>
                      </div>
                    )}
                  </div>

                  {videoProgress && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                      <Loader2 className="size-3 animate-spin shrink-0" />
                      <span>{videoProgress}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {mainSrc && (
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 shrink-0" onClick={handleDownloadMain}>
                        <Download className="size-3.5" />
                        Baixar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={mainSrc ? 'outline' : 'default'}
                      className="flex-1 gap-1.5 h-8"
                      disabled={generating}
                      onClick={generateMain}
                    >
                      {generating
                        ? <><Loader2 className="size-3.5 animate-spin" />Gerando...</>
                        : <><Sparkles className="size-3.5" />{mainSrc ? 'Gerar novamente' : 'Gerar imagem'}</>
                      }
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
              )}
            </div>

            {/* Right: Informações do post */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Legenda — editável */}
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
                    <Type className="size-3" /> Legenda
                  </p>
                  <div className="flex items-center gap-1">
                    {mediaEntry?.postId && !editingCaption && (
                      <button
                        onClick={handleModalRegenerateCaption}
                        disabled={modalRegeneratingCaption}
                        className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                        title="Regenerar com IA"
                      >
                        {modalRegeneratingCaption
                          ? <Loader2 className="size-3 animate-spin" />
                          : <Sparkles className="size-3" />
                        }
                        {modalRegeneratingCaption ? 'Gerando...' : 'IA'}
                      </button>
                    )}
                    {mediaEntry?.postId && (
                      <button
                        onClick={() => { setCaptionEdit(localCaption); setEditingCaption(v => !v); setCaptionError(null) }}
                        className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                        title={editingCaption ? 'Cancelar edição' : 'Editar legenda'}
                      >
                        {editingCaption ? <X className="size-3" /> : <Pencil className="size-3" />}
                        {editingCaption ? 'Cancelar' : 'Editar'}
                      </button>
                    )}
                  </div>
                </div>
                {editingCaption ? (
                  <div className="space-y-2">
                    <textarea
                      value={captionEdit}
                      onChange={e => setCaptionEdit(e.target.value)}
                      rows={6}
                      className="w-full text-xs leading-relaxed border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      placeholder="Escreva a legenda..."
                    />
                    {captionError && <p className="text-[10px] text-destructive">{captionError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCaption}
                        disabled={captionSaving}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        {captionSaving ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                        Salvar
                      </button>
                      <button
                        onClick={() => { setEditingCaption(false); setCaptionError(null) }}
                        disabled={captionSaving}
                        className="text-xs text-muted-foreground border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  localCaption ? (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{localCaption}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {mediaEntry?.postId ? 'Nenhuma legenda. Clique em Editar ou IA para gerar.' : 'Nenhuma legenda.'}
                    </p>
                  )
                )}
              </div>

              {post.visual && (
                <div className="space-y-3">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
                    <Palette className="size-3" /> Briefing Visual
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {post.visual.color_palette.map((hex, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="size-7 rounded-lg border border-black/10 shadow-sm" style={{ backgroundColor: hex }} />
                        <span className="text-[9px] font-mono text-muted-foreground">{hex}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-bold">{post.visual.headline}</p>
                    {post.visual.subline && (
                      <p className="text-[11px] text-muted-foreground">{post.visual.subline}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2.5 leading-relaxed">
                    {post.visual.image_description}
                  </p>
                </div>
              )}

              {post.script && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
                    <Clapperboard className="size-3" /> Roteiro · {post.script.duration}
                  </p>
                  <div className="bg-pink-50 dark:bg-pink-950/30 rounded-lg p-3 border border-pink-100 dark:border-pink-900">
                    <p className="text-[10px] font-medium text-pink-600 dark:text-pink-400 mb-1">Hook</p>
                    <p className="text-xs font-semibold italic">&ldquo;{post.script.hook}&rdquo;</p>
                  </div>
                  <div className="space-y-2">
                    {post.script.scenes.map((scene, i) => (
                      <div key={i} className="flex gap-2">
                        <div className="shrink-0 size-6 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                        </div>
                        <div className="flex-1 bg-muted/30 rounded-lg p-2 space-y-1">
                          <p className="text-[10px] text-muted-foreground">Visual</p>
                          <p className="text-xs">{scene.visual}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Narração</p>
                          <p className="text-xs text-muted-foreground">{scene.narration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">CTA final</p>
                    <p className="text-xs font-medium">{post.script.cta}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center gap-2 shrink-0 flex-wrap ${modalIsFullyPublished ? 'bg-green-50/40 dark:bg-green-950/10' : 'bg-background'}`}>
          {modalIsFullyPublished ? (
            /* Estado publicado — footer simplificado */
            <>
              <div className="flex-1 flex items-center gap-1.5 text-xs font-medium text-green-600">
                <CheckCircle2 className="size-3.5" />
                Publicado no Instagram
              </div>
              {hasMedia && (
                <button
                  onClick={isMultiFrameModal ? () => handleDownloadSlide(activeSlide) : handleDownloadMain}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-4 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-transparent"
                >
                  <Download className="size-3.5" />
                  Baixar
                </button>
              )}
              <button
                onClick={onDeleteRequest}
                className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-4 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors border border-transparent"
              >
                <Trash2 className="size-3.5" />
                Apagar
              </button>
            </>
          ) : (
            /* Estado normal */
            <>
              {hasMedia && (
                <button
                  onClick={isMultiFrameModal ? () => handleDownloadSlide(activeSlide) : handleDownloadMain}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-transparent"
                >
                  <Download className="size-3.5" />
                  Baixar
                </button>
              )}

              {mediaEntry?.postId && (
                <button
                  onClick={() => { setModalRescheduleDate(day.date); setModalRescheduleTime(post.time ?? ''); setModalEditingSchedule(v => !v) }}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-primary transition-colors border border-transparent"
                >
                  <Calendar className="size-3.5" />
                  Reagendar
                </button>
              )}

              {mediaEntry?.postId && (
                <button
                  onClick={handleModalToggleConfirm}
                  disabled={modalConfirmingSave}
                  className={`flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg transition-colors border ${
                    modalConfirmed
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-emerald-600'
                  }`}
                >
                  {modalConfirmingSave ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  {modalConfirmed ? 'Confirmado ✓' : 'Confirmar'}
                </button>
              )}

              {accountConnected && mediaEntry?.postId && (
                <button
                  onClick={handleModalPublishNow}
                  disabled={modalPublishingNow}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {modalPublishingNow ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Publicar agora
                </button>
              )}

              {modalPublishError && (
                <p className="w-full text-[10px] text-destructive">{modalPublishError}</p>
              )}

              <button
                onClick={onDeleteRequest}
                className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors border border-transparent"
              >
                <Trash2 className="size-3.5" />
                Apagar
              </button>
            </>
          )}
        </div>

        {/* Inline reschedule form */}
        {modalEditingSchedule && (
          <div className="px-5 pb-4 space-y-2 border-t pt-3">
            <div className="flex gap-2">
              <input
                type="date"
                value={modalRescheduleDate}
                onChange={e => setModalRescheduleDate(e.target.value)}
                className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="time"
                value={modalRescheduleTime}
                onChange={e => setModalRescheduleTime(e.target.value)}
                className="w-24 text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {modalRescheduleError && <p className="text-xs text-destructive">{modalRescheduleError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleModalReschedule}
                disabled={modalRescheduleSaving || !modalRescheduleDate}
                className="flex-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {modalRescheduleSaving ? <Loader2 className="size-3 animate-spin" /> : <Pencil className="size-3" />}
                Salvar reagendamento
              </button>
              <button
                onClick={() => { setModalEditingSchedule(false); setModalRescheduleError(null) }}
                disabled={modalRescheduleSaving}
                className="text-xs text-muted-foreground border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function buildImagePrompt(post: SchedulePost): string {
  const v = post.visual
  if (!v) return `${post.theme}. ${post.caption ?? ''}`
  return [
    `${v.image_description}.`,
    `Headline text on the image: "${v.headline}".`,
    v.subline ? `Subline text on the image: "${v.subline}".` : '',
    `Apply these brand colors as fills, backgrounds and accents throughout the design: ${v.color_palette.join(', ')}. NEVER write these hex codes as visible text on the image.`,
    `Background: ${v.background}.`,
    `Style: professional social media ${post.type} for Instagram.`,
    `IMPORTANT: Do not display hex color codes, color swatches, or any technical metadata as text anywhere on the image.`,
  ].filter(Boolean).join(' ')
}

function buildCarouselSlidePrompt(post: SchedulePost, slideIdx: number): string {
  const v = post.visual
  const slide = v?.slides?.[slideIdx]
  if (!slide || !v) return buildImagePrompt(post)
  return [
    `${slide.image_description}.`,
    `Visual concept for this slide (do NOT write this as text): ${slide.description}.`,
    `Instagram carousel slide ${slide.slide_number}.`,
    `The ONLY text visible on the image should be this headline: "${slide.headline}".`,
    `Apply these brand colors as fills, backgrounds and accents: ${v.color_palette.join(', ')}. NEVER write these hex codes as visible text on the image.`,
    `Background: ${v.background}.`,
    `Style: professional social media carousel slide for Instagram, 4:5 ratio.`,
    `IMPORTANT: Do not render the visual concept description as visible text. Do not display hex color codes or any technical metadata as text on the image.`,
  ].filter(Boolean).join(' ')
}

function buildStorySequenceFramePrompt(post: SchedulePost, frameIdx: number): string {
  const v = post.visual
  const frame = v?.slides?.[frameIdx]
  if (!frame || !v) return buildImagePrompt(post)
  return [
    `${frame.image_description}.`,
    `Visual concept for this frame (do NOT write this as text): ${frame.description}.`,
    `Instagram story frame ${frame.slide_number}, vertical 9:16 format.`,
    `The ONLY text visible on the image should be this headline: "${frame.headline}".`,
    `Apply these brand colors as fills, backgrounds and accents: ${v.color_palette.join(', ')}. NEVER write these hex codes as visible text on the image.`,
    `Background: ${v.background}.`,
    `Style: professional Instagram story, vertical 9:16 aspect ratio, full bleed design.`,
    `IMPORTANT: Do not render the visual concept description as visible text. Do not display hex color codes or any technical metadata as text on the image.`,
  ].filter(Boolean).join(' ')
}

function buildVideoPrompt(post: SchedulePost): string {
  const s = post.script
  if (!s) return `${post.theme}. ${post.caption ?? ''}`
  return [
    `Cinematic Instagram Reel in Brazilian Portuguese (pt-BR), 9:16 vertical, ${s.duration}.`,
    `ALL spoken dialogue and narration MUST be in Brazilian Portuguese with a natural Brazilian accent — NOT European Portuguese.`,
    `Theme: ${post.theme}.`,
    `Background: dramatic cinematic soundtrack with ambient sound effects matching the mood.`,
    `A confident Brazilian male voice narrates the opening hook: "${s.hook}"`,
    s.scenes.map((sc, i) => [
      `Scene ${i + 1} (${sc.time}):`,
      sc.visual,
      sc.narration ? `The narrator says in Brazilian Portuguese: "${sc.narration}"` : null,
    ].filter(Boolean).join(' ')).join(' '),
    s.cta ? `The narrator ends with the call to action: "${s.cta}"` : null,
    `Style: professional, high-production cinematic vertical video with smooth transitions and dramatic lighting.`,
    `IMPORTANT: Do NOT render any text, subtitles, captions, or written words on screen. The video must be purely visual with spoken audio only.`,
  ].filter(Boolean).join(' ')
}

// ── Scene video helpers ─────────────────────────────────────────────────────

function parseSceneDurationSeconds(time: string): number {
  const m = time.match(/(\d+)[^\d]+(\d+)/)
  if (!m) return 8
  return Math.max(1, parseInt(m[2]) - parseInt(m[1]))
}

function toVeoDuration(secs: number): 4 | 6 | 8 {
  if (secs <= 5) return 4
  if (secs <= 7) return 6
  return 8
}

function buildSceneVideoPrompt(post: SchedulePost, sceneIdx: number): string {
  const s = post.script
  if (!s) return `${post.theme}. Scene ${sceneIdx + 1}.`
  const scene = s.scenes[sceneIdx]
  if (!scene) return `${post.theme}.`

  const totalScenes = s.scenes.length
  const isFirst = sceneIdx === 0
  const isLast = sceneIdx === totalScenes - 1

  return [
    // Global language context — must come first
    `Cinematic Instagram Reel clip in Brazilian Portuguese (pt-BR), 9:16 vertical format.`,
    `ALL spoken audio MUST use Brazilian Portuguese with a natural Brazilian accent — NOT European Portuguese (pt-PT).`,

    // Theme and visual description
    `Theme: ${post.theme}.`,
    scene.visual,

    // Narration — written in Portuguese so the model uses the right language
    scene.narration
      ? `A confident Brazilian male voice narrates: "${scene.narration}"`
      : null,

    // Background audio
    isFirst
      ? `Background: dramatic cinematic music starting strong with ambient sound effects.`
      : `Background: continuing cinematic music with ambient sound effects matching the scene.`,

    // Hook for first scene
    isFirst
      ? `This is the opening scene — grab attention immediately. The narrator opens with: "${s.hook}"`
      : null,

    // CTA for last scene
    isLast && s.cta
      ? `The narrator ends with: "${s.cta}"`
      : null,

    // Style and critical constraints
    `Style: professional cinematic vertical video, smooth camera movement, dramatic lighting, high production quality.`,
    `CRITICAL: Do NOT render any text, subtitles, captions, watermarks, or written words on screen. The video must be purely visual with spoken narration only — no on-screen text of any kind.`,
  ].filter(Boolean).join(' ')
}

function PostDetailCard({ post, day, onClose, scheduleId, mediaEntry, persistedSceneUrls, onMediaSaved, onDeleted, onMediaGenerated, onRescheduled, onConfirmed, accountConnected }: {
  post: SchedulePost
  day: ScheduleDay
  onClose: () => void
  scheduleId?: string | null
  mediaEntry?: { imageUrl: string | null; videoUrl: string | null; postId: string; confirmed?: boolean; status?: string } | null
  persistedSceneUrls?: (string | null)[]
  onMediaSaved?: (key: string, imageUrl: string | null, videoUrl: string | null) => void
  onDeleted?: () => void
  onMediaGenerated?: (key: string, src: string, mimeType: string) => void
  onRescheduled?: (oldDate: string, newDate: string, postId: string, theme: string, newTime: string | null) => void
  onConfirmed?: (postId: string, confirmed: boolean) => void
  accountConnected?: boolean
}) {
  const type = safePostType(post.type)
  const Icon = TYPE_ICONS[type]
  const mediaKey = `${day.date}::${post.theme}`

  const isImageType = type === 'post' || type === 'carousel' || type === 'story' || type === 'story_sequence'
  const isReelType = type === 'reel'
  const isCarousel = type === 'carousel'
  const isStorySequence = type === 'story_sequence'
  const isMultiFrame = isCarousel || isStorySequence
  const carouselSlideCount = post.visual?.slides?.length ?? 0

  // Base64 state (just generated this session)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedImageMime, setGeneratedImageMime] = useState<string>('image/jpeg')
  // Carousel / story_sequence: one entry per slide (null = not yet generated)
  const [carouselSlideImages, setCarouselSlideImages] = useState<(string | null)[]>(
    () => Array(carouselSlideCount).fill(null)
  )
  const [carouselSlideGenerating, setCarouselSlideGenerating] = useState<boolean[]>(
    () => Array(carouselSlideCount).fill(false)
  )
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const [mediaGenerating, setMediaGenerating] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState<string | null>(null)
  const [imageProgress, setImageProgress] = useState(0)
  const [reelDuration, setReelDuration] = useState<4 | 6 | 8>(8)
  // Scene state
  const sceneCount = isReelType ? (post.script?.scenes?.length ?? 0) : 0
  const [sceneVideos, setSceneVideos] = useState<(string | null)[]>(() => Array(sceneCount).fill(null))
  const [sceneVideoGenerating, setSceneVideoGenerating] = useState<boolean[]>(() => Array(sceneCount).fill(false))
  const [sceneVideoProgress, setSceneVideoProgress] = useState<(string | null)[]>(() => Array(sceneCount).fill(null))
  const [generatingAllScenes, setGeneratingAllScenes] = useState(false)
  const [concatenating, setConcatenating] = useState(false)
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scheduleIdRef = useRef(scheduleId)
  scheduleIdRef.current = scheduleId
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(day.date)
  const [rescheduleTime, setRescheduleTime] = useState(post.time ?? '')
  const [rescheduleSaving, setRescheduleSaving] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)

  const [isConfirmed, setIsConfirmed] = useState(mediaEntry?.confirmed ?? false)
  const [confirmingSave, setConfirmingSave] = useState(false)
  const isPublished = mediaEntry?.status === 'published'
  const [publishingNow, setPublishingNow] = useState(false)
  const [publishedLocal, setPublishedLocal] = useState(false)
  const [publishNowError, setPublishNowError] = useState<string | null>(null)
  const isFullyPublished = isPublished || publishedLocal

  async function handlePublishNow() {
    const postId = mediaEntry?.postId
    if (!postId) return
    setPublishingNow(true)
    setPublishNowError(null)
    try {
      const res = await fetch(`/api/instagram/publish/${postId}`, { method: 'POST' })
      if (res.ok) {
        setPublishedLocal(true)
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setPublishNowError(data.error ?? 'Erro ao publicar')
      }
    } catch {
      setPublishNowError('Erro de rede')
    } finally {
      setPublishingNow(false)
    }
  }

  async function handleToggleConfirm() {
    const postId = mediaEntry?.postId
    if (!postId) return
    const newValue = !isConfirmed
    setConfirmingSave(true)
    try {
      const res = await fetch(`/api/schedule/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: newValue }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao confirmar agendamento')
      }
      setIsConfirmed(newValue)
      onConfirmed?.(postId, newValue)
    } catch {
      // revert silently
    } finally {
      setConfirmingSave(false)
    }
  }

  async function handleReschedule() {
    if (!rescheduleDate) return
    const postId = mediaEntry?.postId
    if (!postId) return
    setRescheduleSaving(true)
    setRescheduleError(null)
    try {
      const res = await fetch(`/api/schedule/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rescheduleDate, time: rescheduleTime || null }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao reagendar')
      }
      onRescheduled?.(day.date, rescheduleDate, postId, post.theme, rescheduleTime || null)
      setEditingSchedule(false)
      onClose()
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : 'Erro ao reagendar')
    } finally {
      setRescheduleSaving(false)
    }
  }

  async function handleDelete() {
    const postId = mediaEntry?.postId
    if (!postId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/schedule/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir')
      }
      onDeleted?.()
    } catch (err) {
      setDeleting(false)
      setConfirmDelete(false)
      console.error('[handleDelete]', err)
    }
  }

  async function handleGenerateAllSlides() {
    setGeneratingAll(true)
    setMediaError(null)
    for (let idx = 0; idx < carouselSlideCount; idx++) {
      await handleGenerateCarouselSlide(idx)
    }
    setGeneratingAll(false)
  }

  function downloadSlide(base64: string, index: number) {
    const slug = post.theme.slice(0, 30).replace(/\s+/g, '-')
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${base64}`
    a.download = `${slug}-slide-${index + 1}.png`
    a.click()
  }

  async function handleDownloadAllSlides() {
    const generated = carouselSlideImages.filter(Boolean)
    if (generated.length === 0) return

    if (generated.length === 1) {
      downloadSlide(generated[0]!, carouselSlideImages.indexOf(generated[0]))
      return
    }

    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const slug = post.theme.slice(0, 30).replace(/\s+/g, '-')

    carouselSlideImages.forEach((img, idx) => {
      if (!img) return
      zip.file(`${slug}-slide-${idx + 1}.png`, img, { base64: true })
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-carrossel.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Simula progresso enquanto gera imagem (API não emite streaming)
  useEffect(() => {
    if (!mediaGenerating || !isImageType) {
      if (!mediaGenerating && imageProgress > 0) setImageProgress(0)
      return
    }
    setImageProgress(0)
    const interval = setInterval(() => {
      setImageProgress(prev => {
        // Desacelera conforme se aproxima de 90%
        if (prev >= 90) return prev
        const step = prev < 30 ? 3 : prev < 60 ? 2 : 0.8
        return Math.min(prev + step, 90)
      })
    }, 300)
    return () => clearInterval(interval)
  }, [mediaGenerating, isImageType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-gera vídeo de reel se ainda não há vídeo (apenas reels sem cenas — cenas são geradas manualmente)
  useEffect(() => {
    if (isReelType && sceneCount > 0) return
    const hasVideo = !!generatedVideo || !!mediaEntry?.videoUrl
    if (isReelType && !hasVideo) {
      handleGenerateVideo()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const imageProgressLabel =
    imageProgress < 25 ? 'Interpretando prompt...' :
    imageProgress < 55 ? 'Compondo a imagem...' :
    imageProgress < 80 ? 'Refinando detalhes...' :
    'Finalizando...'

  const aspectRatioClass =
    type === 'story' || type === 'story_sequence' ? 'aspect-[9/16]' :
    type === 'carousel' ? 'aspect-[4/5]' :
    'aspect-square'

  // Resolved display: prefer fresh base64, fall back to persisted URL
  const displayImageSrc = generatedImage
    ? `data:${generatedImageMime};base64,${generatedImage}`
    : mediaEntry?.imageUrl ?? null
  const displayVideoSrc = generatedVideo
    ? `data:video/mp4;base64,${generatedVideo}`
    : mediaEntry?.videoUrl ?? null

  /** After generating media, upload to Storage and update schedule_posts record */
  async function uploadMediaToStorage(
    base64: string,
    mimeType: 'image/png' | 'image/jpeg' | 'video/mp4',
    slideIndex?: number,
    sceneIndex?: number,
  ) {
    const currentScheduleId = scheduleIdRef.current
    if (!currentScheduleId) {
      console.warn('[uploadMediaToStorage] scheduleId ausente — upload ignorado')
      return
    }

    try {
      // Use postId from mediaEntry if available, otherwise look it up
      let postId = mediaEntry?.postId
      if (!postId) {
        const lookupRes = await fetch(
          `/api/schedule/post-id?scheduleId=${encodeURIComponent(currentScheduleId)}&date=${encodeURIComponent(day.date)}&theme=${encodeURIComponent(post.theme)}`
        )
        if (!lookupRes.ok) return
        const data = await lookupRes.json() as { postId: string }
        postId = data.postId
      }
      if (!postId) return

      const body: Record<string, unknown> = {
        postId,
        mediaType: mimeType === 'video/mp4' ? 'video' : 'image',
        data: base64,
        mimeType,
      }
      if (slideIndex !== undefined) body.slideIndex = slideIndex
      if (sceneIndex !== undefined) body.sceneIndex = sceneIndex

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (uploadRes.ok) {
        const { url } = await uploadRes.json() as { url: string }
        if (onMediaSaved) {
          if (sceneIndex !== undefined) {
            onMediaSaved(`${mediaKey}::scene${sceneIndex}`, null, url)
          } else {
            const targetKey = slideIndex !== undefined ? `${mediaKey}::slide${slideIndex}` : mediaKey
            onMediaSaved(targetKey, mimeType !== 'video/mp4' ? url : null, mimeType === 'video/mp4' ? url : null)
            // Slide 0 also updates main key for thumbnail
            if (slideIndex === 0) onMediaSaved(mediaKey, url, null)
          }
        }
      } else {
        const errBody = await uploadRes.json().catch(() => ({}))
        console.error('[uploadMediaToStorage] HTTP', uploadRes.status, errBody)
      }
    } catch (err) {
      // Upload failure é silencioso na UI — imagem ainda visível pelo base64
      console.error('[uploadMediaToStorage] falha:', err)
    }
  }

  async function handleGenerateImage() {
    setMediaGenerating(true)
    setMediaError(null)
    setGeneratedImage(null)
    try {
      const res = await fetch('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildImagePrompt(post),
          aspectRatio: type === 'story' ? '9:16' : type === 'carousel' ? '4:5' : '1:1',
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao gerar imagem')
      const mime = (data.mimeType as string) || 'image/jpeg'
      setGeneratedImage(data.imageData)
      setGeneratedImageMime(mime)
      onMediaGenerated?.(mediaKey, data.imageData as string, mime)
      await uploadMediaToStorage(data.imageData as string, mime as 'image/png' | 'image/jpeg' | 'video/mp4')
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Erro ao gerar imagem')
    } finally {
      setMediaGenerating(false)
    }
  }

  async function handleGenerateCarouselSlide(slideIdx: number) {
    setCarouselSlideGenerating(prev => prev.map((v, i) => i === slideIdx ? true : v))
    setMediaError(null)
    try {
      const framePrompt = isStorySequence
        ? buildStorySequenceFramePrompt(post, slideIdx)
        : buildCarouselSlidePrompt(post, slideIdx)
      const frameAspect = isStorySequence ? '9:16' : '4:5'
      const res = await fetch('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: framePrompt,
          aspectRatio: frameAspect,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao gerar frame')
      setCarouselSlideImages(prev => prev.map((v, i) => i === slideIdx ? (data.imageData as string) : v))
      onMediaGenerated?.(`${mediaKey}::slide${slideIdx}`, data.imageData as string, 'image/png')
      if (slideIdx === 0) onMediaGenerated?.(mediaKey, data.imageData as string, 'image/png')
      await uploadMediaToStorage(data.imageData as string, 'image/png', slideIdx)
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Erro ao gerar slide')
    } finally {
      setCarouselSlideGenerating(prev => prev.map((v, i) => i === slideIdx ? false : v))
    }
  }

  async function handleGenerateVideo() {
    setMediaGenerating(true)
    setMediaError(null)
    setGeneratedVideo(null)
    setVideoProgress('Iniciando geração do vídeo...')

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/media/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildVideoPrompt(post), targetDuration: reelDuration }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error('Falha ao conectar ao servidor')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const evt = JSON.parse(line) as { type: string; message?: string; videoData?: string; mimeType?: string }
            if (evt.type === 'start' || evt.type === 'progress') {
              setVideoProgress(evt.message ?? null)
            } else if (evt.type === 'complete' && evt.videoData) {
              setGeneratedVideo(evt.videoData)
              setVideoProgress(null)
              onMediaGenerated?.(mediaKey, evt.videoData, 'video/mp4')
              uploadMediaToStorage(evt.videoData, 'video/mp4')
            } else if (evt.type === 'error') {
              throw new Error(evt.message ?? 'Erro ao gerar vídeo')
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMediaError(err instanceof Error ? err.message : 'Erro ao gerar vídeo')
      }
      setVideoProgress(null)
    } finally {
      setMediaGenerating(false)
    }
  }

  async function handleGenerateScene(sceneIdx: number) {
    setSceneVideoGenerating(prev => prev.map((v, i) => i === sceneIdx ? true : v))
    setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? 'Iniciando...' : v))
    setMediaError(null)

    const scene = post.script!.scenes[sceneIdx]
    const dur = toVeoDuration(parseSceneDurationSeconds(scene.time))

    try {
      const res = await fetch('/api/media/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildSceneVideoPrompt(post, sceneIdx),
          targetDuration: dur,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Falha ao conectar ao servidor')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const evt = JSON.parse(line) as { type: string; message?: string; videoData?: string }
            if (evt.type === 'start' || evt.type === 'progress') {
              setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? (evt.message ?? v) : v))
            } else if (evt.type === 'complete' && evt.videoData) {
              setSceneVideos(prev => prev.map((v, i) => i === sceneIdx ? evt.videoData! : v))
              setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? null : v))
              onMediaGenerated?.(`${mediaKey}::scene${sceneIdx}`, evt.videoData, 'video/mp4')
              await uploadMediaToStorage(evt.videoData, 'video/mp4', undefined, sceneIdx)
            } else if (evt.type === 'error') {
              throw new Error(evt.message ?? 'Erro ao gerar cena')
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMediaError(err instanceof Error ? err.message : 'Erro ao gerar cena')
      }
      setSceneVideoProgress(prev => prev.map((v, i) => i === sceneIdx ? null : v))
    } finally {
      setSceneVideoGenerating(prev => prev.map((v, i) => i === sceneIdx ? false : v))
    }
  }

  async function handleGenerateAllScenes() {
    setGeneratingAllScenes(true)
    setMediaError(null)
    for (let i = 0; i < sceneCount; i++) {
      await handleGenerateScene(i)
    }
    setGeneratingAllScenes(false)
  }

  async function handleConcatenate() {
    const postId = mediaEntry?.postId
    if (!postId) return

    // Resolve URLs for all scenes (persisted URLs only — base64 not supported server-side)
    const urls: (string | null)[] = Array.from({ length: sceneCount }, (_, i) =>
      persistedSceneUrls?.[i] ?? null
    )

    const missing = urls.filter(u => !u).length
    if (missing > 0) {
      setMediaError(`${missing} cena(s) ainda não salva(s). Gere e aguarde o upload de todas as cenas antes de concatenar.`)
      return
    }

    setConcatenating(true)
    setMediaError(null)
    try {
      const res = await fetch('/api/media/concat-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, sceneUrls: urls }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Erro ao concatenar')
      setFinalVideoUrl(data.url)
      onMediaSaved?.(mediaKey, null, data.url)
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Erro ao concatenar vídeos')
    } finally {
      setConcatenating(false)
    }
  }

  function handleDownload() {
    const slug = post.theme.slice(0, 40).replace(/\s+/g, '-')
    if (displayImageSrc) {
      const a = document.createElement('a')
      a.href = displayImageSrc
      a.download = `${slug}.png`
      a.click()
    } else if (displayVideoSrc) {
      const a = document.createElement('a')
      a.href = displayVideoSrc
      a.download = `${slug}.mp4`
      a.click()
    }
  }

  return (
    <Card className={`sticky top-6 overflow-hidden ${isFullyPublished ? 'ring-2 ring-green-500/40 border-green-500/50' : ''}`}>
      <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${isFullyPublished ? 'bg-green-50/50 dark:bg-green-950/20' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[type]}`}>
            <Icon className="size-3" />
            {TYPE_LABELS[type]}
          </span>
          {post.time && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />{post.time}
            </span>
          )}
          {isFullyPublished && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500 text-white font-medium">
              <CheckCircle2 className="size-3" />Publicado
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {mediaEntry?.postId && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-input transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[10px] text-destructive hover:text-destructive/80 px-2 py-1 rounded border border-destructive/40 bg-destructive/5 transition-colors flex items-center gap-1"
                >
                  {deleting ? <Loader2 className="size-2.5 animate-spin" /> : null}
                  Excluir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                title="Excluir post"
              >
                <Trash2 className="size-3.5" />
              </button>
            )
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <CardContent
        className="p-4 space-y-4 max-h-[70vh] overflow-y-auto"
        onWheel={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {editingSchedule ? 'Reagendar post' : day.day_label}
            </p>
            {mediaEntry?.postId && !editingSchedule && (
              <div className="flex items-center gap-2 flex-wrap">
                {!isFullyPublished && (
                  <>
                    <button
                      onClick={handleToggleConfirm}
                      disabled={confirmingSave}
                      className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
                        isConfirmed
                          ? 'text-emerald-600 hover:text-emerald-700'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                      title={isConfirmed ? 'Cancelar confirmação' : 'Confirmar agendamento'}
                    >
                      {confirmingSave
                        ? <Loader2 className="size-3 animate-spin" />
                        : isConfirmed
                          ? <CheckCircle2 className="size-3" />
                          : <Calendar className="size-3" />
                      }
                      {isConfirmed ? 'Confirmado' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => { setRescheduleDate(day.date); setRescheduleTime(post.time ?? ''); setEditingSchedule(true) }}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                      title="Reagendar"
                    >
                      <Pencil className="size-3" />
                      Reagendar
                    </button>
                  </>
                )}
                {accountConnected && !isFullyPublished && (
                  <button
                    onClick={handlePublishNow}
                    disabled={publishingNow}
                    className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    title="Publicar agora no Instagram"
                  >
                    {publishingNow ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    Publicar agora
                  </button>
                )}
              </div>
            )}
          </div>
          <h3 className="font-semibold text-sm leading-snug">{post.theme}</h3>
          {editingSchedule ? (
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-24 text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {rescheduleError && <p className="text-xs text-destructive">{rescheduleError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleReschedule}
                  disabled={rescheduleSaving || !rescheduleDate}
                  className="flex-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {rescheduleSaving ? <Loader2 className="size-3 animate-spin" /> : <Pencil className="size-3" />}
                  Salvar
                </button>
                <button
                  onClick={() => { setEditingSchedule(false); setRescheduleError(null) }}
                  disabled={rescheduleSaving}
                  className="text-xs text-muted-foreground border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {publishNowError && (
                <p className="text-[10px] text-destructive mt-1">{publishNowError}</p>
              )}
              {post.content_pillar && (
                <Badge variant="outline" className="text-[10px] h-4 mt-1.5">{post.content_pillar}</Badge>
              )}
              {post.seasonal_hook && (
                <Badge className="text-[10px] h-4 mt-1 ml-1 bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300">
                  🗓 {post.seasonal_hook}
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
              <Type className="size-3" /> Legenda
            </p>
            <p className="text-xs leading-relaxed whitespace-pre-wrap">{post.caption}</p>
          </div>
        )}

        {/* Visual briefing (post / carousel / story) */}
        {post.visual && (
          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
              <Palette className="size-3" /> Briefing Visual
            </p>

            {/* Color palette */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">Paleta de cores</p>
              <div className="flex gap-2 flex-wrap">
                {post.visual.color_palette.map((hex, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="size-8 rounded-lg border border-black/10 shadow-sm"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-[9px] font-mono text-muted-foreground">{hex}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Headline / subline */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground">Headline</p>
              <p className="text-sm font-bold">{post.visual.headline}</p>
              {post.visual.subline && (
                <>
                  <p className="text-[10px] text-muted-foreground mt-1">Subline</p>
                  <p className="text-xs text-muted-foreground">{post.visual.subline}</p>
                </>
              )}
            </div>

            {/* Fonts */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/30 rounded-lg p-2.5">
                <p className="text-[9px] text-muted-foreground mb-0.5">Fonte headline</p>
                <p className="text-xs font-medium">{post.visual.fonts.headline}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5">
                <p className="text-[9px] text-muted-foreground mb-0.5">Fonte body</p>
                <p className="text-xs font-medium">{post.visual.fonts.body}</p>
              </div>
            </div>

            {/* Image description */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Camera className="size-3" /> Descrição da imagem
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-2.5">
                {post.visual.image_description}
              </p>
            </div>

            {/* Background */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Fundo</p>
              <p className="text-xs bg-muted/30 rounded-lg p-2.5 font-mono">{post.visual.background}</p>
            </div>
          </div>
        )}

        {/* Reel script */}
        {post.script && (
          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
              <Clapperboard className="size-3" /> Roteiro do Reel · {post.script.duration}
            </p>

            {/* Hook */}
            <div className="bg-pink-50 dark:bg-pink-950/30 rounded-lg p-3 border border-pink-100 dark:border-pink-900">
              <p className="text-[10px] font-medium text-pink-600 dark:text-pink-400 mb-1">Hook (0-3s)</p>
              <p className="text-xs font-semibold italic">&ldquo;{post.script.hook}&rdquo;</p>
            </div>

            {/* Scenes */}
            <div className="space-y-2">
              {post.script.scenes.map((scene, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="shrink-0 text-center">
                    <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-0.5 w-6 text-center leading-tight">{scene.time}</p>
                  </div>
                  <div className="flex-1 bg-muted/30 rounded-lg p-2.5 space-y-1.5">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Visual</p>
                      <p className="text-xs">{scene.visual}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Narração</p>
                      <p className="text-xs text-muted-foreground">{scene.narration}</p>
                    </div>
                    {scene.text_overlay && (
                      <div className="bg-black/80 text-white rounded px-2 py-1 inline-block">
                        <p className="text-[9px] font-bold">{scene.text_overlay}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1">CTA final</p>
              <p className="text-xs font-medium">{post.script.cta}</p>
            </div>
          </div>
        )}

        {/* ── Carousel / Story Sequence: frames individuais ── */}
        {isMultiFrame && carouselSlideCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1 shrink-0">
                {isStorySequence
                  ? <><GalleryHorizontal className="size-3" /> Frames ({carouselSlideCount})</>
                  : <><Images className="size-3" /> Slides ({carouselSlideCount})</>
                }
              </p>
              <div className="flex items-center gap-1.5">
                {carouselSlideImages.some(Boolean) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleDownloadAllSlides}
                    title={carouselSlideImages.filter(Boolean).length === 1 ? 'Baixar imagem' : 'Baixar todas como ZIP'}
                  >
                    <FolderArchive className="size-3" />
                    {carouselSlideImages.filter(Boolean).length === 1 ? 'Baixar' : 'Baixar ZIP'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  disabled={generatingAll || carouselSlideGenerating.some(Boolean)}
                  onClick={handleGenerateAllSlides}
                >
                  {generatingAll ? (
                    <><Loader2 className="size-3 animate-spin" />{carouselSlideImages.filter(Boolean).length}/{carouselSlideCount}...</>
                  ) : (
                    <><Sparkles className="size-3" />Gerar todas</>
                  )}
                </Button>
              </div>
            </div>
            {post.visual?.slides?.map((slide, idx) => {
              const img = carouselSlideImages[idx]
              const generating = carouselSlideGenerating[idx]
              return (
                <div key={idx} className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                    <span className="text-xs font-medium">{isStorySequence ? 'Frame' : 'Slide'} {slide.slide_number}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{slide.headline}</span>
                  </div>
                  {generating && (
                    <div className={`${isStorySequence ? 'aspect-[9/16]' : 'aspect-[4/5]'} bg-muted/50 relative overflow-hidden`}>
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  {!generating && img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:image/png;base64,${img}`}
                      alt={`${isStorySequence ? 'Frame' : 'Slide'} ${slide.slide_number}`}
                      className="w-full object-cover"
                    />
                  )}
                  {!generating && !img && (
                    <div className={`${isStorySequence ? 'aspect-[9/16]' : 'aspect-[4/5]'} bg-muted/20 flex items-center justify-center`}>
                      <p className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed">{slide.image_description}</p>
                    </div>
                  )}
                  <div className="p-2 flex gap-1.5">
                    {img && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs shrink-0"
                        onClick={() => downloadSlide(img, idx)}
                        title="Baixar slide"
                      >
                        <Download className="size-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={img ? 'outline' : 'default'}
                      className="flex-1 gap-1.5 h-7 text-xs"
                      disabled={generating || generatingAll}
                      onClick={() => handleGenerateCarouselSlide(idx)}
                    >
                      {generating ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                      {generating ? 'Gerando...' : img ? 'Gerar novamente' : `Gerar ${isStorySequence ? 'frame' : 'imagem'}`}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Generated media preview (post / story) ── */}
        {!isMultiFrame && mediaGenerating && isImageType && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Gerando imagem
            </p>
            <div className={`w-full ${aspectRatioClass} rounded-xl border bg-muted/50 overflow-hidden relative`}>
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${imageProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center justify-between">
                <span>{imageProgressLabel}</span>
                <span className="tabular-nums">{Math.round(imageProgress)}%</span>
              </p>
            </div>
          </div>
        )}

        {!isMultiFrame && !mediaGenerating && displayImageSrc && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3" /> Imagem gerada
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageSrc}
              alt="Imagem gerada"
              className="w-full rounded-xl border shadow-sm object-cover"
            />
          </div>
        )}

        {/* ── Scene Viewer (reels com cenas) ── */}
        {isReelType && sceneCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1 shrink-0">
                <Clapperboard className="size-3" /> Cenas ({sceneCount})
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  disabled={generatingAllScenes || sceneVideoGenerating.some(Boolean)}
                  onClick={handleGenerateAllScenes}
                >
                  {generatingAllScenes ? (
                    <><Loader2 className="size-3 animate-spin" />{sceneVideos.filter(Boolean).length}/{sceneCount}...</>
                  ) : (
                    <><Sparkles className="size-3" />Gerar todas</>
                  )}
                </Button>
              </div>
            </div>

            {post.script?.scenes.map((scene, idx) => {
              const b64Video = sceneVideos[idx]
              const persistedUrl = persistedSceneUrls?.[idx] ?? null
              const videoSrc = b64Video ? `data:video/mp4;base64,${b64Video}` : persistedUrl
              const generating = sceneVideoGenerating[idx]
              const progress = sceneVideoProgress[idx]
              return (
                <div key={idx} className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                    <span className="text-xs font-medium">Cena {idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground">{scene.time}</span>
                  </div>
                  {generating && (
                    <div className="aspect-[9/16] bg-muted/50 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        {progress && <p className="text-[9px] text-muted-foreground text-center">{progress}</p>}
                      </div>
                    </div>
                  )}
                  {!generating && videoSrc && (
                    <video src={videoSrc} controls className="w-full" />
                  )}
                  {!generating && !videoSrc && (
                    <div className="aspect-[9/16] bg-muted/20 flex flex-col items-center justify-center gap-2 p-3">
                      <Clapperboard className="size-6 text-muted-foreground/40" />
                      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">{scene.visual}</p>
                    </div>
                  )}
                  <div className="p-2 flex gap-1.5">
                    {videoSrc && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs shrink-0"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = videoSrc
                          a.download = `${post.theme.slice(0, 30).replace(/\s+/g, '-')}-cena-${idx + 1}.mp4`
                          a.click()
                        }}
                      >
                        <Download className="size-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={videoSrc ? 'outline' : 'default'}
                      className="flex-1 gap-1.5 h-7 text-xs"
                      disabled={generating || generatingAllScenes}
                      onClick={() => handleGenerateScene(idx)}
                    >
                      {generating ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                      {generating ? 'Gerando...' : videoSrc ? 'Gerar novamente' : 'Gerar cena'}
                    </Button>
                  </div>
                </div>
              )
            })}

            {/* ── Concatenar cenas em vídeo final ── */}
            {(() => {
              const readyCount = Array.from({ length: sceneCount }, (_, i) => persistedSceneUrls?.[i] ?? null).filter(Boolean).length
              const hasFinal = !!finalVideoUrl || !!mediaEntry?.videoUrl
              if (readyCount < 2 && !hasFinal) return null
              const finalSrc = finalVideoUrl ?? mediaEntry?.videoUrl ?? null
              return (
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
                      <Film className="size-3" /> Vídeo final
                    </p>
                    <div className="flex items-center gap-1.5">
                      {finalSrc && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => {
                            const a = document.createElement('a')
                            a.href = finalSrc
                            a.download = `${post.theme.slice(0, 30).replace(/\s+/g, '-')}-final.mp4`
                            a.click()
                          }}
                        >
                          <Download className="size-3" /> Baixar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={finalSrc ? 'outline' : 'default'}
                        className="h-7 gap-1.5 text-xs"
                        disabled={concatenating || generatingAllScenes || sceneVideoGenerating.some(Boolean) || readyCount < 2}
                        onClick={handleConcatenate}
                        title={readyCount < 2 ? 'Salve pelo menos 2 cenas para concatenar' : undefined}
                      >
                        {concatenating ? (
                          <><Loader2 className="size-3 animate-spin" />Concatenando...</>
                        ) : (
                          <><Film className="size-3" />{finalSrc ? 'Gerar novamente' : `Juntar ${readyCount} cenas`}</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {finalSrc && (
                    <video src={finalSrc} controls className="w-full rounded-xl border shadow-sm" />
                  )}
                  {!finalSrc && readyCount >= 2 && (
                    <p className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                      {readyCount}/{sceneCount} cenas prontas. Clique em &ldquo;Juntar {readyCount} cenas&rdquo; para gerar o vídeo completo.
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Single video (reels sem cenas) ── */}
        {!(isReelType && sceneCount > 0) && displayVideoSrc && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3" /> Vídeo gerado
            </p>
            <video
              src={displayVideoSrc}
              controls
              className="w-full rounded-xl border shadow-sm"
            />
          </div>
        )}

        {!(isReelType && sceneCount > 0) && videoProgress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            <Loader2 className="size-3 animate-spin shrink-0" />
            <span>{videoProgress}</span>
          </div>
        )}

        {mediaError && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-900">
            {mediaError}
          </div>
        )}

        {/* ── Seletor de duração (somente reels sem cenas) ── */}
        {!isMultiFrame && !isImageType && !(isReelType && sceneCount > 0) && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground shrink-0">Duração:</span>
            <div className="flex gap-1">
              {([4, 6, 8] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setReelDuration(d)}
                  disabled={mediaGenerating}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    reelDuration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:border-primary/60 text-muted-foreground'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Action buttons (post / story / reel sem cenas — não multi-frame) ── */}
        {!isMultiFrame && !(isReelType && sceneCount > 0) && (
          <div className="flex gap-2 pt-1">
            {(displayImageSrc || displayVideoSrc) && (
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleDownload}>
                <Download className="size-3.5" />
                Baixar
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              disabled={mediaGenerating}
              onClick={isImageType ? handleGenerateImage : handleGenerateVideo}
            >
              {mediaGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {mediaGenerating
                ? isImageType ? 'Gerando imagem...' : 'Gerando vídeo...'
                : isImageType
                  ? displayImageSrc ? 'Gerar novamente' : 'Gerar imagem'
                  : displayVideoSrc ? 'Gerar novamente' : 'Gerar vídeo'
              }
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
