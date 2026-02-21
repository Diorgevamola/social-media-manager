import { createClient } from '@/lib/supabase/server'
import type { InstagramAccount, ContentPost } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart2, TrendingUp, Users, Eye, Target } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const MAIN_GOAL_LABELS: Record<string, string> = {
  engagement: 'Engajamento',
  growth: 'Crescimento',
  sales: 'Vendas',
  authority: 'Autoridade',
}

const BRAND_VOICE_LABELS: Record<string, string> = {
  professional: 'Profissional',
  casual: 'Casual',
  inspirational: 'Inspiracional',
  educational: 'Educacional',
  funny: 'Divertido',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: accounts }, { data: posts }] = await Promise.all([
    supabase
      .from('instagram_accounts')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .returns<InstagramAccount[]>(),
    supabase
      .from('content_posts')
      .select('*')
      .eq('user_id', user!.id)
      .returns<ContentPost[]>(),
  ])

  const totalAccounts = accounts?.length ?? 0
  const totalPosts = posts?.length ?? 0
  const drafts = posts?.filter((p) => p.status === 'draft').length ?? 0
  const planned = posts?.filter((p) => p.status === 'planned').length ?? 0
  const published = posts?.filter((p) => p.status === 'published').length ?? 0

  const postsByType = {
    post: posts?.filter((p) => p.post_type === 'post').length ?? 0,
    carousel: posts?.filter((p) => p.post_type === 'carousel').length ?? 0,
    reel: posts?.filter((p) => p.post_type === 'reel').length ?? 0,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Visao geral dos seus perfis e conteudo criado.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Contas cadastradas', value: totalAccounts, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
          { label: 'Posts criados', value: totalPosts, icon: BarChart2, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950' },
          { label: 'Planejados', value: planned, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
          { label: 'Publicados', value: published, icon: Eye, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950' },
        ].map((stat) => (
          <Card key={stat.label} className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className={`size-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`size-4 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(stat.value)}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Content by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteudo por tipo</CardTitle>
            <CardDescription>Distribuicao dos seus posts criados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { type: 'Post', count: postsByType.post, color: 'bg-pink-500' },
              { type: 'Carrossel', count: postsByType.carousel, color: 'bg-purple-500' },
              { type: 'Reel', count: postsByType.reel, color: 'bg-orange-500' },
            ].map((item) => {
              const pct = totalPosts > 0 ? Math.round((item.count / totalPosts) * 100) : 0
              return (
                <div key={item.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.type}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Content by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status do conteudo</CardTitle>
            <CardDescription>Estado dos seus posts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Rascunhos', count: drafts, color: 'bg-yellow-400', textColor: 'text-yellow-700', bg: 'bg-yellow-50 dark:bg-yellow-950' },
              { label: 'Planejados', count: planned, color: 'bg-green-400', textColor: 'text-green-700', bg: 'bg-green-50 dark:bg-green-950' },
              { label: 'Publicados', count: published, color: 'bg-blue-400', textColor: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-950' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg ${item.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <Badge variant="outline" className={`${item.textColor} border-current`}>
                  {item.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Accounts overview */}
        {accounts && accounts.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Contas cadastradas</CardTitle>
              <CardDescription>Visão geral das contas e suas estratégias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {accounts.map((account) => (
                  <div key={account.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {account.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">@{account.username}</p>
                        {account.name && (
                          <p className="text-xs text-muted-foreground">{account.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="font-semibold text-sm">{account.posting_frequency}x</p>
                        <p className="text-[10px] text-muted-foreground">Posts/sem</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <Target className="size-4 mx-auto text-muted-foreground mb-0.5" />
                        <p className="text-[10px] text-muted-foreground">
                          {MAIN_GOAL_LABELS[account.main_goal] ?? account.main_goal}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="font-semibold text-sm text-[10px] leading-tight">
                          {BRAND_VOICE_LABELS[account.brand_voice] ?? account.brand_voice}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Tom</p>
                      </div>
                    </div>
                    {account.niche && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Nicho:</span> {account.niche}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insight note */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 pt-4 pb-4">
          <BarChart2 className="size-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Analytics detalhados de engajamento estarao disponiveis em versoes futuras da plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
