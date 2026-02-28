'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  model: z.enum(['veo-3.1', 'seedance-1', 'seedance-2.0']),
  imageUrl: z.string().url().optional().or(z.literal('')),
  aspectRatio: z.enum(['16:9', '9:16', '4:3', '3:4', '1:1', '21:9']).default('9:16'),
  resolution: z.enum(['480p', '720p', '1080p', '2K']).default('1080p'),
  duration: z.coerce.number().int().min(4).max(15).default(5),
  audio: z.boolean().default(true),
})

type VideoFormData = z.infer<typeof videoSchema>

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void
}

const modelInfo: Record<string, { label: string; description: string; endpoint: string; costPerMin: string }> = {
  'veo-3.1': {
    label: 'VEO 3.1 Fast',
    description: 'Geração rápida, qualidade excelente',
    endpoint: '/api/media/generate-video',
    costPerMin: '~$0.15/min',
  },
  'seedance-1': {
    label: 'Seedance 1.0 Pro',
    description: 'Compatível agora, imagem-para-vídeo',
    endpoint: '/api/media/generate-video-seedance',
    costPerMin: '~$0.10/min',
  },
  'seedance-2.0': {
    label: 'Seedance 2.0 ⭐ NOVO',
    description: 'Última geração, melhor qualidade e controle',
    endpoint: '/api/media/generate-video-seedance-2',
    costPerMin: '~$0.05/min',
  },
}

export function VideoGenerator({ onVideoGenerated }: VideoGeneratorProps) {
  const [selectedModel, setSelectedModel] = useState<'veo-3.1' | 'seedance-1' | 'seedance-2.0'>('seedance-2.0')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      model: 'seedance-2.0',
      aspectRatio: '9:16',
      resolution: '1080p',
      duration: 5,
      audio: true,
    },
  })

  const watchedDuration = watch('duration')
  const watchedModel = watch('model')

  async function onSubmit(data: VideoFormData) {
    setIsGenerating(true)
    setError(null)
    setProgress(null)
    setGeneratedVideoUrl(null)

    try {
      const modelInfo = {
        'veo-3.1': '/api/media/generate-video',
        'seedance-1': '/api/media/generate-video-seedance',
        'seedance-2.0': '/api/media/generate-video-seedance-2',
      }

      const endpoint = modelInfo[data.model]

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.prompt,
          image_url: data.imageUrl || undefined,
          aspect_ratio: data.aspectRatio,
          resolution: data.resolution,
          duration: data.duration,
          audio: data.audio,
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
            } catch (e) {
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
            Escolha entre VEO 3.1, Seedance 1.0 ou Seedance 2.0 (nova!)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-3">
            <Label>Modelo de Geração</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(modelInfo).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedModel(key as any)
                    setValue('model', key as any)
                  }}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedModel === key
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold text-sm">{info.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">Custo: {info.costPerMin}</p>
                </button>
              ))}
            </div>
          </div>

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

            {/* Image URL (for image-to-video) */}
            {selectedModel !== 'veo-3.1' && (
              <div className="space-y-2">
                <Label>URL da Imagem (opcional)</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  {...register('imageUrl')}
                />
                <p className="text-xs text-muted-foreground">
                  Para {selectedModel === 'seedance-1' ? 'Seedance 1.0' : 'Seedance 2.0'}, você pode fornecer uma imagem de referência
                </p>
              </div>
            )}

            {/* Video Settings Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Aspecto</Label>
                <Select defaultValue="9:16" onValueChange={(v) => setValue('aspectRatio', v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="9:16">9:16</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="3:4">3:4</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="21:9">21:9</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resolução</Label>
                <Select defaultValue="1080p" onValueChange={(v) => setValue('resolution', v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    {selectedModel === 'seedance-2.0' && <SelectItem value="2K">2K</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duração (s)</Label>
                <Input
                  type="number"
                  min={selectedModel === 'seedance-1' ? 2 : 4}
                  max={selectedModel === 'seedance-1' ? 12 : 15}
                  {...register('duration', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>Áudio</Label>
                <Select defaultValue="true" onValueChange={(v) => setValue('audio', v === 'true')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <Card>
          <CardContent className="pt-4">
            <p className="font-semibold mb-2">VEO 3.1</p>
            <p className="text-muted-foreground text-xs">
              Rápido, excelente qualidade. Duração: 4-8s. Custo: ~$0.15/min
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="font-semibold mb-2">Seedance 1.0</p>
            <p className="text-muted-foreground text-xs">
              Imagem-para-vídeo. Duração: 2-12s. Custo: ~$0.10/min
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="font-semibold mb-2">Seedance 2.0</p>
            <p className="text-muted-foreground text-xs">
              Última geração! Até 2K, 4-15s, melhor qualidade. Custo: ~$0.05/min
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
