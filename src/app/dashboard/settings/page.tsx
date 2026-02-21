import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Key, Database, Bot, Globe, Palette, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ThemeSelector } from '@/components/settings/theme-selector'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações da sua conta.</p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4" />
            Aparência
          </CardTitle>
          <CardDescription>Escolha o tema da interface. Por padrão usa o tema do seu sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações da conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">E-mail</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Nome</span>
            <span className="text-sm font-medium">
              {user?.user_metadata?.full_name || '–'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Plano</span>
            <Badge>Grátis (MVP)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Integrations status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrações</CardTitle>
          <CardDescription>Status das integrações configuradas via variáveis de ambiente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              name: 'Supabase',
              description: 'Banco de dados e autenticação',
              icon: Database,
              status: 'configured',
            },
            {
              name: 'Google Gemini AI',
              description: 'Geração de conteúdo com IA',
              icon: Bot,
              status: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
            },
            {
              name: 'Instagram Graph API',
              description: 'Conexão com contas do Instagram',
              icon: Globe,
              status: process.env.INSTAGRAM_APP_ID ? 'configured' : 'missing',
            },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-3 py-2 border-b last:border-0"
            >
              <div className="size-8 bg-muted rounded-lg flex items-center justify-center">
                <integration.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.description}</p>
              </div>
              <Badge
                variant={integration.status === 'configured' ? 'default' : 'destructive'}
              >
                {integration.status === 'configured' ? 'Configurado' : 'Pendente'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="size-4" />
              Chaves de API
            </CardTitle>
            <CardDescription>
              Crie chaves para integrar com n8n, Zapier, Make e automações externas.
            </CardDescription>
          </div>
          <Link
            href="/dashboard/settings/api-keys"
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 mt-1"
          >
            Gerenciar
            <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
      </Card>

      {/* Env vars info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="size-4" />
            Variáveis de ambiente
          </CardTitle>
          <CardDescription>
            Configure essas variáveis no arquivo <code className="bg-muted px-1 rounded text-xs">.env.local</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { key: 'NEXT_PUBLIC_SUPABASE_URL', desc: 'URL do projeto Supabase' },
              { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', desc: 'Chave anon do Supabase' },
              { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Chave service role (servidor)' },
              { key: 'INSTAGRAM_APP_ID', desc: 'ID do app Meta for Developers' },
              { key: 'INSTAGRAM_APP_SECRET', desc: 'Secret do app Meta' },
              { key: 'GEMINI_API_KEY', desc: 'Chave da API Google AI Studio' },
              { key: 'NEXT_PUBLIC_APP_URL', desc: 'URL da aplicação (ex: http://localhost:3000)' },
            ].map((env) => (
              <div key={env.key} className="flex gap-3 text-xs font-mono">
                <code className="bg-muted px-2 py-1 rounded shrink-0">{env.key}</code>
                <span className="text-muted-foreground font-sans self-center">{env.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
