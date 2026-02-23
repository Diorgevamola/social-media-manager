import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { decryptToken } from '@/lib/token-crypto'

/** Tenta extrair a foto de perfil pública via og:image do perfil do Instagram */
async function scrapeInstagramAvatar(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    })

    if (!res.ok) return null

    const html = await res.text()

    // og:image pode vir em duas ordens de atributos
    const match =
      html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) ??
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)

    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const { id } = await params

    const { data: account, error: fetchError } = await supabase
      .from('instagram_accounts')
      .select('id, username, ig_user_id, access_token')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    let profilePictureUrl: string | null = null

    // Estratégia 1: Instagram Graph API (contas conectadas ao Meta)
    if (account.ig_user_id && account.access_token) {
      try {
        const token = decryptToken(account.access_token)
        const res = await fetch(
          `https://graph.instagram.com/v21.0/${account.ig_user_id}?fields=profile_picture_url&access_token=${token}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const data = (await res.json()) as { profile_picture_url?: string }
          profilePictureUrl = data.profile_picture_url ?? null
        }
      } catch {
        // Fallback para scraping
      }
    }

    // Estratégia 2: Scraping da página pública
    if (!profilePictureUrl) {
      profilePictureUrl = await scrapeInstagramAvatar(account.username)
    }

    if (!profilePictureUrl) {
      return NextResponse.json(
        {
          error:
            'Não foi possível obter a foto de perfil. Verifique se o perfil é público ou conecte a conta ao Meta.',
        },
        { status: 422 },
      )
    }

    const { error: updateError } = await supabase
      .from('instagram_accounts')
      .update({
        profile_picture_url: profilePictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ profile_picture_url: profilePictureUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar foto de perfil'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
