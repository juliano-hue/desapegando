## 1. Desenho de Arquitetura

```mermaid
flowchart LR
  U["Usuário (Web/Mobile)"] --> FE["Frontend (React + Vite)"]
  FE --> BE["API (Express)"]
  BE --> DB["Banco (SQLite via Prisma)"]
  BE --> ST["Armazenamento de imagens (local no protótipo)"]
  BE --> OAUTH["OAuth Google (opcional)"]
```

## 2. Tecnologias
- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS (design system próprio)
- Auth: credenciais (e-mail/senha com hash) + Google OAuth
- Backend: Express + TypeScript (ESM)
- Banco: SQLite (via Prisma) para protótipo e migração fácil para Postgres
- Upload de imagens: armazenamento local no protótipo (pasta pública) com plano para S3 compatível

## 3. Rotas
| Rota | Finalidade |
|------|------------|
| / | Home + busca + filtros |
| /auth | Cadastro/Login |
| /anunciar | Criar anúncio |
| /anuncio/[id] | Detalhe do anúncio |
| /perfil | Perfil do usuário |

## 4. APIs (contratos)
### 4.1 Autenticação
- `POST /api/auth/register`
  - Req: `{ fullName, email, password, phone }`
  - Res: `{ user }` (ou erro validado)
- `POST /api/auth/login`
  - Req: `{ email, password }`
  - Res: `{ user }` + cookie de sessão
- `POST /api/auth/logout`
  - Res: `{ ok: true }`
- `GET /api/auth/me`
  - Res: `{ user | null }`

### 4.2 Produtos/Anúncios
- `GET /api/listings?query&categoryId&subCategoryId&page`
- `GET /api/listings/[id]`
- `POST /api/listings`
- `PATCH /api/listings/[id]`
- `DELETE /api/listings/[id]`

### 4.3 Perfil
- `PATCH /api/profile`
- `GET /api/profile/listings`
- `GET /api/profile/orders` (compras)
- `GET /api/profile/sales` (vendas)

## 5. Diagrama de Servidor (camadas)

```mermaid
flowchart TD
  C["Route Handler (Controller)"] --> S["Service"]
  S --> R["Repository (Prisma)"]
  R --> D["SQLite"]
```

## 6. Modelo de Dados
### 6.1 ERD

```mermaid
erDiagram
  USER ||--o{ LISTING : "cria"
  CATEGORY ||--o{ SUBCATEGORY : "possui"
  CATEGORY ||--o{ LISTING : "classifica"
  SUBCATEGORY ||--o{ LISTING : "refina"
  LISTING ||--o{ LISTING_IMAGE : "tem"
  USER ||--o{ ORDER : "compra"
  USER ||--o{ SALE : "vende"

  USER {
    string id
    string fullName
    string email
    string phone
    string passwordHash
    string googleSub
    datetime createdAt
    datetime updatedAt
  }

  CATEGORY {
    string id
    string name
    datetime createdAt
  }

  SUBCATEGORY {
    string id
    string categoryId
    string name
  }

  LISTING {
    string id
    string userId
    string categoryId
    string subCategoryId
    string title
    string description
    int priceCents
    string currency
    string status
    string city
    string state
    datetime createdAt
    datetime updatedAt
  }

  LISTING_IMAGE {
    string id
    string listingId
    string url
    int sortOrder
  }

  ORDER {
    string id
    string buyerId
    string listingId
    string status
    datetime createdAt
  }

  SALE {
    string id
    string sellerId
    string listingId
    string status
    datetime createdAt
  }
```

### 6.2 DDL (alto nível)
- Índices: `User.email` único; `Listing.categoryId`, `Listing.subCategoryId`, `Listing.createdAt`
- Migrações via Prisma para evoluir categorias/subcategorias sem reestruturação
