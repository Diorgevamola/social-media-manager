'use client'

import { Button } from '@/components/ui/button'
import { Instagram } from 'lucide-react'

interface ConnectInstagramButtonProps {
  large?: boolean
  accountId?: string
}

export function ConnectInstagramButton({ large, accountId }: ConnectInstagramButtonProps) {
  function handleConnect() {
    const url = accountId
      ? `/api/instagram/connect?accountId=${accountId}`
      : `/api/instagram/connect`
    window.location.href = url
  }

  return (
    <Button
      onClick={handleConnect}
      size={large ? 'lg' : 'default'}
      className="ig-gradient text-white border-0 hover:opacity-90"
    >
      <Instagram className="size-4" />
      Conectar Instagram
    </Button>
  )
}
