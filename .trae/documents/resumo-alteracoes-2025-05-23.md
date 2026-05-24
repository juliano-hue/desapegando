# Resumo das Últimas Alterações - Desapegando

**Data:** 23/05/2025  
**Projeto:** Lugar de Desapegar (desapegando)

---

## 1. Sistema "Marcar como Vendido" com Retenção 24h

### Funcionalidades Implementadas

#### Backend
- **Novo campo no banco:** `soldAt` (DateTime) na tabela `Listing`
- **Status SOLD:** Novo status para anúncios vendidos
- **Lógica de retenção:** 
  - Anúncios SOLD ficam públicos por 24h após `soldAt`
  - Após 24h, são ocultados da listagem pública (apenas dono pode ver)
- **Endpoint:** `PATCH /api/listings/:id` aceita `{ status: "SOLD" }`
- **Registro de venda:** Cria entrada na tabela `Sale` para histórico

#### Frontend
- **Botão "Marcar como vendido":**
  - Visível apenas para dono do anúncio
  - Aparece nas páginas: Editar Anúncio e Detalhe do Anúncio
  - Bloqueado durante processamento
- **Overlay "VENDIDO":**
  - Tarja escura com texto "VENDIDO" sobreposta na imagem
  - Aplicada em: cards da listagem, detalhe do anúncio, edição
  - Estilo: fundo preto translúcido, texto branco, borda arredondada
- **Bloqueio de contato:**
  - Para anúncios SOLD, oculta botões de contato (WhatsApp, telefone)
  - Mostra mensagem informativa: "Este item foi vendido."

### Arquivos Modificados
- `prisma/schema.prisma` - Adicionado campo `soldAt`
- `prisma/migrations/20260524120000_add_listing_soldat/migration.sql` - Migração
- `api/routes/listings.ts` - Lógica de status SOLD e retenção 24h
- `src/lib/models.ts` - Adicionado `soldAt` no tipo
- `src/components/ListingCard.tsx` - Overlay VENDIDO
- `src/pages/ListingDetail.tsx` - Botão marcar vendido, overlay, bloqueio contato
- `src/pages/EditListing.tsx` - Botão marcar vendido, overlay
- `api/tests/listings.edit.test.ts` - Testes para feature de vendido

---

## 2. Correção na Exibição de Imagens (Letterbox)

### Problema Anterior
- Imagens eram cortadas (`object-cover` + `overflow-hidden`)
- Partes importantes da foto ficavam fora do quadro
- Hover com `scale` aumentava o corte

### Solução Implementada
- Substituído `object-cover` por `object-contain object-center`
- Removido efeito `hover:scale` que causava corte
- Mantido fundo neutro (`bg-white/6`, `bg-white/10`) para letterboxing
- Adicionado `decoding="async"` para performance

### Resultado
- Imagem inteira sempre visível
- Proporção original preservada
- Sem distorções ou cortes
- Fundo neutro preenche espaço vazio (letterbox)

### Arquivos Modificados
- `src/components/ListingCard.tsx` - Card da listagem
- `src/pages/ListingDetail.tsx` - Detalhe do anúncio (imagem principal + miniaturas)
- `src/pages/EditListing.tsx` - Edição do anúncio (imagem principal + grid)
- `src/pages/NewListing.tsx` - Criação de anúncio (grid de fotos)
- `src/pages/Profile.tsx` - Miniaturas de compras/vendas
- `src/pages/BulkImport.tsx` - Prévia de importação em lote

---

## 3. Estado do Deploy

### Ambiente
- **Plataforma:** Vercel
- **URL de Produção:** https://desapegando-4xxx.vercel.app
- **Branch:** main
- **Auto-deploy:** Ativo (cada push dispara novo deploy)

### Status Atual
- **Último Deploy:** Commit `c866009` - "feat: marcar anuncio como vendido com retencao 24h"
- **Status:** ✅ Production (Current) - Deployment Completed
- **Build:** Sucesso (35s)
- **Migrações:** Aplicadas com sucesso no Neon (PostgreSQL)

### Variáveis de Ambiente Configuradas
- `DATABASE_URL` ✅ (Neon PostgreSQL)
- `JWT_SECRET` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SUPABASE_BUCKET` ✅

### Health Check
- `GET /api/health` → `{"success":true,"message":"ok"}` ✅
- `GET /api/listings` → Retornando dados com campo `soldAt` ✅

---

## Resumo de Arquivos Alterados (Último Commit)

```
8 files changed, 240 insertions(+), 29 deletions(-)

prisma/migrations/20260524120000_add_listing_soldat/migration.sql (novo)
prisma/schema.prisma                          (+2 campos)
api/routes/listings.ts                        (+64/-13)
api/tests/listings.edit.test.ts               (+44/-0)
src/lib/models.ts                             (+1/-0)
src/components/ListingCard.tsx                (+8/-2)
src/pages/ListingDetail.tsx                   (+60/-10)
src/pages/EditListing.tsx                     (+52/-4)
```

---

## Checklist de Funcionalidades

- [x] Botão "Marcar como vendido" (dono do anúncio)
- [x] Overlay "VENDIDO" nas imagens
- [x] Retenção 24h após venda
- [x] Ocultação automática da listagem pública após 24h
- [x] Bloqueio de contato para itens vendidos
- [x] Imagens exibidas integralmente (sem corte)
- [x] Proporção preservada (letterbox)
- [x] Deploy em produção no Vercel
- [x] Migrações aplicadas no banco

---

## Observações

1. **Preview vs Production:** O `DATABASE_URL` está configurado para ambos os ambientes. Idealmente, Preview deveria usar banco separado para evitar migrações acidentais em produção.

2. **Google OAuth:** Não configurado atualmente. Se desejar adicionar login com Google, precisará das variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

3. **Imagens:** Todas as alterações de exibição de imagem foram aplicadas localmente. Para subir para produção, é necessário fazer commit e push.

---

**Última atualização:** 23/05/2025 23:20  
**Próximo passo recomendado:** Commit das alterações de imagem + push para deploy no Vercel
