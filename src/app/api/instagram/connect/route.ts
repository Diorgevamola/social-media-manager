import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstagramOAuthUrl } from '@/lib/instagram/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')

  if (!accountId) {
    return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Valida que a conta pertence ao usuário
  const { data: account } = await supabase
    .from('instagram_accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const state = Buffer.from(JSON.stringify({ accountId, userId: user.id })).toString('base64')
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`
  const url = getInstagramOAuthUrl(redirectUri, state)

  return NextResponse.redirect(url)
}
