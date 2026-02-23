import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-key-auth'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import type { SchedulePost } from '@/types/schedule'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const schema = z.object({
  scheduleId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  postType: z.enum(['post', 'reel', 'carousel', 'story', 'story_sequence']),
  accountId: z.string().uuid(),
  description: z.string().max(500).optional(),
})

const POST_TYPE_LABELS: Record<string, string> = {
  post: 'post estático (imagem)',
  reel: 'reel (vídeo curto)',
  carousel: 'carrossel (múltiplos slides 4:5)',
  story: 'story (formato vertical 9:16)',
  story_sequence: 'sequência de stories (múltiplos frames 9:16)',
}

function buildPrompt(params: {
  postType: string
  date: string
  username: string
  niche: string
  brand_voice: string
  main_goal: string
  target_audience: string | null
  color_palette: string[] | null
  negative_words: string[] | null
  description?: string
}) {
  const { postType, date, username, niche, brand_voice, main_goal, target_audience, color_palette, negative_words, description } = params
  const hasPalette = color_palette && color_palette.length > 0
  const typeLabel = POST_TYPE_LABELS[postType] ?? postType

  const visualSchema = `{
    "headline": "título curto e impactante",
    "subline": "subtítulo ou null",
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "fonts": { "headline": "NomeFonte", "body": "NomeFonte" },
    "image_description": "descrição detalhada da imagem/cena",
    "background": "descrição do fundo"
  }`

  const carouselVisualSchema = `{
    "headline": "título do carrossel",
    "subline": "subtítulo ou null",
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "fonts": { "headline": "NomeFonte", "body": "NomeFonte" },
    "image_description": "descrição visual geral",
    "background": "descrição do fundo",
    "slides": [
      { "slide_number": 1, "headline": "título slide 1", "description": "conteúdo do slide 1", "image_description": "cena visual slide 1" },
      { "slide_number": 2, "headline": "título slide 2", "description": "conteúdo do slide 2", "image_description": "cena visual slide 2" },
      { "slide_number": 3, "headline": "título slide 3", "description": "conteúdo do slide 3", "image_description": "cena visual slide 3" }
    ]
  }`

  const scriptSchema = `{
    "duration": "15s",
    "hook": "frase de abertura impactante",
    "scenes": [
      { "time": "0-5s", "visual": "descrição da cena", "narration": "narração", "text_overlay": "texto na tela ou null" },
      { "time": "5-12s", "visual": "descrição da cena", "narration": "narração", "text_overlay": null }
    ],
    "cta": "chamada para ação final"
  }`

  const isReel = postType === 'reel'
  const isCarousel = postType === 'carousel'
  const isStorySequence = postType === 'story_sequence'

  const storySequenceVisualSchema = `{
    "headline": "tema geral da sequência",
    "subline": "subtítulo ou null",
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "fonts": { "headline": "NomeFonte", "body": "NomeFonte" },
    "image_description": "descrição visual geral da sequência",
    "background": "descrição do fundo",
    "slides": [
      { "slide_number": 1, "headline": "título frame 1", "description": "conteúdo do frame 1", "image_description": "cena vertical 9:16 frame 1" },
      { "slide_number": 2, "headline": "título frame 2", "description": "conteúdo do frame 2", "image_description": "cena vertical 9:16 frame 2" },
      { "slide_number": 3, "headline": "título frame 3", "description": "conteúdo do frame 3", "image_description": "cena vertical 9:16 frame 3" }
    ]
  }`

  const contentField = isReel
    ? `"script": ${scriptSchema}`
    : isCarousel
      ? `"visual": ${carouselVisualSchema}`
      : isStorySequence
        ? `"visual": ${storySequenceVisualSchema}`
        : `"visual": ${visualSchema}`

  return `Você é um estrategista de conteúdo para Instagram especializado em ${niche}.

Gere um ${typeLabel} para a data ${date}.
Conta: @${username}
Nicho: ${niche}
Tom de voz: ${brand_voice}
Meta principal: ${main_goal}
${target_audience ? `Público-alvo: ${target_audience}` : ''}
Paleta de cores da marca: ${hasPalette ? color_palette.join(', ') + ' — USE ESTAS CORES no campo color_palette do briefing visual' : 'não definida (use cores adequadas ao nicho)'}
${negative_words && negative_words.length > 0 ? `PALAVRAS PROIBIDAS (NUNCA use estas palavras): ${negative_words.join(', ')}` : ''}
${description ? `\nDireção criativa do usuário (SIGA ESTA DIREÇÃO para criar o conteúdo):\n"${description}"\n` : ''}
Retorne APENAS um JSON válido com esta estrutura (sem markdown, sem \`\`\`):
{
  "type": "${postType}",
  "time": "HH:MM",
  "theme": "tema ou assunto principal do conteúdo",
  "caption": "legenda completa para o post com emojis e hashtags",
  "content_pillar": "pilar de conteúdo (ex: Educação, Entretenimento, Vendas)",
  "seasonal_hook": "gancho sazonal relevante ou null",
  ${contentField}
}`
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, supabase } = auth

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { scheduleId, date, postType, accountId, description } = parsed.data

    // Verify scheduleId belongs to the user
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('id')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Cronograma não encontrado' }, { status: 404 })
    }

    // Fetch account info
    const { data: account, error: accountError } = await supabase
      .from('instagram_accounts')
      .select('username, niche, brand_voice, main_goal, target_audience, color_palette, negative_words')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: accountError ? `Erro ao buscar conta: ${accountError.message}` : 'Conta não encontrada' },
        { status: 404 },
      )
    }

    // Build prompt and call Gemini
    const prompt = buildPrompt({
      postType,
      date,
      username: account.username,
      niche: account.niche ?? 'geral',
      brand_voice: account.brand_voice,
      main_goal: account.main_goal,
      target_audience: account.target_audience as string | null,
      color_palette: (account.color_palette as string[] | null) ?? null,
      negative_words: (account.negative_words as string[] | null) ?? null,
      description,
    })

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } },
    })
    const text = result.text ?? ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Falha ao parsear resposta da IA' }, { status: 500 })
    }

    const post = JSON.parse(jsonMatch[0]) as SchedulePost

    // Insert into schedule_posts
    const { data: savedPost, error: insertError } = await supabase
      .from('schedule_posts')
      .insert({
        schedule_id: scheduleId,
        user_id: userId,
        date,
        post_type: post.type,
        time: post.time ?? null,
        theme: post.theme,
        caption: post.caption ?? null,
        content_pillar: post.content_pillar ?? null,
        seasonal_hook: post.seasonal_hook ?? null,
        visual_data: post.visual ? (post.visual as unknown as Record<string, unknown>) : null,
        script_data: post.script ? (post.script as unknown as Record<string, unknown>) : null,
      })
      .select('id')
      .single()

    if (insertError || !savedPost) {
      return NextResponse.json({ error: 'Erro ao salvar post' }, { status: 500 })
    }

    return NextResponse.json({ post, postId: savedPost.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
