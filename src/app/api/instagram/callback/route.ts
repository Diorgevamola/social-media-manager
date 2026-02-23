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

  // DEBUG — remover após diagnóstico
  console.error('[IG-CALLBACK] appUrl:', appUrl)
  console.error('[IG-CALLBACK] redirectUri:', redirectUri)
  console.error('[IG-CALLBACK] code length:', code?.length)

  try {
    // 1. Token de curta duração via Instagram API direta (sem Facebook Pages)
    const { access_token: shortToken } = await exchangeCodeForToken(code, redirectUri)

    // 2. Token de longa duração (~60 dias) via graph.instagram.com
    const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken)

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // 3. Busca user_id e username diretamente do Instagram (sem precisar de Página do Facebook)
    const { user_id: igUserId } = await getInstagramUserProfile(longToken)

    // 4. Salva no banco
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('instagram_accounts')
      .update({
        access_token: encryptToken(longToken),
        token_expires_at: tokenExpiresAt,
        ig_user_id: igUserId,
        facebook_page_id: null, // não utilizado no novo fluxo
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
    // DEBUG: return full details as JSON temporarily
    const igErr = err as Record<string, unknown>
    return NextResponse.json({
      error: message,
      redirectUri,
      appUrl,
      igRawResponse: igErr.igRawResponse,
      igStatus: igErr.igStatus,
      codeLength: code?.length,
    }, { status: 400 })
  }
}
