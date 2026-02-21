import { createServiceClient } from '@/lib/supabase/service'
import { calcCostUsd } from '@/lib/ai-pricing'

interface LogOptions {
  userId: string
  operationType: string
  model: string
  inputTokens?: number
  outputTokens?: number
  generationCount?: number
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget AI usage logger.
 * Never awaited — does not block the main API response.
 */
export function logAiUsage(opts: LogOptions): void {
  void (async () => {
    try {
      const db = createServiceClient()
      const cost = calcCostUsd(
        opts.model,
        opts.inputTokens ?? 0,
        opts.outputTokens ?? 0,
        opts.generationCount ?? 1,
      )
      await db.from('ai_usage_logs').insert({
        user_id:          opts.userId,
        operation_type:   opts.operationType,
        model:            opts.model,
        input_tokens:     opts.inputTokens ?? 0,
        output_tokens:    opts.outputTokens ?? 0,
        generation_count: opts.generationCount ?? 1,
        cost_usd:         cost,
        metadata:         opts.metadata ?? null,
      })
    } catch {
      // Silently ignore — never fails the main request
    }
  })()
}
