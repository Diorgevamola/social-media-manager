import type { AIGeneratedContent } from '@/types/instagram'
import type { PostType } from '@/types/database'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'moonshotai/kimi-k2.5'

function getHeaders() {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }
  return {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function callOpenRouter(prompt: string): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0].message.content
}

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

  const text = await callOpenRouter(prompt)

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

  const text = await callOpenRouter(prompt)

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
}): Promise<
  Array<{
    day: string
    post_type: PostType
    topic: string
    content_idea: string
  }>
> {
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

  const text = await callOpenRouter(prompt)

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

  const text = await callOpenRouter(prompt)

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []

  const parsed = JSON.parse(jsonMatch[0]) as { hashtags: string[] }
  return parsed.hashtags
}

export interface CaptionRequest {
  topic: string
  tone: 'professional' | 'casual' | 'funny' | 'inspirational' | 'educational'
  postType: 'post' | 'carousel' | 'reel'
  niche: string
  language?: string
  additionalContext?: string
}

export interface CaptionResponse {
  captions: string[]
  cta: string
}

export interface HashtagRequest {
  topic: string
  niche: string
  count?: number
}

export interface HashtagResponse {
  hashtags: string[]
  categories: {
    high: string[]
    medium: string[]
    niche: string[]
  }
}

export interface ContentIdeaRequest {
  niche: string
  postType: 'post' | 'carousel' | 'reel'
  count?: number
  recentTopics?: string[]
}

export interface ContentIdeaResponse {
  ideas: Array<{
    title: string
    description: string
    hook: string
  }>
}

export async function generateCaptions(request: CaptionRequest): Promise<CaptionResponse> {
  const toneMap: Record<string, string> = {
    professional: 'profissional e corporativo',
    casual: 'casual e descontraido',
    funny: 'divertido e com humor',
    inspirational: 'inspirador e motivacional',
    educational: 'educativo e informativo',
  }

  const typeMap: Record<string, string> = {
    post: 'post de imagem unica',
    carousel: 'carrossel (com slides)',
    reel: 'reel (video curto)',
  }

  const prompt = `Voce e um especialista em social media para Instagram.
Gere 3 opcoes de caption para um ${typeMap[request.postType]} sobre "${request.topic}" no nicho de ${request.niche}.

Tom: ${toneMap[request.tone]}
${request.language ? `Idioma: ${request.language}` : 'Idioma: Portugues brasileiro'}
${request.additionalContext ? `Contexto adicional: ${request.additionalContext}` : ''}

Regras:
- Cada caption deve ter entre 100-300 caracteres
- Inclua emojis relevantes
- Comece com um hook que prenda atencao
- Termine com um CTA (call to action)
- Nao inclua hashtags na caption

Responda APENAS em JSON valido com este formato:
{
  "captions": ["caption1", "caption2", "caption3"],
  "cta": "sugestao de call to action"
}`

  const text = await callOpenRouter(prompt)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response')
  }
  return JSON.parse(jsonMatch[0]) as CaptionResponse
}

export async function generateHashtagsServer(
  request: HashtagRequest,
): Promise<HashtagResponse> {
  const count = request.count ?? 30

  const prompt = `Voce e um especialista em hashtags de Instagram.
Gere ${count} hashtags relevantes para o tema "${request.topic}" no nicho de ${request.niche}.

Regras:
- Divida em 3 categorias: alto volume (popular), medio volume, e nicho especifico
- Cada hashtag deve comecar com #
- Inclua mix de hashtags em portugues e ingles
- Nao use hashtags banidas ou shadow-banned pelo Instagram

Responda APENAS em JSON valido com este formato:
{
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "categories": {
    "high": ["#popular1", "#popular2", ...],
    "medium": ["#medio1", "#medio2", ...],
    "niche": ["#nicho1", "#nicho2", ...]
  }
}`

  const text = await callOpenRouter(prompt)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response')
  }
  return JSON.parse(jsonMatch[0]) as HashtagResponse
}

export async function generateContentIdeas(
  request: ContentIdeaRequest,
): Promise<ContentIdeaResponse> {
  const count = request.count ?? 5

  const typeMap: Record<string, string> = {
    post: 'posts de imagem',
    carousel: 'carrosseis educativos',
    reel: 'reels (videos curtos)',
  }

  const prompt = `Voce e um estrategista de conteudo para Instagram.
Gere ${count} ideias de conteudo para ${typeMap[request.postType]} no nicho de ${request.niche}.

${request.recentTopics?.length ? `Topicos recentes (evitar repeticao): ${request.recentTopics.join(', ')}` : ''}

Para cada ideia, forneca:
- Titulo curto e direto
- Descricao de 1-2 frases do conteudo
- Hook inicial (primeira frase para prender atencao)

Responda APENAS em JSON valido com este formato:
{
  "ideas": [
    {
      "title": "titulo",
      "description": "descricao",
      "hook": "hook inicial"
    }
  ]
}`

  const text = await callOpenRouter(prompt)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response')
  }
  return JSON.parse(jsonMatch[0]) as ContentIdeaResponse
}
