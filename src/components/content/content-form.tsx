'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Calendar, X } from 'lucide-react'
import { ContentPreview } from '@/components/content/preview'
import { AIGenerator } from '@/components/content/ai-generator'
import type { PostType, PostStatus } from '@/types/database'

const schema = z.object({
  post_type: z.enum(['post', 'carousel', 'reel']),
  caption: z.string().optional(),
  notes: z.string().optional(),
  scheduled_at: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ContentFormProps {
  initialTab?: string
}

export function ContentForm({ initialTab }: ContentFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [showAI, setShowAI] = useState(initialTab === 'ai')

  const {
    register,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      post_type: 'post',
      caption: '',
      notes: '',
    },
  })

  const postType = watch('post_type') as PostType
  const caption = watch('caption')

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (tag && !hashtags.includes(`#${tag}`)) {
      setHashtags([...hashtags, `#${tag}`])
    }
    setHashtagInput('')
  }

  function removeHashtag(tag: string) {
    setHashtags(hashtags.filter((h) => h !== tag))
  }

  function handleAIGenerated(content: { caption: string; hashtags: string[] }) {
    if (content.caption) {
      setValue('caption', content.caption)
    }
    if (content.hashtags.length > 0) {
      const newTags = content.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`))
      setHashtags(newTags)
    }
    setShowAI(false)
  }

  async function savePost(status: PostStatus) {
    setSaving(true)
    setError(null)

    const data = watch()

    try {
      const res = await fetch('/api/content/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type: data.post_type,
          caption: data.caption || null,
          hashtags: hashtags.length > 0 ? hashtags : null,
          notes: data.notes || null,
          status,
          scheduled_at: data.scheduled_at || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Falha ao salvar post')
      }

      router.push('/dashboard/content')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Generator toggle */}
      <div className="flex gap-2">
        <Button
          variant={showAI ? 'default' : 'outline'}
          onClick={() => setShowAI(!showAI)}
          className="gap-2"
        >
          {showAI ? 'Fechar IA' : 'Gerar com IA'}
        </Button>
      </div>

      {/* AI Generator */}
      {showAI && (
        <AIGenerator postType={postType} onGenerated={handleAIGenerated} />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes do Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de post</Label>
                <Select
                  value={postType}
                  onValueChange={(v) => setValue('post_type', v as PostType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post (imagem unica)</SelectItem>
                    <SelectItem value="carousel">Carrossel</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Legenda</Label>
                <Textarea
                  id="caption"
                  placeholder="Escreva a legenda do seu post..."
                  rows={6}
                  {...register('caption')}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {caption?.length ?? 0} / 2.200 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label>Hashtags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar hashtag..."
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addHashtag()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addHashtag}>
                    Adicionar
                  </Button>
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                        {tag}
                        <button
                          onClick={() => removeHashtag(tag)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled">Agendar para (opcional)</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  {...register('scheduled_at')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas internas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Anotacoes para voce lembrar depois..."
                  rows={2}
                  {...register('notes')}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => savePost('draft')}
              variant="outline"
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar rascunho
            </Button>
            <Button
              onClick={() => savePost('planned')}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
              Salvar como planejado
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <ContentPreview
            postType={postType}
            caption={caption ?? ''}
            hashtags={hashtags}
          />
        </div>
      </div>
    </div>
  )
}
