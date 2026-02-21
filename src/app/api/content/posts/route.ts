import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { z } from 'zod'

const createPostSchema = z.object({
  post_type: z.enum(['post', 'carousel', 'reel']),
  caption: z.string().nullable().optional(),
  hashtags: z.array(z.string()).nullable().optional(),
  media_urls: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['draft', 'planned', 'published']).optional().default('draft'),
  scheduled_at: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
})

const updatePostSchema = createPostSchema.partial().extend({
  id: z.string(),
})

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const postType = searchParams.get('postType')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    let query = supabase
      .from('content_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }
    if (postType) {
      query = query.eq('post_type', postType)
    }

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch posts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { data: post, error } = await supabase
      .from('content_posts')
      .insert({
        user_id: userId,
        post_type: parsed.data.post_type,
        caption: parsed.data.caption ?? null,
        hashtags: parsed.data.hashtags ?? null,
        media_urls: parsed.data.media_urls ?? null,
        notes: parsed.data.notes ?? null,
        status: parsed.data.status,
        scheduled_at: parsed.data.scheduled_at ?? null,
        account_id: parsed.data.account_id ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const body = await request.json()
    const parsed = updatePostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { id, ...updateData } = parsed.data

    const { data: post, error } = await supabase
      .from('content_posts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('content_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
