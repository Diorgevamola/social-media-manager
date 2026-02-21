# 🚀 Quick Start - 5 Minutos

## ⚡ Setup Rápido

### 1️⃣ Clonar variáveis de ambiente
```bash
cp .env.local.example .env.local
```

### 2️⃣ Instalar dependências
```bash
npm install
```

### 3️⃣ Rodar em desenvolvimento
```bash
npm run dev
```

✅ Acesse: **http://localhost:3000**

---

## 🔑 Configurar Credenciais (15 minutos)

### Supabase
1. Crie projeto em [supabase.com](https://supabase.com)
2. Vá em `Project Settings` → `API`
3. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
4. Vá em `SQL Editor` e execute `supabase/schema.sql`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxx
```

### Instagram/Meta
1. Crie app em [developers.facebook.com](https://developers.facebook.com)
2. Tipo: **Business**
3. Adicione produto: **Instagram Graph API**
4. Em `Settings` → `Basic`:
   - Copie `App ID` → `INSTAGRAM_APP_ID` e `NEXT_PUBLIC_INSTAGRAM_APP_ID`
   - Copie `App Secret` → `INSTAGRAM_APP_SECRET`
5. Em `Products` → `Instagram Graph API` → `Settings`:
   - Adicione OAuth Redirect URI: `http://localhost:3000/api/instagram/callback`

```env
INSTAGRAM_APP_ID=123456789
INSTAGRAM_APP_SECRET=xxxxxxxxxxxxx
NEXT_PUBLIC_INSTAGRAM_APP_ID=123456789
```

### Google Gemini
1. Vá em [aistudio.google.com](https://aistudio.google.com)
2. Clique em `Create API Key`
3. Copie a key

```env
GOOGLE_GEMINI_API_KEY=AIzaSyxxxxxxx
```

### App URL
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✨ Features Prontas para Testar

### 🔐 Autenticação
```
Login Page: http://localhost:3000/auth/login
Signup Page: http://localhost:3000/auth/signup
```

**Testar:**
1. Criar uma conta com email/senha
2. Login
3. Verifique token em cookies

### 📱 Conectar Instagram
```
Dashboard: http://localhost:3000/dashboard
Accounts: http://localhost:3000/dashboard/accounts
```

**Testar:**
1. Click "Connect Instagram"
2. Autorize no Facebook
3. Conta deve aparecer em `Accounts`

### ✨ Gerar Conteúdo com IA
```
Create: http://localhost:3000/dashboard/create
```

**Testar:**
1. Preencha formulário
2. Click "Gerar legenda" ou "Gerar hashtags"
3. IA deve responder em ~2 segundos

### 📅 Calendário
```
Calendar: http://localhost:3000/dashboard/calendar
```

**Testar:**
1. Posts aparecem no calendário
2. Click para editar ou deletar

---

## 🧪 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Hot reload

# Qualidade
npm run lint               # ESLint check
npm run typecheck          # TypeScript compile
npm run test               # Jest tests

# Build
npm run build              # Produção build
npm run start              # Rodal build local

# Debugging
npm run dev -- --inspect   # Node debugger
```

---

## 📂 Arquivos Principais para Editar

### Adicionar Componentes
```
src/components/
└─ Criar arquivo .tsx
```

### Adicionar Pages
```
src/app/dashboard/
└─ Criar folder + page.tsx
```

### Adicionar API Routes
```
src/app/api/
└─ Criar folder + route.ts
```

### Adicionar Types
```
src/types/
└─ Criar arquivo .ts
```

### Adicionar Stores
```
src/stores/
└─ Criar arquivo .ts com Zustand
```

---

## 🐛 Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not set"
✓ Preencheu `.env.local`?
✓ Reiniciou `npm run dev`?
✓ Verificou cópia/cola sem espaços?

### "Invalid OAuth redirect"
✓ Instagram App ID está correto?
✓ Redirect URI é exatamente `http://localhost:3000/api/instagram/callback`?
✓ Esperou 5 minutos para propagar?

### "Gemini API error"
✓ Gemini API Key está válida?
✓ Quotas disponíveis no Google Cloud?
✓ Rede permite HTTPS para google APIs?

### "Build fails with TypeScript"
```bash
# Limpar cache e rebuild
rm -rf .next
npm run typecheck
npm run build
```

### "Components not displaying"
```bash
# Rebuild Tailwind
npm run build

# Limpar cache do browser
Ctrl+Shift+Del (Hard Refresh)
```

---

## 📊 Verificar Projeto

### Build
```bash
npm run build
# ✅ Deve compilar sem erros
```

### Lint
```bash
npm run lint
# ✅ Deve passar sem warnings
```

### Types
```bash
npm run typecheck
# ✅ Deve ser 0 errors
```

### Coverage
```bash
npm run test:coverage
# Visualizar em coverage/
```

---

## 🚀 Deploy (Próximo Passo)

### Opção 1: Vercel (Recomendado)
```bash
npm i -g vercel
vercel
# Siga os passos - automático!
```

### Opção 2: Docker
```bash
docker build -t social-media-manager .
docker run -p 3000:3000 social-media-manager
```

### Opção 3: Manual
```bash
npm run build
npm run start
# Listener em :3000
```

---

## 📚 Próximos Passos

1. ✅ Setup completo (você está aqui)
2. → Testar fluxo de auth
3. → Testar conexão Instagram
4. → Testar geração IA
5. → Implementar features adicionais
6. → Deploy em staging
7. → Validação com usuários

---

## 💬 Dúvidas?

Consulte:
- `README.md` - Setup completo
- `PROJECT_STRUCTURE.md` - Arquitetura
- `EXECUTIVE_SUMMARY.md` - Visão geral
- `.env.local.example` - Template env vars

---

**Ready?** 🎉

```bash
npm run dev
```

Visit: **http://localhost:3000**

Bon appétit! 🍽️
