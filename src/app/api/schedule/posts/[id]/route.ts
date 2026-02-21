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
