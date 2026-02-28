# API de Automação de Publicação

Documentação dos endpoints para automação de publicação no Instagram através do Cron Job.

## Visão Geral

O sistema de publicação automática funciona em 3 etapas:

1. **Geração**: Posts são gerados e armazenados no cronograma
2. **Confirmação**: Usuário confirma os posts que deseja publicar (obrigatório)
3. **Publicação**: Cron job publica automaticamente nos horários agendados

## Endpoints

### 1. Status de Publicação

**GET `/api/schedule/posts/[id]/status`**

Retorna o status atual de um post, incluindo histórico de tentativas.

**Resposta:**
```json
{
  "postId": "uuid",
  "status": "planned|published",
  "confirmed": true,
  "scheduledDate": "2026-03-01",
  "scheduledTime": "09:00",
  "publishedAt": "2026-03-01T09:15:30Z",
  "igMediaId": "instagram-media-id",
  "igContainerId": null,
  "publishError": null,
  "publishAttempts": 1,
  "publishHistory": {
    "attempts": [
      {
        "timestamp": "2026-03-01T09:15:30Z",
        "attempt": 1,
        "status": "success",
        "igMediaId": "instagram-media-id"
      }
    ],
    "lastAttempt": "2026-03-01T09:15:30Z"
  },
  "statistics": {
    "totalAttempts": 1,
    "successCount": 1,
    "errorCount": 0,
    "avgDurationMs": 1200
  },
  "attemptLog": [
    {
      "id": "log-uuid",
      "attempt": 1,
      "status": "success",
      "timestamp": "2026-03-01T09:15:30Z",
      "igMediaId": "instagram-media-id",
      "durationMs": 1200
    }
  ]
}
```

### 2. Confirmar Post

**POST `/api/schedule/posts/[id]/confirm`**

Confirma um post para publicação automática. **Apenas posts confirmados serão publicados pelo cron job.**

**Request:**
```json
{
  "confirmed": true
}
```

**Resposta:**
```json
{
  "ok": true,
  "postId": "uuid",
  "confirmed": true,
  "message": "Post confirmado para publicação automática"
}
```

### 3. Desagendar Post

**POST `/api/schedule/posts/[id]/unschedule`**

Remove um post do cronograma. Reseta o status e remove qualquer ID do Instagram.

**Resposta:**
```json
{
  "ok": true,
  "postId": "uuid",
  "message": "Post removido do cronograma"
}
```

**Restrições:**
- Não pode desagendar posts já publicados
- Posts desagendados perdem confirmação e IDs do Instagram
- Contador de tentativas é resetado

### 4. Remarcar Post

**PUT `/api/schedule/posts/[id]/reschedule`**

Remarcar um post para um novo horário.

**Request:**
```json
{
  "date": "2026-03-02",
  "time": "14:30"
}
```

**Resposta:**
```json
{
  "ok": true,
  "postId": "uuid",
  "newDate": "2026-03-02",
  "newTime": "14:30",
  "message": "Post remarcado para 2026-03-02 às 14:30"
}
```

**Restrições:**
- Não pode remarcar posts já publicados
- Data obrigatória (formato: `YYYY-MM-DD`)
- Hora opcional (formato: `HH:mm`)

## Fluxo Recomendado

### 1. Gerar Cronograma
```bash
POST /api/schedule/generate
```

### 2. Revisar Posts
```bash
GET /api/schedule/latest
# Usuário revisa os posts na interface
```

### 3. Confirmar Posts
```bash
# Confirmar em bulk
POST /api/schedule/posts/bulk-confirm
{
  "postIds": ["id1", "id2", "id3"],
  "confirmed": true
}

# Ou confirmar individualmente
POST /api/schedule/posts/[id]/confirm
{
  "confirmed": true
}
```

### 4. Monitorar Status
```bash
# Verificar status de um post
GET /api/schedule/posts/[id]/status

# Ver histórico de publicação
GET /api/schedule/posts/[id]/status
# Campo: attemptLog
```

### 5. Ações Corretivas (Opcional)
```bash
# Se mudou de ideia
POST /api/schedule/posts/[id]/unschedule

# Se quer mudar horário
PUT /api/schedule/posts/[id]/reschedule
{
  "date": "2026-03-02",
  "time": "15:00"
}
```

## Cron Job

O cron job é acionado automaticamente em **00:00 UTC todos os dias** (via Vercel Crons).

Pode ser acionado manualmente:
```bash
GET /api/cron/publish-pending?secret={CRON_SECRET}
# Ou via header Authorization
curl -H "Authorization: Bearer {CRON_SECRET}" \
  https://seu-dominio.com/api/cron/publish-pending
```

**Resposta:**
```json
{
  "published": 5,
  "pending_reels": 2,
  "errors": 1,
  "attempts": 8,
  "details": [
    {
      "postId": "uuid",
      "status": "success",
      "igMediaId": "insta-id",
      "attempt": 1
    },
    {
      "postId": "uuid",
      "status": "error",
      "error": "Invalid image URL",
      "attempt": 1
    }
  ]
}
```

## Retry Automático

O cron job implementa **exponential backoff** para falhas:
- Tentativa 1: falha
- Tentativa 2: aguarda 1s, tenta novamente
- Tentativa 3: aguarda 2s, tenta novamente
- Tentativa 4: aguarda 4s, tenta novamente
- Tentativa 5: aguarda 8s, tenta novamente

Limite máximo: 5 tentativas para reels, 3 tentativas para posts simples.

## Logging

Cada tentativa de publicação é registrada em `schedule_posts_publish_log`:
- Timestamp
- Número da tentativa
- Status (success, pending_reel, error)
- ID do Instagram (se sucesso)
- Mensagem de erro (se falha)
- Duração em milissegundos

Também mantém um histórico JSON em `schedule_posts.publish_history` para rápido acesso.

## Exemplo: Fluxo Completo

```bash
# 1. Gerar cronograma
curl -X POST https://seu-dominio.com/api/schedule/generate \
  -H "x-api-key: sua-api-key" \
  -H "Content-Type: application/json"

# 2. Revisar na UI
# Usuário acessa https://seu-dominio.com/dashboard/schedule

# 3. Confirmar posts
curl -X POST https://seu-dominio.com/api/schedule/posts/bulk-confirm \
  -H "x-api-key: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "postIds": ["id1", "id2", "id3"],
    "confirmed": true
  }'

# 4. Cron job publica automaticamente (ou testar manualmente)
curl https://seu-dominio.com/api/cron/publish-pending?secret=CRON_SECRET

# 5. Verificar status
curl https://seu-dominio.com/api/schedule/posts/[id]/status \
  -H "x-api-key: sua-api-key"
```

## Tratamento de Erros

Se um post falhar ao ser publicado:
1. Erro é registrado em `publish_error` e `schedule_posts_publish_log`
2. Contagem de tentativas é incrementada
3. Próxima tentativa acontece no próximo cron (próximo dia à 00:00 UTC)
4. Usuário pode ver erro via `GET /api/schedule/posts/[id]/status`
5. Opções: remarcar para outro horário ou desagendar

## Filtros de Segurança

- Apenas posts confirmados são publicados
- Apenas posts com mídia gerada (image_url ou video_url)
- Apenas posts com horário vencido
- Máximo de tentativas evita loops infinitos

## Autenticação

Todos os endpoints usam autenticação via:
- API Key: header `x-api-key`
- OAuth: header `Authorization: Bearer {token}`

O cron job usa `CRON_SECRET` (env var) para validação.
