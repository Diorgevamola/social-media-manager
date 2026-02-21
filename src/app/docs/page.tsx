'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Copy, Check, Key, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Param {
  name: string
  in: 'query' | 'body' | 'path'
  type: string
  required: boolean
  description: string
  example?: string
}

interface Endpoint {
  id: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  title: string
  description: string
  auth: boolean
  notes?: string[]
  params?: Param[]
  bodySchema?: string
  bodyExample?: string
  responseExample: string
  curlExtra?: string   // extra curl flags like -X POST or body
}

interface Section {
  id: string
  title: string
  description: string
  endpoints: Endpoint[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:5000'

const sections: Section[] = [
  {
    id: 'auth',
    title: 'Autenticação',
    description: 'Como autenticar requisições à API',
    endpoints: [],
  },
  {
    id: 'accounts',
    title: 'Contas Instagram',
    description: 'Gerencie as contas do Instagram conectadas à plataforma.',
    endpoints: [
      {
        id: 'list-accounts',
        method: 'GET',
        path: '/api/instagram/accounts',
        title: 'Listar contas',
        description: 'Retorna todas as contas do Instagram ativas do usuário autenticado, ordenadas por data de criação (mais recente primeiro).',
        auth: true,
        responseExample: `{
  "accounts": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "user_id": "uuid",
      "username": "minha_marca",
      "name": "Minha Marca Oficial",
      "niche": "moda feminina",
      "target_audience": "Mulheres 18-35, interessadas em moda e lifestyle",
      "brand_voice": "casual",
      "content_pillars": ["Inspiração", "Bastidores", "Promoções"],
      "posting_frequency": 5,
      "main_goal": "growth",
      "strategic_notes": "Foco em reels de trending",
      "color_palette": ["#FF6B6B", "#4ECDC4", "#45B7D1"],
      "negative_words": ["barato", "promoção"],
      "is_active": true,
      "created_at": "2026-02-15T10:30:00Z",
      "updated_at": "2026-02-20T08:00:00Z"
    }
  ]
}`,
      },
      {
        id: 'create-account',
        method: 'POST',
        path: '/api/instagram/accounts',
        title: 'Criar conta',
        description: 'Cria uma nova conta do Instagram na plataforma. O username deve ser único por usuário.',
        auth: true,
        notes: ['O campo `username` deve ser único por usuário. Retorna 409 se já existir.'],
        bodySchema: `{
  "username":          string   // obrigatório · max 30 chars
  "name":              string   // nome de exibição
  "biography":         string   // bio da conta
  "website":           string   // URL do site
  "niche":             string   // nicho de mercado
  "target_audience":   string   // descrição do público-alvo
  "brand_voice":       "professional" | "casual" | "inspirational" | "educational" | "funny"
  "content_pillars":   string[] // pilares de conteúdo (ex: ["Educação","Entretenimento"])
  "posting_frequency": number   // posts por semana (1–21)
  "main_goal":         "engagement" | "growth" | "sales" | "authority"
  "strategic_notes":   string   // notas estratégicas livres
  "color_palette":     string[] // cores em hex (ex: ["#FF6B6B","#4ECDC4"])
  "negative_words":    string[] // palavras proibidas no conteúdo
}`,
        bodyExample: `{
  "username": "minha_marca",
  "name": "Minha Marca",
  "niche": "moda feminina",
  "target_audience": "Mulheres 18-35",
  "brand_voice": "casual",
  "content_pillars": ["Inspiração", "Bastidores", "Promoções"],
  "posting_frequency": 5,
  "main_goal": "growth",
  "color_palette": ["#FF6B6B", "#4ECDC4"],
  "negative_words": ["barato"]
}`,
        responseExample: `{
  "account": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "minha_marca",
    "brand_voice": "casual",
    ...
  }
}`,
      },
      {
        id: 'update-account',
        method: 'PATCH',
        path: '/api/instagram/accounts/:id',
        title: 'Atualizar conta',
        description: 'Atualiza os campos de uma conta existente. Todos os campos são opcionais — envie apenas o que deseja alterar.',
        auth: true,
        params: [
          { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da conta a atualizar', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
        ],
        bodySchema: `// Todos os campos são opcionais
{
  "username":          string
  "name":              string | null
  "biography":         string | null
  "website":           string | null
  "niche":             string | null
  "target_audience":   string | null
  "brand_voice":       "professional" | "casual" | "inspirational" | "educational" | "funny"
  "content_pillars":   string[] | null
  "posting_frequency": number   // 1–21
  "main_goal":         "engagement" | "growth" | "sales" | "authority"
  "strategic_notes":   string | null
  "color_palette":     string[]
  "negative_words":    string[]
}`,
        bodyExample: `{
  "niche": "moda sustentável",
  "posting_frequency": 7,
  "color_palette": ["#2ECC71", "#27AE60", "#1ABC9C"]
}`,
        responseExample: `{
  "account": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "minha_marca",
    "niche": "moda sustentável",
    ...
  }
}`,
      },
    ],
  },
  {
    id: 'content',
    title: 'Posts de Conteúdo',
    description: 'Gerencie posts de conteúdo (rascunhos, planejados e publicados).',
    endpoints: [
      {
        id: 'list-posts',
        method: 'GET',
        path: '/api/content/posts',
        title: 'Listar posts',
        description: 'Retorna a lista de posts de conteúdo do usuário. Suporta filtros por status, tipo e limite de resultados.',
        auth: true,
        params: [
          { name: 'status', in: 'query', type: 'string', required: false, description: 'Filtra por status do post', example: 'planned' },
          { name: 'postType', in: 'query', type: 'string', required: false, description: 'Filtra por tipo do post', example: 'carousel' },
          { name: 'limit', in: 'query', type: 'number', required: false, description: 'Número máximo de resultados (padrão: 50, máx: 200)', example: '20' },
        ],
        responseExample: `{
  "posts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "account_id": "uuid | null",
      "post_type": "post",
      "caption": "Texto da legenda com #hashtags 🔥",
      "hashtags": ["marketing", "socialmedia"],
      "media_urls": ["https://..."],
      "notes": "Publicar às 19h",
      "status": "planned",
      "scheduled_at": "2026-02-25T19:00:00Z",
      "published_at": null,
      "ig_media_id": null,
      "created_at": "2026-02-20T10:00:00Z",
      "updated_at": "2026-02-20T10:00:00Z"
    }
  ]
}`,
      },
      {
        id: 'create-post',
        method: 'POST',
        path: '/api/content/posts',
        title: 'Criar post',
        description: 'Cria um novo post de conteúdo. Pode ser criado como rascunho (draft) e publicado depois.',
        auth: true,
        bodySchema: `{
  "post_type":    "post" | "carousel" | "reel"  // obrigatório
  "caption":      string | null                  // legenda do post
  "hashtags":     string[]                       // hashtags sem o #
  "media_urls":   string[]                       // URLs das mídias
  "notes":        string | null                  // notas internas
  "status":       "draft" | "planned" | "published"  // padrão: "draft"
  "scheduled_at": string | null                  // ISO datetime para agendamento
  "account_id":   string | null                  // UUID da conta Instagram
}`,
        bodyExample: `{
  "post_type": "carousel",
  "caption": "5 dicas para crescer no Instagram 🚀\\n\\n1. Poste consistentemente\\n2. Use Reels...\\n\\n#instagram #dicas #marketing",
  "hashtags": ["instagram", "dicas", "marketing"],
  "status": "planned",
  "scheduled_at": "2026-02-25T19:00:00Z",
  "account_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}`,
        responseExample: `{
  "post": {
    "id": "abc12345-1234-1234-1234-abc123456789",
    "post_type": "carousel",
    "caption": "5 dicas para crescer...",
    "status": "planned",
    "scheduled_at": "2026-02-25T19:00:00Z",
    "created_at": "2026-02-20T10:00:00Z"
  }
}`,
      },
      {
        id: 'update-post',
        method: 'PATCH',
        path: '/api/content/posts',
        title: 'Atualizar post',
        description: 'Atualiza um post existente. O campo `id` é obrigatório; os demais são opcionais.',
        auth: true,
        bodySchema: `{
  "id":           string  // obrigatório · UUID do post
  "post_type":    "post" | "carousel" | "reel"
  "caption":      string | null
  "hashtags":     string[]
  "media_urls":   string[]
  "notes":        string | null
  "status":       "draft" | "planned" | "published"
  "scheduled_at": string | null
  "account_id":   string | null
}`,
        bodyExample: `{
  "id": "abc12345-1234-1234-1234-abc123456789",
  "status": "published",
  "published_at": "2026-02-25T19:05:00Z"
}`,
        responseExample: `{
  "post": {
    "id": "abc12345-1234-1234-1234-abc123456789",
    "status": "published",
    ...
  }
}`,
      },
      {
        id: 'delete-post',
        method: 'DELETE',
        path: '/api/content/posts',
        title: 'Excluir post',
        description: 'Exclui permanentemente um post de conteúdo.',
        auth: true,
        params: [
          { name: 'id', in: 'query', type: 'uuid', required: true, description: 'ID do post a excluir', example: 'abc12345-1234-1234-1234-abc123456789' },
        ],
        responseExample: `{
  "success": true
}`,
      },
    ],
  },
  {
    id: 'schedule',
    title: 'Cronograma',
    description: 'Acesse e gerencie cronogramas de conteúdo gerados pela IA.',
    endpoints: [
      {
        id: 'get-schedule',
        method: 'GET',
        path: '/api/schedule/latest',
        title: 'Buscar cronograma atual',
        description: 'Retorna o cronograma mais recente de uma conta, incluindo todos os posts planejados com seus briefings visuais, scripts de reels e mídias geradas.',
        auth: true,
        params: [
          { name: 'accountId', in: 'query', type: 'uuid', required: true, description: 'ID da conta Instagram', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
        ],
        responseExample: `{
  "scheduleId": "sch-uuid-1234",
  "schedule": {
    "schedule": [
      {
        "date": "2026-02-23",
        "day_label": "segunda-feira, 23 de fevereiro",
        "posts": [
          {
            "type": "post",
            "time": "09:00",
            "theme": "Dica de produtividade da semana",
            "caption": "Começa a semana com foco! 🔥 ...",
            "content_pillar": "Educação",
            "seasonal_hook": null,
            "visual": {
              "headline": "Sua semana mais produtiva",
              "subline": "5 hábitos que vão mudar tudo",
              "color_palette": ["#1A1A2E", "#16213E", "#E94560"],
              "fonts": { "headline": "Playfair Display", "body": "Inter" },
              "image_description": "Pessoa em frente ao notebook...",
              "background": "Gradiente de #1A1A2E para #16213E"
            }
          },
          {
            "type": "reel",
            "time": "18:00",
            "theme": "Tendências da semana",
            "caption": "Você está por dentro? 👀 ...",
            "content_pillar": "Entretenimento",
            "seasonal_hook": null,
            "script": {
              "duration": "30s",
              "hook": "Você ainda não sabe disso?",
              "scenes": [
                { "time": "0-3s", "visual": "Zoom no rosto surpreso", "narration": "Para tudo!", "text_overlay": "PARA TUDO! 🛑" }
              ],
              "cta": "Salva esse vídeo para não esquecer!"
            }
          }
        ]
      }
    ],
    "account": {
      "username": "minha_marca",
      "niche": "moda feminina",
      "brand_voice": "casual",
      "main_goal": "growth"
    },
    "period": 7,
    "generated_at": "2026-02-20T10:00:00Z"
  },
  "mediaMap": {
    "2026-02-23::Dica de produtividade da semana": {
      "imageUrl": "https://...supabase.../schedule-media/...",
      "videoUrl": null,
      "postId": "post-uuid-1234"
    }
  }
}`,
      },
      {
        id: 'save-schedule',
        method: 'POST',
        path: '/api/schedule/save',
        title: 'Salvar cronograma',
        description: 'Persiste um cronograma gerado (pelo fluxo da IA) na base de dados. Cada post é salvo individualmente com seu tipo, hora, legenda e briefing visual/script.',
        auth: true,
        notes: [
          'Normalmente chamado automaticamente após geração pelo fluxo da plataforma.',
          'Pode ser usado para importar cronogramas criados externamente.',
        ],
        bodySchema: `{
  "accountId":    string    // obrigatório · UUID da conta
  "period":       7 | 15 | 30  // obrigatório · duração em dias
  "generated_at": string    // obrigatório · ISO datetime
  "schedule": [             // obrigatório · array de dias
    {
      "date":  "YYYY-MM-DD",
      "posts": [
        {
          "type":          "post" | "reel" | "carousel" | "story"
          "time":          "HH:MM"
          "theme":         string   // assunto do post (max 60 chars)
          "caption":       string   // legenda completa
          "content_pillar": string  // pilar de conteúdo
          "seasonal_hook": string | null
          "visual":  { ... }        // presente para post/carousel/story
          "script":  { ... }        // presente para reel
        }
      ]
    }
  ]
}`,
        bodyExample: `{
  "accountId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "period": 7,
  "generated_at": "2026-02-20T10:00:00Z",
  "schedule": [
    {
      "date": "2026-02-23",
      "posts": [
        {
          "type": "post",
          "time": "09:00",
          "theme": "Dica de segunda",
          "caption": "Começa a semana com foco! 🔥",
          "content_pillar": "Educação",
          "seasonal_hook": null,
          "visual": {
            "headline": "Segunda produtiva",
            "color_palette": ["#1A1A2E"],
            "image_description": "Workspace organizado..."
          }
        }
      ]
    }
  ]
}`,
        responseExample: `{
  "scheduleId": "sch-uuid-1234",
  "postsCount": 14
}`,
      },
      {
        id: 'delete-schedule-post',
        method: 'DELETE',
        path: '/api/schedule/posts/:id',
        title: 'Excluir post do cronograma',
        description: 'Exclui um post específico do cronograma **e remove automaticamente a mídia gerada** (imagem/vídeo) do Supabase Storage, evitando arquivos órfãos.',
        auth: true,
        notes: [
          'Remove tanto o registro do banco quanto o arquivo de mídia (imagem ou vídeo) do storage.',
          'Operação irreversível — a mídia gerada não pode ser recuperada.',
        ],
        params: [
          { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID do post no cronograma', example: 'post-uuid-1234' },
        ],
        responseExample: `{
  "ok": true
}`,
      },
    ],
  },
  {
    id: 'keys',
    title: 'Chaves de API',
    description: 'Gerencie suas chaves de acesso programático. Estes endpoints requerem autenticação por sessão (login na plataforma), não por API key.',
    endpoints: [
      {
        id: 'list-keys',
        method: 'GET',
        path: '/api/keys',
        title: 'Listar chaves',
        description: 'Retorna todas as chaves de API ativas (não revogadas) do usuário. O valor da chave nunca é retornado — apenas o prefixo para identificação.',
        auth: true,
        notes: ['Somente chaves ativas (não revogadas) são retornadas.', 'O valor completo da chave não é armazenado e nunca é retornado neste endpoint.'],
        responseExample: `{
  "keys": [
    {
      "id": "key-uuid-1234",
      "name": "n8n automação",
      "prefix": "smm_a1b2c3d4",
      "last_used_at": "2026-02-20T15:30:00Z",
      "expires_at": null,
      "created_at": "2026-02-18T09:00:00Z",
      "revoked_at": null
    }
  ]
}`,
      },
      {
        id: 'create-key',
        method: 'POST',
        path: '/api/keys',
        title: 'Criar chave',
        description: 'Cria uma nova chave de API. O valor completo da chave (`rawKey`) é retornado **apenas nesta resposta** e não pode ser recuperado depois — guarde-o imediatamente.',
        auth: true,
        notes: [
          '⚠️ O campo `rawKey` é retornado apenas uma vez. Não é possível recuperá-lo depois.',
          'A chave é armazenada como hash SHA-256 — nem a equipe tem acesso ao valor original.',
          'Use `expires_at: null` para chave sem expiração.',
        ],
        bodySchema: `{
  "name":       string           // obrigatório · identificação da chave (max 100 chars)
  "expires_at": string | null    // ISO datetime ou null para nunca expirar
}`,
        bodyExample: `{
  "name": "n8n produção",
  "expires_at": null
}`,
        responseExample: `{
  "key": {
    "id": "key-uuid-1234",
    "name": "n8n produção",
    "prefix": "smm_a1b2c3d4",
    "created_at": "2026-02-20T10:00:00Z",
    "expires_at": null
  },
  "rawKey": "smm_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}`,
      },
      {
        id: 'revoke-key',
        method: 'DELETE',
        path: '/api/keys/:id',
        title: 'Revogar chave',
        description: 'Revoga uma chave de API. A chave é marcada como revogada e todas as requisições futuras usando ela retornarão 401.',
        auth: true,
        notes: ['A revogação é imediata e irreversível.', 'Para uso temporário, prefira definir `expires_at` na criação.'],
        params: [
          { name: 'id', in: 'path', type: 'uuid', required: true, description: 'ID da chave a revogar', example: 'key-uuid-1234' },
        ],
        responseExample: `{
  "ok": true
}`,
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const methodStyle: Record<string, { bg: string; text: string; border: string }> = {
  GET:    { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-500/20' },
  POST:   { bg: 'bg-green-500/10',  text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' },
  PATCH:  { bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  DELETE: { bg: 'bg-red-500/10',    text: 'text-red-600 dark:text-red-400',     border: 'border-red-500/20' },
}

function buildCurl(ep: Endpoint, apiKey: string, baseUrl: string): string {
  const key = apiKey || 'smm_SUA_CHAVE_AQUI'
  const url = `${baseUrl}${ep.path}`

  const lines: string[] = [`curl -s "${url}" \\`, `  -H "X-API-Key: ${key}"`]

  if (ep.method !== 'GET' && ep.method !== 'DELETE') {
    lines.push(`  -H "Content-Type: application/json"`)
    lines[0] = `curl -s -X ${ep.method} "${url}" \\`
  }
  if (ep.method === 'DELETE' && !ep.path.includes('?')) {
    lines[0] = `curl -s -X DELETE "${url}" \\`
  }

  if (ep.bodyExample) {
    const compact = ep.bodyExample.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
    lines.push(`  -d '${compact}'`)
  }

  return lines.join('\n')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}
      title="Copiar"
    >
      {copied
        ? <><Check className="size-3 text-green-500" /><span className="text-green-500">Copiado!</span></>
        : <><Copy className="size-3" /><span>Copiar</span></>}
    </button>
  )
}

function CodeBlock({ code, label, className = '' }: { code: string; label?: string; className?: string }) {
  return (
    <div className={`relative group ${className}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 rounded-t-md">
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{label ?? 'code'}</span>
        <CopyButton text={code} size="xs" />
      </div>
      <pre className="bg-zinc-950 text-zinc-200 p-3 rounded-b-md text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  )
}

function ParamRow({ param }: { param: Param }) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-2 pr-3 align-top">
        <code className="text-xs font-mono font-semibold text-foreground">{param.name}</code>
        {param.required && <span className="ml-1 text-red-500 text-xs">*</span>}
      </td>
      <td className="py-2 pr-3 align-top">
        <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">{param.type}</span>
      </td>
      <td className="py-2 pr-3 align-top">
        <span className="text-[11px] text-zinc-400 capitalize">{param.in}</span>
      </td>
      <td className="py-2 align-top">
        <span className="text-xs text-muted-foreground">{param.description}</span>
        {param.example && (
          <span className="ml-1 text-xs text-zinc-500">· ex: <code className="font-mono">{param.example}</code></span>
        )}
      </td>
    </tr>
  )
}

function EndpointCard({ ep, apiKey, baseUrl }: { ep: Endpoint; apiKey: string; baseUrl: string }) {
  const [open, setOpen] = useState(true)
  const s = methodStyle[ep.method]
  const curl = buildCurl(ep, apiKey, baseUrl)

  return (
    <div id={ep.id} className="border rounded-xl overflow-hidden scroll-mt-24">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors ${open ? 'bg-muted/20' : ''}`}
      >
        <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${s.bg} ${s.text} ${s.border} shrink-0`}>
          {ep.method}
        </span>
        <code className="text-sm font-mono font-medium flex-1 truncate">{ep.path}</code>
        <span className="text-xs text-muted-foreground font-sans hidden sm:block shrink-0">{ep.title}</span>
        {ep.auth && <span className="text-sm shrink-0" title="Requer autenticação">🔐</span>}
        {open ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-5 pt-3 space-y-4 border-t">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{ep.description}</p>

          {/* Notes */}
          {ep.notes && (
            <div className="space-y-1">
              {ep.notes.map((n, i) => (
                <div key={i} className="flex gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span dangerouslySetInnerHTML={{ __html: n.replace(/`([^`]+)`/g, '<code class="font-mono">$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              ))}
            </div>
          )}

          {/* Params table */}
          {ep.params && ep.params.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parâmetros</p>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {['Nome', 'Tipo', 'Em', 'Descrição'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 px-3">
                    {ep.params.map(p => <ParamRow key={p.name} param={p} />)}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">* obrigatório</p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Body schema + example */}
            {ep.bodySchema && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schema do body</p>
                <CodeBlock code={ep.bodySchema} label="schema (JSON)" />
                {ep.bodyExample && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Exemplo de body</p>
                    <CodeBlock code={ep.bodyExample} label="application/json" />
                  </>
                )}
              </div>
            )}

            {/* Response */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resposta 200</p>
              <CodeBlock code={ep.responseExample} label="application/json" />
            </div>
          </div>

          {/* curl */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">curl</p>
            <CodeBlock code={curl} label="bash" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl] = useState(BASE_URL)

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const allEndpoints = sections.flatMap(s => s.endpoints)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <span className="font-semibold text-sm">API Reference</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <code className="text-xs text-muted-foreground font-mono">{baseUrl}</code>
          </div>
          {/* API Key input — updates all curl commands live */}
          <div className="flex items-center gap-2 shrink-0">
            <Key className="size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Cole sua API key para ver nos curls"
              className="text-xs font-mono bg-muted border rounded px-2.5 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
              spellCheck={false}
            />
          </div>
          <Link
            href="/dashboard/settings/api-keys"
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
          >
            <ExternalLink className="size-3.5" />
            Gerenciar chaves
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex gap-6 py-8">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden lg:block">
          <nav className="sticky top-20 space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Guia</p>
              <ul className="space-y-0.5">
                <li>
                  <button
                    onClick={() => scrollTo('section-auth')}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Autenticação
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo('section-errors')}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Erros
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo('section-integrations')}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Integrações
                  </button>
                </li>
              </ul>
            </div>

            {sections.filter(s => s.endpoints.length > 0).map(section => (
              <div key={section.id}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.endpoints.map(ep => (
                    <li key={ep.id}>
                      <button
                        onClick={() => scrollTo(ep.id)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                      >
                        <span className={`text-[10px] font-bold font-mono px-1 py-0.5 rounded ${methodStyle[ep.method].bg} ${methodStyle[ep.method].text}`}>
                          {ep.method.slice(0, 3)}
                        </span>
                        <span className="truncate">{ep.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-12">

          {/* Auth section */}
          <section id="section-auth" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-1">Autenticação</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Todos os endpoints marcados com 🔐 requerem uma API key válida.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 mb-5">
              <CodeBlock
                code={`X-API-Key: ${apiKey || 'smm_SUA_CHAVE_AQUI'}`}
                label="header recomendado"
              />
              <CodeBlock
                code={`Authorization: Bearer ${apiKey || 'smm_SUA_CHAVE_AQUI'}`}
                label="authorization bearer"
              />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border">
                <span className="text-lg">🔑</span>
                <div>
                  <p className="font-medium text-sm">Formato das chaves</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Todas as chaves começam com <code className="font-mono bg-muted px-1 rounded">smm_</code> seguido de 32 caracteres hex.
                    Exemplo: <code className="font-mono bg-muted px-1 rounded">smm_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5</code>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="font-medium text-sm">Segurança</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    As chaves são armazenadas como hash SHA-256. Nem a plataforma tem acesso ao valor original — guarde sua chave com segurança ao criá-la.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border">
                <span className="text-lg">⏱</span>
                <div>
                  <p className="font-medium text-sm">Expiração</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Chaves podem ter expiração opcional (<code className="font-mono bg-muted px-1 rounded">expires_at</code>).
                    Requisições com chaves expiradas ou revogadas retornam <code className="font-mono bg-muted px-1 rounded">401 Unauthorized</code>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Endpoint sections */}
          {sections.filter(s => s.endpoints.length > 0).map(section => (
            <section key={section.id} className="scroll-mt-20">
              <div className="mb-5">
                <h2 className="text-xl font-bold">{section.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
              </div>
              <div className="space-y-3">
                {section.endpoints.map(ep => (
                  <EndpointCard key={ep.id} ep={ep} apiKey={apiKey} baseUrl={baseUrl} />
                ))}
              </div>
            </section>
          ))}

          {/* Errors */}
          <section id="section-errors" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-5">Erros</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Todos os erros retornam JSON com o campo <code className="font-mono bg-muted px-1 rounded text-xs">error</code> descrevendo o problema.
            </p>
            <CodeBlock code={`{ "error": "mensagem descritiva do erro" }`} label="formato de erro" className="mb-5" />
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {['Código', 'Status', 'Quando acontece'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['400', 'Bad Request',           'Body inválido, campo obrigatório ausente, tipo errado'],
                    ['401', 'Unauthorized',           'API key ausente, inválida, revogada ou expirada'],
                    ['404', 'Not Found',              'Recurso não encontrado ou não pertence ao usuário'],
                    ['409', 'Conflict',               'Conflito de dados (ex: username duplicado)'],
                    ['500', 'Internal Server Error',  'Erro inesperado no servidor'],
                  ].map(([code, status, desc]) => (
                    <tr key={code} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs font-bold">{code}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{status}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Integrations */}
          <section id="section-integrations" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-5">Integrações</h2>

            <div className="space-y-6">
              {/* n8n */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/20 border-b flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span className="font-semibold text-sm">n8n</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">Use o node <strong>HTTP Request</strong> para chamar os endpoints.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Configuração do node</p>
                      <CodeBlock code={`Method: GET
URL: ${baseUrl}/api/instagram/accounts
Authentication: Header Auth
  Name: X-API-Key
  Value: ${apiKey || 'smm_SUA_CHAVE_AQUI'}`} label="HTTP Request node" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Criar post via n8n</p>
                      <CodeBlock code={`Method: POST
URL: ${baseUrl}/api/content/posts
Headers:
  X-API-Key: ${apiKey || 'smm_SUA_CHAVE_AQUI'}
  Content-Type: application/json
Body (JSON):
  post_type: "post"
  caption: "{{ $json.caption }}"
  status: "planned"`} label="HTTP Request node" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Make / Zapier */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/20 border-b flex items-center gap-2">
                  <span className="text-base">⚙️</span>
                  <span className="font-semibold text-sm">Make (Integromat) / Zapier</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Use o módulo <strong>HTTP → Make a Request</strong> (Make) ou <strong>Webhooks → Custom Request</strong> (Zapier).
                  </p>
                  <CodeBlock code={`URL: ${baseUrl}/api/content/posts
Method: POST
Headers:
  X-API-Key: ${apiKey || 'smm_SUA_CHAVE_AQUI'}
  Content-Type: application/json
Body type: raw (JSON)
Body: {
  "post_type": "post",
  "caption": "Conteúdo via automação!",
  "status": "draft"
}`} label="configuração do módulo HTTP" />
                </div>
              </div>

              {/* curl examples */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/20 border-b flex items-center gap-2">
                  <span className="text-base">🖥</span>
                  <span className="font-semibold text-sm">curl — Exemplos rápidos</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {allEndpoints.slice(0, 6).map(ep => (
                      <div key={ep.id}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{ep.title}</p>
                        <CodeBlock code={buildCurl(ep, apiKey, baseUrl)} label="bash" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <p className="text-xs text-muted-foreground pb-12 text-center">
            Social Media Manager API · {new Date().getFullYear()} ·{' '}
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          </p>
        </main>
      </div>
    </div>
  )
}
