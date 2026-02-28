/**
 * Seedance — fal.ai provider
 *
 * Usando Seedance 1.0 Pro (v2 ainda não disponível no fal.ai).
 * Quando v2 lançar, basta atualizar .env.local:
 *   SEEDANCE_T2V_MODEL_ID=fal-ai/bytedance/seedance/v2/pro/text-to-video
 *   SEEDANCE_I2V_MODEL_ID=fal-ai/bytedance/seedance/v2/pro/image-to-video
 */

import { fal } from '@fal-ai/client'

// ─── Model IDs ────────────────────────────────────────────────────────────────
export const SEEDANCE_T2V_MODEL =
  process.env.SEEDANCE_T2V_MODEL_ID ??
  'fal-ai/bytedance/seedance/v1/pro/text-to-video'

export const SEEDANCE_I2V_MODEL =
  process.env.SEEDANCE_I2V_MODEL_ID ??
  'fal-ai/bytedance/seedance/v1/pro/image-to-video'

// ─── Configure fal client ─────────────────────────────────────────────────────
fal.config({
  credentials: process.env.FAL_KEY,
})

// ─── Types ────────────────────────────────────────────────────────────────────
export type SeedanceAspectRatio = '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9'
export type SeedanceResolution  = '480p' | '720p' | '1080p'

export interface SeedanceT2VInput {
  prompt:       string
  aspect_ratio?: SeedanceAspectRatio
  resolution?:   SeedanceResolution
  duration?:     number               // 2–12 s (v1 Pro)
  audio?:        boolean
  camera_fixed?: boolean
  seed?:         number               // -1 = aleatório
}

export interface SeedanceI2VInput extends SeedanceT2VInput {
  image_url: string                   // URL pública da imagem de referência
}

export interface SeedanceVideoResult {
  video: {
    url:          string
    content_type: string
    file_name?:   string
    file_size?:   number
  }
  seed?:    number
  timings?: Record<string, number>
}

// ─── Progress callback ────────────────────────────────────────────────────────
export type SeedanceProgressCallback = (message: string, elapsed: number) => void

// ─── Text-to-video ────────────────────────────────────────────────────────────
export async function generateVideoFromText(
  input: SeedanceT2VInput,
  onProgress?: SeedanceProgressCallback,
): Promise<SeedanceVideoResult> {
  const startedAt = Date.now()

  const result = await fal.subscribe(SEEDANCE_T2V_MODEL, {
    input,
    logs: true,
    onQueueUpdate(update) {
      if (!onProgress) return
      const elapsed = Math.round((Date.now() - startedAt) / 1000)
      if (update.status === 'IN_QUEUE') {
        onProgress('Na fila de geração...', elapsed)
      } else if (update.status === 'IN_PROGRESS') {
        const lastLog = update.logs?.at(-1)?.message
        onProgress(lastLog ?? `Gerando vídeo... ${elapsed}s`, elapsed)
      }
    },
  })

  return result.data as SeedanceVideoResult
}

// ─── Image-to-video ───────────────────────────────────────────────────────────
export async function generateVideoFromImage(
  input: SeedanceI2VInput,
  onProgress?: SeedanceProgressCallback,
): Promise<SeedanceVideoResult> {
  const startedAt = Date.now()

  const result = await fal.subscribe(SEEDANCE_I2V_MODEL, {
    input,
    logs: true,
    onQueueUpdate(update) {
      if (!onProgress) return
      const elapsed = Math.round((Date.now() - startedAt) / 1000)
      if (update.status === 'IN_QUEUE') {
        onProgress('Na fila de geração...', elapsed)
      } else if (update.status === 'IN_PROGRESS') {
        const lastLog = update.logs?.at(-1)?.message
        onProgress(lastLog ?? `Gerando vídeo a partir da imagem... ${elapsed}s`, elapsed)
      }
    },
  })

  return result.data as SeedanceVideoResult
}
