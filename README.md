# PupBox

A Turborepo monorepo containing the PupBox storefront, admin panel and API.

## Structure

| Path                | Package            | What it is                          | Dev port |
| ------------------- | ------------------ | ----------------------------------- | -------- |
| `apps/web`          | `@pupbox/web`      | Customer storefront (Next.js 14)    | 3000     |
| `apps/admin`        | `@pupbox/admin`    | Admin panel (Next.js 14)            | 3001     |
| `apps/api`          | `@pupbox/api`      | REST API (NestJS 10)                | 4000     |
| `packages/database` | `@pupbox/database` | Prisma schema, migrations and seeds | —        |

## Prerequisites

- Node.js 20 or newer
- Docker (for local Postgres and Redis)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres and Redis
docker compose up -d

# 3. Create your env file and fill in the values
cp .env.example .env

# 4. Generate the Prisma client and run migrations
npm run db:generate
npm run db:migrate

# 5. Start every app in dev mode
npm run dev
```

Once running:

- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000/api/v1
- Swagger docs: http://localhost:4000/api/docs

## Scripts

Run from the repo root:

| Script                | What it does                                       |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start all apps in watch mode                       |
| `npm run build`       | Build all apps                                     |
| `npm run lint`        | Lint all apps                                      |
| `npm run db:generate` | Generate the Prisma client                         |
| `npm run db:migrate`  | Create and apply migrations (`prisma migrate dev`) |
| `npm run db:studio`   | Open Prisma Studio                                 |

To seed the database, run `npm run db:seed --workspace @pupbox/database`.
