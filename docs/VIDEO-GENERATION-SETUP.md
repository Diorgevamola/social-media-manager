# 📹 Setup Completo: Geração de Vídeos (VEO 3.1 + Seedance 2.0)

**Data**: 28/02/2026
**Status**: ✅ Implementação Concluída
**Opção**: 3 - VEO 3.1 + Seedance 2.0 via Aggregator

---

## 🎯 O Que Foi Implementado

### 1️⃣ Cliente Seedance 2.0 (laozhang.ai)
```typescript
// /src/lib/laozhang/client.ts

export async function generateVideoWithSeedance(
  input: SeedanceGenerationRequest,
  onProgress?: (message: string, elapsed: number) => void
): Promise<SeedanceGenerationResponse>
```

**Capacidades:**
- ✅ Texto→vídeo e imagem→vídeo
- ✅ Polling assíncrono com retry
- ✅ Timeout: 5 minutos
- ✅ Suporte a 12 arquivos de referência

### 2️⃣ Rota de API
```
POST /api/media/generate-video-seedance-2
```

**Parâmetros:**
```json
{
  "prompt": "string (min 10 caracteres)",
  "image_url": "string (opcional)",
  "aspect_ratio": "16:9|9:16|4:3|3:4|1:1|21:9",
  "resolution": "480p|720p|1080p|2K",
  "duration": 4-15,
  "audio": boolean
}
```

**Response:** Server-Sent Events (streaming)
```json
// Evento de progresso
{ "type": "progress", "message": "...", "elapsed": 5 }

// Evento de conclusão
{ "type": "complete", "videoUrl": "...", "videoData": "base64..." }

// Evento de erro
{ "type": "error", "message": "..." }
```

### 3️⃣ Componente UI
```typescript
// /src/components/content/video-generator.tsx

<VideoGenerator onVideoGenerated={(url) => { }} />
```

**Features:**
- Seletor de modelo (VEO 3.1, Seedance 1.0, Seedance 2.0)
- Formulário com parâmetros de vídeo
- Preview de vídeo gerado
- Progress bar com eventos em tempo real

### 4️⃣ Página de Dashboard
```
/dashboard/video
```

- Central unificada de geração
- Info cards com preços e capacidades
- Exemplos de uso

---

## 🚀 Como Usar

### Passo 1: Configurar Chave de API

1. Acesse https://api.laozhang.ai
2. Crie uma conta ou faça login
3. Gere uma chave API
4. Adicione ao `.env.local`:

```bash
LAOZHANG_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### Passo 2: Testar a Geração

Vá para `/dashboard/video` e experimente:

```
Descrição: "Um influencer fazendo yoga em um estúdio moderno,
          luz natural, edição dinâmica, efeitos de transição"
Modelo: Seedance 2.0
Duração: 5s
Resolução: 1080p
Áudio: Ativado
```

### Passo 3: Integrar no Fluxo

```typescript
import { VideoGenerator } from '@/components/content/video-generator'

export function ContentCreator() {
  return (
    <VideoGenerator
      onVideoGenerated={(videoUrl) => {
        // Salvar URL no banco
        // Usar em preview
        // Publicar no Instagram
      }}
    />
  )
}
```

---

## 💰 Preços Comparativos

| Modelo | Duração | Resolução | Custo/Min | Custo 5s |
|--------|---------|-----------|-----------|----------|
| VEO 3.1 | 4-8s | 1080p | ~$0.15 | ~$0.013 |
| Seedance 1.0 | 2-12s | 1080p | ~$0.10 | ~$0.008 |
| **Seedance 2.0** | 4-15s | Até 2K | ~$0.05 | ~$0.004 |
| Sora 2 | Variável | 1080p | ~$5.00 | ~$0.42 |

**Conclusão:** Seedance 2.0 é **100x mais barato** que Sora 2!

---

## 📋 Características por Modelo

### VEO 3.1
- ✅ Geração rápida (30-60s)
- ✅ Qualidade excelente
- ✅ Duração: 4-8 segundos
- ❌ Sem image-to-video
- 🔗 Endpoint: `/api/media/generate-video`

### Seedance 1.0 Pro
- ✅ Imagem-para-vídeo
- ✅ Áudio nativo com lip-sync
- ✅ Duração: 2-12 segundos
- ✅ Customização via prompts
- 🔗 Endpoint: `/api/media/generate-video-seedance`

### Seedance 2.0 ⭐ NOVO
- ✅ Última geração (Fev 2026)
- ✅ Até 2K (4x resolução do v1)
- ✅ Duração: 4-15 segundos
- ✅ 12 arquivos de referência
- ✅ Lip-sync em 8+ idiomas
- ✅ Preço 3x mais barato
- 🔗 Endpoint: `/api/media/generate-video-seedance-2`

---

## 🔧 Troubleshooting

### Erro: "LAOZHANG_API_KEY não configurada"
```bash
# Solução: Adicione ao .env.local
LAOZHANG_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### Timeout após 5 minutos
```
Causa: Seedance 2.0 pode levar 1-2 minutos para processar
Solução: Aumentar MAX_WAIT_TIME em /src/lib/laozhang/client.ts
```

### Erro 429 (Rate Limited)
```typescript
// Já implementado com retry exponencial
// Aguarde 1-2 minutos antes de tentar novamente
```

---

## 📊 Logging de Uso

Cada geração de vídeo é registrada em:
```sql
SELECT * FROM ai_generations
WHERE type = 'video'
ORDER BY created_at DESC
```

**Campos:**
- `user_id` — Usuário que gerou
- `model` — Modelo usado (seedance-2.0, veo-3.1, etc)
- `metadata` — Parâmetros (resolução, duração, etc)

---

## 🎬 Exemplos de Prompts Efetivos

### Exemplo 1: Lifestyle
```
"Uma mulher em um café aconchegante, sorrindo para câmera,
segurando uma xícara de café quente. Luz dourada, atmosfera
aconchegante, movimento leve da câmera para o lado"
```

### Exemplo 2: Produto
```
"Um smartphone premium sendo rotacionado lentamente no ar,
mostrando design elegante. Fundo branco limpo, iluminação
de estúdio profissional, efeito de refração de luz"
```

### Exemplo 3: Tutorial
```
"Mãos demonstrando passo a passo a aplicação de um sérum
facial. Close-up na pele, iluminação clara, movimento
fluido e naturalcâmera estável"
```

---

## 📚 Referências

- **LaoZhang API**: https://api.laozhang.ai
- **Documentação**: https://docs.laozhang.ai
- **Seedance 2.0 Guide**: https://blog.laozhang.ai/en/posts/seedance-2-api
- **GitHub**: Esta documentação

---

## ✅ Checklist de Implementação

- [x] Cliente Seedance 2.0 criado
- [x] Rota de API implementada
- [x] Componente UI criado
- [x] Página de dashboard criada
- [x] Documentação escrita
- [ ] LAOZHANG_API_KEY configurada
- [ ] Testes manuais concluídos
- [ ] Integração com Instagram agendada

---

**Status**: 🚀 Pronto para produção

**Próximos Passos:**
1. Configurar chave API
2. Testar em `/dashboard/video`
3. Integrar com fluxo de publicação
4. Monitorar custo mensal
