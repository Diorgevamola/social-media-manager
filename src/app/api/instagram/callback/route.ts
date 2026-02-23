import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramUserProfile,
} from '@/lib/instagram/client'
import { encryptToken } from '@/lib/token-crypto'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (errorParam) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent('Autorização negada pelo usuário')}`,
    )
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent('Parâmetros inválidos no callback')}`,
    )
  }

  let accountId: string
  let userId: string
  try {
    const parsed = JSON.parse(Buffer.from(stateParam, 'base64').toString())
    accountId = parsed.accountId
    userId = parsed.userId
    if (!accountId || !userId) throw new Error('state inválido')
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent('State OAuth inválido')}`,
    )
  }

  const redirectUri = `${appUrl}/api/instagram/callback`

  try {
    // 1. Token de curta duração via Instagram API direta (sem Facebook Pages)
    const { access_token: shortToken } = await exchangeCodeForToken(code, redirectUri)

    // 2. Token de longa duração (~60 dias) via graph.instagram.com
    const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken)

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // 3. Busca user_id e username diretamente do Instagram (sem precisar de Página do Facebook)
    const { user_id: igUserId } = await getInstagramUserProfile(longToken)

    // 4. Busca foto de perfil via Graph API (best-effort — não bloqueia o fluxo)
    let profilePictureUrl: string | null = null
    try {
      const picRes = await fetch(
        `https://graph.instagram.com/v21.0/${igUserId}?fields=profile_picture_url&access_token=${longToken}`,
        { cache: 'no-store' },
      )
      if (picRes.ok) {
        const picData = (await picRes.json()) as { profile_picture_url?: string }
        profilePictureUrl = picData.profile_picture_url ?? null
      }
    } catch { /* silently ignore */ }

    // 5. Salva no banco
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('instagram_accounts')
      .update({
        access_token: encryptToken(longToken),
        token_expires_at: tokenExpiresAt,
        ig_user_id: igUserId,
        facebook_page_id: null, // não utilizado no novo fluxo
        ...(profilePictureUrl ? { profile_picture_url: profilePictureUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('user_id', userId)

    if (updateError) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/accounts?error=${encodeURIComponent('Erro ao salvar token: ' + updateError.message)}`,
      )
    }

    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?success=${encodeURIComponent('Conta conectada ao Instagram com sucesso!')}`,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent(message)}`,
    )
  }
}
