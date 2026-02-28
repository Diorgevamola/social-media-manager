# 📋 Plano: Queue para Rate Limits

**Status**: 🔄 Planejado (pronto para executar)
**Data**: 28/02/2026
**Estimativa**: 6-8 horas
**Tecnologia**: Bull + Redis

---

## 🎯 Problema

Atualmente o sistema:
- ❌ Gera vídeos síncronamente (bloqueia cliente por 30-90s)
- ❌ Publica reels sequencialmente sem controle
- ❌ Sem respeito a rate limits do Instagram (200 req/hora)
- ❌ Máximo ~20 vídeos/dia
- ❌ Cron publica 1 vídeo por ciclo

**Para 100 vídeos/dia**: Precisa de 1 publicação a cada **18 segundos**!

---

## ✅ Solução: Bull Queue + Redis

### Arquitetura
```
┌─────────────────────────────────────────────────────────┐
│ Client (Frontend)                                         │
│  POST /api/media/generate-video                          │
│  → { jobId: "...", status: "queued" }                   │
│  → WebSocket: status updates                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ API Route                                                 │
│ ├─ Validate request                                      │
│ ├─ Create job in queue                                   │
│ └─ Return jobId                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Redis Queue (Bull)                                        │
│                                                            │
│ Queue 1: video-generation                                │
│ ├─ Max workers: 3                                         │
│ ├─ Max requests: 200/min                                 │
│ └─ Jobs: VEO 3.1 generation                              │
│                                                            │
│ Queue 2: instagram-publish                               │
│ ├─ Max workers: 1                                         │
│ ├─ Max requests: 200/hora = 1/18s                        │
│ └─ Jobs: Create container                                │
│                                                            │
│ Queue 3: instagram-finalize                              │
│ ├─ Max workers: 1                                         │
│ ├─ Max requests: 200/hora = 1/18s                        │
│ └─ Jobs: Publish when FINISHED                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Job Processors (Background Workers)                      │
│                                                            │
│ videoGenerationProcessor()                                │
│  → FAL.ai API call                                        │
│  → Save URL to DB                                         │
│  → Update job status                                      │
│                                                            │
│ instagramPublishProcessor()                               │
│  → Instagram Graph API (create container)                │
│  → Save ig_container_id                                  │
│  → Queue finalize job                                    │
│                                                            │
│ instagramFinalizeProcessor()                              │
│  → Check container status                                │
│  → Publish when FINISHED                                 │
│  → Save ig_media_id                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Instalação

```bash
cd /c/Users/diorg/social-media-manager

npm install bull redis
npm install --save-dev @types/bull
```

---

## 📁 Arquivos a Criar/Modificar

### 1. `src/lib/queue/redis.ts` (NOVO)
```typescript
import Redis from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl)

redis.on('error', (err) => console.error('Redis error:', err))
redis.on('connect', () => console.log('Redis connected'))
```

### 2. `src/lib/queue/types.ts` (NOVO)
```typescript
// Video Generation Job
export interface VideoGenerationJobData {
  prompt: string
  targetDuration: 4 | 6 | 8
  userId: string
  schedulePostId?: string
}

export interface VideoGenerationJobResult {
  videoUrl: string
  seed?: number
  videoData?: string // base64
  mimeType?: string
}

// Instagram Publish Job
export interface InstagramPublishJobData {
  postId: string
  userId: string
  videoUrl: string
  caption: string
  igUserId: string
  accessToken: string // encrypted
}

export interface InstagramPublishJobResult {
  igContainerId: string
}

// Instagram Finalize Job
export interface InstagramFinalizeJobData {
  postId: string
  userId: string
  igContainerId: string
  igUserId: string
  accessToken: string
}

export interface InstagramFinalizeJobResult {
  igMediaId: string
}

// Job Status Response
export interface JobStatus {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: any
  error?: string
}
```

### 3. `src/lib/queue/config.ts` (NOVO)
```typescript
import Queue from 'bull'
import { redis } from './redis'

// ── Queues ────────────────────────────────────────────
export const videoGenerationQueue = new Queue('video-generation', { redis })
export const instagramPublishQueue = new Queue('instagram-publish', { redis })
export const instagramFinalizeQueue = new Queue('instagram-finalize', { redis })

// ── Event Handlers (shared across all queues) ────────
function setupQueueEvents(queue: Queue.Queue) {
  queue.on('error', (err) => console.error(`Queue error:`, err))
  queue.on('waiting', (job) => console.log(`Job ${job.id} waiting`))
  queue.on('active', (job) => console.log(`Job ${job.id} processing`))
  queue.on('completed', (job) => console.log(`Job ${job.id} completed`))
  queue.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err.message))
  queue.on('removed', (job) => console.log(`Job ${job.id} removed`))
}

setupQueueEvents(videoGenerationQueue)
setupQueueEvents(instagramPublishQueue)
setupQueueEvents(instagramFinalizeQueue)

// ── Rate Limiting ──────────────────────────────────
// Delay before next job (respects rate limits)
export const RATE_LIMITS = {
  videoGeneration: 0,      // 3 concurrent = ~200 req/min
  instagramPublish: 18000, // 1 job per 18s = 200 req/hour
  instagramFinalize: 18000, // 1 job per 18s = 200 req/hour
}
```

### 4. `src/lib/queue/handlers.ts` (NOVO)
```typescript
import { generateVideoVeo31 } from '@/lib/fal-video/client'
import { createReelContainer, tryPublishReelContainer } from '@/lib/instagram/publishing'
import { createClient } from '@/lib/supabase/server'
import { logAiUsage } from '@/lib/log-ai-usage'
import { decryptToken } from '@/lib/token-crypto'
import type {
  VideoGenerationJobData,
  VideoGenerationJobResult,
  InstagramPublishJobData,
  InstagramPublishJobResult,
  InstagramFinalizeJobData,
  InstagramFinalizeJobResult,
} from './types'

// ── Video Generation Handler ────────────────────────
export async function handleVideoGeneration(job: any): Promise<VideoGenerationJobResult> {
  const data = job.data as VideoGenerationJobData
  const { prompt, targetDuration, userId, schedulePostId } = data

  try {
    job.progress(10) // Start

    const result = await generateVideoVeo31(
      {
        prompt,
        duration: targetDuration === 4 ? '4s' : targetDuration === 6 ? '6s' : '8s',
        aspect_ratio: '9:16',
        resolution: '720p',
        generate_audio: true,
      },
      (message) => {
        console.log(`[Video Generation] ${message}`)
        job.progress(50) // Mid-progress
      },
    )

    job.progress(90)

    // Log usage
    logAiUsage({
      userId,
      operationType: 'video',
      model: 'fal-ai/veo3.1/fast',
      generationCount: 1,
      metadata: { targetDuration, provider: 'fal.ai' },
    })

    // Update DB if schedulePostId provided
    if (schedulePostId) {
      const supabase = await createClient()
      await supabase
        .from('schedule_posts')
        .update({ generated_video_url: result.video.url })
        .eq('id', schedulePostId)
    }

    job.progress(100)

    return {
      videoUrl: result.video.url,
      seed: result.seed,
      mimeType: result.video.content_type,
    }
  } catch (error) {
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ── Instagram Publish Handler (Phase 1: Create Container) ────────────────────────
export async function handleInstagramPublish(job: any): Promise<InstagramPublishJobResult> {
  const data = job.data as InstagramPublishJobData
  const { postId, videoUrl, caption, igUserId, accessToken } = data

  try {
    job.progress(50)

    const plainToken = decryptToken(accessToken)
    const igContainerId = await createReelContainer(igUserId, plainToken, videoUrl, caption)

    job.progress(100)

    // Update DB
    const supabase = await createClient()
    await supabase
      .from('schedule_posts')
      .update({ ig_container_id: igContainerId })
      .eq('id', postId)

    return { igContainerId }
  } catch (error) {
    throw new Error(`Instagram publish failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ── Instagram Finalize Handler (Phase 2: Publish when FINISHED) ────────────────────────
export async function handleInstagramFinalize(job: any): Promise<InstagramFinalizeJobResult> {
  const data = job.data as InstagramFinalizeJobData
  const { postId, igContainerId, igUserId, accessToken } = data

  try {
    job.progress(50)

    const plainToken = decryptToken(accessToken)
    const igMediaId = await tryPublishReelContainer(igUserId, plainToken, igContainerId)

    if (!igMediaId) {
      throw new Error('Container not ready yet (status: IN_PROGRESS)')
    }

    job.progress(100)

    // Update DB
    const supabase = await createClient()
    await supabase
      .from('schedule_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        ig_media_id: igMediaId,
        ig_container_id: null,
        publish_error: null,
      })
      .eq('id', postId)

    return { igMediaId }
  } catch (error) {
    throw new Error(`Instagram finalize failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
```

### 5. `src/lib/queue/index.ts` (NOVO)
```typescript
export { videoGenerationQueue, instagramPublishQueue, instagramFinalizeQueue } from './config'
export { handleVideoGeneration, handleInstagramPublish, handleInstagramFinalize } from './handlers'
export type {
  VideoGenerationJobData,
  VideoGenerationJobResult,
  InstagramPublishJobData,
  InstagramPublishJobResult,
  InstagramFinalizeJobData,
  InstagramFinalizeJobResult,
  JobStatus,
} from './types'
```

### 6. `src/app/api/media/generate-video/route.ts` (MODIFICAR)
**Antes**: Síncrono (espera VEO 3.1 terminar)
**Depois**: Assíncrono (retorna jobId, processa em background)

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { videoGenerationQueue } from '@/lib/queue'
import { z } from 'zod'

const schema = z.object({
  prompt: z.string().min(10),
  targetDuration: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
  schedulePostId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const { prompt, targetDuration, schedulePostId } = parsed.data

    // Add to queue
    const job = await videoGenerationQueue.add(
      { prompt, targetDuration, userId: user.id, schedulePostId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    )

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'queued',
      message: 'Video generation started. Check /api/queue/status for updates.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### 7. `src/app/api/queue/status/[jobId]/route.ts` (NOVO)
```typescript
import { NextResponse } from 'next/server'
import { videoGenerationQueue, instagramPublishQueue, instagramFinalizeQueue } from '@/lib/queue'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params

    // Try all queues (could optimize with queue name in request)
    let job = await videoGenerationQueue.getJob(jobId)
    let queue = 'video-generation'

    if (!job) {
      job = await instagramPublishQueue.getJob(jobId)
      queue = 'instagram-publish'
    }
    if (!job) {
      job = await instagramFinalizeQueue.getJob(jobId)
      queue = 'instagram-finalize'
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const state = await job.getState()
    const progress = job.progress() as number
    const result = job.data
    const failedReason = job.failedReason

    return NextResponse.json({
      jobId: job.id,
      queue,
      status: state, // 'queued' | 'active' | 'completed' | 'failed'
      progress, // 0-100
      result,
      error: failedReason,
      createdAt: job.timestamp,
      finishedAt: job.finishedOn,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### 8. `src/app/api/cron/process-instagram/route.ts` (NOVO)
**Substitui o `publish-pending` com lógica de queue**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { instagramFinalizeQueue } from '@/lib/queue'
import { decryptToken } from '@/lib/token-crypto'

export const maxDuration = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') ?? request.headers.get('authorization')?.replace('Bearer ', '')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Find posts waiting for finalization (ig_container_id != null)
  const { data: pendingReels } = await supabase
    .from('schedule_posts')
    .select('id, schedule_id, ig_container_id, publish_attempts')
    .eq('status', 'planned')
    .eq('confirmed', true)
    .not('ig_container_id', 'is', null)
    .lt('publish_attempts', 5)

  let queued = 0

  for (const post of pendingReels ?? []) {
    try {
      // Get account info
      const { data: schedule } = await supabase
        .from('schedules')
        .select('account_id')
        .eq('id', post.schedule_id)
        .single()

      if (!schedule?.account_id) continue

      const { data: account } = await supabase
        .from('instagram_accounts')
        .select('ig_user_id, access_token')
        .eq('id', schedule.account_id)
        .single()

      if (!account?.ig_user_id || !account.access_token) continue

      // Queue finalize job
      await instagramFinalizeQueue.add(
        {
          postId: post.id,
          igContainerId: post.ig_container_id,
          igUserId: account.ig_user_id,
          accessToken: account.access_token,
        },
        { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
      )

      queued++
    } catch (err) {
      console.error('Error queuing finalize job:', err)
    }
  }

  return NextResponse.json({ queued, message: `${queued} finalize jobs queued` })
}
```

### 9. `src/app/api/cron/process-queues/route.ts` (NOVO - Optional)
**Processor que roda localmente ou em worker, inicializa os handlers**

```typescript
import { videoGenerationQueue, instagramPublishQueue, instagramFinalizeQueue } from '@/lib/queue'
import { handleVideoGeneration, handleInstagramPublish, handleInstagramFinalize } from '@/lib/queue/handlers'
import { RATE_LIMITS } from '@/lib/queue/config'

// Initialize queue processors (call on app startup or manually)
export function initializeQueueProcessors() {
  videoGenerationQueue.process(3, (job) => handleVideoGeneration(job))
  instagramPublishQueue.process(1, (job) => handleInstagramPublish(job))
  instagramFinalizeQueue.process(1, (job) => handleInstagramFinalize(job))

  // Set delays for rate limiting
  videoGenerationQueue.removeRepeatableByKey('*')
  instagramPublishQueue.delayUntil = RATE_LIMITS.instagramPublish
  instagramFinalizeQueue.delayUntil = RATE_LIMITS.instagramFinalize

  console.log('✅ Queue processors initialized')
}

export async function GET() {
  initializeQueueProcessors()
  return new Response('Processors initialized')
}
```

### 10. `.env.local` (ADICIONAR)
```env
REDIS_URL=redis://localhost:6379
# OR for production (Vercel KV):
# REDIS_URL=redis://...
```

### 11. `src/components/content/video-generator.tsx` (MODIFICAR)
**Adaptar para novo fluxo assíncrono**

```typescript
// Change from:
// const response = await fetch('/api/media/generate-video')
// const result = await response.json() // waits 30-90s

// To:
const response = await fetch('/api/media/generate-video', {
  method: 'POST',
  body: JSON.stringify({ prompt, duration })
})
const { jobId } = await response.json() // returns immediately

// Poll for status
const pollJobStatus = async (jobId: string) => {
  const statusResponse = await fetch(`/api/queue/status/${jobId}`)
  const status = await statusResponse.json()

  if (status.status === 'completed') {
    setGeneratedVideoUrl(status.result.videoUrl)
  } else if (status.status === 'failed') {
    setError(status.error)
  } else {
    setProgress(`${status.progress || 0}%`)
    setTimeout(() => pollJobStatus(jobId), 2000)
  }
}

pollJobStatus(jobId)
```

---

## 🚀 Execution Steps

### Phase 1: Setup (1-2 hours)
- [ ] `npm install bull redis`
- [ ] Create `src/lib/queue/` directory
- [ ] Implement files 1-5 (queue config, types, handlers)
- [ ] Setup local Redis: `brew install redis` or Docker

### Phase 2: API Integration (2-3 hours)
- [ ] Modify `/api/media/generate-video` (file 6)
- [ ] Create `/api/queue/status/[jobId]` (file 7)
- [ ] Create `/api/cron/process-instagram` (file 8)
- [ ] Test endpoints with Postman/curl

### Phase 3: Processor & Frontend (2-3 hours)
- [ ] Create processor initializer (file 9)
- [ ] Update environment variables (file 10)
- [ ] Adapt VideoGenerator component (file 11)
- [ ] Update ScheduleCalendar to handle async

### Phase 4: Testing (1-2 hours)
- [ ] Unit tests: handlers in isolation
- [ ] Integration: queue → DB state
- [ ] E2E: Full pipeline with mock FAL/Instagram
- [ ] Load test: 100 jobs in queue

### Phase 5: Deployment
- [ ] Add Redis to Vercel KV (production)
- [ ] Deploy to main
- [ ] Monitor queue metrics
- [ ] Watch for rate limit errors

---

## 📊 Rate Limit Configuration

```typescript
// Instagram: 200 requests per hour
// = 1 request per 18 seconds
const INSTAGRAM_RATE_LIMIT_MS = 18000

// FAL.ai: ~200 requests per minute
// = Allow 3 concurrent jobs
const FAL_MAX_CONCURRENT = 3

// Queue config:
videoGenerationQueue.process(FAL_MAX_CONCURRENT, handler)
instagramPublishQueue.process(1, handler) // 1 at a time
instagramPublishQueue.setDelayMs = INSTAGRAM_RATE_LIMIT_MS
```

---

## 🧪 Testing Checklist

- [ ] Generate single video → jobId returned immediately
- [ ] Poll job status → Progress updates
- [ ] Job completes → videoUrl in result
- [ ] 100 jobs queued → All processed respecting rate limits
- [ ] Retry on failure → Job retried up to 3x
- [ ] Redis persistence → Queue survives app restart
- [ ] Instagram publish → Container created, then finalized
- [ ] Rate limits enforced → Never exceed 200 req/hour Instagram

---

## 🎯 Success Criteria

✅ Client receives jobId immediately (no blocking)
✅ Queue respects Instagram 200 req/hour (1 per 18s)
✅ Can queue 100+ videos without rate limit errors
✅ Job status queryable via `/api/queue/status/[jobId]`
✅ Retry logic handles transient failures
✅ Production deployment with Vercel KV

---

## 📚 References

- Bull Documentation: https://docs.bullmq.io
- Redis: https://redis.io
- Vercel KV: https://vercel.com/docs/storage/vercel-kv
- Instagram Graph API Rate Limits: https://developers.facebook.com/docs/graph-api/overview/rate-limiting

---

**Ready to implement?** Start with Phase 1 setup!
