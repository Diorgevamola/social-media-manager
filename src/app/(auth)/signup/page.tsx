import { SignupForm } from '@/components/auth/signup-form'
import { LogoMark } from '@/components/ui/logo'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">

        <div className="flex items-center gap-2.5 mb-8">
          <div className="size-8 bg-black rounded-lg border border-foreground/10 flex items-center justify-center shrink-0">
            <LogoMark size={18} accent />
          </div>
          <span className="text-xl font-bold">Social Manager</span>
        </div>

        <h2 className="text-2xl font-bold mb-2">Criar conta grátis</h2>
        <p className="text-muted-foreground mb-8">
          Já tem conta?{' '}
          <a href="/login" className="text-primary hover:underline font-medium">
            Entrar
          </a>
        </p>
        <SignupForm />
      </div>
    </div>
  )
}
