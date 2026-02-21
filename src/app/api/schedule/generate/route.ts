import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logAiUsage } from '@/lib/log-ai-usage'
import { z } from 'zod'
import { addDays, format, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ScheduleDay } from '@/types/schedule'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

const POST_TYPE_LABELS: Record<string, string> = {
  post: 'Post estático',
  reel: 'Reel',
  carousel: 'Carrossel',
  story: 'Story',
  story_sequence: 'Sequência de Stories',
}

const slotSchema = z.object({
  type: z.enum(['post', 'reel', 'carousel', 'story', 'story_sequence']),
  timeMode: z.enum(['auto', 'manual']),
  time: z.string().optional(),
  slides: z.number().int().min(2).max(10).optional(),
})

const schema = z.object({
  accountId: z.string().uuid(),
  period: z.enum(['7', '15', '30']),
  dayConfig: z.record(
    z.enum(['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']),
    z.array(slotSchema),
  ),
})

/** Finds the closing brace/bracket of a JSON object/array starting at `start`. */
function findObjectEnd(str: string, start: number): number {
  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < str.length; i++) {
    const c = str[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

export async function POST(request: Request) {
  // Auth + validation errors must return JSON (stream hasn't started yet)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { accountId, period, dayConfig } = parsed.data

    const { data: account, error: accountError } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    const periodDays = parseInt(period)
    const startDate = new Date()

    type SlotConfig = { type: string; timeMode: 'auto' | 'manual'; time?: string; slides?: number }
    const days: Array<{ date: Date; dayName: string; slots: SlotConfig[] }> = []

    for (let i = 0; i < periodDays; i++) {
      const date = addDays(startDate, i)
      const dayIndex = getDay(date)
      const dayName = DAY_NAMES[dayIndex]
      const slots = dayConfig[dayName as keyof typeof dayConfig] ?? []
      if (slots.length > 0) {
        days.push({ date, dayName, slots })
      }
    }

    if (days.length === 0) {
      return NextResponse.json({ error: 'Nenhum dia configurado com posts' }, { status: 400 })
    }

    const pillars = account.content_pillars?.join(', ') || 'geral'
    const postsSchedule = days.map(d => ({
      date: format(d.date, 'yyyy-MM-dd'),
      date_label: format(d.date, "EEEE, dd 'de' MMMM", { locale: ptBR }),
      slots: d.slots,
    }))

    const colorPaletteStr = (account.color_palette as string[] | null)?.filter(Boolean)
    const hasPalette = colorPaletteStr && colorPaletteStr.length > 0
    const negativeWords = (account.negative_words as string[] | null)?.filter(Boolean) ?? []

    const prompt = `Você é um estrategista de conteúdo e diretor de arte para Instagram especializado em ${account.niche || 'conteúdo geral'}.

PERFIL:
- Username: @${account.username}
- Nicho: ${account.niche || 'geral'}
- Público-alvo: ${account.target_audience || 'geral'}
- Tom de voz: ${account.brand_voice}
- Objetivo principal: ${account.main_goal}
- Pilares de conteúdo: ${pillars}
- Notas estratégicas: ${account.strategic_notes || 'nenhuma'}
- Paleta de cores da marca: ${hasPalette ? colorPaletteStr.join(', ') + ' — USE ESTAS CORES como base dos color_palette nos briefings visuais' : 'não definida (use cores que combinem com o nicho e tom de voz)'}
${negativeWords.length > 0 ? `- PALAVRAS PROIBIDAS (NUNCA use estas palavras em nenhum conteúdo gerado): ${negativeWords.join(', ')}` : ''}

PERÍODO: ${periodDays} dias a partir de hoje (${format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })})

CRONOGRAMA DE POSTS A PLANEJAR:
${postsSchedule.map(d =>
  `- ${d.date_label} (${d.date}):\n` +
  d.slots.map(s => {
    const typeLabel = (s.type === 'carousel' || s.type === 'story_sequence') && s.slides
      ? `${POST_TYPE_LABELS[s.type]} (${s.slides} frames)`
      : POST_TYPE_LABELS[s.type]
    const timeLabel = s.timeMode === 'manual' && s.time
      ? ` → horário FIXO definido pelo usuário: ${s.time} (use EXATAMENTE este valor no campo "time")`
      : ` → horário a otimizar pela IA (escolha o melhor horário para este tipo de conteúdo e público)`
    return `  • ${typeLabel}${timeLabel}`
  }).join('\n')
).join('\n')}

INSTRUÇÕES GERAIS:
1. Para cada slot, crie conteúdo específico, criativo e alinhado ao perfil
2. Considere datas sazonais, feriados e eventos relevantes para o nicho neste período
3. Distribua os pilares de conteúdo de forma equilibrada
4. Use o tom de voz "${account.brand_voice}" em todas as descrições
5. Para horários: se marcado como "horário FIXO", use EXATAMENTE aquele valor no campo "time". Se marcado como "horário a otimizar pela IA", sugira o melhor horário baseado no tipo de conteúdo, nicho e comportamento do público-alvo (ex: reels às 18:00-20:00, posts às 09:00-11:00, stories às 07:00-08:00)

INSTRUÇÕES POR TIPO:
- POST ESTÁTICO: É uma ÚNICA imagem estática. NUNCA mencione "carrossel", "slides", "swipe" ou múltiplas imagens. Gere um briefing visual para uma única foto/arte com:
  • headline: título impactante para o designer (até 8 palavras)
  • subline: subtítulo complementar (até 12 palavras)
  • color_palette: array com 3-4 códigos hex que representam a identidade visual ideal
  • fonts: headline_font e body_font (nomes de fontes Google Fonts adequadas ao tom)
  • image_description: descrição detalhada de UMA ÚNICA imagem/foto (cenário, composição, lighting, elementos visuais) — jamais descreva múltiplos slides ou sequências
  • background: descrição do fundo (cor sólida, gradiente com hex codes, textura ou estilo)

- CARROSSEL: São múltiplos slides com sequência narrativa. O número de slides está indicado entre parênteses no cronograma (ex: "Carrossel (5 slides)"). Gere um briefing visual com:
  • headline: título impactante para a capa (até 8 palavras)
  • subline: subtítulo da capa (até 12 palavras)
  • color_palette: array com 3-4 códigos hex da identidade visual do carrossel
  • fonts: headline_font e body_font (nomes de fontes Google Fonts adequadas ao tom)
  • image_description: descrição visual da capa (primeiro slide)
  • background: descrição do fundo padrão dos slides
  • slides: array com EXATAMENTE o número de slides indicado. Cada item:
    { "slide_number": N, "headline": "título do slide", "description": "o que este slide comunica", "image_description": "descrição detalhada da imagem deste slide específico" }

- STORY: É UMA ÚNICA imagem vertical (9:16) efêmera. NUNCA mencione sequência, múltiplos frames ou slides. Gere um briefing visual com:
  • headline: título impactante para o designer (até 8 palavras)
  • subline: subtítulo complementar (até 12 palavras)
  • color_palette: array com 3-4 códigos hex da identidade visual
  • fonts: headline_font e body_font (nomes de fontes Google Fonts adequadas ao tom)
  • image_description: descrição detalhada de UM ÚNICO story em formato vertical 9:16 (cenário, composição, elementos visuais)
  • background: descrição do fundo

- SEQUÊNCIA DE STORIES: São múltiplos stories verticais (9:16) publicados em sequência, como um carrossel mas no formato story. O número de frames está indicado entre parênteses (ex: "Sequência de Stories (4 frames)"). Gere um briefing visual com:
  • headline: título da sequência (até 8 palavras)
  • subline: subtítulo ou null
  • color_palette: array com 3-4 códigos hex da identidade visual (consistente em toda a sequência)
  • fonts: headline_font e body_font (nomes de fontes Google Fonts)
  • image_description: descrição visual do primeiro frame
  • background: descrição do fundo padrão de todos os frames
  • slides: array com EXATAMENTE o número de frames indicado. Cada item:
    { "slide_number": N, "headline": "título deste frame", "description": "o que este frame comunica", "image_description": "descrição visual detalhada deste frame em formato 9:16" }

- REEL: Gere um roteiro de vídeo completo com:
  • duration: duração estimada em segundos (ex: "30s", "45s", "60s")
  • hook: frase de abertura irresistível para os primeiros 3 segundos
  • scenes: array de cenas com time (timestamp), visual (o que aparece na tela), narration (o que falar/texto), text_overlay (texto na tela ou null)
  • cta: chamada para ação no final

REGRA CRÍTICA — TIPOS DE POST:
- Se o slot indicar "Post estático" → use "type": "post" com campo "visual" (SEM slides)
- Se o slot indicar "Carrossel" → use "type": "carousel" com campo "visual" contendo array "slides"
- Se o slot indicar "Story" → use "type": "story" com campo "visual" (SEM slides — UMA ÚNICA imagem)
- Se o slot indicar "Sequência de Stories" → use "type": "story_sequence" com campo "visual" contendo array "slides" em formato 9:16
- Se o slot indicar "Reel" → use "type": "reel" com campo "script" (SEM visual)
NUNCA misture os tipos. O campo "type" deve refletir EXATAMENTE o tipo do slot.

Retorne APENAS um JSON válido com esta estrutura exata (contém exemplos dos 5 tipos):
{
  "schedule": [
    {
      "date": "2026-02-23",
      "day_label": "segunda-feira, 23 de fevereiro",
      "posts": [
        {
          "type": "post",
          "time": "09:00",
          "theme": "título do tema (max 60 chars)",
          "caption": "legenda completa pronta para usar com emojis e hashtags",
          "content_pillar": "qual pilar de conteúdo",
          "seasonal_hook": "data sazonal relevante ou null",
          "visual": {
            "headline": "Headline para o designer",
            "subline": "Subline complementar ou null",
            "color_palette": ["#1A1A2E", "#16213E", "#0F3460", "#E94560"],
            "fonts": {
              "headline": "Playfair Display",
              "body": "Inter"
            },
            "image_description": "Descrição detalhada de UMA ÚNICA imagem para este post",
            "background": "Gradiente suave de #1A1A2E para #0F3460"
          }
        },
        {
          "type": "carousel",
          "time": "11:00",
          "theme": "título do carrossel (max 60 chars)",
          "caption": "legenda completa pronta para usar com emojis e hashtags",
          "content_pillar": "qual pilar de conteúdo",
          "seasonal_hook": null,
          "visual": {
            "headline": "Headline da capa do carrossel",
            "subline": "Subtítulo da capa ou null",
            "color_palette": ["#1A1A2E", "#16213E", "#0F3460"],
            "fonts": {
              "headline": "Playfair Display",
              "body": "Inter"
            },
            "image_description": "Descrição visual da capa (slide 1)",
            "background": "Fundo padrão de todos os slides",
            "slides": [
              {
                "slide_number": 1,
                "headline": "Título do slide 1",
                "description": "O que este slide comunica ao leitor",
                "image_description": "Descrição visual detalhada deste slide"
              },
              {
                "slide_number": 2,
                "headline": "Título do slide 2",
                "description": "O que este slide comunica ao leitor",
                "image_description": "Descrição visual detalhada deste slide"
              }
            ]
          }
        },
        {
          "type": "story",
          "time": "08:00",
          "theme": "título do story (max 60 chars)",
          "caption": "legenda ou null",
          "content_pillar": "qual pilar de conteúdo",
          "seasonal_hook": null,
          "visual": {
            "headline": "Headline do story",
            "subline": "Subtítulo ou null",
            "color_palette": ["#1A1A2E", "#16213E", "#0F3460"],
            "fonts": {
              "headline": "Playfair Display",
              "body": "Inter"
            },
            "image_description": "Descrição detalhada do story vertical 9:16",
            "background": "Fundo do story"
          }
        },
        {
          "type": "story_sequence",
          "time": "07:00",
          "theme": "título da sequência (max 60 chars)",
          "caption": "legenda ou null",
          "content_pillar": "qual pilar de conteúdo",
          "seasonal_hook": null,
          "visual": {
            "headline": "Headline da sequência",
            "subline": "Subtítulo ou null",
            "color_palette": ["#1A1A2E", "#16213E", "#0F3460"],
            "fonts": {
              "headline": "Playfair Display",
              "body": "Inter"
            },
            "image_description": "Descrição do primeiro frame 9:16",
            "background": "Fundo padrão da sequência",
            "slides": [
              {
                "slide_number": 1,
                "headline": "Título do frame 1",
                "description": "O que este frame comunica",
                "image_description": "Descrição visual detalhada do frame 1 em formato 9:16"
              },
              {
                "slide_number": 2,
                "headline": "Título do frame 2",
                "description": "O que este frame comunica",
                "image_description": "Descrição visual detalhada do frame 2 em formato 9:16"
              }
            ]
          }
        },
        {
          "type": "reel",
          "time": "18:00",
          "theme": "título do tema (max 60 chars)",
          "caption": "legenda completa pronta para usar com emojis e hashtags",
          "content_pillar": "qual pilar de conteúdo",
          "seasonal_hook": null,
          "script": {
            "duration": "45s",
            "hook": "Frase de abertura irresistível para os primeiros 3s",
            "scenes": [
              {
                "time": "0-3s",
                "visual": "O que aparece na tela",
                "narration": "O que falar ou texto da legenda",
                "text_overlay": "Texto em destaque na tela ou null"
              }
            ],
            "cta": "Chamada para ação final"
          }
        }
      ]
    }
  ]
}`

    // Start streaming response
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          send({ type: 'start', totalDays: days.length })

          const geminiStream = await model.generateContentStream(prompt)
          let usageMeta: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined

          let buffer = ''
          let scanFrom = 0
          let foundScheduleArray = false
          let completedCount = 0

          for await (const chunk of geminiStream.stream) {
            const meta = chunk.usageMetadata
            if (meta) usageMeta = meta
            buffer += chunk.text()

            // Detect the start of the "schedule" array
            if (!foundScheduleArray) {
              const schedIdx = buffer.indexOf('"schedule"')
              if (schedIdx !== -1) {
                const arrIdx = buffer.indexOf('[', schedIdx)
                if (arrIdx !== -1) {
                  foundScheduleArray = true
                  scanFrom = arrIdx + 1
                }
              }
            }

            // Extract completed day objects from buffer
            if (foundScheduleArray) {
              let keepSearching = true
              while (keepSearching) {
                // Skip whitespace and commas
                let i = scanFrom
                while (i < buffer.length && ',\n\r\t '.includes(buffer[i])) i++

                // Expect start of a day object
                if (i >= buffer.length || buffer[i] !== '{') {
                  keepSearching = false
                  break
                }

                const end = findObjectEnd(buffer, i)
                if (end === -1) {
                  // Day object not complete yet — wait for more chunks
                  keepSearching = false
                  break
                }

                try {
                  const day = JSON.parse(buffer.slice(i, end + 1)) as ScheduleDay
                  completedCount++
                  send({ type: 'day', day, index: completedCount - 1 })
                } catch {
                  // Malformed JSON fragment — skip past it
                }

                scanFrom = end + 1
              }
            }
          }

          logAiUsage({
            userId: user.id,
            operationType: 'schedule',
            model: 'gemini-2.5-flash',
            inputTokens:  usageMeta?.promptTokenCount     ?? 0,
            outputTokens: usageMeta?.candidatesTokenCount ?? 0,
          })

          send({
            type: 'complete',
            account: {
              username: account.username,
              niche: account.niche,
              brand_voice: account.brand_voice,
              main_goal: account.main_goal,
            },
            period: periodDays,
            generated_at: new Date().toISOString(),
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao gerar cronograma'
          send({ type: 'error', message })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
