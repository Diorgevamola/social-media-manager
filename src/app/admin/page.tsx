import { AdminShell } from '@/components/admin/admin-shell'
import { createServiceClient } from '@/lib/supabase/service'
import { Users, CalendarDays, FileText, Image, Video, DollarSign } from 'lucide-react'

async function getStats() {
  const db = createServiceClient()

  const [
    { count: totalUsers },
    { count: totalSchedules },
    { count: totalPosts },
    { count: totalImages },
    { count: totalVideos },
    { count: totalTextGenerations },
    costResult,
    recentUsersResult,
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('schedules').select('*', { count: 'exact', head: true }),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }).not('generated_image_url', 'is', null),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }).not('generated_video_url', 'is', null),
    db.from('ai_generations').select('*', { count: 'exact', head: true }),
    db.from('ai_usage_logs').select('cost_usd'),
    db.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const accurateCostUsd = (costResult.data ?? []).reduce(
    (sum: number, row: { cost_usd: string | number | null }) => sum + Number(row.cost_usd ?? 0),
    0,
  )

  return {
    totalUsers:           totalUsers ?? 0,
    totalSchedules:       totalSchedules ?? 0,
    totalPosts:           totalPosts ?? 0,
    totalImages:          totalImages ?? 0,
    totalVideos:          totalVideos ?? 0,
    totalTextGenerations: totalTextGenerations ?? 0,
    accurateCostUsd,
    recentUsers:          recentUsersResult.count ?? 0,
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-foreground',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-9 bg-muted rounded-lg flex items-center justify-center shrink-0">
          <Icon className={`size-4 ${color}`} />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  return (
    <AdminShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Usuários"
            value={stats.totalUsers}
            sub={`+${stats.recentUsers} nos últimos 30 dias`}
          />
          <StatCard
            icon={CalendarDays}
            label="Cronogramas gerados"
            value={stats.totalSchedules}
          />
          <StatCard
            icon={FileText}
            label="Posts planejados"
            value={stats.totalPosts}
          />
          <StatCard
            icon={Image}
            label="Imagens geradas"
            value={stats.totalImages}
          />
          <StatCard
            icon={Video}
            label="Vídeos gerados"
            value={stats.totalVideos}
          />
          <StatCard
            icon={DollarSign}
            label="Custo preciso registrado"
            value={`$${stats.accurateCostUsd.toFixed(4)}`}
            sub="Desde a implantação dos logs"
            color="text-emerald-600"
          />
        </div>

        <div className="mt-8 bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Gerações de texto históricas</h2>
          <p className="text-muted-foreground text-sm">
            Total de gerações via <code className="text-xs bg-muted px-1 py-0.5 rounded">ai_generations</code>:{' '}
            <strong>{stats.totalTextGenerations}</strong>
          </p>
        </div>
      </div>
    </AdminShell>
  )
}
