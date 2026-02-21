import { AdminShell } from '@/components/admin/admin-shell'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface UserRow {
  id: string
  email: string
  created_at: string
  full_name: string | null
  instagram_accounts: number
  schedules: number
  schedule_posts: number
  images: number
  videos: number
}

async function getUsers(): Promise<UserRow[]> {
  const db = createServiceClient()

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (!authUsers?.users?.length) return []

  const userIds = authUsers.users.map((u) => u.id)

  const [
    { data: profiles },
    { data: accounts },
    { data: schedules },
    { data: posts },
    { data: images },
    { data: videos },
  ] = await Promise.all([
    db.from('profiles').select('id, full_name').in('id', userIds),
    db.from('instagram_accounts').select('user_id').in('user_id', userIds),
    db.from('schedules').select('user_id').in('user_id', userIds),
    db.from('schedule_posts').select('user_id').in('user_id', userIds),
    db.from('schedule_posts').select('user_id').in('user_id', userIds).not('generated_image_url', 'is', null),
    db.from('schedule_posts').select('user_id').in('user_id', userIds).not('generated_video_url', 'is', null),
  ])

  const count = (arr: Array<{ user_id: string }> | null, userId: string) =>
    (arr ?? []).filter((r) => r.user_id === userId).length

  return authUsers.users.map((u) => {
    const profile = (profiles ?? []).find((p) => p.id === u.id)
    return {
      id:                  u.id,
      email:               u.email ?? '—',
      created_at:          u.created_at,
      full_name:           profile?.full_name ?? null,
      instagram_accounts:  count(accounts, u.id),
      schedules:           count(schedules, u.id),
      schedule_posts:      count(posts, u.id),
      images:              count(images, u.id),
      videos:              count(videos, u.id),
    }
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function AdminUsersPage() {
  const users = await getUsers()

  return (
    <AdminShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} usuários cadastrados</p>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Contas</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cronogramas</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Posts</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Imagens</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vídeos</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{user.instagram_accounts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{user.schedules}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{user.schedule_posts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{user.images}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{user.videos}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
