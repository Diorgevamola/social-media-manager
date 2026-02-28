# Image Generator Provider — Pivot Guide

## Overview

O sistema de geração de imagens foi projetado para **pivoting rápido** entre providers:
- **FAL.ai** (Seedance 2.0) — atual, sem quota issues
- **Google Gemini** — backup quando quota reset

## Arquitetura

```
src/lib/image-generator/
├── types.ts              # Interface ImageGeneratorProvider
├── fal-provider.ts       # FAL.ai implementation
├── gemini-provider.ts    # Google Gemini implementation
└── index.ts              # Factory (getImageGenerator)

src/app/api/media/generate-image/route.ts  # Uses factory
```

## Pivot Rápido (2 passos)

### 1. Mudar Environment Variable

Em `.env.local`:
```bash
# Para usar FAL.ai (padrão)
IMAGE_GENERATOR_PROVIDER=fal

# Para usar Gemini
IMAGE_GENERATOR_PROVIDER=gemini
```

### 2. Redeploy

```bash
# Local development (auto-reload)
npm run dev

# Vercel production
git push origin feature/...
# Vercel autodeploy detecta mudança em .env
```

**Pronto!** A mudança é imediata sem alterar nenhum código.

---

## Provider Comparison

| Aspecto | FAL.ai | Gemini |
|---------|--------|--------|
| **Status** | ✅ Ativo | 🔄 Backup |
| **Modelo** | Seedance 2.0 | gemini-3-pro-image-preview |
| **Quota** | Generous | Free tier esgotado |
| **Latency** | ~5-10s | ~3-5s |
| **Qualidade** | Excelente | Excelente |
| **Custo** | Pago (fácil escalável) | Pago (após free tier) |

---

## Fluxo de Uso

### Local Development

```bash
# Start with FAL.ai (default)
npm run dev

# Test image generation
curl -X POST http://localhost:5000/api/media/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A beautiful sunset"}'

# Se quotas esgotarem, mudar para Gemini:
# 1. Edit .env.local: IMAGE_GENERATOR_PROVIDER=gemini
# 2. npm run dev (hot reload)
# 3. Retry request
```

### Production (Vercel)

```bash
# Change .env on Vercel Dashboard
# Settings → Environment Variables → IMAGE_GENERATOR_PROVIDER → gemini
# Or via CLI:
vercel env add IMAGE_GENERATOR_PROVIDER gemini

# Auto-redeploy on next push
git push origin feature/...
```

---

## Troubleshooting

### ❌ Error: "FAL_KEY environment variable is not set"
→ Check `.env.local` or Vercel Environment Variables

### ❌ Error: "GEMINI_API_KEY environment variable is not set"
→ Switch back to FAL or verify Gemini API key

### ❌ Error: "No images returned from FAL.ai"
→ FAL quotas exhausted, switch to Gemini

### ❌ Error: "Resource exhausted" (429 from Gemini)
→ Gemini free tier quota reset, switch back to FAL

---

## Adding New Providers

To add a new provider (e.g., Replicate, Stability AI):

1. **Create provider file**: `src/lib/image-generator/new-provider.ts`
   ```typescript
   export class NewImageGenerator implements ImageGeneratorProvider {
     async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
       // Implementation
     }
   }
   ```

2. **Register in factory**: `src/lib/image-generator/index.ts`
   ```typescript
   case 'new':
     return new NewImageGenerator()
   ```

3. **Add env var**: `IMAGE_GENERATOR_PROVIDER=new`

Done!

---

## Monitoring

Check logs for current provider:

```bash
# Local
npm run dev
# Watch for: "Using FAL.ai provider" or "Using Gemini provider"

# Vercel
vercel logs
```

---

## When to Pivot

- **FAL.ai → Gemini**: When FAL quotas are exhausted
- **Gemini → FAL.ai**: When Gemini free tier resets (24h), or Gemini quota expensive
- **Both exhausted**: Migrate to paid Replicate or Stability AI

---

Last updated: 2026-02-25
