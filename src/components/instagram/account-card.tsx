'use client'

import { useState } from 'react'
import type { InstagramAccount } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisconnectAccountButton } from '@/components/instagram/disconnect-button'
import { DisconnectMetaButton } from '@/components/instagram/disconnect-meta-button'
import { EditAccountDialog } from '@/components/instagram/edit-account-dialog'
import { Camera, Loader2 } from 'lucide-react'

interface AccountCardProps {
  account: InstagramAccount
}

const BRAND_VOICE_LABELS: Record<string, string> = {
  professional: 'Profissional',
  casual: 'Casual',
  inspirational: 'Inspiracional',
  educational: 'Educacional',
  funny: 'Divertido',
}

const MAIN_GOAL_LABELS: Record<string, string> = {
  engagement: 'Engajamento',
  growth: 'Crescimento',
  sales: 'Vendas',
  authority: 'Autoridade',
}

export function AccountCard({ account }: AccountCardProps) {
  const palette = account.color_palette?.filter(Boolean) ?? []
  const isMetaConnected = Boolean(account.ig_user_id)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(account.profile_picture_url)
  const [fetchingAvatar, setFetchingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Aviso de token expirando em menos de 7 dias
  const tokenWarning = (() => {
    if (!account.token_expires_at) return null
    const daysLeft = Math.floor(
      (new Date(account.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return daysLeft >= 0 && daysLeft < 7 ? daysLeft : null
  })()

  async function handleFetchAvatar() {
    setFetchingAvatar(true)
    setAvatarError(null)
    try {
      const res = await fetch(`/api/instagram/accounts/${account.id}/fetch-avatar`, {
        method: 'POST',
      })
      const data = await res.json() as { profile_picture_url?: string; error?: string }
      if (!res.ok) {
        setAvatarError(data.error ?? 'Erro ao buscar foto')
      } else if (data.profile_picture_url) {
        setAvatarUrl(data.profile_picture_url)
      }
    } catch {
      setAvatarError('Erro de conexão')
    } finally {
      setFetchingAvatar(false)
    }
  }

  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative group">
              <Avatar className="size-12">
                <AvatarImage src={avatarUrl ?? undefined} alt={account.username} />
                <AvatarFallback className="text-sm font-bold">
                  {account.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleFetchAvatar}
                disabled={fetchingAvatar}
                title={avatarUrl ? 'Atualizar foto de perfil' : 'Buscar foto de perfil'}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
              >
                {fetchingAvatar ? (
                  <Loader2 className="size-4 text-white animate-spin" />
                ) : (
                  <Camera className="size-4 text-white" />
                )}
              </button>
            </div>
            {avatarError && (
              <p className="text-[9px] text-destructive text-center leading-tight max-w-[52px]">
                {avatarError}
              </p>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">@{account.username}</span>
              {account.is_active && (
                <Badge variant="default" className="text-[10px] h-4">Ativo</Badge>
              )}
              {isMetaConnected ? (
                <div className="flex items-center gap-1">
                  <Badge className="text-[10px] h-4 bg-success/10 text-success border-success/30">
                    Conectado ao Meta
                  </Badge>
                  <DisconnectMetaButton accountId={account.id} username={account.username} />
                </div>
              ) : (
                <a href={`/api/instagram/connect?accountId=${account.id}`}>
                  <Button size="sm" variant="outline" className="h-5 text-[10px] px-2">
                    Conectar ao Meta
                  </Button>
                </a>
              )}
              {tokenWarning !== null && (
                <Badge variant="destructive" className="text-[10px] h-4">
                  Token expira em {tokenWarning}d
                </Badge>
              )}
              {account.brand_voice && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  {BRAND_VOICE_LABELS[account.brand_voice] ?? account.brand_voice}
                </Badge>
              )}
              {account.main_goal && (
                <Badge variant="outline" className="text-[10px] h-4">
                  {MAIN_GOAL_LABELS[account.main_goal] ?? account.main_goal}
                </Badge>
              )}
            </div>

            {account.name && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{account.name}</p>
            )}

            {account.niche && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">Nicho:</span> {account.niche}
              </p>
            )}

            {account.target_audience && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">Público:</span> {account.target_audience}
              </p>
            )}

            {account.content_pillars && account.content_pillars.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {account.content_pillars.map((pillar) => (
                  <span
                    key={pillar}
                    className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            )}

            {/* Paleta de cores */}
            {palette.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-muted-foreground font-medium">Paleta:</span>
                <div className="flex gap-1">
                  {palette.map((color, i) => (
                    <div
                      key={i}
                      className="size-3.5 rounded-sm border border-black/10 shadow-sm"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground mt-1.5">
              {account.posting_frequency}x por semana
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-0.5 shrink-0">
            <EditAccountDialog account={account} />
            <DisconnectAccountButton accountId={account.id} username={account.username} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
