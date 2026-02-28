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

async function callKimi(prompt: string): Promise<string> {
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

  const text = await callKimi(prompt)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response')
  }
  return JSON.parse(jsonMatch[0]) as CaptionResponse
}

export async function generateHashtags(request: HashtagRequest): Promise<HashtagResponse> {
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

  const text = await callKimi(prompt)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response')
  }
  return JSON.parse(jsonMatch[0]) as HashtagResponse
}

export async function generateContentIdeas(request: ContentIdeaRequest): Promise<ContentIdeaResponse> {
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

  const text = await callKimi(prompt)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response')
  }
  return JSON.parse(jsonMatch[0]) as ContentIdeaResponse
}
