import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Social Manager',
  description: 'Política de privacidade do Social Manager',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Política de Privacidade</h1>
          <p className="text-muted-foreground mt-2">Última atualização: fevereiro de 2026</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Informações que coletamos</h2>
          <p>
            O Social Manager coleta informações necessárias para o funcionamento do serviço,
            incluindo dados de autenticação do Instagram/Meta fornecidos com sua autorização
            explícita via OAuth. Coletamos apenas as permissões necessárias para publicar e
            gerenciar conteúdo em sua conta.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Como usamos suas informações</h2>
          <p>As informações coletadas são usadas exclusivamente para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Autenticar sua conta do Instagram/Meta</li>
            <li>Publicar conteúdo em seu nome quando solicitado</li>
            <li>Agendar e gerenciar postagens</li>
            <li>Gerar relatórios de desempenho das publicações</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">3. Compartilhamento de dados</h2>
          <p>
            Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros,
            exceto quando exigido por lei ou quando necessário para operar os serviços (ex.:
            comunicação com a API do Meta/Instagram).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">4. Armazenamento e segurança</h2>
          <p>
            Os tokens de acesso do Instagram são armazenados de forma criptografada usando
            AES-256-GCM. Adotamos medidas técnicas e organizacionais para proteger seus dados
            contra acesso não autorizado.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">5. Retenção de dados</h2>
          <p>
            Seus dados são mantidos enquanto sua conta estiver ativa. Você pode solicitar a
            exclusão de seus dados a qualquer momento entrando em contato conosco.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Seus direitos</h2>
          <p>Você tem o direito de:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Acessar os dados que temos sobre você</li>
            <li>Solicitar a correção de dados incorretos</li>
            <li>Solicitar a exclusão de seus dados</li>
            <li>Revogar o acesso do aplicativo à sua conta do Instagram a qualquer momento</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">7. Exclusão de dados</h2>
          <p>
            Para solicitar a exclusão de seus dados, envie um e-mail para{' '}
            <a href="mailto:diorgeone@gmail.com" className="underline text-primary">
              diorgeone@gmail.com
            </a>{' '}
            com o assunto &quot;Exclusão de dados&quot;. Processaremos sua solicitação em até
            30 dias.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">8. Contato</h2>
          <p>
            Em caso de dúvidas sobre esta política de privacidade, entre em contato pelo
            e-mail:{' '}
            <a href="mailto:diorgeone@gmail.com" className="underline text-primary">
              diorgeone@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
