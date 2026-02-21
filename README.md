# Social Media Manager

Plataforma de gerenciamento de conteúdo para Instagram com geração de posts, carrosséis e reels usando IA (Google Gemini).

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind v4 + shadcn/ui + Radix UI
- **Auth + DB**: Supabase
- **AI**: Google Gemini 1.5 Flash
- **State**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod

## MVP Features

- ✅ Autenticação (email/senha via Supabase)
- ✅ Conexão com conta Instagram Business (OAuth)
- ✅ Gerenciamento de contas conectadas
- ✅ Geração de conteúdo com IA (posts, carrosséis, reels)
- ✅ Editor de posts com preview
- ✅ Calendário visual de conteúdo
- ✅ Analytics básico
- 🚧 Agendamento automático (próxima versão)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

### 3. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o SQL em `supabase/schema.sql` no SQL Editor do Supabase
3. Copie as credenciais para `.env.local`

### 4. Configurar Instagram / Meta App

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um novo App (tipo: Business)
3. Adicione o produto **Instagram Graph API**
4. Configure o OAuth redirect URI: `{NEXT_PUBLIC_APP_URL}/api/instagram/callback`
5. Copie o App ID e App Secret para `.env.local`

**Permissões necessárias:**
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`
- `business_management`

### 5. Obter Gemini API Key

1. Acesse [aistudio.google.com](https://aistudio.google.com)
2. Crie uma API Key
3. Adicione ao `.env.local` como `GEMINI_API_KEY`

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:3000`

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/          # Login, signup
│   ├── (dashboard)/     # Dashboard protegido
│   │   ├── page.tsx     # Home
│   │   ├── accounts/    # Contas Instagram
│   │   ├── create/      # Criação de conteúdo
│   │   ├── calendar/    # Calendário
│   │   ├── analytics/   # Analytics
│   │   └── settings/    # Configurações
│   ├── api/
│   │   ├── ai/generate/ # Rota AI Gemini
│   │   └── instagram/   # OAuth callback
│   └── auth/callback/   # Supabase auth callback
├── components/
│   ├── ui/              # Componentes base (shadcn)
│   ├── auth/            # Login, signup forms
│   ├── dashboard/       # Sidebar, header
│   ├── instagram/       # Connect, disconnect buttons
│   └── content/         # Creator, editor, calendar, AI generator
├── lib/
│   ├── supabase/        # Client, server, middleware
│   ├── instagram/       # Instagram Graph API client
│   └── gemini/          # Google Gemini client
└── types/               # TypeScript types
```

## Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis de usuários |
| `instagram_accounts` | Contas Instagram conectadas |
| `content_posts` | Posts criados (rascunhos, planejados) |
| `ai_generations` | Histórico de geração por IA |

## Próximas versões

- Agendamento automático de posts
- Publicação direta via Instagram Graph API
- Analytics de engajamento detalhado
- Geração de cronograma mensal com IA
- Upload de imagens/vídeos
- Múltiplos usuários / workspace
