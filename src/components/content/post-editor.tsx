'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Loader2,
  Save,
  X,
  Hash,
  Instagram,
} from 'lucide-react'
import type { PostType } from '@/types/database'

const schema = z.object({
  profile_id: z.string().optional(),
  caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'planned']),
})

type FormData = z.infer<typeof schema>

interface Profile {
  id: string
  username: string
  display_name: string | null
  profile_picture_url: string | null
}

interface PostEditorProps {
  postType: PostType
  profiles: Profile[]
  initialCaption?: string
  initialHashtags?: string[]
}

const postTypeLabels: Record<PostType, string> = {
  post: 'Post',
  carousel: 'Carrossel',
  reel: 'Reel',
}

export function PostEditor({
  postType,
  profiles,
  initialCaption,
  initialHashtags,
}: PostEditorProps) {
  const [hashtags, setHashtags] = useState<string[]>(initialHashtags ?? [])
  const [hashtagInput, setHashtagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', caption: initialCaption },
  })

  useEffect(() => {
    if (initialCaption) setValue('caption', initialCaption)
    if (initialHashtags) setHashtags(initialHashtags)
  }, [initialCaption, initialHashtags, setValue])

  const caption = watch('caption') ?? ''
  const charCount = caption.length

  function addHashtag(tag: string) {
    const clean = tag.replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '_')
    if (clean && !hashtags.includes(clean) && hashtags.length < 30) {
      setHashtags([...hashtags, clean])
    }
    setHashtagInput('')
  }

  function removeHashtag(tag: string) {
    setHashtags(hashtags.filter((h) => h !== tag))
  }

  function handleHashtagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault()
      addHashtag(hashtagInput)
    }
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('content_posts') as any).insert({
      user_id: user!.id,
      profile_id: data.profile_id || null,
      post_type: postType,
      caption: data.caption || null,
      hashtags: hashtags.length > 0 ? hashtags : null,
      notes: data.notes || null,
      status: data.status,
    })

    if (!error) {
      setSaved(true)
      setTimeout(() => {
        router.push('/dashboard/calendar')
        router.refresh()
      }, 1000)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-3 gap-6">
      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Editar {postTypeLabels[postType]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile selector */}
            {profiles.length > 0 && (
              <div className="space-y-2">
                <Label>Perfil do Instagram</Label>
                <Select onValueChange={(v) => setValue('profile_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            <AvatarImage src={profile.profile_picture_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {profile.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          @{profile.username}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Legenda</Label>
                <span
                  className={`text-xs ${
                    charCount > 2000
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {charCount}/2200
                </span>
              </div>
              <Textarea
                placeholder="Escreva a legenda do seu post..."
                rows={8}
                {...register('caption')}
                aria-invalid={!!errors.caption}
              />
              {errors.caption && (
                <p className="text-destructive text-xs">{errors.caption.message}</p>
              )}
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Hash className="size-3.5" />
                  Hashtags
                </Label>
                <span className="text-xs text-muted-foreground">{hashtags.length}/30</span>
              </div>
              <Input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                placeholder="Digite e pressione Enter ou Espaço..."
              />
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-md min-h-10">
                  {hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas internas (não aparecem no post)</Label>
              <Textarea
                placeholder="Referências visuais, instruções para o designer..."
                rows={2}
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Preview card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              {/* IG Header */}
              <div className="flex items-center gap-2 p-3 border-b">
                <div className="size-7 ig-gradient rounded-full flex items-center justify-center">
                  <Instagram className="size-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium">sua_conta</p>
                  <p className="text-[10px] text-muted-foreground">Agora</p>
                </div>
              </div>

              {/* Media placeholder */}
              <div className="aspect-square bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">{postTypeLabels[postType]}</span>
              </div>

              {/* Caption preview */}
              <div className="p-3">
                <p className="text-xs line-clamp-3 whitespace-pre-wrap">
                  {caption || <span className="text-muted-foreground">Legenda aparecerá aqui...</span>}
                </p>
                {hashtags.length > 0 && (
                  <p className="text-xs text-info mt-1 line-clamp-2">
                    {hashtags.slice(0, 5).map((h) => `#${h}`).join(' ')}
                    {hashtags.length > 5 && ` +${hashtags.length - 5}`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save options */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue="draft"
                onValueChange={(v) => setValue('status', v as 'draft' | 'planned')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-warning inline-block" />
                      Rascunho
                    </div>
                  </SelectItem>
                  <SelectItem value="planned">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-success inline-block" />
                      Planejado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={saving || saved}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : saved ? (
                <>✓ Salvo!</>
              ) : (
                <>
                  <Save className="size-4" />
                  Salvar post
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
