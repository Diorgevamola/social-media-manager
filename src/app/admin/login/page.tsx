'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('E-mail ou senha incorretos')
      setLoading(false)
      return
    }

    // Middleware will validate admin status and redirect if not admin
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Icon + Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="size-16 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="size-8 text-white/80" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-white/40 text-sm mt-1.5">Acesso restrito</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm text-white/60">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm text-white/60">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-900/50 rounded-lg px-3 py-2.5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50 transition-colors mt-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Entrar
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-8">
          Apenas administradores autorizados
        </p>
      </div>
    </div>
  )
}
