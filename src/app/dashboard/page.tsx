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
  CheckCircle2,
  Clock,
  CalendarDays,
  ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import { formatNumber } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: accountsCount },
    { count: plannedCount },
    { count: publishedCount },
    { count: schedulesCount },
    { data: recentPosts },
    { data: nextPost },
  ] = await Promise.all([
    // Contas conectadas
    supabase
      .from('instagram_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('is_active', true),

    // Posts agendados (planejados ainda não publicados)
    supabase
      .from('schedule_posts')
      .select('*, schedules!inner(user_id)', { count: 'exact', head: true })
      .eq('schedules.user_id', user!.id)
      .eq('status', 'planned'),

    // Posts publicados
    supabase
      .from('schedule_posts')
      .select('*, schedules!inner(user_id)', { count: 'exact', head: true })
      .eq('schedules.user_id', user!.id)
      .eq('status', 'published'),

    // Cronogramas criados
    supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id),

    // Posts recentes (últimos 5 do cronograma)
    supabase
      .from('schedule_posts')
      .select('id, theme, post_type, status, date, time, confirmed, schedules!inner(user_id, account_id, instagram_accounts(username))')
      .eq('schedules.user_id', user!.id)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(5),

    // Próximo post agendado
    supabase
      .from('schedule_posts')
      .select('id, theme, post_type, date, time, schedules!inner(user_id, instagram_accounts(username))')
      .eq('schedules.user_id', user!.id)
      .eq('status', 'planned')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(1),
  ])

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Usuário'

  const stats = [
    {
      label: 'Contas conectadas',
      value: accountsCount ?? 0,
      icon: Instagram,
      color: 'text-pink-500',
      bg: 'bg-pink-50 dark:bg-pink-950',
      href: '/dashboard/accounts',
    },
    {
      label: 'Posts agendados',
      value: plannedCount ?? 0,
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950',
      href: '/dashboard/schedule',
    },
    {
      label: 'Posts publicados',
      value: publishedCount ?? 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950',
      href: '/dashboard/schedule',
    },
    {
      label: 'Cronogramas',
      value: schedulesCount ?? 0,
      icon: CalendarDays,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
      href: '/dashboard/schedule',
    },
  ]

  const postTypeLabel: Record<string, string> = {
    post: 'Post',
    carousel: 'Carrossel',
    reel: 'Reel',
    story: 'Story',
    stories_sequence: 'Seq. Stories',
  }

  const statusConfig: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' | 'destructive' }> = {
    planned: { label: 'Agendado', variant: 'secondary' },
    published: { label: 'Publicado', variant: 'default' },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getUsername = (post: any) => {
    return post?.schedules?.instagram_accounts?.username ?? null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextPostItem = nextPost?.[0] as any

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Olá, {firstName}!</h1>
        <p className="text-muted-foreground mt-1">
          Aqui está um resumo do seu conteúdo para Instagram.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="py-4 hover:border-primary/50 transition-colors cursor-pointer">
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
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 space-y-2">
            <Link href="/dashboard/schedule">
              <Button variant="outline" className="w-full justify-start gap-3 h-10">
                <CalendarDays className="size-4 text-primary" />
                Ver cronograma
              </Button>
            </Link>
            <Link href="/dashboard/schedule">
              <Button variant="outline" className="w-full justify-start gap-3 h-10">
                <Sparkles className="size-4 text-purple-500" />
                Criar cronograma com IA
              </Button>
            </Link>
            <Link href="/dashboard/accounts">
              <Button variant="outline" className="w-full justify-start gap-3 h-10">
                <Instagram className="size-4 text-pink-500" />
                Gerenciar contas
              </Button>
            </Link>
            {(accountsCount ?? 0) === 0 && (
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
              <Link href="/dashboard/schedule">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  Ver todos <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            {!recentPosts || recentPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PenSquare className="size-8 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum post agendado ainda</p>
                <Link href="/dashboard/schedule" className="mt-3">
                  <Button size="sm">Criar cronograma</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(recentPosts as any[]).map((post) => {
                  const config = statusConfig[post.status] ?? { label: post.status, variant: 'outline' as const }
                  const username = getUsername(post)
                  const dateLabel = post.date
                    ? new Date(post.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : ''
                  return (
                    <Link key={post.id} href="/dashboard/schedule">
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="size-8 bg-muted rounded-md flex items-center justify-center shrink-0">
                          <ImageIcon className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.theme?.slice(0, 60) || 'Sem tema'}
                            {(post.theme?.length ?? 0) > 60 ? '...' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {postTypeLabel[post.post_type] ?? post.post_type}
                            {username ? ` · @${username}` : ''}
                            {dateLabel ? ` · ${dateLabel}` : ''}
                          </p>
                        </div>
                        <Badge variant={config.variant} className="shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximo post agendado */}
      {nextPostItem && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Próximo post agendado</p>
                  <p className="text-sm font-semibold truncate max-w-sm">
                    {nextPostItem.theme ?? 'Sem tema'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextPostItem.date
                      ? new Date(nextPostItem.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long', day: '2-digit', month: 'long'
                        })
                      : ''}
                    {nextPostItem.time ? ` às ${nextPostItem.time}` : ''}
                    {nextPostItem?.schedules?.instagram_accounts?.username
                      ? ` · @${nextPostItem.schedules.instagram_accounts.username}`
                      : ''}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/schedule" className="shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5">
                  Ver <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect Instagram CTA */}
      {(accountsCount ?? 0) === 0 && (
        <Card className="border-dashed py-8">
          <CardContent className="flex flex-col items-center justify-center text-center px-6">
            <div className="size-16 ig-gradient rounded-2xl flex items-center justify-center mb-4">
              <Instagram className="size-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Conecte sua conta do Instagram</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Conecte sua conta Business do Instagram para começar a gerenciar seu conteúdo com IA.
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
