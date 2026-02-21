'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface DisconnectAccountButtonProps {
  accountId: string
  username: string
}

export function DisconnectAccountButton({ accountId, username }: DisconnectAccountButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDisconnect() {
    if (!confirm(`Deseja desconectar a conta @${username}?`)) return

    setLoading(true)
    const { error } = await supabase
      .from('instagram_accounts')
      .delete()
      .eq('id', accountId)

    if (!error) {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDisconnect}
      disabled={loading}
      className="text-destructive hover:text-destructive gap-1.5"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      Remover
    </Button>
  )
}
