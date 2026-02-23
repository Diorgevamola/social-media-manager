/**
 * fal.ai Video Generation Client
 *
 * Suporta VEO 3.1 Fast (default) e Seedance 2.0 como fallback.
 * Modelos disponíveis em https://fal.ai/models
 */

import { fal } from '@fal-ai/client'

// ─── Configure fal client ─────────────────────────────────────────────────────
fal.config({
  credentials: process.env.FAL_KEY,
})

// ─── Model IDs ────────────────────────────────────────────────────────────────
export const VEO31_FAST_MODEL =
  process.env.VEO31_MODEL_ID ?? 'fal-ai/veo3.1/fast'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Veo31Input {
  prompt:           string
  duration?:        '4s' | '6s' | '8s'
  aspect_ratio?:    '16:9' | '9:16'
  resolution?:      '720p' | '1080p' | '4k'
  generate_audio?:  boolean
  negative_prompt?: string
  seed?:            number
}

export interface FalVideoResult {
  video: {
    url:          string
    content_type: string
    file_name?:   string
    file_size?:   number
  }
  seed?:    number
  timings?: Record<string, number>
}

export type ProgressCallback = (message: string, elapsed: number) => void

// ─── Text-to-video (VEO 3.1 Fast) ──────────────────────────────────────────
export async function generateVideoVeo31(
  input: Veo31Input,
  onProgress?: ProgressCallback,
): Promise<FalVideoResult> {
  const startedAt = Date.now()

  const result = await fal.subscribe(VEO31_FAST_MODEL, {
    input: {
      prompt:          input.prompt,
      duration:        input.duration ?? '8s',
      aspect_ratio:    input.aspect_ratio ?? '9:16',
      resolution:      input.resolution ?? '720p',
      generate_audio:  input.generate_audio ?? false,
      ...(input.negative_prompt && { negative_prompt: input.negative_prompt }),
      ...(input.seed !== undefined && { seed: input.seed }),
    },
    logs: true,
    onQueueUpdate(update) {
      if (!onProgress) return
      const elapsed = Math.round((Date.now() - startedAt) / 1000)
      if (update.status === 'IN_QUEUE') {
        onProgress('Na fila de geração VEO 3.1...', elapsed)
      } else if (update.status === 'IN_PROGRESS') {
        const lastLog = update.logs?.at(-1)?.message
        onProgress(lastLog ?? `Gerando vídeo VEO 3.1... ${elapsed}s`, elapsed)
      }
    },
  })

  return result.data as FalVideoResult
}
