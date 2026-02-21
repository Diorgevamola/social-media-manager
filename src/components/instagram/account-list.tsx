'use client'

import { useState } from 'react'
import type { InstagramAccount } from '@/types/database'
import { AccountCard } from '@/components/instagram/account-card'
import { CreateProfileForm } from '@/components/instagram/create-profile-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Instagram, Plus } from 'lucide-react'

interface AccountListProps {
  accounts: InstagramAccount[]
}

export function AccountList({ accounts }: AccountListProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="size-16 ig-gradient rounded-2xl flex items-center justify-center mb-4">
            <Instagram className="size-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma conta adicionada</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Adicione sua conta do Instagram com informações de briefing para começar a gerar conteúdo personalizado com IA.
          </p>
          <Button
            size="lg"
            className="ig-gradient text-white border-0 hover:opacity-90"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" />
            Adicionar conta
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {accounts.length} conta{accounts.length !== 1 ? 's' : ''} cadastrada{accounts.length !== 1 ? 's' : ''}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
            >
              <Plus className="size-4" />
              Adicionar conta
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar conta do Instagram</DialogTitle>
            <DialogDescription>
              Preencha o briefing da conta para que a IA gere conteúdo personalizado.
            </DialogDescription>
          </DialogHeader>
          <CreateProfileForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
