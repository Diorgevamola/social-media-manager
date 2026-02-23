'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColorPaletteInput } from '@/components/instagram/color-palette-input'
import { NegativeWordsInput } from '@/components/instagram/negative-words-input'
import { KnowledgeBaseUploader } from '@/components/instagram/knowledge-base-uploader'
import { Loader2, Pencil } from 'lucide-react'
import type { InstagramAccount, BrandVoice, MainGoal } from '@/types/database'

interface EditAccountDialogProps {
  account: InstagramAccount
}

export function EditAccountDialog({ account }: EditAccountDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    username: account.username,
    name: account.name ?? '',
    niche: account.niche ?? '',
    target_audience: account.target_audience ?? '',
    brand_voice: account.brand_voice as BrandVoice,
    content_pillars: account.content_pillars?.join(', ') ?? '',
    posting_frequency: String(account.posting_frequency),
    main_goal: account.main_goal as MainGoal,
    strategic_notes: account.strategic_notes ?? '',
    biography: account.biography ?? '',
    website: account.website ?? '',
    color_palette: account.color_palette ?? [],
    negative_words: account.negative_words ?? [],
    knowledge_base_enabled: account.knowledge_base_enabled ?? true,
    knowledge_base_influence: account.knowledge_base_influence ?? 50,
  })

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
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

      const res = await fetch(`/api/instagram/accounts/${account.id}`, {
        method: 'PATCH',
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
          knowledge_base_enabled: form.knowledge_base_enabled,
          knowledge_base_influence: form.knowledge_base_influence,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar conta')

      router.refresh()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="Editar conta"
      >
        <Pencil className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar @{account.username}</DialogTitle>
            <DialogDescription>
              Atualize o briefing da conta para melhorar a geração de conteúdo com IA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}

            {/* Username + Nome */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-username">Username *</Label>
                <Input
                  id="edit-username"
                  placeholder="@seuperfil"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Nome do perfil</Label>
                <Input
                  id="edit-name"
                  placeholder="Nome de exibição"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
            </div>

            {/* Nicho + Público */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-niche">Nicho</Label>
                <Input
                  id="edit-niche"
                  placeholder="Ex: fitness, moda, tech"
                  value={form.niche}
                  onChange={(e) => handleChange('niche', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-audience">Público-alvo</Label>
                <Input
                  id="edit-audience"
                  placeholder="Ex: mulheres 25-35"
                  value={form.target_audience}
                  onChange={(e) => handleChange('target_audience', e.target.value)}
                />
              </div>
            </div>

            {/* Tom de voz + Objetivo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tom de voz</Label>
                <Select value={form.brand_voice} onValueChange={(v) => handleChange('brand_voice', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={form.main_goal} onValueChange={(v) => handleChange('main_goal', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Engajamento</SelectItem>
                    <SelectItem value="growth">Crescimento</SelectItem>
                    <SelectItem value="sales">Vendas</SelectItem>
                    <SelectItem value="authority">Autoridade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pilares + Frequência */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit-pillars">Pilares de conteúdo</Label>
                <Input
                  id="edit-pillars"
                  placeholder="educação, bastidores, dicas (separado por vírgula)"
                  value={form.content_pillars}
                  onChange={(e) => handleChange('content_pillars', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-freq">Posts/semana</Label>
                <Input
                  id="edit-freq"
                  type="number"
                  min="1"
                  max="21"
                  value={form.posting_frequency}
                  onChange={(e) => handleChange('posting_frequency', e.target.value)}
                />
              </div>
            </div>

            {/* Paleta de cores — novo campo */}
            <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
              <Label>Paleta de cores da marca</Label>
              <ColorPaletteInput
                value={form.color_palette}
                onChange={(colors) => setForm((prev) => ({ ...prev, color_palette: colors }))}
              />
            </div>

            {/* Palavras proibidas */}
            <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
              <Label>Palavras proibidas</Label>
              <NegativeWordsInput
                value={form.negative_words}
                onChange={(words) => setForm((prev) => ({ ...prev, negative_words: words }))}
              />
            </div>

            {/* Notas estratégicas */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notas estratégicas</Label>
              <Textarea
                id="edit-notes"
                placeholder="Informações adicionais sobre estratégia, diferenciais..."
                rows={3}
                value={form.strategic_notes}
                onChange={(e) => handleChange('strategic_notes', e.target.value)}
              />
            </div>

            {/* Bio + Website */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-bio">Bio</Label>
                <Input
                  id="edit-bio"
                  placeholder="Breve descrição do perfil"
                  value={form.biography}
                  onChange={(e) => handleChange('biography', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  placeholder="https://..."
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                />
              </div>
            </div>

            {/* Base de Conhecimento */}
            <div className="border rounded-lg p-3 bg-muted/20 space-y-1">
              <KnowledgeBaseUploader
                accountId={account.id}
                enabled={form.knowledge_base_enabled}
                influence={form.knowledge_base_influence}
                onSettingsChange={(enabled, influence) =>
                  setForm((prev) => ({
                    ...prev,
                    knowledge_base_enabled: enabled,
                    knowledge_base_influence: influence,
                  }))
                }
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
