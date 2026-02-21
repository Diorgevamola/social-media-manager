'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Loader2, Copy, Check, RefreshCw, Hash, Lightbulb } from 'lucide-react'
import type { PostType } from '@/types/database'

const captionSchema = z.object({
  topic: z.string().min(3, 'Descreva o tema do post'),
  niche: z.string().min(2, 'Informe o nicho'),
  tone: z.string(),
  additionalContext: z.string().optional(),
})

type CaptionFormData = z.infer<typeof captionSchema>

interface AIGeneratorProps {
  postType: PostType
  onGenerated: (content: { caption: string; hashtags: string[] }) => void
}

interface CaptionResult {
  captions: string[]
  cta: string
}

interface HashtagResult {
  hashtags: string[]
  categories: {
    high: string[]
    medium: string[]
    niche: string[]
  }
}

interface IdeaResult {
  ideas: Array<{
    title: string
    description: string
    hook: string
  }>
}

const toneOptions = [
  { value: 'professional', label: 'Profissional' },
  { value: 'casual', label: 'Descontraido' },
  { value: 'inspirational', label: 'Motivacional' },
  { value: 'educational', label: 'Educativo' },
  { value: 'funny', label: 'Humoristico' },
]

const postTypeLabels: Record<string, string> = {
  post: 'post de imagem',
  carousel: 'carrossel',
  reel: 'reel',
}

export function AIGenerator({ postType, onGenerated }: AIGeneratorProps) {
  const [activeTab, setActiveTab] = useState('caption')
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null)
  const [hashtagResult, setHashtagResult] = useState<HashtagResult | null>(null)
  const [ideaResult, setIdeaResult] = useState<IdeaResult | null>(null)
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null)
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const [hashtagLoading, setHashtagLoading] = useState(false)
  const [ideaLoading, setIdeaLoading] = useState(false)
  const [hashtagTopic, setHashtagTopic] = useState('')
  const [hashtagNiche, setHashtagNiche] = useState('')
  const [ideaNiche, setIdeaNiche] = useState('')
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CaptionFormData>({
    resolver: zodResolver(captionSchema),
    defaultValues: { tone: 'professional' },
  })

  const watchedTone = watch('tone')

  async function onCaptionSubmit(data: CaptionFormData) {
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, postType }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Falha ao gerar captions')
      }

      const generated: CaptionResult = await res.json()
      setCaptionResult(generated)
      setSelectedCaption(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  async function handleGenerateHashtags() {
    if (!hashtagTopic || !hashtagNiche) return
    setHashtagLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: hashtagTopic, niche: hashtagNiche }),
      })
      if (!res.ok) throw new Error('Falha ao gerar hashtags')
      const data: HashtagResult = await res.json()
      setHashtagResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setHashtagLoading(false)
    }
  }

  async function handleGenerateIdeas() {
    if (!ideaNiche) return
    setIdeaLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: ideaNiche, postType }),
      })
      if (!res.ok) throw new Error('Falha ao gerar ideias')
      const data: IdeaResult = await res.json()
      setIdeaResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIdeaLoading(false)
    }
  }

  function handleUseCaption(caption: string) {
    setSelectedCaption(caption)
    const hashtags = hashtagResult?.hashtags ?? []
    onGenerated({ caption, hashtags })
  }

  function handleUseHashtags(hashtags: string[]) {
    const caption = selectedCaption ?? captionResult?.captions[0] ?? ''
    onGenerated({ caption, hashtags })
  }

  async function copyToClipboard(text: string, type: 'caption' | 'hashtags', index?: number) {
    await navigator.clipboard.writeText(text)
    if (type === 'caption' && index !== undefined) {
      setCopiedCaption(index)
      setTimeout(() => setCopiedCaption(null), 2000)
    } else {
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-purple-500" />
          Gerador de Conteudo com IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="caption" className="flex-1">Captions</TabsTrigger>
            <TabsTrigger value="hashtags" className="flex-1">Hashtags</TabsTrigger>
            <TabsTrigger value="ideas" className="flex-1">Ideias</TabsTrigger>
          </TabsList>

          {/* CAPTION TAB */}
          <TabsContent value="caption">
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <form onSubmit={handleSubmit(onCaptionSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Tema do {postTypeLabels[postType]}
                      <span className="text-destructive ml-0.5">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: dicas de produtividade para empreendedores"
                      {...register('topic')}
                      aria-invalid={!!errors.topic}
                    />
                    {errors.topic && (
                      <p className="text-destructive text-xs">{errors.topic.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Nicho / Segmento
                      <span className="text-destructive ml-0.5">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: empreendedorismo, fitness, moda..."
                      {...register('niche')}
                      aria-invalid={!!errors.niche}
                    />
                    {errors.niche && (
                      <p className="text-destructive text-xs">{errors.niche.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tom de voz</Label>
                    <Select value={watchedTone} onValueChange={(v) => setValue('tone', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {toneOptions.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Contexto adicional (opcional)</Label>
                    <Textarea
                      placeholder="Informacoes sobre seu produto, promocao, evento..."
                      rows={3}
                      {...register('additionalContext')}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Gerando com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Gerar Captions
                      </>
                    )}
                  </Button>
                </form>
              </div>

              <div className="space-y-3">
                {!captionResult ? (
                  <div className="border border-dashed rounded-lg flex items-center justify-center min-h-60">
                    <div className="text-center py-8 px-4">
                      <Sparkles className="size-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        Preencha o formulario e clique em &quot;Gerar Captions&quot; para a IA criar suas legendas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium">
                      {captionResult.captions.length} opcoes geradas
                    </p>
                    {captionResult.captions.map((caption, i) => (
                      <div
                        key={i}
                        className={`bg-muted/50 rounded-lg p-3 relative cursor-pointer transition-all ${
                          selectedCaption === caption ? 'ring-2 ring-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedCaption(caption)}
                      >
                        <p className="text-sm whitespace-pre-wrap pr-8">{caption}</p>
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(caption, 'caption', i)
                            }}
                          >
                            {copiedCaption === i ? <Check className="size-3" /> : <Copy className="size-3" />}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUseCaption(caption)
                          }}
                        >
                          Usar esta caption
                        </Button>
                      </div>
                    ))}
                    {captionResult.cta && (
                      <>
                        <Separator />
                        <div className="text-xs text-muted-foreground">
                          <strong>CTA sugerido:</strong> {captionResult.cta}
                        </div>
                      </>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleSubmit(onCaptionSubmit)()}
                      disabled={isSubmitting}
                    >
                      <RefreshCw className="size-4" />
                      Gerar novamente
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* HASHTAGS TAB */}
          <TabsContent value="hashtags" className="space-y-4">
            <div className="grid gap-3 max-w-md">
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input
                  placeholder="Ex: Marketing digital, receitas saudaveis"
                  value={hashtagTopic}
                  onChange={(e) => setHashtagTopic(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nicho</Label>
                <Input
                  placeholder="Ex: Empreendedorismo, Fitness"
                  value={hashtagNiche}
                  onChange={(e) => setHashtagNiche(e.target.value)}
                />
              </div>
              <Button
                onClick={handleGenerateHashtags}
                disabled={hashtagLoading || !hashtagTopic || !hashtagNiche}
                className="gap-2"
              >
                {hashtagLoading ? <Loader2 className="size-4 animate-spin" /> : <Hash className="size-4" />}
                Gerar Hashtags
              </Button>
            </div>

            {hashtagResult && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {hashtagResult.hashtags.length} hashtags geradas
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => copyToClipboard(hashtagResult.hashtags.join(' '), 'hashtags')}
                    >
                      {copiedHashtags ? <Check className="size-3" /> : <Copy className="size-3" />}
                      Copiar todas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleUseHashtags(hashtagResult.hashtags)}
                    >
                      Usar hashtags
                    </Button>
                  </div>
                </div>

                {(['high', 'medium', 'niche'] as const).map((cat) => (
                  <div key={cat}>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      {cat === 'high' ? 'Alto volume' : cat === 'medium' ? 'Medio volume' : 'Nicho'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {hashtagResult.categories[cat].map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* IDEAS TAB */}
          <TabsContent value="ideas" className="space-y-4">
            <div className="grid gap-3 max-w-md">
              <div className="space-y-1.5">
                <Label>Nicho</Label>
                <Input
                  placeholder="Ex: Tecnologia, Saude, Educacao"
                  value={ideaNiche}
                  onChange={(e) => setIdeaNiche(e.target.value)}
                />
              </div>
              <Button
                onClick={handleGenerateIdeas}
                disabled={ideaLoading || !ideaNiche}
                className="gap-2"
              >
                {ideaLoading ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
                Gerar Ideias
              </Button>
            </div>

            {ideaResult && (
              <div className="space-y-3 mt-4">
                {ideaResult.ideas.map((idea, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-3">
                    <h4 className="text-sm font-semibold">{idea.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{idea.description}</p>
                    <p className="text-xs mt-2">
                      <span className="font-medium">Hook:</span> {idea.hook}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
