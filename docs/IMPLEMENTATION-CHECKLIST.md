# Checklist de Implementação: Automação de Publicação

Status: ✅ **Fases 1 & 2 Completas** | 🟡 **Fase 3 Pendente**

## ✅ Fase 1: Melhorar Cron Job & Logging (COMPLETA)

### Banco de Dados
- [x] Criar migration SQL `publish-logging-migration.sql`
  - [x] Tabela `schedule_posts_publish_log`
  - [x] Índices para performance
  - [x] Campo `publish_history` em `schedule_posts`
  - [x] RLS Policies
  - [x] Função de trigger para `updated_at`

### Código Backend
- [x] Biblioteca de logging: `src/lib/publish-logging.ts`
  - [x] `logPublishAttempt()` - registra tentativas
  - [x] `updatePostPublishHistory()` - atualiza histórico JSON
  - [x] `getPublishLog()` - busca histórico
  - [x] `getPublishStats()` - calcula estatísticas
  - [x] Retry automático (exponential backoff)

### Melhorias no Cron Job
- [x] `src/app/api/cron/publish-pending/route.ts`
  - [x] Logging estruturado de cada tentativa
  - [x] Suporte a retry com delays exponenciais
  - [x] Resposta JSON detalhada com histórico
  - [x] Tracking de duração de execução

### Tipos TypeScript
- [x] `src/types/database.ts`
  - [x] Interface `PublishLog`
  - [x] Campo `publish_history` em `SchedulePostRow`
  - [x] Tipos para o Database

---

## ✅ Fase 2: Endpoints de Confirmação & Controle (COMPLETA)

### Endpoints Implementados
- [x] **GET** `/api/schedule/posts/[id]/status`
  - Retorna status atual, histórico e estatísticas
  - Arquivo: `src/app/api/schedule/posts/[id]/status/route.ts`

- [x] **POST** `/api/schedule/posts/[id]/confirm`
  - Confirma/desconfirma post para publicação
  - Arquivo: `src/app/api/schedule/posts/[id]/confirm/route.ts`

- [x] **POST** `/api/schedule/posts/[id]/unschedule`
  - Remove post do cronograma (reseta status)
  - Arquivo: `src/app/api/schedule/posts/[id]/unschedule/route.ts`

- [x] **PUT** `/api/schedule/posts/[id]/reschedule`
  - Remarcar post para novo horário/data
  - Arquivo: `src/app/api/schedule/posts/[id]/reschedule/route.ts`

### Documentação
- [x] `docs/PUBLISH-AUTOMATION-API.md`
  - Documentação completa de todos os endpoints
  - Exemplos de uso
  - Fluxo recomendado
  - Tratamento de erros

---

## 🟡 Fase 3: Dashboard - Status Panel (PENDENTE)

### Componentes
- [ ] Melhorar `src/components/schedule/schedule-calendar.tsx`
  - [ ] Adicionar coluna Status com badges
  - [ ] Mostrar `published_at` quando publicado
  - [ ] Mostrar `publish_error` se houver erro
  - [ ] Botão para retentar (se erro)
  - [ ] Botão para confirmar (se não confirmado)

- [ ] Melhorar `src/components/schedule/PostStatusBadge.tsx`
  - [ ] Adicionar status `pending_reel` (amarelo)
  - [ ] Adicionar status `error` (vermelho)
  - [ ] Mostrar timestamp de publicação

- [ ] Novo componente `src/components/schedule/PublishHistoryPanel.tsx`
  - [ ] Mostrar histórico de tentativas
  - [ ] Timestamps e duração
  - [ ] Mensagens de erro detalhadas

### Interatividade
- [ ] Botão "Confirmar" com callback para POST `/api/schedule/posts/[id]/confirm`
- [ ] Botão "Retentar" com callback para POST `/api/instagram/publish/[postId]`
- [ ] Botão "Desagendar" com callback para POST `/api/schedule/posts/[id]/unschedule`
- [ ] Botão "Remarcar" com modal para PUT `/api/schedule/posts/[id]/reschedule`
- [ ] Indicador visual de "aguardando" para reels (pending_reel)

---

## 🚀 Próximas Ações

### Imediatas (para ativar a feature)

1. **Aplicar Migration SQL**
   ```bash
   cd supabase
   # No Supabase Dashboard > SQL Editor:
   # Copiar todo conteúdo de publish-logging-migration.sql e executar
   ```

2. **Testar Endpoints Manualmente**
   ```bash
   # Usar Insomnia, Postman ou curl para testar:
   curl -X GET "https://seu-app.com/api/schedule/posts/[id]/status" \
     -H "x-api-key: sua-api-key"
   ```

3. **Testar Cron Job**
   ```bash
   # Acionar manualmente:
   curl "https://seu-app.com/api/cron/publish-pending?secret={CRON_SECRET}"

   # Checar resposta com histórico detalhado
   ```

### Médio Prazo (Fase 3)

4. **Implementar Dashboard UI** (próximo sprint)
   - Melhorar visual dos status
   - Adicionar interatividade
   - Testar UX com usuário

5. **Testes Automatizados**
   - Testes unitários para `publish-logging.ts`
   - Testes de integração para cron job
   - Testes de endpoints

### Longo Prazo (Fase 4)

6. **Melhorias Avançadas** (future sprints)
   - [ ] Webhooks do Instagram para status em tempo real
   - [ ] Agendamento visual (drag-and-drop)
   - [ ] Bulk actions (publicar tudo, pausar cronograma)
   - [ ] Analytics: posts publicados, erro rate, melhor horário
   - [ ] Notificações (email/push quando publicar ou falhar)

---

## 📋 Validação

Antes de considerar concluído:

### Teste Manual: Fluxo Completo

```bash
# 1. Gerar cronograma
POST /api/schedule/generate

# 2. Confirmar alguns posts
POST /api/schedule/posts/[id1]/confirm { "confirmed": true }
POST /api/schedule/posts/[id2]/confirm { "confirmed": true }

# 3. Verificar status
GET /api/schedule/posts/[id1]/status
# Deve retornar: confirmed=true, status=planned, publishHistory vazio

# 4. Remarcar um post
PUT /api/schedule/posts/[id3]/reschedule
{
  "date": "2026-03-01",
  "time": "09:00"
}

# 5. Desagendar um post
POST /api/schedule/posts/[id4]/unschedule

# 6. Testar cron job (com posts com horário no passado)
GET /api/cron/publish-pending?secret={CRON_SECRET}
# Deve retornar detalhes de publicação com attempts

# 7. Verificar histórico após publicação
GET /api/schedule/posts/[id1]/status
# Deve retornar:
# - status = published
# - publishedAt = timestamp
# - igMediaId = ID do Instagram
# - publishHistory com 1 attempt bem-sucedido
# - statistics com 1 sucesso, 0 erros
```

### Verificações de Banco de Dados

```sql
-- Conferir que a migration foi aplicada
SELECT * FROM information_schema.tables WHERE table_name = 'schedule_posts_publish_log';

-- Ver histórico de um post
SELECT * FROM schedule_posts_publish_log
WHERE post_id = 'seu-post-id'
ORDER BY attempt_number DESC;

-- Ver histórico JSON de um post
SELECT id, publish_history
FROM schedule_posts
WHERE id = 'seu-post-id';
```

---

## 🔧 Troubleshooting

### Erro: "Table not found: schedule_posts_publish_log"
- Solução: Aplicar migration SQL em Supabase Dashboard

### Erro: "RLS policy violation"
- Solução: Verificar que RLS policies estão corretas
- Checar: `user_id` deve corresponder ao usuário autenticado

### Cron job não está logando
- Solução: Verificar que `CRON_SECRET` está definida em `.env`
- Checar logs de erro em Supabase

### Posts não estão sendo publicados
- Solução: Verificar que `confirmed=true`
- Verificar que `generated_image_url` ou `generated_video_url` estão definidas
- Verificar que horário é anterior a `now()`

---

## 📚 Referências

- **API Docs**: `docs/PUBLISH-AUTOMATION-API.md`
- **Migration SQL**: `supabase/publish-logging-migration.sql`
- **Biblioteca de Logging**: `src/lib/publish-logging.ts`
- **Cron Job Melhorado**: `src/app/api/cron/publish-pending/route.ts`
- **Endpoints Novos**:
  - `src/app/api/schedule/posts/[id]/status/route.ts`
  - `src/app/api/schedule/posts/[id]/confirm/route.ts`
  - `src/app/api/schedule/posts/[id]/unschedule/route.ts`
  - `src/app/api/schedule/posts/[id]/reschedule/route.ts`

---

## ✨ Resumo do que foi implementado

### Melhorias de Logging
- ✅ Cada tentativa de publicação agora é registrada com timestamp, status, erro (se houver) e duração
- ✅ Histórico persistido em 2 lugares: tabela `schedule_posts_publish_log` + JSON em `publish_history`
- ✅ Fácil debug: ver exatamente quando e por que uma publicação falhou

### Melhorias no Controle
- ✅ Usuário pode confirmar ou desconfirmar posts antes de serem publicados
- ✅ Usuário pode remarcar posts para outro horário
- ✅ Usuário pode desagendar posts completamente
- ✅ Confirmação é obrigatória antes de publicar

### Melhorias na Resiliência
- ✅ Retry automático com exponential backoff (1s, 2s, 4s, 8s, 16s)
- ✅ Limite de tentativas evita loops infinitos
- ✅ Erros são registrados para análise posterior
- ✅ Posts com erro podem ser remarcados e tentados novamente

### Próximas Prioridades
1. Aplicar migration SQL em Supabase
2. Testar endpoints manualmente
3. Implementar UI (Fase 3)
4. Deploy em produção

---

Atualizado em: 2026-02-28
Autor: Claude Code
Status: 70% completo (Fases 1-2 ✅ | Fase 3 🟡)
