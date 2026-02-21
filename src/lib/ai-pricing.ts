// Google AI pricing (approximate — update as needed)
export const AI_PRICING: Record<string, { inputPer1M?: number; outputPer1M?: number; perImage?: number; perVideo?: number }> = {
  'gemini-1.5-flash':           { inputPer1M: 0.075, outputPer1M: 0.30 },
  'gemini-2.0-flash':           { inputPer1M: 0.10,  outputPer1M: 0.40 },
  'gemini-3-pro-image-preview': { perImage: 0.04 },
  'veo-3.1-generate-preview':   { perVideo: 0.35 },
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
