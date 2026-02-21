import { createClient } from '@/lib/supabase/server'
import type { InstagramAccount } from '@/types/database'
import { AccountList } from '@/components/instagram/account-list'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface AccountsPageProps {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  const { data: accounts } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .returns<InstagramAccount[]>()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Contas do Instagram</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas contas do Instagram conectadas.
        </p>
      </div>

      {params.success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="text-sm">{params.success}</span>
        </div>
      )}

      {params.error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="text-sm">{params.error}</span>
        </div>
      )}

      <AccountList accounts={accounts ?? []} />
    </div>
  )
}
