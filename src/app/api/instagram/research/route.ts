import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { researchInstagramProfile } from '@/lib/gemini/client'
import { logAiUsage } from '@/lib/log-ai-usage'

function extractUsername(input: string): string {
  // Handle full URL: https://www.instagram.com/username/ or https://instagram.com/username
  const urlMatch = input.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/)
  if (urlMatch) return urlMatch[1]

  // Handle @username or plain username
  return input.replace(/^@/, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { input: string }

    if (!body.input?.trim()) {
      return NextResponse.json(
        { error: 'Username ou link do Instagram é obrigatório' },
        { status: 400 },
      )
    }

    const username = extractUsername(body.input.trim())

    if (!username || username.length < 1) {
      return NextResponse.json(
        { error: 'Username inválido' },
        { status: 400 },
      )
    }

    const profile = await researchInstagramProfile(username)

    // Log AI usage (best-effort — no token count available for search model)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      logAiUsage({
        userId: user.id,
        operationType: 'research',
        model: 'gemini-2.5-flash',
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('[instagram/research] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao pesquisar perfil. Tente novamente.' },
      { status: 500 },
    )
  }
}
