/**
 * LaoZhang API Client — Seedance 2.0 Video Generation
 *
 * Agregador OpenAI-compatible com suporte a Seedance 2.0
 * Documentação: https://docs.laozhang.ai
 * Preço: ~$0.05 por vídeo de 5s em 720p
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type AspectRatio = '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9'
export type Resolution = '480p' | '720p' | '1080p' | '2K'
export type VideoModel = 'seedance-2.0'

export interface SeedanceGenerationRequest {
  prompt: string
  aspect_ratio?: AspectRatio
  resolution?: Resolution
  duration?: number // 4-15 segundos
  image_url?: string // Para image-to-video
  audio?: boolean // Gerar áudio nativo
}

export interface SeedanceGenerationResponse {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  video_url?: string
  video_data?: string // Base64 encoded
  error?: string
}

// ─── Configuration ────────────────────────────────────────────────────────────
const LAOZHANG_BASE_URL = process.env.LAOZHANG_API_URL ?? 'https://api.laozhang.ai/v1'
const LAOZHANG_API_KEY = process.env.LAOZHANG_API_KEY
const SEEDANCE_MODEL = 'seedance-2.0'

// ─── Polling configuration ────────────────────────────────────────────────────
const POLL_INTERVAL = 3000 // 3 segundos
const MAX_WAIT_TIME = 300000 // 5 minutos
const REQUEST_TIMEOUT = 60000 // 1 minuto

// ─── Error handling ──────────────────────────────────────────────────────────
export class LaoZhangError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'LaoZhangError'
  }
}

// ─── Main client function ────────────────────────────────────────────────────
export async function generateVideoWithSeedance(
  input: SeedanceGenerationRequest,
  onProgress?: (message: string, elapsed: number) => void,
): Promise<SeedanceGenerationResponse> {
  if (!LAOZHANG_API_KEY) {
    throw new LaoZhangError('LAOZHANG_API_KEY não configurada em .env.local')
  }

  const startedAt = Date.now()
  let taskId: string | null = null

  try {
    // ─── 1. Submit job ─────────────────────────────────────────────────────
    onProgress?.('Iniciando geração com Seedance 2.0...', 0)

    const submitRes = await fetch(`${LAOZHANG_BASE_URL}/video/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LAOZHANG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SEEDANCE_MODEL,
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio ?? '9:16',
        resolution: input.resolution ?? '1080p',
        duration: input.duration ?? 5,
        ...(input.image_url && { image_url: input.image_url }),
        audio: input.audio ?? true,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!submitRes.ok) {
      const errorData = await submitRes.json().catch(() => ({}))
      throw new LaoZhangError(
        `Falha ao enviar requisição (${submitRes.status})`,
        submitRes.status,
        errorData,
      )
    }

    const submitData = await submitRes.json()
    taskId = submitData.task_id

    if (!taskId) {
      throw new LaoZhangError('task_id não retornado na resposta')
    }

    onProgress?.('Video enfileirado na fila de processamento...', 1)

    // ─── 2. Poll for completion ───────────────────────────────────────────
    return await pollForCompletion(taskId, startedAt, onProgress)
  } catch (err) {
    if (err instanceof LaoZhangError) throw err

    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    throw new LaoZhangError(`Erro ao gerar vídeo: ${message}`, undefined, err)
  }
}

// ─── Polling mechanism ─────────────────────────────────────────────────────
async function pollForCompletion(
  taskId: string,
  startedAt: number,
  onProgress?: (message: string, elapsed: number) => void,
): Promise<SeedanceGenerationResponse> {
  let lastStatus = 'queued'

  while (true) {
    const elapsed = Math.round((Date.now() - startedAt) / 1000)

    // Timeout check
    if (elapsed > MAX_WAIT_TIME / 1000) {
      throw new LaoZhangError(`Timeout após ${elapsed}s. Tente novamente mais tarde.`)
    }

    try {
      const statusRes = await fetch(`${LAOZHANG_BASE_URL}/video/generations/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${LAOZHANG_API_KEY}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      })

      if (!statusRes.ok) {
        const errorData = await statusRes.json().catch(() => ({}))
        throw new LaoZhangError(
          `Erro ao verificar status (${statusRes.status})`,
          statusRes.status,
          errorData,
        )
      }

      const statusData = await statusRes.json()
      const status = statusData.status as string

      // Update progress message based on status
      if (status !== lastStatus) {
        lastStatus = status
        const messages: Record<string, string> = {
          queued: 'Na fila de geração...',
          processing: 'Gerando vídeo (isso pode levar 1-2 minutos)...',
          completed: 'Vídeo gerado com sucesso!',
          failed: 'Falha ao gerar vídeo',
        }
        onProgress?.(messages[status] ?? `Status: ${status}`, elapsed)
      }

      if (status === 'completed') {
        if (!statusData.video_url && !statusData.video_data) {
          throw new LaoZhangError('URL do vídeo não retornada')
        }

        // Download video to base64 if needed
        let videoData: string | undefined

        if (statusData.video_url && !statusData.video_data) {
          const videoRes = await fetch(statusData.video_url)
          if (videoRes.ok) {
            const buffer = await videoRes.arrayBuffer()
            videoData = Buffer.from(buffer).toString('base64')
          }
        } else {
          videoData = statusData.video_data
        }

        return {
          task_id: taskId,
          status: 'completed',
          video_url: statusData.video_url,
          video_data: videoData,
        }
      }

      if (status === 'failed') {
        throw new LaoZhangError(
          statusData.error ?? 'Geração de vídeo falhou no servidor',
        )
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
    } catch (err) {
      if (err instanceof LaoZhangError) throw err

      const message = err instanceof Error ? err.message : 'Erro ao verificar status'
      throw new LaoZhangError(`Erro ao verificar status: ${message}`)
    }
  }
}

// ─── Utility: Check if API key is configured ──────────────────────────────
export function isLaoZhangConfigured(): boolean {
  return !!LAOZHANG_API_KEY && LAOZHANG_API_KEY !== 'sk-xxxxxxxxxxxxxxxx'
}
