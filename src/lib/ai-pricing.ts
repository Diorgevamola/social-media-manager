// AI pricing (approximate — update as needed)
export const AI_PRICING: Record<string, { inputPer1M?: number; outputPer1M?: number; perImage?: number; perVideo?: number }> = {
  'moonshotai/kimi-k2.5':         { inputPer1M: 0.06,  outputPer1M: 0.24 },
  'gemini-3.1-flash-image-preview': { perImage: 0.04 },
  'veo-3.1-generate-preview':   { perVideo: 0.35 },   // Google direto (legado)
  'fal-ai/veo3.1/fast':         { perVideo: 1.20 },   // fal.ai VEO 3.1 Fast (~8s @ $0.15/s com áudio)

  // Seedance 2.0 (fal.ai) — preço oficial pendente de 24/02/2026
  // Estimativa baseada no v1 Pro: ~$0.62 por 5s @ 1080p
  // Atualizar após lançamento: https://fal.ai/seedance-2.0
  'fal-ai/bytedance/seedance/v2/pro/text-to-video':  { perVideo: 0.62 },
  'fal-ai/bytedance/seedance/v2/pro/image-to-video': { perVideo: 0.62 },

  // Seedance 1.x (fallback/referência)
  'fal-ai/bytedance/seedance/v1/pro/text-to-video':  { perVideo: 0.62 },
  'fal-ai/bytedance/seedance/v1/pro/image-to-video': { perVideo: 0.62 },
}

export function calcCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  count = 1,
): number {
  const pricing = AI_PRICING[model]
  if (!pricing) return 0

  if (pricing.perImage !== undefined) {
    return pricing.perImage * count
  }

  if (pricing.perVideo !== undefined) {
    return pricing.perVideo * count
  }

  const inputCost  = (inputTokens  / 1_000_000) * (pricing.inputPer1M  ?? 0)
  const outputCost = (outputTokens / 1_000_000) * (pricing.outputPer1M ?? 0)
  return inputCost + outputCost
}
