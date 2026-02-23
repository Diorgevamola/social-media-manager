import type { SchedulePostRow, InstagramAccount } from '@/types/database'

// Tokens obtidos via Instagram Business Login (IGAA...) funcionam com graph.instagram.com
const GRAPH = 'https://graph.instagram.com/v21.0'

async function graphPost<T>(
  path: string,
  token: string,
  body: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err?.error?.message ?? `Graph API error ${res.status} on ${path}`,
    )
  }
  return res.json() as Promise<T>
}

async function graphGet<T>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}${path}`)
  url.searchParams.set('access_token', token)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err?.error?.message ?? `Graph API error ${res.status} on ${path}`,
    )
  }
  return res.json() as Promise<T>
}

/** Cria container de imagem (post/story) — retorna creation_id */
export async function createImageContainer(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption: string,
  isStory = false,
): Promise<string> {
  const body: Record<string, string> = { image_url: imageUrl, caption }
  if (isStory) body.media_type = 'STORIES'
  const data = await graphPost<{ id: string }>(
    `/${igUserId}/media`,
    token,
    body,
  )
  return data.id
}

/** Cria container de reel (vídeo) — retorna creation_id */
export async function createReelContainer(
  igUserId: string,
  token: string,
  videoUrl: string,
  caption: string,
): Promise<string> {
  const data = await graphPost<{ id: string }>(
    `/${igUserId}/media`,
    token,
    { media_type: 'REELS', video_url: videoUrl, caption },
  )
  return data.id
}

/** Verifica status de processamento de container */
export async function getContainerStatus(
  containerId: string,
  token: string,
): Promise<'FINISHED' | 'IN_PROGRESS' | 'ERROR' | 'EXPIRED'> {
  const data = await graphGet<{ status_code: string }>(
    `/${containerId}`,
    token,
    { fields: 'status_code' },
  )
  return data.status_code as 'FINISHED' | 'IN_PROGRESS' | 'ERROR' | 'EXPIRED'
}

/** Tenta publicar um container de reel já criado. Retorna null se ainda não está pronto. */
export async function tryPublishReelContainer(
  igUserId: string,
  token: string,
  containerId: string,
): Promise<string | null> {
  const status = await getContainerStatus(containerId, token)
  if (status === 'ERROR' || status === 'EXPIRED') {
    throw new Error(`Container de reel com status: ${status}`)
  }
  if (status !== 'FINISHED') return null
  return publishContainer(igUserId, token, containerId)
}

/** Cria carrossel: um container child por slide + container pai */
export async function createCarouselContainer(
  igUserId: string,
  token: string,
  imageUrls: string[],
  caption: string,
): Promise<string> {
  // Cria um container child por imagem
  const childIds = await Promise.all(
    imageUrls.map(url =>
      graphPost<{ id: string }>(
        `/${igUserId}/media`,
        token,
        { image_url: url, is_carousel_item: 'true' },
      ).then(d => d.id),
    ),
  )

  // Container pai do carrossel
  const parent = await graphPost<{ id: string }>(
    `/${igUserId}/media`,
    token,
    {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
    },
  )
  return parent.id
}

/** Publica container já criado — retorna ig_media_id */
export async function publishContainer(
  igUserId: string,
  token: string,
  containerId: string,
): Promise<string> {
  const data = await graphPost<{ id: string }>(
    `/${igUserId}/media_publish`,
    token,
    { creation_id: containerId },
  )
  return data.id
}

export type PublishResult =
  | { status: 'published'; igMediaId: string }
  | { status: 'pending_reel'; igContainerId: string }

/**
 * Publica um SchedulePostRow completo.
 * - posts/stories/carrosséis: publica imediatamente → { status: 'published', igMediaId }
 * - reels: cria container e retorna imediatamente → { status: 'pending_reel', igContainerId }
 *   O cron vai verificar o status e publicar quando o container estiver FINISHED.
 */
export async function publishPost(
  post: SchedulePostRow,
  account: Pick<InstagramAccount, 'ig_user_id' | 'access_token'>,
): Promise<PublishResult> {
  const { ig_user_id, access_token } = account
  if (!ig_user_id || !access_token) {
    throw new Error('Conta não conectada ao Meta')
  }

  const caption = post.caption ?? ''
  const type = post.post_type

  if (type === 'reel') {
    if (!post.generated_video_url) throw new Error('Reel sem URL de vídeo')
    // Cria container e retorna imediatamente — sem polling (evita timeout serverless)
    const igContainerId = await createReelContainer(ig_user_id, access_token, post.generated_video_url, caption)
    return { status: 'pending_reel', igContainerId }
  }

  if (type === 'carousel') {
    const urls = post.slide_image_urls
      ? Object.values(post.slide_image_urls as Record<string, string>)
      : []
    if (urls.length === 0 && post.generated_image_url) urls.push(post.generated_image_url)
    if (urls.length === 0) throw new Error('Carrossel sem imagens')
    const containerId = await createCarouselContainer(ig_user_id, access_token, urls, caption)
    const igMediaId = await publishContainer(ig_user_id, access_token, containerId)
    return { status: 'published', igMediaId }
  }

  // post, story, story_sequence
  if (!post.generated_image_url) throw new Error('Post sem URL de imagem')
  const isStory = type === 'story' || type === 'story_sequence'
  const containerId = await createImageContainer(ig_user_id, access_token, post.generated_image_url, caption, isStory)
  const igMediaId = await publishContainer(ig_user_id, access_token, containerId)
  return { status: 'published', igMediaId }
}
