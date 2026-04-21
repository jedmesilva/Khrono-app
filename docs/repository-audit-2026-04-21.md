# Auditoria técnica do repositório (2026-04-21)

## Escopo analisado
- Monorepo pnpm com app mobile Expo (`artifacts/krono`), API server Express (`artifacts/api-server`), contratos de API (`lib/api-spec`, `lib/api-zod`, `lib/api-client-react`) e migrations Supabase (`supabase/migrations` + `artifacts/krono/supabase/migrations`).
- Execução de validações de tipo do app e do servidor.

## Diagnóstico executivo
O produto está arquitetado de forma coerente para **mobile + Supabase + API auxiliar de pagamentos (Stripe)**, mas há riscos críticos que afetam segurança, confiabilidade de deploy e manutenção.

## Pontos críticos encontrados

### 1) Falha de segurança potencial no middleware de autenticação (CRÍTICO)
**Arquivo:** `artifacts/api-server/src/middleware/auth.ts`

O `requireAuth` faz `next()` quando não existe `SUPABASE_JWT_SECRET` e nem `SUPABASE_URL` válidos para JWKS. Isso pode deixar rotas protegidas acessíveis sem validação de token em ambiente mal configurado.

**Impacto:** acesso não autenticado a endpoints de pagamento (`/stripe/*`) em caso de configuração incompleta.

**Plano de correção:**
1. Alterar fallback final para `401 Unauthorized` quando nenhuma estratégia de verificação estiver configurada.
2. Falhar startup (`process.exit(1)`) se variáveis mínimas de auth não estiverem presentes em produção.
3. Adicionar teste de integração cobrindo cenário “sem segredo + sem JWKS”.

---

### 2) Contrato de API desatualizado em relação ao servidor real (ALTO)
**Arquivos:**
- `lib/api-spec/openapi.yaml`
- `artifacts/api-server/src/routes/stripe.ts`

O OpenAPI publica apenas `/healthz`, mas o servidor expõe vários endpoints Stripe. Isso quebra geração confiável de SDKs e validação de contrato.

**Impacto:** client gerado divergente, risco de quebra silenciosa e baixa rastreabilidade de mudanças.

**Plano de correção:**
1. Expandir `openapi.yaml` para todas as rotas Stripe e schemas de request/response.
2. Regenerar `api-zod` e `api-client-react` no pipeline.
3. Bloquear merge se houver drift de contrato (check CI).

---

### 3) Falhas de TypeScript no servidor e no app (ALTO)
**Comandos executados:**
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/khrono run typecheck`

Há erros de tipagem em ambos os lados (auth/stripe/db no servidor; telas/contextos no app).

**Impacto:** regressões em runtime, menor segurança em refactors, build/CI instáveis.

**Plano de correção:**
1. Corrigir primeiro o servidor (auth + rotas Stripe + typing de DB).
2. Corrigir em seguida o app (tipos de componentes, contexts e contratos de callback).
3. Introduzir meta de “typecheck limpo obrigatório” na CI.

---

### 4) Estratégia de banco fragmentada (ALTO)
**Arquivos/pastas:**
- `supabase/migrations/*`
- `artifacts/krono/supabase/migrations/*`
- `artifacts/api-server/src/lib/db.ts` (usa `DATABASE_URL` separado)

Existem migrations em dois lugares para Supabase e, ao mesmo tempo, o API server usa banco PostgreSQL via `DATABASE_URL` (Railway/Replit), separado do banco principal do app.

**Impacto:** risco de inconsistência entre schema esperado pelo app e schema realmente em produção; difícil governança de mudanças.

**Plano de correção:**
1. Definir **fonte única de migrations** para Supabase (preferência: pasta raiz `supabase/migrations`).
2. Documentar formalmente o boundary: quais tabelas ficam no Supabase vs banco do server.
3. Se possível, avaliar unificação do armazenamento de `stripe_payment_links` no Supabase (com service role no backend).

---

### 5) Acoplamento legado de ambiente Replit em projeto Railway/Expo (MÉDIO-ALTO)
**Arquivos:**
- `artifacts/api-server/src/lib/stripeClient.ts`
- `artifacts/api-server/src/lib/stripeInit.ts`
- `artifacts/krono/package.json` (script `dev` com variáveis Replit)

Há lógica forte dependente de variáveis Replit (connectors/domains), enquanto a operação declarada é Railway + Expo.

**Impacto:** comportamento inconsistente entre ambientes e maior custo operacional.

**Plano de correção:**
1. Tornar caminho Railway/environment-first explícito e padrão.
2. Tratar suporte Replit como opcional com feature flag.
3. Consolidar documentação de env vars por ambiente (dev/staging/prod).

---

### 6) Inconsistências de build/deploy e artefatos gerados (MÉDIO)
**Arquivos:**
- `artifacts/api-server/build.ts` (gera `dist/index.js`)
- `artifacts/api-server/package.json` (`start` usa `dist/index.js`)
- histórico local contém `dist/index.cjs` legado

Há indício de transição de formato de build (cjs -> esm) que pode causar confusão se pipelines/artefatos antigos forem reutilizados.

**Impacto:** risco de falha de inicialização por artefato incorreto em deploy manual ou cache antigo.

**Plano de correção:**
1. Garantir limpeza de `dist/` sempre antes de build (já existe no script).
2. Remover artefatos legados versionados e ignorar build output no Git.
3. Adicionar check CI: build + start smoke test.

---

### 7) Cobertura funcional de API focada em Stripe, sem camadas de proteção adicionais (MÉDIO)
Faltam sinais de rate limiting, idempotency key enforcement e validação formal de payload com schema nas rotas de pagamento.

**Impacto:** risco maior de abuso, duplicidade de intents e bugs de integração.

**Plano de correção:**
1. Validar payload com Zod em todas as rotas Stripe.
2. Exigir idempotency key para criação de intents.
3. Adicionar rate limit por IP/usuário/token e logs de auditoria padronizados.

## Veredito por área

### Servidor (Railway)
- **Implementação base:** boa (Express 5, healthcheck, webhook raw body, logs).
- **Status atual:** **não está pronto para operação robusta** sem correções de auth, typing e contrato.

### APIs
- **Endpoints Stripe existem e funcionam conceitualmente**, porém com gaps de segurança/contrato/validação.
- **OpenAPI não representa a API real** no estado atual.

### App mobile (Expo)
- Estrutura de app está madura e extensa.
- **Typecheck com erros importantes** indica dívida técnica ativa.

### Banco (Supabase)
- Uso de Supabase é consistente no app.
- **Governança de migrations e fronteira entre bancos precisa ser consolidada**.

## Plano de execução recomendado (priorizado)

### Fase 0 — Segurança imediata (1 dia)
1. Corrigir fallback permissivo do `requireAuth`.
2. Tornar env de auth obrigatório em produção.
3. Revisar CORS para produção (origens Railway/Expo web específicas).

### Fase 1 — Estabilidade de build/typing (1-2 dias)
1. Zerar typecheck do `api-server`.
2. Zerar typecheck do `khrono` por lotes (rotas críticas primeiro).
3. Adicionar CI com gates: `typecheck`, `build`, `health smoke`.

### Fase 2 — Contrato e integração (1-2 dias)
1. Atualizar OpenAPI com rotas Stripe.
2. Regenerar `api-zod` e `api-client-react`.
3. Migrar chamadas `fetch` manuais do app para client tipado gradualmente.

### Fase 3 — Dados e operação (2-3 dias)
1. Unificar estratégia de migrations Supabase.
2. Definir ADR curta sobre “Supabase x banco auxiliar do server”.
3. Implantar observabilidade mínima (erros por rota, taxa de webhook, latência p95).

## Checklist de pronto para produção
- [ ] `requireAuth` nunca permite acesso sem verificação.
- [ ] `typecheck` limpo no app e servidor.
- [ ] OpenAPI cobre endpoints reais.
- [ ] CI bloqueia drift de contrato e erro de build.
- [ ] Migrations Supabase com fonte única e processo único.
- [ ] Playbook de deploy Railway + rollback documentado.

