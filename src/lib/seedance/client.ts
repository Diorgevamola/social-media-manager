/**
 * Seedance 2.0 — fal.ai provider
 *
 * Model IDs são lidos de env vars para facilitar a troca quando o
 * lançamento oficial ocorrer em 24/02/2026.
 *
 * Para trocar para o modelo oficial basta atualizar .env.local:
 *   SEEDANCE_T2V_MODEL_ID=fal-ai/bytedance/seedance/v2/pro/text-to-video
 *   SEEDANCE_I2V_MODEL_ID=fal-ai/bytedance/seedance/v2/pro/image-to-video
 *
 * Até o lançamento, os defaults abaixo apontam para o placeholder esperado.
 * Se quiser usar o 1.5 Pro enquanto aguarda, comente a linha e descomente a de baixo.
 */

import { fal } from '@fal-ai/client'

// ─── Model IDs ────────────────────────────────────────────────────────────────
// TODO: confirmar IDs exatos em 24/02/2026 em https://fal.ai/models
export const SEEDANCE_T2V_MODEL =
  process.env.SEEDANCE_T2V_MODEL_ID ??
  'fal-ai/bytedance/seedance/v2/pro/text-to-video'
  // 'fal-ai/bytedance/seedance/v1/pro/text-to-video'  // ← v1.5 disponível agora

export const SEEDANCE_I2V_MODEL =
  process.env.SEEDANCE_I2V_MODEL_ID ??
  'fal-ai/bytedance/seedance/v2/pro/image-to-video'
  // 'fal-ai/bytedance/seedance/v1/pro/image-to-video'  // ← v1.5 disponível agora

// ─── Configure fal client ─────────────────────────────────────────────────────
fal.config({
  credentials: process.env.FAL_KEY,
})

// ─── Types ────────────────────────────────────────────────────────────────────
export type SeedanceAspectRatio = '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9'
export type SeedanceResolution  = '480p' | '720p' | '1080p' | '2k'

export interface SeedanceT2VInput {
  prompt:       string
  aspect_ratio?: SeedanceAspectRatio
  resolution?:   SeedanceResolution
  duration?:     number               // 4–15 s
  audio?:        boolean              // geração de áudio nativo (novo no v2)
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
