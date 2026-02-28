import { createClient } from '@/lib/supabase/server'
import type { SchedulePostRow, PublishLog } from '@/types/database'

interface PublishLogEntry {
  postId: string
  userId: string
  attemptNumber: number
  status: 'success' | 'pending_reel' | 'error'
  igMediaId?: string
  igContainerId?: string
  errorMessage?: string
  durationMs?: number
}

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,     // 1 segundo
  maxDelayMs: 16000,     // 16 segundos max
}

/**
 * Registra uma tentativa de publicação no histórico
 */
export async function logPublishAttempt(
  entry: PublishLogEntry,
): Promise<PublishLog | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedule_posts_publish_log')
    .insert({
      user_id: entry.userId,
      post_id: entry.postId,
      attempt_number: entry.attemptNumber,
      status: entry.status,
      ig_media_id: entry.igMediaId,
      ig_container_id: entry.igContainerId,
      error_message: entry.errorMessage,
      duration_ms: entry.durationMs,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao registrar tentativa de publicação:', error)
    return null
  }

  return data as PublishLog
}

/**
 * Atualiza o histórico JSON do post com a tentativa mais recente
 */
export async function updatePostPublishHistory(
  postId: string,
  userId: string,
  attemptNumber: number,
  status: 'success' | 'pending_reel' | 'error',
  details?: {
    igMediaId?: string
    igContainerId?: string
    error?: string
  },
): Promise<boolean> {
  const supabase = await createClient()

  // Busca o histórico atual
  const { data: post } = await supabase
    .from('schedule_posts')
    .select('publish_history')
    .eq('id', postId)
    .eq('user_id', userId)
    .single()

  const currentHistory = (post?.publish_history as SchedulePostRow['publish_history']) || {
    attempts: [],
    lastAttempt: null,
  }

  // Adiciona nova tentativa
  const newAttempt = {
    timestamp: new Date().toISOString(),
    attempt: attemptNumber,
    status,
    igMediaId: details?.igMediaId,
    igContainerId: details?.igContainerId,
    error: details?.error,
  }

  const updatedHistory = {
    attempts: [...(currentHistory.attempts || []), newAttempt],
    lastAttempt: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('schedule_posts')
    .update({ publish_history: updatedHistory })
    .eq('id', postId)
    .eq('user_id', userId)

  if (error) {
    console.error('Erro ao atualizar histórico de publicação:', error)
    return false
  }

  return true
}

/**
 * Calcula o delay para retry exponencial
 * Fórmula: min(baseDelay * 2^(attemptNumber-1), maxDelay) + jitter aleatório
 */
export function calculateRetryDelay(attemptNumber: number, config = DEFAULT_RETRY_CONFIG): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attemptNumber - 1)
  const clampedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  const jitter = Math.random() * 100 // 0-100ms de jitter
  return clampedDelay + jitter
}

/**
 * Aguarda por um tempo especificado em milissegundos
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Obtém o histórico de tentativas de um post
 */
export async function getPublishLog(postId: string, userId: string): Promise<PublishLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedule_posts_publish_log')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .order('attempt_number', { ascending: true })

  if (error) {
    console.error('Erro ao buscar histórico de publicação:', error)
    return []
  }

  return (data || []) as PublishLog[]
}

/**
 * Função para publicar com retry automático usando exponential backoff
 */
export async function publishWithRetry<T>(
  publishFn: (attemptNumber: number) => Promise<T>,
  postId: string,
  userId: string,
  config = DEFAULT_RETRY_CONFIG,
): Promise<{ success: boolean; result?: T; error?: string; attempts: number }> {
  let lastError: string | null = null

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const startTime = Date.now()

    try {
      const result = await publishFn(attempt)
      const duration = Date.now() - startTime

      await logPublishAttempt({
        postId,
        userId,
        attemptNumber: attempt,
        status: 'success',
        durationMs: duration,
      })

      await updatePostPublishHistory(postId, userId, attempt, 'success')

      return { success: true, result, attempts: attempt }
    } catch (err) {
      const duration = Date.now() - startTime
      lastError = err instanceof Error ? err.message : 'Erro desconhecido'

      await logPublishAttempt({
        postId,
        userId,
        attemptNumber: attempt,
        status: 'error',
        errorMessage: lastError,
        durationMs: duration,
      })

      await updatePostPublishHistory(postId, userId, attempt, 'error', { error: lastError })

      // Se não é a última tentativa, aguarda antes de retry
      if (attempt < config.maxAttempts) {
        const delayMs = calculateRetryDelay(attempt, config)
        console.log(`Tentativa ${attempt} falhou. Aguardando ${delayMs}ms antes de retry...`)
        await sleep(delayMs)
      }
    }
  }

  return {
    success: false,
    error: lastError || 'Falha após máximo de tentativas',
    attempts: config.maxAttempts,
  }
}

/**
 * Obtém estatísticas de publicação para um post
 */
export async function getPublishStats(postId: string, userId: string) {
  const logs = await getPublishLog(postId, userId)

  const stats = {
    totalAttempts: logs.length,
    successCount: logs.filter(l => l.status === 'success').length,
    pendingReelCount: logs.filter(l => l.status === 'pending_reel').length,
    errorCount: logs.filter(l => l.status === 'error').length,
    lastAttemptAt: logs[logs.length - 1]?.created_at || null,
    lastStatus: logs[logs.length - 1]?.status || null,
    avgDurationMs: logs.length > 0
      ? logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / logs.length
      : null,
  }

  return stats
}
