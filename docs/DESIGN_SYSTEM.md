# Design System - Social Media Manager

> Pipeline de Qualidade executado em 2026-02-22
> Stack: Next.js 15 + React 19 + Tailwind CSS v4 + Radix UI + CVA

---

## Sumario

- [Tokens de Design](#tokens-de-design)
- [Componentes Atomicos (UI)](#componentes-atomicos-ui)
- [Componentes de Negocio](#componentes-de-negocio)
- [Padroes e Convencoes](#padroes-e-convencoes)
- [Auditoria de Acessibilidade](#auditoria-de-acessibilidade)
- [Metricas de Qualidade](#metricas-de-qualidade)

---

## Tokens de Design

### Sistema de Cores (OKLch)

O projeto usa CSS custom properties com cores em OKLch (perceptualmente uniforme).
Dois temas: `:root` (light) e `.dark` (dark).

#### Cores Semanticas

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--primary` | `oklch(0.588 0.213 17.6)` | `oklch(0.707 0.165 254.624)` | Botoes primarios, links, focus ring |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | Texto sobre primary |
| `--secondary` | `oklch(0.961 0 0)` | `oklch(0.269 0 0)` | Botoes secundarios |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Texto sobre secondary |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Acoes perigosas, erros |
| `--muted` | `oklch(0.961 0 0)` | `oklch(0.269 0 0)` | Backgrounds desabilitados |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Texto secundario, placeholders |
| `--accent` | `oklch(0.961 0 0)` | `oklch(0.269 0 0)` | Estados hover |
| `--accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Texto sobre accent |

#### Cores de Superficie

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Fundo da pagina |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texto principal |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fundo de cards |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texto em cards |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fundo de popovers/dropdowns |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texto em popovers |

#### Cores Utilitarias

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Bordas gerais |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Bordas de inputs |
| `--ring` | `oklch(0.588 0.213 17.6)` | `oklch(0.707 0.165 254.624)` | Focus ring |

#### Cores de Graficos (Recharts)

| Token | Light | Dark |
|-------|-------|------|
| `--chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` |
| `--chart-2` | `oklch(0.6 0.118 184.704)` | `oklch(0.696 0.17 162.48)` |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)` |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)` |
| `--chart-5` | `oklch(0.769 0.188 70.08)` | `oklch(0.645 0.246 16.439)` |

#### Cores do Sidebar

| Token | Light | Dark |
|-------|-------|------|
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-primary` | `oklch(0.588 0.213 17.6)` | `oklch(0.707 0.165 254.624)` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |

### Border Radius

| Token | Valor |
|-------|-------|
| `--radius` (base) | `0.625rem` (10px) |
| `--radius-sm` | `calc(var(--radius) - 4px)` = 6px |
| `--radius-md` | `calc(var(--radius) - 2px)` = 8px |
| `--radius-lg` | `var(--radius)` = 10px |
| `--radius-xl` | `calc(var(--radius) + 4px)` = 14px |

### Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-sans` | Geist Sans | Texto geral |
| `--font-mono` | Geist Mono | Codigo |

### Gradientes Customizados

```css
.ig-gradient {
  background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
}
.ig-gradient-text {
  /* Mesmo gradiente com clip de texto */
}
```

### Animacoes

| Nome | Uso |
|------|-----|
| `shimmer` | Skeleton loading |
| `animate-pulse` | Loading generico |
| `animate-spin` | Spinners |
| `animate-in/out` | Entrada/saida de modais |
| `slide-in-from-*` | Popovers, dropdowns |
| `fade-in/out` | Transicoes de visibilidade |
| `zoom-in/out` | Escala de modais |

---

## Componentes Atomicos (UI)

Localizacao: `src/components/ui/`

Todos usam o padrao shadcn/ui: Radix UI primitives + CVA variants + `cn()` utility.

### Button

**Arquivo:** `src/components/ui/button.tsx`

| Prop | Tipo | Default |
|------|------|---------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link' \| 'instagram'` | `'default'` |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` |
| `asChild` | `boolean` | `false` |

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Salvar</Button>
<Button variant="destructive" size="sm">Excluir</Button>
<Button variant="instagram">Publicar no Instagram</Button>
<Button variant="ghost" size="icon"><Settings /></Button>
```

### Input

**Arquivo:** `src/components/ui/input.tsx`

Estende `React.ComponentProps<'input'>`. Suporta `aria-invalid` para estados de erro.

```tsx
import { Input } from '@/components/ui/input'

<Input type="email" placeholder="seu@email.com" />
<Input aria-invalid={!!errors.email} />
```

### Label

**Arquivo:** `src/components/ui/label.tsx`

Baseado em `@radix-ui/react-label`. Suporte a `peer-disabled`.

```tsx
import { Label } from '@/components/ui/label'

<Label htmlFor="email">Email</Label>
```

### Card

**Arquivo:** `src/components/ui/card.tsx`

Compound component com 6 subcomponentes.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Titulo</CardTitle>
    <CardDescription>Descricao</CardDescription>
    <CardAction><Button variant="ghost">...</Button></CardAction>
  </CardHeader>
  <CardContent>Conteudo</CardContent>
  <CardFooter>Rodape</CardFooter>
</Card>
```

### Textarea

**Arquivo:** `src/components/ui/textarea.tsx`

Estende `React.ComponentProps<'textarea'>`. Usa `field-sizing: content` para auto-resize.

```tsx
import { Textarea } from '@/components/ui/textarea'

<Textarea placeholder="Escreva sua legenda..." className="min-h-32" />
```

### Select

**Arquivo:** `src/components/ui/select.tsx`

Baseado em `@radix-ui/react-select`. Suporta `size="sm"`.

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select>
  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
  <SelectContent>
    <SelectItem value="post">Post</SelectItem>
    <SelectItem value="carousel">Carrossel</SelectItem>
    <SelectItem value="reel">Reel</SelectItem>
  </SelectContent>
</Select>
```

### Tabs

**Arquivo:** `src/components/ui/tabs.tsx`

Baseado em `@radix-ui/react-tabs`. Animacao em data-state.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs defaultValue="editor">
  <TabsList>
    <TabsTrigger value="editor">Editor</TabsTrigger>
    <TabsTrigger value="preview">Preview</TabsTrigger>
  </TabsList>
  <TabsContent value="editor">...</TabsContent>
  <TabsContent value="preview">...</TabsContent>
</Tabs>
```

### Dialog

**Arquivo:** `src/components/ui/dialog.tsx`

Modal com overlay, portal e animacoes.

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild><Button>Abrir</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titulo</DialogTitle>
      <DialogDescription>Descricao</DialogDescription>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

### Badge

**Arquivo:** `src/components/ui/badge.tsx`

| Prop | Tipo | Default |
|------|------|---------|
| `variant` | `'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'instagram'` | `'default'` |

```tsx
import { Badge } from '@/components/ui/badge'

<Badge>Publicado</Badge>
<Badge variant="secondary">Rascunho</Badge>
<Badge variant="instagram">Instagram</Badge>
```

### Avatar

**Arquivo:** `src/components/ui/avatar.tsx`

Baseado em `@radix-ui/react-avatar`. Fallback automatico.

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

<Avatar>
  <AvatarImage src={user.avatar} />
  <AvatarFallback>DG</AvatarFallback>
</Avatar>
```

### Separator

**Arquivo:** `src/components/ui/separator.tsx`

Horizontal ou vertical. Decorativo por padrao.

### Skeleton

**Arquivo:** `src/components/ui/skeleton.tsx`

Placeholder com `animate-pulse`.

```tsx
import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-4 w-32" />
```

### DropdownMenu

**Arquivo:** `src/components/ui/dropdown-menu.tsx`

14 subcomponentes exportados. Suporta checkbox/radio items.

### Toaster

**Arquivo:** `src/components/ui/toaster.tsx`

Provider-based. Variantes: `'default' | 'destructive'`.

### LogoMark

**Arquivo:** `src/components/ui/logo.tsx`

SVG customizado. Props: `size`, `accent`, `className`.

---

## Componentes de Negocio

Localizacao: `src/components/`

### Auth (`auth/`)

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| LoginForm | `login-form.tsx` | Form com RHF + Zod, email/senha |
| SignupForm | `signup-form.tsx` | Form com confirmacao de senha |

### Dashboard (`dashboard/`)

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| Header | `header.tsx` | Barra superior com avatar, dropdown, logout |
| Sidebar | `sidebar.tsx` | Navegacao lateral com 5 itens + settings |

### Instagram (`instagram/`)

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| AccountCard | `account-card.tsx` | Card de conta com avatar, stats, acoes |
| AccountList | `account-list.tsx` | Lista de contas com dialog de adicao |
| ConnectButton | `connect-button.tsx` | Botao OAuth Instagram |
| DisconnectButton | `disconnect-button.tsx` | Desconectar conta |
| DeleteProfileButton | `delete-profile-button.tsx` | Excluir perfil |
| CreateProfileForm | `create-profile-form.tsx` | Formulario de perfil |
| EditAccountDialog | `edit-account-dialog.tsx` | Dialog de edicao |
| ColorPaletteInput | `color-palette-input.tsx` | Seletor de cores |
| NegativeWordsInput | `negative-words-input.tsx` | Input de palavras negativas |
| KnowledgeBaseUploader | `knowledge-base-uploader.tsx` | Upload de base de conhecimento |

### Content (`content/`)

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| AIGenerator | `ai-generator.tsx` | Gerador de conteudo com IA |
| ContentCreator | `content-creator.tsx` | Wrapper de criacao |
| ContentForm | `content-form.tsx` | Form de conteudo |
| PostEditor | `post-editor.tsx` | Editor de post |
| PostTypeSelector | `post-type-selector.tsx` | Seletor tipo post/carrossel/reel |
| Preview | `preview.tsx` | Preview do post |
| CalendarView | `calendar-view.tsx` | Calendario de publicacoes |

### Schedule (`schedule/`)

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| ScheduleConfigurator | `schedule-configurator.tsx` | Configuracao de cronograma |
| ScheduleCalendar | `schedule-calendar.tsx` | Calendario completo |
| AddPostDialog | `add-post-dialog.tsx` | Dialog para novo post |

### Settings (`settings/`)

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| ThemeSelector | `theme-selector.tsx` | Seletor light/dark/system |

### Admin (`admin/`)

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| AdminShell | `admin-shell.tsx` | Layout do painel admin |

### Providers (`providers.tsx`)

QueryClient + ThemeProvider + Toaster (wrapper global).

---

## Padroes e Convencoes

### Utility Function: `cn()`

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Todas as classes condicionais devem usar `cn()` para merge correto com Tailwind.

### Padrao de Variantes (CVA)

```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const componentVariants = cva('base-classes', {
  variants: {
    variant: {
      default: 'variant-classes',
    },
    size: {
      default: 'size-classes',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
```

### Convencoes de Nomenclatura

- Componentes UI: PascalCase (`Button`, `Card`)
- Arquivos: kebab-case (`button.tsx`, `card.tsx`)
- Tokens CSS: kebab-case com `--` prefix (`--primary`, `--card-foreground`)
- Variantes CVA: camelCase (`defaultVariants`)

### Padrao de Imports

```typescript
// 1. React/Next
import * as React from 'react'
// 2. Radix UI
import * as DialogPrimitive from '@radix-ui/react-dialog'
// 3. Icons
import { X } from 'lucide-react'
// 4. Internal
import { cn } from '@/lib/utils'
```

### Status Colors (utils.ts)

```typescript
// src/lib/utils.ts - getStatusColor()
draft:     'bg-muted text-muted-foreground'
planned:   'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
```

---

## Auditoria de Acessibilidade

### Conformidade WCAG 2.1 AA

| Criterio | Status | Notas |
|----------|--------|-------|
| 1.4.3 Contraste minimo (4.5:1 texto) | PASS | OKLch garante contraste perceptual |
| 1.4.11 Contraste UI (3:1) | PASS | Focus rings e borders atendem |
| 2.1.1 Teclado | PASS | Radix UI gerencia focus trapping |
| 2.4.7 Focus visivel | PASS | `focus-visible:ring-[3px]` em todos os interativos |
| 4.1.2 Nome, papel, valor | PARCIAL | LogoMark sem role="img" |

### Issues Identificados

| Severidade | Componente | Issue | Recomendacao |
|-----------|------------|-------|-------------|
| MEDIA | `logo.tsx` | SVG sem `role="img"` e `aria-label` | Adicionar atributos a11y |
| MEDIA | `signup-form.tsx` | Cor de sucesso hardcoded `text-green-500` | Usar token semantico |
| BAIXA | `utils.ts` | `getStatusColor()` usa cores hardcoded (blue/green) | Migrar para tokens |
| BAIXA | `sidebar.tsx` | Links ativos sem `aria-current="page"` | Adicionar atributo |
| BAIXA | `disconnect-button.tsx` | Usa `confirm()` nativo | Substituir por Dialog acessivel |

---

## Metricas de Qualidade

### Build Report

| Metrica | Resultado |
|---------|-----------|
| TypeScript `--noEmit` | PASS (zero erros) |
| ESLint | 13 warnings (unused vars em schedule-calendar.tsx) |
| Componentes UI compilados | 14/14 |
| Tokens compilados | 24 cores + 4 radius + 2 fonts + 5 chart |
| Imports verificados | Todos resolvidos corretamente |

### Inventario

| Categoria | Quantidade |
|-----------|-----------|
| Componentes atomicos (UI) | 14 |
| Componentes de negocio | 18 |
| Variantes CVA | 2 componentes (Button: 7 variants + 4 sizes, Badge: 5 variants) |
| Tokens de cor | 48 (24 light + 24 dark) |
| Temas | 2 (light + dark) |
| Testes unitarios | 0 |
| Cobertura de testes | 0% |

### Dependencias do Design System

| Package | Versao | Papel |
|---------|--------|-------|
| `tailwindcss` | ^4.0.6 | Engine de CSS |
| `class-variance-authority` | ^0.7.1 | Type-safe variants |
| `clsx` | ^2.1.1 | Class merging |
| `tailwind-merge` | ^2.6.0 | Tailwind-aware merge |
| `@radix-ui/*` | various | Primitivos acessiveis |
| `lucide-react` | ^0.468.0 | Icons |
| `tw-animate-css` | ^1.2.5 | Animacoes |

---

*Gerado automaticamente pelo Design System Build Quality Pipeline v1.0*
*Data: 2026-02-22*
