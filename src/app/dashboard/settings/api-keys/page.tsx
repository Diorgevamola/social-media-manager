'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface ApiKeyRow {
  id: string
  name: string
  prefix: string
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  revoked_at: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/keys')
      if (res.ok) {
        const data = await res.json() as { keys: ApiKeyRow[] }
        setKeys(data.keys ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchKeys() }, [fetchKeys])

  async function handleCreate() {
    if (!newKeyName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json() as { rawKey?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar chave')
        return
      }
      setNewKeyValue(data.rawKey ?? null)
      setNewKeyName('')
      setShowForm(false)
      setShowKey(false)
      await fetchKeys()
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id)
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      setKeys(prev => prev.filter(k => k.id !== id))
    } finally {
      setRevoking(null)
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Chaves de API</h1>
        <p className="text-muted-foreground mt-1">
          Crie chaves para integrar com n8n, Zapier, Make e outras automações.
        </p>
      </div>

      {/* New key revealed */}
      {newKeyValue && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <Check className="size-4" />
              Chave criada com sucesso
            </CardTitle>
            <CardDescription className="text-xs">
              Copie agora — esta chave não será exibida novamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-xs break-all">
              <span className="flex-1 select-all">
                {showKey ? newKeyValue : newKeyValue.slice(0, 12) + '•'.repeat(28)}
              </span>
              <button
                onClick={() => setShowKey(v => !v)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                title={showKey ? 'Ocultar' : 'Mostrar'}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <button
                onClick={() => handleCopy(newKeyValue)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                title="Copiar"
              >
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </button>
            </div>
            <button
              onClick={() => setNewKeyValue(null)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Entendi, já copiei a chave
            </button>
          </CardContent>
        </Card>
      )}

      {/* Keys list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="size-4" />
              Suas chaves
            </CardTitle>
            <CardDescription>
              {keys.length === 0 ? 'Nenhuma chave criada ainda.' : `${keys.length} chave${keys.length !== 1 ? 's' : ''} ativa${keys.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setError(null) }}
            className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="size-3.5" />
            Nova chave
          </button>
        </CardHeader>

        {showForm && (
          <div className="px-6 pb-4 border-t pt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da chave</label>
              <input
                type="text"
                placeholder="ex: n8n automação, make.com"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={100}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newKeyName.trim()}
                className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Criando…' : 'Criar chave'}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewKeyName(''); setError(null) }}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border hover:border-border transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <CardContent className={showForm ? 'pt-0' : undefined}>
          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Key className="size-8 mx-auto mb-2 opacity-30" />
              <p>Crie sua primeira chave para começar a integrar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map(key => (
                <div
                  key={key.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{key.name}</span>
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {key.prefix}••••••••
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Criada {formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: ptBR })}
                      {key.last_used_at && (
                        <> · Último uso {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: ptBR })}</>
                      )}
                      {!key.last_used_at && ' · Nunca usada'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
                    title="Revogar chave"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como usar</CardTitle>
          <CardDescription>Adicione o header em todas as requisições à API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Header HTTP</p>
            <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
              {`X-API-Key: smm_sua_chave_aqui`}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Ou via Authorization Bearer</p>
            <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
              {`Authorization: Bearer smm_sua_chave_aqui`}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Exemplo com curl</p>
            <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {`curl https://seu-dominio.com/api/instagram/accounts \\
  -H "X-API-Key: smm_sua_chave_aqui"`}
            </pre>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" />
            Ver documentação completa da API
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
