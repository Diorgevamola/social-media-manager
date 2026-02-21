import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIGeneratedContent } from '@/types/instagram'
import type { PostType } from '@/types/database'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export interface InstagramProfileResearch {
  username: string
  display_name: string
  bio: string
  niche: string
  tone: string
  target_audience: string
  content_pillars: string[]
  followers_count: number
  posts_count: number
}

export async function researchInstagramProfile(
  username: string,
): Promise<InstagramProfileResearch> {
  const searchModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ googleSearch: {} }] as any,
  })

  const prompt = `Pesquise o perfil do Instagram @${username} e retorne informações detalhadas sobre ele.

Analise o perfil buscando por:
- Nome de exibição (display name)
- Bio/descrição do perfil
- Nicho de conteúdo (fitness, moda, tecnologia, gastronomia, viagem, negócios, educação, lifestyle, beleza, arte, etc.)
- Tom de voz usado nos posts (formal, descontraído, inspiracional, humorístico, educativo, profissional, etc.)
- Público-alvo (faixa etária, interesses, gênero, etc.)
- Pilares de conteúdo (temas recorrentes dos posts)
- Número aproximado de seguidores
- Número aproximado de posts

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "username": "${username}",
  "display_name": "nome de exibição do perfil",
  "bio": "bio do perfil do instagram",
  "niche": "nicho principal (uma palavra ou duas)",
  "tone": "tom de voz descritivo",
  "target_audience": "descrição do público-alvo",
  "content_pillars": ["pilar1", "pilar2", "pilar3"],
  "followers_count": 0,
  "posts_count": 0
}

Se não encontrar alguma informação específica, use valores razoáveis baseados no que encontrou.
Para followers_count e posts_count, use números inteiros (sem ponto ou vírgula).`

  const result = await searchModel.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI não retornou JSON válido')
  }

  const parsed = JSON.parse(jsonMatch[0]) as InstagramProfileResearch
  return parsed
}

interface GenerateContentOptions {
  postType: PostType
  topic: string
  tone?: string
  niche?: string
  language?: string
  additionalContext?: string
}

export async function generateInstagramContent(
  options: GenerateContentOptions,
): Promise<AIGeneratedContent> {
  const {
    postType,
    topic,
    tone = 'profissional e engajador',
    niche = 'geral',
    language = 'português',
    additionalContext = '',
  } = options

  const postTypeLabel = ({
    post: 'post de imagem',
    carousel: 'carrossel (múltiplas imagens)',
    reel: 'reel (vídeo curto)',
    story: 'story (conteúdo de 24h)',
  } as Record<string, string>)[postType]

  const prompt = `Você é um especialista em marketing de conteúdo para Instagram.

Crie conteúdo para um ${postTypeLabel} sobre: ${topic}

Configurações:
- Tom: ${tone}
- Nicho: ${niche}
- Idioma: ${language}
${additionalContext ? `- Contexto adicional: ${additionalContext}` : ''}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "caption": "legenda completa para o post (máximo 2200 caracteres)",
  "hashtags": ["hashtag1", "hashtag2", ...] (30 hashtags relevantes sem #),
  "content_ideas": ["ideia1", "ideia2", "ideia3"] (3 ideias de conteúdo visual),
  "cta": "call to action específico para este post"
}

Regras:
- A legenda deve ser envolvente e adequada para ${postTypeLabel}
- Use emojis estrategicamente
- As hashtags devem misturar populares e de nicho
- As ideias visuais devem ser específicas e criativas
- O CTA deve ser ativo e específico`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON')
  }

  const parsed = JSON.parse(jsonMatch[0]) as AIGeneratedContent
  return parsed
}

export async function generateContentCalendar(options: {
  niche: string
  postsPerWeek: number
  weeks: number
  themes?: string[]
}): Promise<Array<{
  day: string
  post_type: PostType
  topic: string
  content_idea: string
}>> {
  const { niche, postsPerWeek, weeks, themes = [] } = options

  const prompt = `Você é um estrategista de conteúdo para Instagram.

Crie um calendário de conteúdo para ${weeks} semanas, com ${postsPerWeek} posts por semana.

Nicho: ${niche}
${themes.length > 0 ? `Temas/campanhas: ${themes.join(', ')}` : ''}

Retorne APENAS um JSON válido com esta estrutura:
{
  "calendar": [
    {
      "day": "2024-01-15",
      "post_type": "post|carousel|reel",
      "topic": "tópico do post",
      "content_idea": "descrição breve da ideia visual"
    }
  ]
}

Gere exatamente ${postsPerWeek * weeks} itens no array.
Varie os tipos de post (post, carousel, reel) de forma estratégica.
Os tópicos devem ser específicos e relevantes para o nicho.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON')
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    calendar: Array<{
      day: string
      post_type: PostType
      topic: string
      content_idea: string
    }>
  }

  return parsed.calendar
}

export async function generateHashtags(topic: string, niche: string): Promise<string[]> {
  const prompt = `Gere 30 hashtags para Instagram sobre "${topic}" no nicho "${niche}".

Mix: 10 hashtags grandes (1M+), 10 médias (100K-1M), 10 pequenas (10K-100K).

Retorne APENAS um JSON: { "hashtags": ["hashtag1", ...] } sem o símbolo #`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []

  const parsed = JSON.parse(jsonMatch[0]) as { hashtags: string[] }
  return parsed.hashtags
}
