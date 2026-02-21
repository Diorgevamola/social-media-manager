# Estrutura do Projeto Social Media Manager

```
social-media-manager/
│
├── 📋 Configurações
│   ├── next.config.ts           ← Next.js config com remote patterns
│   ├── tailwind.config.ts       ← Tema Tailwind v4
│   ├── postcss.config.mjs       ← PostCSS config
│   ├── tsconfig.json            ← TypeScript com paths absolutos
│   ├── eslint.config.mjs        ← ESLint + Next.js + TypeScript
│   ├── package.json             ← Dependências
│   └── .env.local.example       ← Template variáveis
│
├── 📁 src/
│   │
│   ├── 🎨 app/
│   │   ├── layout.tsx           ← Root layout (providers)
│   │   ├── globals.css          ← CSS global + variáveis Tailwind
│   │   ├── page.tsx             ← Landing page (/)
│   │   │
│   │   ├── 🔐 (auth)/           ← Grupo de autenticação
│   │   │   ├── login/page.tsx   ← Login
│   │   │   ├── signup/page.tsx  ← Sign up
│   │   │   └── layout.tsx       ← Auth layout
│   │   │
│   │   ├── 🚀 (dashboard)/      ← Grupo dashboard protegido
│   │   │   ├── page.tsx         ← Home dashboard
│   │   │   ├── layout.tsx       ← Dashboard layout com sidebar
│   │   │   ├── accounts/        ← Gerenciamento de contas
│   │   │   │   ├── page.tsx     ← Listar contas
│   │   │   │   └── [id]/page.tsx ← Detalhes conta
│   │   │   ├── create/          ← Criar conteúdo
│   │   │   │   ├── page.tsx     ← Criar novo post
│   │   │   │   └── [id]/page.tsx ← Editar post
│   │   │   ├── calendar/        ← Calendário visual
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/       ← Analytics e insights
│   │   │   │   └── page.tsx
│   │   │   └── settings/        ← Configurações
│   │   │       └── page.tsx
│   │   │
│   │   ├── 🔒 auth/
│   │   │   └── callback/route.ts ← Supabase auth callback
│   │   │
│   │   └── 🔌 api/
│   │       ├── ai/
│   │       │   ├── generate-caption/route.ts    ← POST gerar legenda
│   │       │   ├── generate-hashtags/route.ts   ← POST gerar hashtags
│   │       │   └── generate-ideas/route.ts      ← POST gerar ideias
│   │       ├── instagram/
│   │       │   ├── callback/route.ts            ← OAuth callback
│   │       │   ├── accounts/route.ts            ← GET contas
│   │       │   └── media/route.ts               ← GET mídia
│   │       └── content/
│   │           └── posts/route.ts               ← CRUD posts
│   │
│   ├── 🧩 components/
│   │   ├── 🎨 ui/                 ← shadcn/ui base
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── card.tsx
│   │   │   ├── label.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── separator.tsx
│   │   │   └── skeleton.tsx
│   │   │
│   │   ├── 🔐 auth/
│   │   │   ├── login-form.tsx      ← Form de login
│   │   │   └── signup-form.tsx     ← Form de signup
│   │   │
│   │   ├── 📱 instagram/
│   │   │   ├── connect-button.tsx  ← Botão conectar Instagram
│   │   │   ├── disconnect-button.tsx ← Botão desconectar
│   │   │   └── account-card.tsx    ← Card de conta
│   │   │
│   │   ├── 📊 dashboard/
│   │   │   ├── header.tsx          ← Header dashboard
│   │   │   ├── sidebar.tsx         ← Sidebar navegação
│   │   │   └── user-menu.tsx       ← Menu usuário
│   │   │
│   │   ├── 📝 content/
│   │   │   ├── content-form.tsx    ← Form criar post
│   │   │   ├── ai-generator.tsx    ← Panel gerador IA
│   │   │   ├── preview.tsx         ← Preview do post
│   │   │   ├── media-uploader.tsx  ← Upload de mídia
│   │   │   ├── calendar-view.tsx   ← Calendário visual
│   │   │   └── content-list.tsx    ← Lista de posts
│   │   │
│   │   ├── 📍 providers.tsx        ← React Query, Toast providers
│   │   └── 🎯 navbar.tsx           ← Navbar
│   │
│   ├── 📚 lib/
│   │   ├── utils.ts                ← Utilidades (cn, formatDate, etc)
│   │   │
│   │   ├── supabase/
│   │   │   ├── client.ts           ← Browser client
│   │   │   ├── server.ts           ← Server client
│   │   │   └── middleware.ts       ← Session middleware
│   │   │
│   │   ├── instagram/
│   │   │   └── client.ts           ← Instagram Graph API client
│   │   │
│   │   ├── gemini/
│   │   │   └── client.ts           ← Google Gemini client
│   │   │
│   │   └── hooks/                  ← Custom React hooks
│   │       ├── useAuth.ts          ← Hook autenticação
│   │       ├── useInstagram.ts     ← Hook Instagram accounts
│   │       └── useContent.ts       ← Hook conteúdo
│   │
│   ├── 🏪 stores/
│   │   ├── auth.ts                 ← Store autenticação (Zustand)
│   │   ├── instagram.ts            ← Store contas (Zustand)
│   │   └── content.ts              ← Store posts (Zustand)
│   │
│   ├── 📘 types/
│   │   ├── index.ts                ← Export centralizado
│   │   ├── database.ts             ← Tipos Supabase
│   │   └── instagram.ts            ← Tipos Instagram API
│   │
│   └── 🔐 middleware.ts            ← Next.js middleware

├── 💾 supabase/
│   └── schema.sql                  ← Schema do banco PostgreSQL

├── 📖 Documentação
│   ├── README.md                   ← Setup completo
│   ├── RECONSTRUCTION_COMPLETE.md  ← Sumário da reconstrução
│   ├── PROJECT_STRUCTURE.md        ← Este arquivo
│   └── .env.local.example          ← Template env vars

└── 📦 node_modules/
    └── [dependências npm]
```

---

## 🗂️ Layers da Aplicação

### Layer 1: Presentational (UI)
```
pages/ → components/ → ui/
└─ Componentes React reutilizáveis
```

### Layer 2: Business Logic
```
stores/ (Zustand) + hooks/
└─ State management e lógica compartilhada
```

### Layer 3: Data Layer
```
lib/supabase/ + lib/instagram/ + lib/gemini/
└─ Clientes e integrações com serviços externos
```

### Layer 4: API Routes
```
app/api/* (Route Handlers Next.js)
└─ Endpoints para operações backend
```

### Layer 5: Type Safety
```
types/
└─ TypeScript types e interfaces
```

---

## 🔄 Fluxos Principais

### Autenticação
```
Login → Supabase Auth → Session Middleware → Protected Routes
```

### Instagram Connection
```
"Conectar Instagram" → OAuth → API Callback → Salva em DB → Dashboard
```

### Criação de Conteúdo
```
Novo Post → Preenche Form → IA Gera Caption/Hashtags → Preview → Save Draft
```

### Calendário
```
Posts Drafts → Exibidos no Calendário → Organiza por data → Agendamento (v2)
```

---

## 📊 Tech Stack Detalhado

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | Next.js | 15.1.6 |
| **Runtime** | React | 19.0.0 |
| **Tipagem** | TypeScript | 5.7.3 |
| **Styling** | Tailwind CSS | 4.0.6 |
| **UI Components** | Radix UI | Latest |
| **HTTP Client** | Fetch API | Native |
| **State Mgmt** | Zustand | 5.0.2 |
| **Server State** | TanStack Query | 5.62.16 |
| **Forms** | React Hook Form | 7.54.2 |
| **Validation** | Zod | 3.24.1 |
| **Auth** | Supabase | 2.49.1 |
| **DB** | PostgreSQL | Via Supabase |
| **AI** | Google Gemini | 1.5 Flash |
| **Icons** | Lucide React | 0.468.0 |
| **Linting** | ESLint | 9.19.0 |
| **Testing** | Jest | 29.7.0 |

---

## 🚀 Deploy Checklist

- [ ] Variáveis `.env.local` configuradas
- [ ] Banco Supabase criado e migrado
- [ ] App Meta criado e configurado
- [ ] Google Gemini API Key obtida
- [ ] `npm run build` executado com sucesso
- [ ] `npm run lint` sem warnings
- [ ] `npm run typecheck` sem erros
- [ ] Testes executados: `npm test`
- [ ] Deploy para staging/production

---

**Estrutura pronta para desenvolvimento!** 🎉
