'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles } from 'lucide-react'
import type { BrandVoice, MainGoal } from '@/types/database'
import { ColorPaletteInput } from '@/components/instagram/color-palette-input'
import { NegativeWordsInput } from '@/components/instagram/negative-words-input'
import { KnowledgeBaseUploader } from '@/components/instagram/knowledge-base-uploader'
import { CheckCircle2 } from 'lucide-react'

interface CreateProfileFormProps {
  onSuccess?: () => void
}

interface ResearchResult {
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

const TONE_TO_BRAND_VOICE: Record<string, BrandVoice> = {
  formal: 'professional',
  profissional: 'professional',
  professional: 'professional',
  inspiracional: 'inspirational',
  inspirational: 'inspirational',
  educativo: 'educational',
  educational: 'educational',
  humorístico: 'funny',
  funny: 'funny',
  humor: 'funny',
  descontraído: 'casual',
  casual: 'casual',
}

function mapTone(tone: string): BrandVoice {
  const lower = tone.toLowerCase()
  for (const [key, value] of Object.entries(TONE_TO_BRAND_VOICE)) {
    if (lower.includes(key)) return value
  }
  return 'casual'
}

export function CreateProfileForm({ onSuccess }: CreateProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [researchInput, setResearchInput] = useState('')
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null)
  const [kbEnabled, setKbEnabled] = useState(true)
  const [kbInfluence, setKbInfluence] = useState(50)

  const [form, setForm] = useState({
    username: '',
    name: '',
    niche: '',
    target_audience: '',
    brand_voice: 'casual' as BrandVoice,
    content_pillars: '',
    posting_frequency: '3',
    main_goal: 'engagement' as MainGoal,
    strategic_notes: '',
    biography: '',
    website: '',
    color_palette: [] as string[],
    negative_words: [] as string[],
  })

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleResearch() {
    if (!researchInput.trim()) return
    setResearching(true)
    setError(null)

    try {
      const res = await fetch('/api/instagram/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: researchInput.trim() }),
      })

      const data: ResearchResult = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Erro na pesquisa')

      setForm((prev) => ({
        ...prev,
        username: data.username || prev.username,
        name: data.display_name || prev.name,
        biography: data.bio || prev.biography,
        niche: data.niche || prev.niche,
        target_audience: data.target_audience || prev.target_audience,
        brand_voice: mapTone(data.tone),
        content_pillars: data.content_pillars?.join(', ') || prev.content_pillars,
      }))
      setResearchInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pesquisar perfil')
    } finally {
      setResearching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const pillars = form.content_pillars
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)

      const res = await fetch('/api/instagram/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.replace('@', '').trim(),
          name: form.name || null,
          biography: form.biography || null,
          website: form.website || null,
          niche: form.niche || null,
          target_audience: form.target_audience || null,
          brand_voice: form.brand_voice,
          content_pillars: pillars.length > 0 ? pillars : null,
          posting_frequency: parseInt(form.posting_frequency, 10),
          main_goal: form.main_goal,
          strategic_notes: form.strategic_notes || null,
          color_palette: form.color_palette.length > 0 ? form.color_palette : [],
          negative_words: form.negative_words.length > 0 ? form.negative_words : [],
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      // Salvar configurações de knowledge base
      if (data.account?.id) {
        await fetch(`/api/instagram/accounts/${data.account.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            knowledge_base_enabled: kbEnabled,
            knowledge_base_influence: kbInfluence,
          }),
        })
        setCreatedAccountId(data.account.id)
      } else {
        router.refresh()
        onSuccess?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Passo 2: conta criada, aguardando upload de docs
  if (createdAccountId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Conta criada com sucesso!</span>
        </div>

        <div className="border rounded-lg p-3 bg-muted/20">
          <KnowledgeBaseUploader
            accountId={createdAccountId}
            enabled={kbEnabled}
            influence={kbInfluence}
            onSettingsChange={async (enabled, influence) => {
              setKbEnabled(enabled)
              setKbInfluence(influence)
              await fetch(`/api/instagram/accounts/${createdAccountId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ knowledge_base_enabled: enabled, knowledge_base_influence: influence }),
              })
            }}
          />
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={() => {
            router.refresh()
            onSuccess?.()
          }}
        >
          Concluir
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}

      {/* AI Research */}
      <div className="space-y-1.5">
        <Label>Pesquisar perfil com IA (opcional)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="@username ou link do Instagram"
            value={researchInput}
            onChange={(e) => setResearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleResearch())}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResearch}
            disabled={researching || !researchInput.trim()}
            className="shrink-0"
          >
            {researching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {researching ? 'Pesquisando...' : 'Preencher com IA'}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A IA pesquisa o perfil público e pré-preenche os campos abaixo automaticamente.
        </p>
      </div>

      <div className="border-t pt-4 space-y-4">
        {/* Username */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="@seuperfil"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome do perfil</Label>
            <Input
              id="name"
              placeholder="Nome de exibição"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
        </div>

        {/* Niche + Target Audience */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="niche">Nicho</Label>
            <Input
              id="niche"
              placeholder="Ex: fitness, moda, tech"
              value={form.niche}
              onChange={(e) => handleChange('niche', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target_audience">Público-alvo</Label>
            <Input
              id="target_audience"
              placeholder="Ex: mulheres 25-35, empreendedores"
              value={form.target_audience}
              onChange={(e) => handleChange('target_audience', e.target.value)}
            />
          </div>
        </div>

        {/* Brand Voice + Main Goal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tom de voz</Label>
            <Select
              value={form.brand_voice}
              onValueChange={(v) => handleChange('brand_voice', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="inspirational">Inspiracional</SelectItem>
                <SelectItem value="educational">Educacional</SelectItem>
                <SelectItem value="funny">Divertido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Objetivo principal</Label>
            <Select
              value={form.main_goal}
              onValueChange={(v) => handleChange('main_goal', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engagement">Engajamento</SelectItem>
                <SelectItem value="growth">Crescimento</SelectItem>
                <SelectItem value="sales">Vendas</SelectItem>
                <SelectItem value="authority">Autoridade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Pillars + Posting Frequency */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="content_pillars">Pilares de conteúdo</Label>
            <Input
              id="content_pillars"
              placeholder="Ex: educação, bastidores, dicas (separado por vírgula)"
              value={form.content_pillars}
              onChange={(e) => handleChange('content_pillars', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="posting_frequency">Posts/semana</Label>
            <Input
              id="posting_frequency"
              type="number"
              min="1"
              max="21"
              value={form.posting_frequency}
              onChange={(e) => handleChange('posting_frequency', e.target.value)}
            />
          </div>
        </div>

        {/* Paleta de cores */}
        <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
          <Label>Paleta de cores da marca</Label>
          <ColorPaletteInput
            value={form.color_palette}
            onChange={(colors) => setForm((prev) => ({ ...prev, color_palette: colors }))}
          />
        </div>

        {/* Palavras negativas */}
        <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
          <Label>Palavras proibidas</Label>
          <NegativeWordsInput
            value={form.negative_words}
            onChange={(words) => setForm((prev) => ({ ...prev, negative_words: words }))}
          />
        </div>

        {/* Strategic Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="strategic_notes">Notas estratégicas</Label>
          <Textarea
            id="strategic_notes"
            placeholder="Informações adicionais sobre estratégia, diferenciais, referências..."
            rows={3}
            value={form.strategic_notes}
            onChange={(e) => handleChange('strategic_notes', e.target.value)}
          />
        </div>

        {/* Bio + Website */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="biography">Bio (opcional)</Label>
            <Input
              id="biography"
              placeholder="Breve descrição do perfil"
              value={form.biography}
              onChange={(e) => handleChange('biography', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website (opcional)</Label>
            <Input
              id="website"
              placeholder="https://..."
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
            />
          </div>
        </div>
      </div>

        {/* Configurações de Base de Conhecimento */}
        <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Base de Conhecimento</p>
              <p className="text-[11px] text-muted-foreground">
                Após criar a conta, você poderá enviar PDFs com estratégias e briefings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setKbEnabled(!kbEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                kbEnabled ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  kbEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {kbEnabled && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Influência no cronograma:
              </span>
              <select
                value={kbInfluence}
                onChange={(e) => setKbInfluence(parseInt(e.target.value))}
                className="h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none"
              >
                <option value={30}>30%</option>
                <option value={40}>40%</option>
                <option value={50}>50%</option>
                <option value={100}>100%</option>
              </select>
            </div>
          )}
        </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Salvando...
          </>
        ) : (
          'Adicionar conta'
        )}
      </Button>
    </form>
  )
}
