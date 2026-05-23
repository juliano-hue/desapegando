# Lugar de Desapegar (desapegando)

Aplicação web para publicar e gerenciar anúncios, com importação em lote (OCR) e fluxo de reserva via WhatsApp.

## Stack
- Frontend: React + Vite + Tailwind
- Backend: Express (API)
- Banco: Prisma + SQLite (por padrão)
- Uploads: gravação em diretório configurável (`UPLOAD_DIR`) e serve em `/uploads`

## Rodar local
1) Copie `.env.example` para `.env` e ajuste valores.
2) Instale dependências:

```bash
npm install
```

3) Suba o ambiente de desenvolvimento (frontend + backend):

```bash
npm run dev
```

## Deploy em produção (Vercel + Neon + Supabase)

Arquitetura recomendada para Vercel:
- Banco: Postgres (Neon)
- Uploads: Supabase Storage

### 1) Criar conta e serviços
- Neon: crie um projeto Postgres e copie a connection string (com `sslmode=require`)
- Supabase: crie um projeto e um bucket Storage público (ex.: `uploads`)

### 2) Variáveis de ambiente (Vercel)
Vercel → Project → Settings → Environment Variables:
- `DATABASE_URL` (Neon, Postgres)
- `JWT_SECRET` (obrigatório)
- `FRONTEND_ORIGIN` = `https://SEUAPP.vercel.app`
- `API_PUBLIC_ORIGIN` = `https://SEUAPP.vercel.app`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET` = `uploads`

### 3) Deploy
1) Vercel → New Project → Import `juliano-hue/desapegando`
2) Deploy

### 4) Migrações
Após o deploy, rode localmente apontando para o `DATABASE_URL` do Neon:

```bash
npx prisma migrate deploy
```

### Checklist pós-deploy
- `https://SEUAPP.vercel.app/api/health`
- Login/cadastro e sessão por cookie
- Criar/editar anúncio
- Upload de imagens (URLs do Supabase Storage)

## Rodar local com Docker (Postgres)
Pré-requisito: Docker Desktop.

```bash
docker compose up -d --build
```

## Testes (com Postgres)
Configure `TEST_DATABASE_URL` apontando para um Postgres (pode ser o Postgres do docker compose).

Exemplo:

```bash
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/desapegando?schema=public" npm test
```
