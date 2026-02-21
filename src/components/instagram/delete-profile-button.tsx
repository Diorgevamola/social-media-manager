'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteProfileButtonProps {
  profileId: string
  username: string
}

export function DeleteProfileButton({ profileId, username }: DeleteProfileButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (!confirm(`Deseja remover o perfil @${username}?`)) return

    setLoading(true)
    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .eq('id', profileId)

    if (!error) {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-destructive hover:text-destructive gap-1.5"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      Remover
    </Button>
  )
}
