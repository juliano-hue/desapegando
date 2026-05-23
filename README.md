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

## Deploy em produção (Render – recomendado)

Esta aplicação pode ser publicada como **um único serviço web**: o backend Express serve a API e também os arquivos estáticos do frontend (Vite build).

### 1) Criar repositório (GitHub)
1) Crie um repositório no GitHub (ex.: `desapegando`).
2) No seu computador, inicialize e envie o código:

```bash
git init
git add .
git commit -m "Deploy-ready"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/desapegando.git
git push -u origin main
```

### 2) Criar serviço no Render
1) Acesse https://render.com e conecte sua conta do GitHub.
2) Selecione “New” → “Blueprint” e escolha o repositório.
3) O Render vai ler o arquivo `render.yaml` e criar o serviço automaticamente.

### 3) Variáveis de ambiente (Render)
Configure no serviço:
- `DATABASE_URL`
  - Opção simples (SQLite em disco persistente): `file:/var/data/dev.db`
- `JWT_SECRET` (obrigatório): string forte
- `FRONTEND_ORIGIN`: `https://SEU-SERVICO.onrender.com`
- `API_PUBLIC_ORIGIN`: `https://SEU-SERVICO.onrender.com`
- `UPLOAD_DIR`: já vem como `/var/data/uploads` via `render.yaml`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (opcional)

### 4) Migrações do banco
Após o primeiro deploy, rode (no Shell do Render ou localmente apontando para o mesmo `DATABASE_URL`):

```bash
npx prisma migrate deploy
```

### 5) Domínio e SSL
- Subdomínio do Render: já funciona com HTTPS.
- Domínio próprio: Render → “Settings” → “Custom Domains” e siga as instruções de DNS. O SSL é provisionado automaticamente.

## Checklist pós-deploy
- Abrir o site e navegar entre páginas (Home, Perfil, Anúncio).
- Login/cadastro e manutenção de sessão (cookie).
- Criar anúncio e visualizar.
- Importação em lote e upload de imagens (verifique `/uploads/...`).
- Reserva via WhatsApp no detalhe do anúncio.

## Manutenção
- Atualizações: dê push no GitHub e o Render redeploya automaticamente.
- Uploads: ficam no disco persistente `/var/data` (plano Starter no blueprint usa 1GB; ajuste conforme necessário).
