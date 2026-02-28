/**
 * xSkill AI Client — Seedance 2.0 Video Generation
 *
 * Acesso direto ao Seedance 2.0 com suporte multimodal
 * Documentação: https://xskill.ai
 * GitHub: https://github.com/hexiaochun/seedance2-api
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type AspectRatio = '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9'
export type Resolution = '480p' | '720p' | '1080p' | '2K'

export interface SeedanceGenerationRequest {
  prompt: string
  aspect_ratio?: AspectRatio
  resolution?: Resolution
  duration?: number // 4-15 segundos
  image_url?: string // Para image-to-video (@Image1)
  audio?: boolean // Gerar áudio nativo
}

export interface SeedanceGenerationResponse {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  video_url?: string
  video_data?: string // Base64 encoded
  error?: string
}

// ─── Configuration ────────────────────────────────────────────────────────
const XSKILL_BASE_URL = 'https://api.xskill.ai/api/v3'
const XSKILL_API_KEY = process.env.XSKILL_API_KEY

// ─── Polling configuration ────────────────────────────────────────────────────
const POLL_INTERVAL = 2000 // 2 segundos
const MAX_WAIT_TIME = 600000 // 10 minutos
const REQUEST_TIMEOUT = 60000 // 1 minuto

// ─── Error handling ──────────────────────────────────────────────────────────
export class XSkillError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'XSkillError'
  }
}

// ─── Main client function ────────────────────────────────────────────────────
export async function generateVideoWithSeedance(
  input: SeedanceGenerationRequest,
  onProgress?: (message: string, elapsed: number) => void,
): Promise<SeedanceGenerationResponse> {
  if (!XSKILL_API_KEY) {
    throw new XSkillError('XSKILL_API_KEY não configurada em .env.local')
  }

  const startedAt = Date.now()

  try {
    // ─── 1. Submit job ─────────────────────────────────────────────────────
    onProgress?.('Iniciando geração com Seedance 2.0 via xSkill...', 0)

    const payload: any = {
      model: 'seedance-2.0',
      prompt: input.prompt,
      resolution: input.resolution ?? '1080p',
      aspect_ratio: input.aspect_ratio ?? '9:16',
      duration: input.duration ?? 5,
      enable_audio: input.audio ?? true,
    }

    // Adicionar imagem de referência se fornecida
    if (input.image_url) {
      payload['@Image1'] = input.image_url
    }

    const submitRes = await fetch(`${XSKILL_BASE_URL}/tasks/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XSKILL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!submitRes.ok) {
      const errorData = await submitRes.json().catch(() => ({}))
      throw new XSkillError(
        `Falha ao enviar requisição (${submitRes.status})`,
        submitRes.status,
        errorData,
      )
    }

    const submitData = await submitRes.json()
    const taskId = submitData.task_id || submitData.id

    if (!taskId) {
      throw new XSkillError('task_id não retornado na resposta')
    }

    onProgress?.('Vídeo enfileirado... Processando...', 1)

    // ─── 2. Poll for completion ───────────────────────────────────────────
    return await pollForCompletion(taskId, startedAt, onProgress)
  } catch (err) {
    if (err instanceof XSkillError) throw err

    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    throw new XSkillError(`Erro ao gerar vídeo: ${message}`, undefined, err)
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
      throw new XSkillError(`Timeout após ${elapsed}s. Tente novamente mais tarde.`)
    }

    try {
      const statusRes = await fetch(`${XSKILL_BASE_URL}/tasks/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XSKILL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_id: taskId }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      })

      if (!statusRes.ok) {
        const errorData = await statusRes.json().catch(() => ({}))
        throw new XSkillError(
          `Erro ao verificar status (${statusRes.status})`,
          statusRes.status,
          errorData,
        )
      }

      const statusData = await statusRes.json()
      const status = statusData.status || statusData.state

      // Update progress message based on status
      if (status !== lastStatus) {
        lastStatus = status
        const messages: Record<string, string> = {
          queued: 'Na fila de geração...',
          pending: 'Na fila de geração...',
          processing: 'Gerando vídeo (isso pode levar 1-2 minutos)...',
          'in-progress': 'Gerando vídeo...',
          completed: 'Vídeo gerado com sucesso!',
          success: 'Vídeo gerado com sucesso!',
          failed: 'Falha ao gerar vídeo',
          error: 'Falha ao gerar vídeo',
        }
        onProgress?.(messages[status] ?? `Status: ${status}`, elapsed)
      }

      if (status === 'completed' || status === 'success') {
        const videoUrl = statusData.result?.video_url || statusData.video_url

        if (!videoUrl) {
          throw new XSkillError('URL do vídeo não retornada')
        }

        // Download video to base64 if needed
        let videoData: string | undefined

        if (videoUrl) {
          try {
            const videoRes = await fetch(videoUrl)
            if (videoRes.ok) {
              const buffer = await videoRes.arrayBuffer()
              videoData = Buffer.from(buffer).toString('base64')
            }
          } catch (e) {
            // Se não conseguir baixar, usar apenas URL
          }
        }

        return {
          task_id: taskId,
          status: 'completed',
          video_url: videoUrl,
          video_data: videoData,
        }
      }

      if (status === 'failed' || status === 'error') {
        throw new XSkillError(
          statusData.error ?? statusData.message ?? 'Geração de vídeo falhou',
        )
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
    } catch (err) {
      if (err instanceof XSkillError) throw err

      const message = err instanceof Error ? err.message : 'Erro ao verificar status'
      throw new XSkillError(`Erro ao verificar status: ${message}`)
    }
  }
}

// ─── Utility: Check if API key is configured ──────────────────────────────
export function isXSkillConfigured(): boolean {
  return !!XSKILL_API_KEY && XSKILL_API_KEY !== 'sk-xxxxxxxxxxxxxxxx'
}
