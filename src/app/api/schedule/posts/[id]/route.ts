import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'

const STORAGE_BUCKET = 'schedule-media'

/** Extract the storage path from a public Supabase Storage URL. */
function extractStoragePath(url: string): string | null {
  try {
    // URL format: .../storage/v1/object/public/<bucket>/<path>
    const marker = `/object/public/${STORAGE_BUCKET}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return url.slice(idx + marker.length)
  } catch {
    return null
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params

    // Fetch the post
    const { data: post, error } = await supabase
      .from('schedule_posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    return NextResponse.json(post)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params

    // Fetch post to get media URLs before deleting
    const { data: post } = await supabase
      .from('schedule_posts')
      .select('id, generated_image_url, generated_video_url')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    // Delete media files from storage if they exist
    const pathsToDelete: string[] = []
    if (post?.generated_image_url) {
      const p = extractStoragePath(post.generated_image_url)
      if (p) pathsToDelete.push(p)
    }
    if (post?.generated_video_url) {
      const p = extractStoragePath(post.generated_video_url)
      if (p) pathsToDelete.push(p)
    }
    if (pathsToDelete.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(pathsToDelete)
    }

    // Delete the post record
    const { error } = await supabase
      .from('schedule_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params
    const body = await request.json() as {
      date?: string
      time?: string | null
      confirmed?: boolean
      caption?: string | null
      visual_data?: Record<string, unknown>
      script_data?: Record<string, unknown>
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.date !== undefined) updates.date = body.date
    if ('time' in body) updates.time = body.time ?? null
    if (body.confirmed !== undefined) updates.confirmed = body.confirmed
    if ('caption' in body) updates.caption = body.caption
    if (body.visual_data !== undefined) updates.visual_data = body.visual_data
    if (body.script_data !== undefined) updates.script_data = body.script_data

    const { error } = await supabase
      .from('schedule_posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
