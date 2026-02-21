'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Image, Film, Images, BookOpen, GalleryHorizontal, Sparkles, Loader2, RotateCcw,
} from 'lucide-react'
import type { PostType, SchedulePost } from '@/types/schedule'

const TYPE_CONFIG: {
  value: PostType
  label: string
  icon: typeof Image
  color: string
  bg: string
  border: string
}[] = [
  {
    value: 'post',
    label: 'Post',
    icon: Image,
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
  },
  {
    value: 'reel',
    label: 'Reel',
    icon: Film,
    color: 'text-pink-700 dark:text-pink-300',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-200 dark:border-pink-800',
  },
  {
    value: 'carousel',
    label: 'Carrossel',
    icon: Images,
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
  },
  {
    value: 'story',
    label: 'Story',
    icon: BookOpen,
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
  },
  {
    value: 'story_sequence',
    label: 'Seq. Stories',
    icon: GalleryHorizontal,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
]

const TYPE_BADGE_COLORS: Record<PostType, string> = {
  post: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  reel: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  carousel: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  story: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  story_sequence: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

function formatDatePT(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ]
    return `${day} de ${months[(month ?? 1) - 1]} de ${year}`
  } catch {
    return dateStr
  }
}

export interface AddPostDialogProps {
  open: boolean
  date: string
  scheduleId: string
  accountId: string
  onClose: () => void
  onSaved: (post: SchedulePost, postId: string) => void
}

export function AddPostDialog({
  open,
  date,
  scheduleId,
  accountId,
  onClose,
  onSaved,
}: AddPostDialogProps) {
  const [selectedType, setSelectedType] = useState<PostType | null>(null)
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<SchedulePost | null>(null)
  const [generatedPostId, setGeneratedPostId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (generating) return
    setSelectedType(null)
    setDescription('')
    setGenerating(false)
    setGeneratedPost(null)
    setGeneratedPostId(null)
    setError(null)
    onClose()
  }

  function handleReset() {
    setSelectedType(null)
    setDescription('')
    setGeneratedPost(null)
    setGeneratedPostId(null)
    setError(null)
  }

  async function handleGenerate() {
    if (!selectedType) return
    setGenerating(true)
    setError(null)
    setGeneratedPost(null)
    setGeneratedPostId(null)

    try {
      const res = await fetch('/api/schedule/add-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, date, postType: selectedType, accountId, description: description.trim() || undefined }),
      })
      const data = await res.json() as { post?: SchedulePost; postId?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao gerar post')
      setGeneratedPost(data.post!)
      setGeneratedPostId(data.postId!)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar post')
    } finally {
      setGenerating(false)
    }
  }

  function handleSave() {
    if (!generatedPost || !generatedPostId) return
    onSaved(generatedPost, generatedPostId)
    handleClose()
  }

  const formattedDate = formatDatePT(date)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Adicionar post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">

          {/* ── Etapa 1: Seleção de tipo ── */}
          {!generating && !generatedPost && (
            <>
              <p className="text-sm text-muted-foreground">
                Escolha o tipo de conteúdo para <span className="font-medium text-foreground">{formattedDate}</span>:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {TYPE_CONFIG.map(({ value, label, icon: Icon, color, bg, border }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedType(value)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                      ${selectedType === value
                        ? `${bg} ${border} ring-2 ring-offset-1 ring-primary/30`
                        : 'border-muted hover:border-muted-foreground/30 bg-muted/20'
                      }
                    `}
                  >
                    <Icon className={`size-6 ${selectedType === value ? color : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${selectedType === value ? color : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Descrição opcional */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Descreva o que você quer no post{' '}
                  <span className="font-normal">(opcional)</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Quero mostrar os bastidores do atendimento ao cliente, tom descontraído, mencionar a promoção de fevereiro..."
                  className="resize-none text-sm h-20"
                  maxLength={500}
                />
                {description.length > 0 && (
                  <p className="text-[10px] text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!selectedType}
                className="w-full ig-gradient text-white border-0 hover:opacity-90 gap-2"
              >
                <Sparkles className="size-4" />
                {description.trim() ? 'Gerar com sua descrição' : 'Gerar conteúdo'}
              </Button>
            </>
          )}

          {/* ── Etapa 2: Carregando ── */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Gerando conteúdo para {formattedDate}...</p>
              <p className="text-xs text-muted-foreground">A IA está criando o briefing completo</p>
            </div>
          )}

          {/* ── Etapa 3: Preview ── */}
          {!generating && generatedPost && (
            <>
              {/* Header do preview */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const type = generatedPost.type as PostType
                  const cfg = TYPE_CONFIG.find(c => c.value === type)
                  const Icon = cfg?.icon ?? Image
                  return (
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${TYPE_BADGE_COLORS[type] ?? ''}`}>
                      <Icon className="size-3" />
                      {cfg?.label ?? type}
                    </span>
                  )
                })()}
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
                {generatedPost.time && (
                  <span className="text-xs text-muted-foreground">· {generatedPost.time}</span>
                )}
              </div>

              {/* Tema */}
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Tema</p>
                <p className="text-sm font-semibold leading-snug">{generatedPost.theme}</p>
                {generatedPost.content_pillar && (
                  <Badge variant="outline" className="text-[10px] h-4 mt-2">{generatedPost.content_pillar}</Badge>
                )}
              </div>

              {/* Caption */}
              {generatedPost.caption && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Legenda</p>
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">
                    {generatedPost.caption.length > 200
                      ? generatedPost.caption.slice(0, 200) + '...'
                      : generatedPost.caption}
                  </p>
                </div>
              )}

              {/* Visual info (post/story/carousel) */}
              {generatedPost.visual && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Briefing visual</p>
                  <div className="flex items-center gap-2">
                    {generatedPost.visual.color_palette?.map((hex, i) => (
                      <div
                        key={i}
                        className="size-5 rounded border border-black/10 shadow-sm shrink-0"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium">{generatedPost.visual.headline}</p>
                  {generatedPost.visual.slides && (
                    <p className="text-[10px] text-muted-foreground">
                      {generatedPost.visual.slides.length} {generatedPost.type === 'story_sequence' ? 'frames' : 'slides'}
                    </p>
                  )}
                </div>
              )}

              {/* Script info (reel) */}
              {generatedPost.script && (
                <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900 rounded-lg p-3 space-y-1.5">
                  <p className="text-[10px] font-medium uppercase text-pink-600 dark:text-pink-400">
                    Roteiro · {generatedPost.script.duration}
                  </p>
                  <p className="text-xs font-semibold italic">&ldquo;{generatedPost.script.hook}&rdquo;</p>
                  <p className="text-[10px] text-muted-foreground">
                    {generatedPost.script.scenes.length} cenas
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                  <RotateCcw className="size-3.5" />
                  Gerar novamente
                </Button>
                <Button onClick={handleSave} className="flex-1 ig-gradient text-white border-0 hover:opacity-90 gap-2" size="sm">
                  <Sparkles className="size-3.5" />
                  Salvar post
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
