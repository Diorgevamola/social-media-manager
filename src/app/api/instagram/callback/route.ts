import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
  getInstagramBusinessAccount,
} from '@/lib/instagram/client'

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
    // 1. Token de curta duração
    const { access_token: shortToken } = await exchangeCodeForToken(code, redirectUri)

    // 2. Token de longa duração (~60 dias)
    const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken)

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // 3. Páginas do Facebook vinculadas ao usuário
    const pages = await getUserPages(longToken)

    if (!pages.data || pages.data.length === 0) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/accounts?error=${encodeURIComponent('Nenhuma Página do Facebook encontrada. Vincule uma Página ao seu perfil.')}`,
      )
    }

    // 4. Encontrar a conta Business do Instagram vinculada a uma das páginas
    let igUserId: string | null = null
    let facebookPageId: string | null = null
    let pageAccessToken: string | null = null

    for (const page of pages.data) {
      const igData = await getInstagramBusinessAccount(page.access_token, page.id)
      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id
        facebookPageId = page.id
        pageAccessToken = page.access_token
        break
      }
    }

    // Usa o token da página se disponível (maior escopo de publicação), caso contrário o user token
    const finalToken = pageAccessToken ?? longToken

    if (!igUserId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/accounts?error=${encodeURIComponent('Nenhuma conta Instagram Business encontrada nas suas Páginas do Facebook')}`,
      )
    }

    // 5. Salva no banco — verifica que a conta pertence ao userId do state
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('instagram_accounts')
      .update({
        access_token: finalToken,
        token_expires_at: tokenExpiresAt,
        ig_user_id: igUserId,
        facebook_page_id: facebookPageId,
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
      `${appUrl}/dashboard/accounts?success=${encodeURIComponent('Conta conectada ao Meta com sucesso!')}`,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent(message)}`,
    )
  }
}
