'use client'

import { useState, useEffect } from 'react'
import type { InstagramAccount } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sparkles, Loader2, CalendarDays, Image, Film, Images, BookOpen, GalleryHorizontal,
  Plus, X, CheckCircle2, Circle, PlusCircle, Clock, ChevronDown,
} from 'lucide-react'
import type { GeneratedSchedule, ScheduleDay, SchedulePost } from '@/types/schedule'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ScheduleCalendar } from '@/components/schedule/schedule-calendar'
import type { MediaMap } from '@/app/dashboard/schedule/page'

type PostType = 'post' | 'reel' | 'carousel' | 'story' | 'story_sequence'
type DayKey = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const POST_TYPES: { value: PostType; label: string; icon: typeof Image; color: string }[] = [
  { value: 'post', label: 'Post', icon: Image, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { value: 'reel', label: 'Reel', icon: Film, color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  { value: 'carousel', label: 'Carrossel', icon: Images, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  { value: 'story', label: 'Story', icon: BookOpen, color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  { value: 'story_sequence', label: 'Seq. Stories', icon: GalleryHorizontal, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
]

const TYPE_COLORS: Record<PostType, string> = {
  post: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  reel: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  carousel: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  story: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  story_sequence: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

const TYPE_ICONS: Record<PostType, typeof Image> = {
  post: Image,
  reel: Film,
  carousel: Images,
  story: BookOpen,
  story_sequence: GalleryHorizontal,
}

/** A single post slot within a day */
type PostSlot = {
  type: PostType
  timeMode: 'auto' | 'manual'
  time: string // 'HH:MM' or '' when auto
  slides: number // quantity of slides — only used when type === 'carousel'
}

type DayConfig = Record<DayKey, PostSlot[]>

function makeSlot(type: PostType): PostSlot {
  return { type, timeMode: 'auto', time: '', slides: 3 }
}

const DEFAULT_CONFIG: DayConfig = {
  segunda: [makeSlot('reel')],
  terca: [makeSlot('carousel')],
  quarta: [makeSlot('post')],
  quinta: [makeSlot('reel')],
  sexta: [makeSlot('carousel')],
  sabado: [],
  domingo: [],
}

interface StreamProgress {
  totalDays: number
  completedDays: ScheduleDay[]
}

interface ScheduleConfiguratorProps {
  accounts: InstagramAccount[]
  initialAccountId?: string | null
  initialSchedule?: GeneratedSchedule | null
  initialScheduleId?: string | null
  initialMediaMap?: MediaMap
}

export function ScheduleConfigurator({
  accounts,
  initialAccountId = null,
  initialSchedule = null,
  initialScheduleId = null,
  initialMediaMap = {},
}: ScheduleConfiguratorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // Inicializa com a conta cujo cronograma foi carregado no SSR
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccountId ?? accounts[0]?.id ?? ''
  )
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [period, setPeriod] = useState<'7' | '15' | '30'>('30')
  const [dayConfig, setDayConfig] = useState<DayConfig>(DEFAULT_CONFIG)
  const [generating, setGenerating] = useState(false)
  const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(null)
  const [result, setResult] = useState<GeneratedSchedule | null>(initialSchedule)
  const [savedScheduleId, setSavedScheduleId] = useState<string | null>(initialScheduleId)
  const [mediaMap, setMediaMap] = useState<MediaMap>(initialMediaMap)
  const [error, setError] = useState<string | null>(null)

  // Auto-close dialog when generation finishes
  useEffect(() => {
    if (result && !generating) {
      const timer = setTimeout(() => setDialogOpen(false), 600)
      return () => clearTimeout(timer)
    }
  }, [result, generating])

  function addSlot(day: DayKey, type: PostType) {
    setDayConfig(prev => ({ ...prev, [day]: [...prev[day], makeSlot(type)] }))
  }

  function removeSlot(day: DayKey, index: number) {
    setDayConfig(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  function toggleSlotTimeMode(day: DayKey, index: number) {
    setDayConfig(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index
          ? { ...slot, timeMode: slot.timeMode === 'auto' ? 'manual' : 'auto', time: slot.timeMode === 'auto' ? '09:00' : '' }
          : slot
      ),
    }))
  }

  function updateSlotTime(day: DayKey, index: number, time: string) {
    setDayConfig(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) => i === index ? { ...slot, time } : slot),
    }))
  }

  function updateSlotSlides(day: DayKey, index: number, slides: number) {
    setDayConfig(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) => i === index ? { ...slot, slides } : slot),
    }))
  }

  const totalPostsPerWeek = Object.values(dayConfig).reduce((sum, slots) => sum + slots.length, 0)

  async function handleGenerate() {
    if (!selectedAccountId) return
    setGenerating(true)
    setError(null)
    setResult(null)
    setStreamProgress(null)

    let accDays: ScheduleDay[] = []
    let totalDays = 0

    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, period, dayConfig }),
        // dayConfig now has PostSlot[] per day — API handles timeMode/time
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao gerar')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream não disponível')

      const decoder = new TextDecoder()
      let lineBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'start') {
              totalDays = event.totalDays
              setStreamProgress({ totalDays, completedDays: [] })
            } else if (event.type === 'day') {
              accDays = [...accDays, event.day]
              setStreamProgress({ totalDays, completedDays: accDays })
            } else if (event.type === 'complete') {
              const finalSchedule: GeneratedSchedule = {
                schedule: accDays,
                account: event.account,
                period: event.period,
                generated_at: event.generated_at,
              }
              setResult(finalSchedule)
              setStreamProgress(null)

              // Auto-save to database
              fetch('/api/schedule/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accountId: selectedAccountId,
                  period: event.period,
                  generated_at: event.generated_at,
                  schedule: accDays,
                }),
              })
                .then(r => r.json())
                .then((saved: { scheduleId?: string }) => {
                  if (saved.scheduleId) {
                    setSavedScheduleId(saved.scheduleId)
                    // Reset media map for new schedule
                    setMediaMap({})
                  }
                })
                .catch((err) => {
                  console.error('[schedule/save] falha ao salvar cronograma:', err)
                })
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setGenerating(false)
    }
  }

  function handlePostAdded(date: string, post: SchedulePost, postId: string) {
    setResult(prev => {
      if (!prev) return prev
      const exists = prev.schedule.find(d => d.date === date)
      if (exists) {
        return {
          ...prev,
          schedule: prev.schedule.map(d =>
            d.date === date ? { ...d, posts: [...d.posts, post] } : d
          ),
        }
      } else {
        const newDay: ScheduleDay = {
          date,
          day_label: format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR }),
          posts: [post],
        }
        return {
          ...prev,
          schedule: [...prev.schedule, newDay].sort((a, b) => a.date.localeCompare(b.date)),
        }
      }
    })
    const key = `${date}::${post.theme}`
    setMediaMap(prev => ({
      ...prev,
      [key]: { imageUrl: null, videoUrl: null, postId },
    }))
  }

  function handlePostDeleted(date: string, postId: string, theme: string) {
    setResult(prev => {
      if (!prev) return prev
      return {
        ...prev,
        schedule: prev.schedule
          .map(d =>
            d.date === date
              ? { ...d, posts: d.posts.filter(p => p.theme !== theme) }
              : d
          )
          .filter(d => d.posts.length > 0),
      }
    })
    const key = `${date}::${theme}`
    setMediaMap(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function handlePostRescheduled(oldDate: string, newDate: string, postId: string, theme: string, newTime: string | null) {
    setResult(prev => {
      if (!prev) return prev
      // Find the post in oldDate
      const sourceDay = prev.schedule.find(d => d.date === oldDate)
      const movedPost = sourceDay?.posts.find(p => p.theme === theme)
      if (!movedPost) return prev
      // Build updated post with new time
      const updatedPost: SchedulePost = { ...movedPost, time: newTime ?? movedPost.time }
      return {
        ...prev,
        schedule: prev.schedule
          .map(d => {
            if (d.date === oldDate) {
              return { ...d, posts: d.posts.filter(p => p.theme !== theme) }
            }
            if (d.date === newDate) {
              return { ...d, posts: [...d.posts, updatedPost] }
            }
            return d
          })
          .filter(d => d.posts.length > 0),
      }
    })
    // Move mediaMap entries to new key
    const oldKey = `${oldDate}::${theme}`
    const newKey = `${newDate}::${theme}`
    setMediaMap(prev => {
      const next = { ...prev }
      if (next[oldKey]) {
        next[newKey] = next[oldKey]
        delete next[oldKey]
      }
      // Also move slide/scene keys
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${oldKey}::`)) {
          const suffix = k.slice(oldKey.length)
          next[`${newKey}${suffix}`] = next[k]
          delete next[k]
        }
      })
      return next
    })
  }

  function handlePostConfirmed(postId: string, confirmed: boolean) {
    setMediaMap(prev => {
      const next = { ...prev }
      // Find the key for this postId and update confirmed
      for (const key of Object.keys(next)) {
        if (next[key].postId === postId) {
          next[key] = { ...next[key], confirmed }
        }
      }
      return next
    })
  }

  async function handleAccountSwitch(accountId: string) {
    if (accountId === selectedAccountId || loadingAccount) return
    setSelectedAccountId(accountId)
    setLoadingAccount(true)
    setError(null)

    try {
      const res = await fetch(`/api/schedule/latest?accountId=${accountId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar cronograma')
      setResult(data.schedule ?? null)
      setSavedScheduleId(data.scheduleId ?? null)
      setMediaMap(data.mediaMap ?? {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cronograma')
    } finally {
      setLoadingAccount(false)
    }
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)
  const progressPercent = streamProgress && streamProgress.totalDays > 0
    ? Math.round((streamProgress.completedDays.length / streamProgress.totalDays) * 100)
    : 0

  return (
    <>
      {/* ── Main page ──────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cronograma</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Visualize e gerencie seu cronograma de conteúdo.
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="ig-gradient text-white border-0 hover:opacity-90 gap-2"
          >
            <PlusCircle className="size-4" />
            Criar cronograma
          </Button>
        </div>

        {/* Account selector bar */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Conta:</span>
            {accounts.map(account => {
              const isActive = selectedAccountId === account.id
              const palette = account.color_palette?.filter(Boolean) ?? []
              return (
                <button
                  key={account.id}
                  onClick={() => handleAccountSwitch(account.id)}
                  disabled={loadingAccount || generating}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-muted hover:border-primary/40 text-muted-foreground bg-muted/30'
                  }`}
                >
                  <Avatar className="size-5 shrink-0">
                    <AvatarFallback className="text-[10px] font-bold">
                      {account.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>@{account.username}</span>
                  {palette.length > 0 && (
                    <span className="flex gap-0.5 ml-0.5">
                      {palette.slice(0, 3).map((c, i) => (
                        <span
                          key={i}
                          className="size-2.5 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                  )}
                  {isActive && <ChevronDown className="size-3 shrink-0" />}
                </button>
              )
            })}
            {loadingAccount && <Loader2 className="size-4 animate-spin text-muted-foreground ml-1" />}
          </div>
        )}

        {/* Calendar or empty state */}
        {result ? (
          <ScheduleCalendar
            schedule={result}
            onRegenerate={() => setDialogOpen(true)}
            regenerating={generating}
            scheduleId={savedScheduleId}
            accountId={selectedAccountId || null}
            accountConnected={Boolean(selectedAccount?.ig_user_id)}
            mediaMap={mediaMap}
            onMediaSaved={(key, imageUrl, videoUrl) =>
              setMediaMap(prev => ({
                ...prev,
                [key]: { ...prev[key], imageUrl: imageUrl ?? prev[key]?.imageUrl ?? null, videoUrl: videoUrl ?? prev[key]?.videoUrl ?? null, postId: prev[key]?.postId ?? '' },
              }))
            }
            onPostAdded={handlePostAdded}
            onPostDeleted={handlePostDeleted}
            onPostRescheduled={handlePostRescheduled}
            onPostConfirmed={handlePostConfirmed}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
              <CalendarDays className="size-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum cronograma gerado</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Configure o período, os dias e os tipos de post. A IA cria briefings visuais e roteiros completos.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <PlusCircle className="size-4" />
              Criar primeiro cronograma
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialog with form ───────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          // Prevent closing while generating
          if (generating) return
          setDialogOpen(open)
          if (!open) setError(null)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              {generating ? 'Gerando cronograma...' : 'Criar cronograma'}
            </DialogTitle>
          </DialogHeader>

          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium mb-1">Nenhuma conta cadastrada</p>
              <p className="text-xs text-muted-foreground">
                Adicione uma conta do Instagram antes de gerar o cronograma.
              </p>
            </div>
          ) : (
            <div className="space-y-5 pt-1">

              {/* ── Progress (shown during generation) ─────────────────── */}
              {generating && streamProgress && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        Gerando {streamProgress.completedDays.length} de {streamProgress.totalDays} dias
                      </span>
                      <span className="text-primary font-semibold">{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {streamProgress.completedDays.map(day => (
                        <div key={day.date} className="flex items-start gap-2 py-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
                          <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{day.day_label}</p>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {day.posts.map((post, i) => {
                                const type = (post.type as PostType) in TYPE_ICONS ? post.type as PostType : 'post'
                                const Icon = TYPE_ICONS[type]
                                return (
                                  <span key={i} className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>
                                    <Icon className="size-2.5" />
                                    {post.theme?.slice(0, 25)}{(post.theme?.length ?? 0) > 25 ? '…' : ''}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                      {Array.from({
                        length: Math.max(0, streamProgress.totalDays - streamProgress.completedDays.length)
                      }).map((_, i) => (
                        <div key={`p-${i}`} className="flex items-center gap-2 py-1 opacity-40">
                          {i === 0
                            ? <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                            : <Circle className="size-4 text-muted-foreground shrink-0" />}
                          <span className="text-xs text-muted-foreground">{i === 0 ? 'Gerando...' : 'Aguardando'}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Form (hidden during generation) ────────────────────── */}
              {!generating && (
                <div className="grid sm:grid-cols-[1fr_220px] gap-5 items-start">

                  {/* Left — account + period + days */}
                  <div className="space-y-4">

                    {/* Account */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conta</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        {accounts.map(account => (
                          <button
                            key={account.id}
                            onClick={() => setSelectedAccountId(account.id)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-2 transition-colors text-left ${
                              selectedAccountId === account.id
                                ? 'border-primary bg-primary/5'
                                : 'border-transparent hover:border-muted bg-muted/30'
                            }`}
                          >
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className="text-xs font-bold">
                                {account.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">@{account.username}</p>
                              {account.niche && <p className="text-xs text-muted-foreground truncate">{account.niche}</p>}
                            </div>
                            {selectedAccountId === account.id && (
                              <div className="ml-auto size-2 rounded-full bg-primary shrink-0" />
                            )}
                          </button>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Period */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Período</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="grid grid-cols-3 gap-2">
                          {(['7', '15', '30'] as const).map(p => (
                            <button
                              key={p}
                              onClick={() => setPeriod(p)}
                              className={`py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                                period === p
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted hover:border-primary/50 text-muted-foreground'
                              }`}
                            >
                              {p === '30' ? '1 mês' : `${p} dias`}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Day config */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Posts por dia da semana</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        {DAYS.map(day => (
                          <div key={day.key} className="space-y-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{day.label}</span>
                            <div className="flex flex-wrap gap-2">
                              {dayConfig[day.key].map((slot, idx) => {
                                const Icon = TYPE_ICONS[slot.type]
                                const label = POST_TYPES.find(t => t.value === slot.type)?.label ?? slot.type
                                return (
                                  <div key={idx} className="flex flex-col rounded-lg border overflow-hidden text-xs min-w-[76px] shadow-sm">
                                    {/* Type header */}
                                    <div className={`flex items-center justify-between gap-1.5 px-2 py-1 ${TYPE_COLORS[slot.type]}`}>
                                      <span className="flex items-center gap-1 font-medium">
                                        <Icon className="size-3" />
                                        {label}
                                      </span>
                                      <button
                                        onClick={() => removeSlot(day.key, idx)}
                                        className="hover:opacity-70 transition-opacity"
                                        aria-label="Remover"
                                      >
                                        <X className="size-2.5" />
                                      </button>
                                    </div>
                                    {/* Time selector */}
                                    <div className="px-2 py-1.5 bg-background">
                                      {slot.timeMode === 'auto' ? (
                                        <button
                                          onClick={() => toggleSlotTimeMode(day.key, idx)}
                                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full"
                                          title="Clique para definir horário manual"
                                        >
                                          <Sparkles className="size-2.5 shrink-0" />
                                          <span>IA otimiza</span>
                                        </button>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <Clock className="size-2.5 text-muted-foreground shrink-0" />
                                          <input
                                            type="time"
                                            value={slot.time}
                                            onChange={e => updateSlotTime(day.key, idx, e.target.value)}
                                            className="text-[10px] bg-transparent border-none outline-none w-[50px] font-mono text-foreground"
                                          />
                                          <button
                                            onClick={() => toggleSlotTimeMode(day.key, idx)}
                                            className="text-muted-foreground hover:text-foreground transition-colors ml-auto"
                                            title="Voltar para IA"
                                          >
                                            <Sparkles className="size-2.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {/* Slides selector (carousel or story_sequence) */}
                                    {(slot.type === 'carousel' || slot.type === 'story_sequence') && (
                                      <div className="px-2 pb-1.5 bg-background border-t border-border/40">
                                        <p className="text-[9px] text-muted-foreground mt-1 mb-1">
                                          {slot.type === 'story_sequence' ? 'Frames' : 'Slides'}
                                        </p>
                                        <div className="flex gap-0.5">
                                          {[3, 5, 7, 10].map(n => (
                                            <button
                                              key={n}
                                              onClick={() => updateSlotSlides(day.key, idx, n)}
                                              className={`flex-1 text-[9px] rounded py-0.5 font-medium transition-colors ${
                                                slot.slides === n
                                                  ? slot.type === 'story_sequence'
                                                    ? 'bg-amber-600 text-white'
                                                    : 'bg-purple-600 text-white'
                                                  : 'text-muted-foreground hover:text-foreground bg-muted/60'
                                              }`}
                                            >
                                              {n}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Add slot button */}
                              {dayConfig[day.key].length < 4 && (
                                <Select onValueChange={(v) => addSlot(day.key, v as PostType)}>
                                  <SelectTrigger className="h-[58px] w-[58px] p-0 border-dashed rounded-lg border-muted-foreground/30 hover:border-primary/60 [&>svg]:hidden flex flex-col items-center justify-center gap-1">
                                    <Plus className="size-3.5 text-muted-foreground" />
                                    <span className="text-[9px] text-muted-foreground">Add</span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {POST_TYPES.map(t => (
                                      <SelectItem key={t.value} value={t.value}>
                                        <span className="flex items-center gap-2">
                                          <t.icon className="size-3.5" />
                                          {t.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {/* Empty day placeholder */}
                              {dayConfig[day.key].length === 0 && (
                                <p className="text-[10px] text-muted-foreground/50 italic self-center">Sem posts</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right — summary + generate */}
                  <div className="space-y-3 sm:sticky sm:top-0">
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumo</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2.5 text-sm">
                        {selectedAccount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Conta</span>
                            <span className="font-medium text-xs">@{selectedAccount.username}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Período</span>
                          <span className="font-medium text-xs">{period === '30' ? '1 mês' : `${period} dias`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Posts/sem</span>
                          <span className="font-medium text-xs">{totalPostsPerWeek}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground text-xs">Total estimado</span>
                          <span className="font-semibold text-xs text-primary">
                            ~{Math.round(totalPostsPerWeek * parseInt(period) / 7)} posts
                          </span>
                        </div>
                        <div className="border-t pt-2 space-y-1.5">
                          {POST_TYPES.map(t => {
                            const count = Object.values(dayConfig).flat().filter(s => s.type === t.value).length
                            if (count === 0) return null
                            const Icon = t.icon
                            return (
                              <div key={t.value} className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                  <Icon className="size-3" />{t.label}
                                </span>
                                <Badge variant="secondary" className="text-[10px] h-4">{count}x/sem</Badge>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {error && (
                      <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
                    )}

                    <Button
                      onClick={handleGenerate}
                      disabled={!selectedAccountId || totalPostsPerWeek === 0}
                      className="w-full ig-gradient text-white border-0 hover:opacity-90"
                    >
                      <Sparkles className="size-4" />
                      Gerar com IA
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
