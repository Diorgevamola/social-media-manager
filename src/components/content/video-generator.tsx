'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Loader2, Film, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const videoSchema = z.object({
  prompt: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  duration: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
})

type VideoFormData = z.infer<typeof videoSchema>

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void
}

export function VideoGenerator({ onVideoGenerated }: VideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      duration: 8,
    },
  })

  async function onSubmit(data: VideoFormData) {
    setIsGenerating(true)
    setError(null)
    setProgress(null)
    setGeneratedVideoUrl(null)

    try {
      const response = await fetch('/api/media/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.prompt,
          duration: data.duration,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Falha ao gerar vídeo')
      }

      // Handle server-sent events
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('Response body not readable')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                setProgress(data.message)
              } else if (data.type === 'complete') {
                setGeneratedVideoUrl(data.videoUrl)
                onVideoGenerated?.(data.videoUrl)
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="size-5" />
            Gerador de Vídeos com IA
          </CardTitle>
          <CardDescription>
            Crie vídeos profissionais com VEO 3.1 em alta qualidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Prompt */}
            <div className="space-y-2">
              <Label>
                Descrição do Vídeo
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                placeholder="Ex: Um influencer fazendo exercício na praia ao pôr do sol, com edição dinâmica..."
                rows={4}
                {...register('prompt')}
              />
              {errors.prompt && <p className="text-destructive text-xs">{errors.prompt.message}</p>}
            </div>

            {/* Duração do vídeo */}
            <div className="space-y-2">
              <Label>Duração (segundos)</Label>
              <Select defaultValue="8" onValueChange={(v) => setValue('duration', Number(v) as 4 | 6 | 8)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 segundos</SelectItem>
                  <SelectItem value="6">6 segundos</SelectItem>
                  <SelectItem value="8">8 segundos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Duração recomendada para Stories e Reels do Instagram
              </p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isGenerating}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Gerando vídeo... {progress && `(${progress})`}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Gerar Vídeo
                </>
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {generatedVideoUrl && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium">Vídeo gerado com sucesso!</p>
              <video controls className="w-full rounded-lg bg-black">
                <source src={generatedVideoUrl} type="video/mp4" />
                Seu navegador não suporta vídeo HTML5
              </video>
              <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full" size="sm">
                  Abrir em nova aba
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardContent className="pt-4">
          <p className="font-semibold mb-2">Sobre VEO 3.1</p>
          <ul className="text-muted-foreground text-xs space-y-1">
            <li>✓ Geração de vídeo de alta qualidade</li>
            <li>✓ Duração: 4, 6 ou 8 segundos</li>
            <li>✓ Resolução: 720p</li>
            <li>✓ Aspecto: 9:16 (ideal para Reels)</li>
            <li>✓ Custo: ~$0.15/minuto</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
