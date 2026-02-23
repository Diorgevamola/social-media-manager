'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Unlink, Loader2 } from 'lucide-react'

interface DisconnectMetaButtonProps {
  accountId: string
  username: string
}

export function DisconnectMetaButton({ accountId, username }: DisconnectMetaButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDisconnect() {
    setLoading(true)
    const { error } = await supabase
      .from('instagram_accounts')
      .update({
        access_token: null,
        token_expires_at: null,
        ig_user_id: null,
        facebook_page_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)

    setLoading(false)

    if (!error) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-5 text-[10px] px-2 text-muted-foreground hover:text-destructive"
      >
        <Unlink className="size-3 mr-1" />
        Desconectar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desconectar do Meta?</DialogTitle>
            <DialogDescription>
              A conta <strong>@{username}</strong> será desconectada do Meta. O perfil e o briefing
              serão mantidos, mas não será possível publicar até reconectar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Desconectar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
