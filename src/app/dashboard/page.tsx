import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Instagram,
  PenSquare,
  Calendar,
  Sparkles,
  ArrowRight,
  FileText,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { formatNumber } from '@/lib/utils'
import type { ContentPost } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ count: accountsCount }, { count: postsCount }, { data: recentPosts }] =
    await Promise.all([
      supabase
        .from('instagram_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_active', true),
      supabase
        .from('content_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id),
      supabase
        .from('content_posts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5)
        .returns<ContentPost[]>(),
    ])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuario'

  const stats = [
    {
      label: 'Contas conectadas',
      value: accountsCount ?? 0,
      icon: Instagram,
      color: 'text-pink-500',
      bg: 'bg-pink-50 dark:bg-pink-950',
    },
    {
      label: 'Posts criados',
      value: postsCount ?? 0,
      icon: FileText,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Rascunhos',
      value: recentPosts?.filter((p) => p.status === 'draft').length ?? 0,
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: 'Planejados',
      value: recentPosts?.filter((p) => p.status === 'planned').length ?? 0,
      icon: Calendar,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950',
    },
  ]

  const postTypeLabel: Record<string, string> = {
    post: 'Post',
    carousel: 'Carrossel',
    reel: 'Reel',
  }

  const statusConfig: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' }> = {
    draft: { label: 'Rascunho', variant: 'outline' },
    planned: { label: 'Planejado', variant: 'secondary' },
    published: { label: 'Publicado', variant: 'default' },
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Ola, {firstName}!</h1>
        <p className="text-muted-foreground mt-1">
          Aqui esta um resumo do seu conteudo para Instagram.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="py-4">
            <CardContent className="px-4">
              <div className="flex items-center gap-3">
                <div className={`size-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Acoes rapidas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 space-y-2">
            <Link href="/dashboard/content/create">
              <Button variant="outline" className="w-full justify-start gap-3 h-10">
                <PenSquare className="size-4 text-primary" />
                Criar novo conteudo
              </Button>
            </Link>
            <Link href="/dashboard/content/create?tab=ai">
              <Button variant="outline" className="w-full justify-start gap-3 h-10">
                <Sparkles className="size-4 text-purple-500" />
                Gerar com IA
              </Button>
            </Link>
            <Link href="/dashboard/calendar">
              <Button variant="outline" className="w-full justify-start gap-3 h-10">
                <Calendar className="size-4 text-blue-500" />
                Ver calendario
              </Button>
            </Link>
            {accountsCount === 0 && (
              <Link href="/dashboard/accounts">
                <Button className="w-full justify-start gap-3 h-10 ig-gradient text-white hover:opacity-90 border-0">
                  <Instagram className="size-4" />
                  Conectar Instagram
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent posts */}
        <Card className="lg:col-span-2 py-4">
          <CardHeader className="px-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground font-medium">Posts recentes</CardTitle>
              <Link href="/dashboard/content">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  Ver todos <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            {!recentPosts || recentPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="size-8 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum post criado ainda</p>
                <Link href="/dashboard/content/create" className="mt-3">
                  <Button size="sm">Criar primeiro post</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPosts.map((post) => {
                  const config = statusConfig[post.status] ?? { label: post.status, variant: 'outline' as const }
                  return (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="size-8 bg-muted rounded-md flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                        {postTypeLabel[post.post_type]?.[0] ?? 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {post.caption?.slice(0, 60) || 'Sem legenda'}
                          {(post.caption?.length ?? 0) > 60 ? '...' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {postTypeLabel[post.post_type] ?? post.post_type}
                        </p>
                      </div>
                      <Badge variant={config.variant}>
                        {config.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connect Instagram CTA */}
      {accountsCount === 0 && (
        <Card className="border-dashed py-8">
          <CardContent className="flex flex-col items-center justify-center text-center px-6">
            <div className="size-16 ig-gradient rounded-2xl flex items-center justify-center mb-4">
              <Instagram className="size-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Conecte sua conta do Instagram</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Conecte sua conta Business do Instagram para comecar a gerenciar seu conteudo com IA.
            </p>
            <Link href="/dashboard/accounts">
              <Button className="ig-gradient text-white border-0 hover:opacity-90">
                <Instagram className="size-4" />
                Conectar Instagram
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
