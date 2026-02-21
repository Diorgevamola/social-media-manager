import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Instagram, Sparkles, Calendar, PenSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <div className="size-8 ig-gradient rounded-lg flex items-center justify-center">
              <Instagram className="size-4 text-white" />
            </div>
            <span className="font-semibold">Social Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Powered by Google Gemini AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Gerencie seu Instagram com
            <span className="ig-gradient-text"> inteligencia artificial</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Crie conteudo, gere legendas e hashtags com IA, e organize seu calendario de publicacoes.
            Tudo em um so lugar.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Comecar gratis
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Ja tenho conta</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Tudo que voce precisa para o Instagram</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: 'IA para Conteudo',
                description: 'Gere legendas, hashtags e ideias de conteudo com inteligencia artificial.',
                color: 'text-purple-500',
                bg: 'bg-purple-50 dark:bg-purple-950',
              },
              {
                icon: PenSquare,
                title: 'Criacao de Posts',
                description: 'Crie posts, carrosseis e reels com preview em tempo real.',
                color: 'text-blue-500',
                bg: 'bg-blue-50 dark:bg-blue-950',
              },
              {
                icon: Calendar,
                title: 'Calendario Visual',
                description: 'Organize seus posts em um calendario visual e planeje seu conteudo.',
                color: 'text-green-500',
                bg: 'bg-green-50 dark:bg-green-950',
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className={`size-12 ${feature.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <feature.icon className={`size-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para comecar?</h2>
          <p className="text-muted-foreground mb-8">
            Crie sua conta gratis e comece a gerenciar seu Instagram com inteligencia artificial.
          </p>
          <Link href="/signup">
            <Button size="lg" className="ig-gradient text-white border-0 hover:opacity-90 gap-2">
              <Instagram className="size-4" />
              Comecar gratis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 ig-gradient rounded flex items-center justify-center">
              <Instagram className="size-3 text-white" />
            </div>
            <span className="text-sm font-medium">Social Manager</span>
          </div>
          <p className="text-xs text-muted-foreground">MVP - Social Media Manager</p>
        </div>
      </footer>
    </div>
  )
}
