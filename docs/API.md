# Social Media Manager — API Reference

Base URL: `https://seu-dominio.com` (ou `http://localhost:5000` em desenvolvimento)

---

## Autenticação

Todos os endpoints marcados com 🔐 requerem autenticação via API Key.

**Opção 1 — Header X-API-Key:**
```
X-API-Key: smm_sua_chave_aqui
```

**Opção 2 — Authorization Bearer:**
```
Authorization: Bearer smm_sua_chave_aqui
```

Obtenha sua chave em **Configurações → Chaves de API** na plataforma.

> ⚠️ A chave raw (`smm_...`) é exibida apenas no momento da criação. Guarde-a com segurança.

---

## Contas Instagram

### GET /api/instagram/accounts 🔐
Lista todas as contas do Instagram ativas do usuário.

**Resposta 200:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "username": "string",
      "name": "string | null",
      "niche": "string | null",
      "brand_voice": "professional | casual | inspirational | educational | funny",
      "main_goal": "engagement | growth | sales | authority",
      "content_pillars": ["string"],
      "target_audience": "string | null",
      "color_palette": ["#hex"],
      "is_active": true,
      "created_at": "ISO datetime"
    }
  ]
}
```

---

### POST /api/instagram/accounts 🔐
Cria uma nova conta do Instagram.

**Body:**
```json
{
  "username": "string (obrigatório, max 30 chars)",
  "name": "string | null",
  "biography": "string | null",
  "website": "string | null",
  "niche": "string | null",
  "target_audience": "string | null",
  "brand_voice": "professional | casual | inspirational | educational | funny",
  "content_pillars": ["string"],
  "posting_frequency": 3,
  "main_goal": "engagement | growth | sales | authority",
  "strategic_notes": "string | null",
  "color_palette": ["#hex"],
  "negative_words": ["string"]
}
```

**Resposta 201:**
```json
{ "account": { ... } }
```

---

### PATCH /api/instagram/accounts/:id 🔐
Atualiza os dados de uma conta. Todos os campos são opcionais.

**Body:** mesmos campos do POST (todos opcionais)

**Resposta 200:**
```json
{ "account": { ... } }
```

---

## Conteúdo

### GET /api/content/posts 🔐
Lista posts de conteúdo.

**Query params:**
| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `status` | `draft\|planned\|published` | não | Filtrar por status |
| `postType` | `post\|carousel\|reel` | não | Filtrar por tipo |
| `limit` | number | não | Máximo de resultados (padrão: 50) |

**Resposta 200:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "post_type": "post | carousel | reel",
      "caption": "string | null",
      "hashtags": ["string"],
      "media_urls": ["string"],
      "status": "draft | planned | published",
      "scheduled_at": "ISO datetime | null",
      "account_id": "uuid | null",
      "created_at": "ISO datetime"
    }
  ]
}
```

---

### POST /api/content/posts 🔐
Cria um novo post de conteúdo.

**Body:**
```json
{
  "post_type": "post | carousel | reel (obrigatório)",
  "caption": "string | null",
  "hashtags": ["string"],
  "media_urls": ["string"],
  "notes": "string | null",
  "status": "draft | planned | published",
  "scheduled_at": "ISO datetime | null",
  "account_id": "uuid | null"
}
```

**Resposta 201:**
```json
{ "post": { ... } }
```

---

### PATCH /api/content/posts 🔐
Atualiza um post existente.

**Body:**
```json
{
  "id": "uuid (obrigatório)",
  "caption": "string",
  "status": "draft | planned | published",
  ...
}
```

---

### DELETE /api/content/posts?id=:id 🔐
Exclui um post.

**Query params:**
| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `id` | uuid | sim |

**Resposta 200:**
```json
{ "success": true }
```

---

## Cronograma

### GET /api/schedule/latest?accountId=:id 🔐
Retorna o cronograma mais recente de uma conta.

**Query params:**
| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `accountId` | uuid | sim |

**Resposta 200:**
```json
{
  "schedule": {
    "schedule": [
      {
        "date": "YYYY-MM-DD",
        "day_label": "segunda-feira, 23 de fevereiro",
        "posts": [
          {
            "type": "post | reel | carousel | story",
            "time": "HH:MM",
            "theme": "string",
            "caption": "string",
            "content_pillar": "string",
            "seasonal_hook": "string | null",
            "visual": { ... },
            "script": { ... }
          }
        ]
      }
    ],
    "account": {
      "username": "string",
      "niche": "string | null",
      "brand_voice": "string",
      "main_goal": "string"
    },
    "period": 7,
    "generated_at": "ISO datetime"
  },
  "scheduleId": "uuid",
  "mediaMap": {}
}
```

---

### POST /api/schedule/save 🔐
Salva um cronograma na base de dados.

**Body:**
```json
{
  "accountId": "uuid",
  "period": 7,
  "generated_at": "ISO datetime",
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "posts": [
        {
          "type": "post | reel | carousel | story",
          "time": "HH:MM",
          "theme": "string",
          "caption": "string",
          "content_pillar": "string",
          "seasonal_hook": "string | null",
          "visual": { ... },
          "script": { ... }
        }
      ]
    }
  ]
}
```

**Resposta 200:**
```json
{ "scheduleId": "uuid", "postsCount": 10 }
```

---

### DELETE /api/schedule/posts/:id 🔐
Exclui um post do cronograma e remove sua mídia do storage.

**Resposta 200:**
```json
{ "ok": true }
```

---

## Chaves de API

> Estes endpoints só funcionam com autenticação por **sessão** (login na plataforma), não por API key.

### GET /api/keys 🔐
Lista as chaves de API ativas.

**Resposta 200:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "n8n automação",
      "prefix": "smm_Ab1cDe2f",
      "last_used_at": "ISO datetime | null",
      "expires_at": "ISO datetime | null",
      "created_at": "ISO datetime"
    }
  ]
}
```

---

### POST /api/keys 🔐
Cria uma nova chave de API.

**Body:**
```json
{
  "name": "string (obrigatório, max 100 chars)",
  "expires_at": "ISO datetime | null"
}
```

**Resposta 201:**
```json
{
  "key": { "id": "uuid", "name": "string", "prefix": "smm_Ab1cDe2f", ... },
  "rawKey": "smm_ab1cde2f3g4h5i6j7k8l9m0n1o2p3q4"
}
```

> ⚠️ `rawKey` é retornado **apenas nesta resposta**. Não é possível recuperar a chave depois.

---

### DELETE /api/keys/:id 🔐
Revoga uma chave de API. A chave é marcada como revogada e não pode mais ser usada.

**Resposta 200:**
```json
{ "ok": true }
```

---

## Respostas de erro

Todos os erros retornam: `{ "error": "mensagem descritiva" }`

| Código | Significado |
|--------|-------------|
| 401 | Não autenticado — chave inválida, expirada ou revogada |
| 400 | Dados inválidos no body ou query params |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: username duplicado) |
| 500 | Erro interno do servidor |

---

## Exemplos de integração

### n8n — HTTP Request node

```
Method: GET
URL: https://seu-dominio.com/api/instagram/accounts
Headers:
  X-API-Key: smm_sua_chave_aqui
```

### Zapier — Webhook / Custom Request

```
URL: https://seu-dominio.com/api/content/posts
Method: POST
Headers:
  X-API-Key: smm_sua_chave_aqui
  Content-Type: application/json
Body:
  { "post_type": "post", "caption": "Meu post via Zapier!", "status": "planned" }
```

### curl

```bash
# Listar contas
curl https://seu-dominio.com/api/instagram/accounts \
  -H "X-API-Key: smm_sua_chave_aqui"

# Criar post
curl -X POST https://seu-dominio.com/api/content/posts \
  -H "X-API-Key: smm_sua_chave_aqui" \
  -H "Content-Type: application/json" \
  -d '{"post_type": "post", "caption": "Olá mundo!", "status": "draft"}'
```

---

*Social Media Manager API · MVP*
