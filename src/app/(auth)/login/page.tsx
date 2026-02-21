import { LoginForm } from '@/components/auth/login-form'
import { LogoMark } from '@/components/ui/logo'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo — Branding ── */}
      <div className="hidden lg:flex flex-1 bg-black items-center justify-center p-12 relative overflow-hidden">
        {/* Marca d'água sutil ao fundo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
          <LogoMark size={480} />
        </div>

        <div className="relative max-w-md text-white z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="size-11 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
              <LogoMark size={24} accent />
            </div>
            <span className="text-xl font-bold tracking-tight">Social Manager</span>
          </div>

          <h1 className="text-4xl font-bold mb-5 leading-tight">
            Gerencie suas redes sociais com inteligência artificial
          </h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Crie conteúdo, gere cronogramas e publique em múltiplas plataformas com o poder da IA.
          </p>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-10">
            {[
              { label: 'Posts criados', value: '10K+' },
              { label: 'Usuários ativos', value: '500+' },
              { label: 'Horas economizadas', value: '50K+' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-white/40 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel direito — Formulário ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Logo mobile (só aparece quando o painel esquerdo some) */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="size-8 bg-black rounded-lg border border-foreground/10 flex items-center justify-center shrink-0">
              <LogoMark size={18} accent />
            </div>
            <span className="text-xl font-bold">Social Manager</span>
          </div>

          <h2 className="text-2xl font-bold mb-2">Entrar na sua conta</h2>
          <p className="text-muted-foreground mb-8">
            Não tem conta?{' '}
            <a href="/signup" className="text-primary hover:underline font-medium">
              Criar conta grátis
            </a>
          </p>
          <LoginForm />
        </div>
      </div>

    </div>
  )
}
