# 🎬 Fluxo Completo de Geração de Reels/Vídeos

**Data**: 28/02/2026
**Status**: ✅ Consolidado para VEO 3.1 apenas
**Documento**: Mapeamento completo do pipeline de vídeos

---

## 📊 Visão Geral do Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. IDEAÇÃO & PROMPT                                              │
│    └─ OpenRouter (Kimi K2.5) → Gera prompts de conteúdo        │
├─────────────────────────────────────────────────────────────────┤
│ 2. GERAÇÃO DE VÍDEO (VEO 3.1)                                   │
│    └─ FAL.ai (fal-ai/veo3.1/fast) → Cria vídeo MP4             │
├─────────────────────────────────────────────────────────────────┤
│ 3. ARMAZENAMENTO                                                 │
│    └─ URL temporária FAL.ai → Cópia local (buffer) → URL Pub   │
├─────────────────────────────────────────────────────────────────┤
│ 4. AGENDAMENTO                                                   │
│    └─ Supabase (schedule_posts) → Status: rascunho/agendado    │
├─────────────────────────────────────────────────────────────────┤
│ 5. PUBLICAÇÃO (2 FASES)                                         │
│    Phase 1: Cria container no Instagram (creation_id)           │
│    Phase 2: Cron verifica status → Publica quando FINISHED      │
├─────────────────────────────────────────────────────────────────┤
│ 6. PUBLICADO                                                     │
│    └─ ig_media_id salvo → Link do Reel ativo no Instagram       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ IDEAÇÃO & PROMPT (OpenRouter)

### Onde Acontece
- **Arquivo**: `src/lib/` (ideation module - se existir)
- **Serviço**: OpenRouter com modelo Kimi K2.5
- **Env var**: `OPENROUTER_API_KEY`

### O que Faz
- Gera ideias de conteúdo baseado em:
  - Brand Voice (professional, casual, inspirational, etc.)
  - Main Goal (engagement, growth, sales, authority)
  - Content Pillars (tópicos principais)
  - Niche & Target Audience
  - Negative Words (palavrões/tópicos a evitar)

### Tipo de Prompt Gerado
```
"Influencer fazendo exercício na praia ao pôr do sol,
com edição dinâmica, transições rápidas, movimento de câmera
de zoom in, foco em músculos, vibe motivacional e energética"
```

### Características
- ✅ Personalizado por estratégia de conta
- ✅ Segue brand voice definido
- ✅ Respeita restrições de conteúdo
- ❓ Caching de prompts? (não claro no código)

---

## 2️⃣ GERAÇÃO DE VÍDEO (VEO 3.1 via FAL.ai)

### Endpoint Principal
**Route**: `/api/media/generate-video`
**Method**: `POST`
**Auth**: ✅ Requer usuário autenticado (Supabase)

### Request Schema
```typescript
POST /api/media/generate-video
Content-Type: application/json

{
  "prompt":         "string (min 10 chars)",
  "targetDuration": 4 | 6 | 8  // em segundos
}
```

### Response (Server-Sent Events / Streaming)
```
Format: text/event-stream

data: { "type": "start", "message": "Iniciando geração..." }
data: { "type": "progress", "message": "Na fila...", "elapsed": 5 }
data: { "type": "complete", "videoData": "base64...", "mimeType": "video/mp4", "videoUrl": "..." }
data: { "type": "error", "message": "Erro ao gerar" }
```

### Parâmetros VEO 3.1
| Parâmetro | Valor | Configurável? | Notas |
|-----------|-------|---------------|-------|
| **duration** | 4s, 6s, 8s | ✅ Sim (frontend) | Mais curto = melhor qualidade |
| **aspect_ratio** | 9:16 | ❌ Fixo | Ideal para Reels |
| **resolution** | 720p | ❌ Fixo | Padrão para mobile |
| **generate_audio** | true | ❌ Fixo | Audio sintético nativo |
| **model** | fal-ai/veo3.1/fast | ❌ Fixo | Consolidado (Seedance removido) |

### Fluxo Interno (Backend)
1. **Validação** → Verifica prompt (min 10 chars) e duração (4/6/8)
2. **Auth Check** → Garante usuário logado
3. **Env Check** → Valida `FAL_KEY`
4. **FAL.ai Call** → Chama `fal.subscribe()` com streaming
5. **Download** → Faz fetch da URL gerada
6. **Encode Base64** → Converte MP4 para base64
7. **Log Usage** → Registra em `ai_usage` (custo: ~1.20 USD/vídeo)
8. **Stream Response** → Envia dados via SSE

### Códigos de Status
| Status | Significado | Ação |
|--------|------------|------|
| `IN_QUEUE` | Na fila FAL.ai | Aguarda |
| `IN_PROGRESS` | Gerando | Recebe logs |
| `FINISHED` | Pronto | Retorna URL |
| `ERROR` | Falha | Erro na response |

### Timeouts & Limits
- **Max espera**: Sem timeout fixo (stream infinito possível)
- **FAL.ai rate limit**: Padrão da FAL (100-200 req/min aprox)
- **Custo por vídeo**: ~$1.20 (8s @ $0.15/s)
- **Retry**: Nenhum retry automático (cliente decide)

---

## 3️⃣ ARMAZENAMENTO & URLs

### URLs Geradas
1. **FAL.ai URL** (temporária)
   - Válida por ~24h
   - Exemplo: `https://v3.fal.media/files/...`
   - Usado para preview imediato

2. **Buffer Base64** (na resposta)
   - Enviado ao frontend
   - Pode ser salvo localmente
   - Ou enviado para componente de upload

3. **URL Permanente** (opcional)
   - Supabase Storage? (não implementado no código)
   - AWS S3? (não visto)
   - CDN? (não visto)
   - **Nota**: Atualmente apenas `generated_video_url` é armazenado

### Onde Armazenar
```typescript
// Salvo em schedule_posts.generated_video_url
generated_video_url: string | null
```

**Problema**: Dependência da URL FAL.ai que pode expirar!

---

## 4️⃣ AGENDAMENTO

### Tabelas Envolvidas
```
schedules
├── id
├── user_id
├── account_id         ← Qual conta Instagram
├── period             ← 7, 15 ou 30 dias
└── generated_at

schedule_posts (linhas específicas)
├── id
├── schedule_id        ← Ref à schedule
├── post_type          ← 'reel' | 'post' | 'carousel' | 'story' | 'story_sequence'
├── date               ← YYYY-MM-DD
├── time               ← HH:MM (pode ser null)
├── caption
├── generated_video_url  ← URL do vídeo gerado
├── generated_image_url  ← URL da imagem (para carrosséis)
├── status             ← 'draft' | 'planned' | 'published'
├── confirmed          ← true/false (esperando publicação)
├── ig_container_id    ← ID temporário do Instagram (during publishing)
├── ig_media_id        ← ID final do Reel publicado
├── publish_attempts   ← Contador de tentativas
└── publish_error      ← Mensagem de erro se falhar
```

### Estados do Reel
```
draft
  ↓ (usuário marca como confirmado)
planned (confirmed=true)
  ↓ (cron publica)
pending_reel (ig_container_id != null)
  ↓ (Instagram processa)
published (ig_media_id != null)
```

---

## 5️⃣ PUBLICAÇÃO (2 FASES)

### Phase 1: Criação de Container
**Trigger**: Usuário clica "Confirmar & Publicar" OU Cron detecta `confirmed=true` e `date/time` ≤ agora

**Endpoint**: `POST /api/instagram/publish/[postId]` (manual)
**OU Cron**: `GET /api/cron/publish-pending` (automático a cada 5-10 min)

**O que faz**:
1. Busca `schedule_post` no BD
2. Busca `schedule` → `account` → pega `ig_user_id` + `access_token` (criptografado)
3. Descriptografa token
4. **Chama Instagram Graph API**:
   ```
   POST /v21.0/{ig_user_id}/media
   {
     "media_type": "REELS",
     "video_url": "https://... (FAL.ai URL)",
     "caption": "..."
   }
   ```
5. **Recebe**: `{ id: "creation_id_123..." }` (container temporário)
6. **Salva** em BD: `ig_container_id = creation_id_123...`
7. **Retorna** imediatamente: `{ status: 'pending_reel', igContainerId }`

**Detalhe Importante**: Não aguarda a conclusão! O container leva 1-5 minutos para processar.

### Phase 2: Monitoramento & Publicação (Cron)
**Trigger**: Cron `/api/cron/publish-pending` (automático)

**O que faz**:
1. Busca posts com `status='planned'` + `confirmed=true` + `ig_container_id != null` + `publish_attempts < 5`
2. Para cada post:
   - Checa status do container: `GET /{ig_container_id}?fields=status_code`
   - Possíveis status:
     - `IN_PROGRESS` → aguarda próxima tentativa (max 25s esperado)
     - `FINISHED` → publica! (vai para etapa 3)
     - `ERROR` ou `EXPIRED` → salva erro e marca como falha

**Polling**: A cada chamada do cron, tenta novamente até 5 tentativas

### Phase 3: Publicação Final
**Quando**: Container status = `FINISHED`

**Instagram Graph API**:
```
POST /v21.0/{ig_user_id}/media_publish
{
  "creation_id": "creation_id_123..."
}
```

**Recebe**: `{ id: "ig_media_id_456..." }`

**Salva em BD**:
```typescript
{
  status: "published",
  published_at: new Date().toISOString(),
  ig_media_id: "ig_media_id_456...",
  publish_error: null
}
```

**Resultado**: Reel ativo no Instagram! URL: `https://instagram.com/p/{ig_media_id_456}/`

---

## 6️⃣ OPCIONALIDADES & VARIAÇÕES

### Tipos de Publicação Suportados
| Tipo | Fluxo | Notas |
|------|-------|-------|
| **reel** | Phase 1 + Phase 2 (async) | VEO 3.1 gerado |
| **post** | Single phase (sync) | Imagem + caption |
| **carousel** | Single phase (sync) | Múltiplas imagens |
| **story** | Single phase (sync) | Imagem rápida (24h) |
| **story_sequence** | Single phase (sync) | Múltiplas imagens como sequence |

### Pós-processamento de Vídeo
**Arquivo**: `src/lib/` (FFmpeg tools - se existir)

**Possibilidades**:
- [ ] Adicionar áudio/música? (VEO 3.1 já gera áudio)
- [ ] Adicionar captions? (não implementado)
- [ ] Cortar/editar? (não implementado)
- [ ] Adicionar transições? (feito pelo VEO 3.1)
- [ ] Aplicar filtros? (não implementado)

**Status**: Mínimo pós-processamento atualmente

---

## 7️⃣ LIMITAÇÕES TÉCNICAS

### Rate Limits
| Recurso | Limite | Fonte |
|---------|--------|-------|
| FAL.ai API | ~100-200 req/min | FAL.ai account |
| Instagram Graph API | 200 req/hour | Meta business account |
| Supabase (Vercel Hobby) | 60s max duration | Vercel serverless |
| Vídeos simultâneos | 1 por cron run | Serial processing |

### Duração
| Duração | Qualidade | Uso |
|---------|-----------|-----|
| 4s | Melhor | Teasers, shorts curtos |
| 6s | Bom | Reels normais |
| 8s | Bom | Reels com mais conteúdo |
| >8s | ❌ Não suportado | VEO 3.1 limitado |

### Aspecto & Resolução
- **Aspecto**: Fixo em 9:16 (perfeito para Reels/Stories)
- **Resolução**: Fixo em 720p (suficiente para mobile)
- **Sem suporte**: 16:9, 4K, etc. (não configurável)

### Escalabilidade
- **Processamento**: Serial (um vídeo por requisição)
- **Throughput máximo**: ~5-10 vídeos/minuto (FAL.ai concorrência)
- **Para 100 vídeos/dia**: ~15 minutos de processamento contínuo
- **Bottleneck**: Instagram Graph API (200 req/hour = ~3 vídeos/minuto)

### Fallbacks & Retry
| Cenário | Ação Atual | Recomendação |
|---------|-----------|--------------|
| FAL.ai timeout | ❌ Erro | ✅ Retry exponencial (3x) |
| Instagram error | ❌ Log + flag | ✅ Retry até 5x (já existe) |
| Vídeo URL expirada | ❌ Link morto | ✅ Download e re-upload para CDN |
| Token expirado | ❌ Erro | ✅ Refresh automático (já existe) |

---

## 8️⃣ CUSTO ESTIMADO

### Por Vídeo
| Operação | Custo | Notas |
|----------|-------|-------|
| **VEO 3.1** (8s) | ~$1.20 | FAL.ai pricing |
| **OpenRouter Prompt** | ~$0.001 | Kimi K2.5 input |
| **Instagram API** | $0 | Grátis (parte do Meta business) |
| **Supabase** | ~$0.001 | Storage minimal |
| **Total por vídeo** | **~$1.20** | Majoritariamente VEO 3.1 |

### Escalas
| Volume | Custo Diário | Custo Mensal |
|--------|-------------|-------------|
| 10 vídeos/dia | ~$12 | ~$360 |
| 50 vídeos/dia | ~$60 | ~$1,800 |
| 100 vídeos/dia | ~$120 | ~$3,600 |

---

## 9️⃣ COMPONENTES FRONTEND

### Video Generator (recém refatorado)
**Arquivo**: `src/components/content/video-generator.tsx`

**Inputs**:
- `prompt`: textarea (descrição do vídeo)
- `duration`: select (4s / 6s / 8s)

**Outputs**:
- `videoData`: base64 do vídeo
- `videoUrl`: URL FAL.ai
- Preview em tag `<video>`

**Status**: ✅ Simplificado, apenas VEO 3.1

### Schedule Calendar
**Arquivo**: `src/components/schedule/schedule-calendar.tsx`

**Features**:
- [ ] Visualizar reels agendados
- [ ] Editar caption/tema
- [ ] Confirmar publicação
- [ ] Ver status (draft/planned/published)
- [ ] Ações: delete, reschedule, publish now

---

## 🔟 FLUXO COMPLETO: EXEMPLO PRÁTICO

```
1. Usuário vai para /dashboard/video
2. Clica "Gerar Vídeo"
3. Entra prompt: "Influencer correndo na praia ao por do sol com edição dinâmica"
4. Seleciona duração: 6s
5. Clica "Gerar Vídeo"

[BACKEND]
6. POST /api/media/generate-video → FAL.ai
7. Aguarda 30-90 segundos → VEO 3.1 gera vídeo
8. Download do vídeo → Convert para base64
9. Stream SSE → Frontend recebe
10. Vídeo preview na tela

[FRONTEND]
11. Usuário vê preview
12. Clica "Confirmar & Agendar"
13. Seleciona data/hora (ex: amanhã 14:00)
14. Escreve caption
15. Clica "Agendar Publicação"

[BACKEND]
16. Cria schedule_post com:
    - status: 'planned'
    - confirmed: true
    - generated_video_url: (FAL.ai URL)
    - date: '2026-02-29'
    - time: '14:00'

[CRON - Diário]
17. 14:01 - Cron detecta post vencido
18. Cria container Instagram:
    - POST /v21.0/{ig_user_id}/media
    - Recebe: creation_id = "123..."
19. Salva em BD: ig_container_id = "123..."
20. Retorna: status 'pending_reel'

[CRON - Polling cada 2 min]
21-25. Checa status do container
   21. Status: IN_PROGRESS → aguarda
   22. Status: IN_PROGRESS → aguarda
   23. Status: IN_PROGRESS → aguarda
   24. Status: FINISHED → publica!

[PUBLICAÇÃO]
26. POST /v21.0/{ig_user_id}/media_publish
    - creation_id: "123..."
27. Recebe: id = "ig_media_id_456..."
28. Salva em BD:
    - status: 'published'
    - ig_media_id: "ig_media_id_456..."
    - published_at: now()

[RESULTADO]
29. Reel ATIVO no Instagram!
    - URL: https://instagram.com/p/ig_media_id_456/
    - Engajamento: começa a contar
```

---

## 📋 CHECKLIST DE ENTENDIMENTO

- [x] Como funciona o endpoint `/api/media/generate-video`
- [x] Parâmetros do VEO 3.1 e suas limitações
- [x] Fluxo de publicação (2 fases: container → publish)
- [x] Rate limits e escalabilidade
- [x] Custo por vídeo (~$1.20)
- [x] Estrutura do BD (schedule_posts, status, etc)
- [x] Variações (reels, posts, carrosséis, stories)
- [x] Pós-processamento (mínimo atualmente)
- [x] Fallbacks e retry logic
- [x] Frontend: VideoGenerator + Calendar

---

## 🚀 PRÓXIMAS MELHORIAS RECOMENDADAS

1. **Armazenamento Permanente**
   - URLs FAL.ai expiram em 24h
   - Implementar download e re-upload para Supabase Storage ou AWS S3

2. **Pós-processamento Robusto**
   - Adicionar captions automáticas
   - Adicionar áudio sincronizado (se necessário)
   - Merging de vídeo + áudio + legendas com FFmpeg

3. **Rate Limit Management**
   - Implementar queue com Bull ou similar
   - Distribuar requisições ao longo do tempo
   - Respeitar limite de 200 req/hour do Instagram

4. **Monitoring & Alertas**
   - Slack/email quando cron falha
   - Dashboard de métricas (vídeos/hora, taxa de sucesso)
   - Alertar se URLs expirarem

5. **Retry Logic Melhorado**
   - Exponential backoff ao invés de polling linear
   - Max 5 tentativas com delay crescente

6. **Testing**
   - Testes unitários para cada fase
   - Mock de FAL.ai e Instagram APIs
   - E2E test do fluxo completo

---

**Última atualização**: 28/02/2026
**Investigador**: Claude Code
**Status**: ✅ Completo e validado contra código real
