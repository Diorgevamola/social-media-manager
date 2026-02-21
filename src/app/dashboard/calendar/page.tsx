import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/content/calendar-view'
import { Button } from '@/components/ui/button'
import { PenSquare } from 'lucide-react'
import Link from 'next/link'
import type { ContentPost } from '@/types/database'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: posts } = await supabase
    .from('content_posts')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .returns<ContentPost[]>()

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendario de Conteudo</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e organize seus posts por data.
          </p>
        </div>
        <Link href="/dashboard/content/create">
          <Button className="gap-2">
            <PenSquare className="size-4" />
            Novo post
          </Button>
        </Link>
      </div>

      <CalendarView posts={posts ?? []} />
    </div>
  )
}
