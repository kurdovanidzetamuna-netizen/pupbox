FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
RUN npm ci --ignore-scripts

# Build
FROM deps AS build
COPY packages/database ./packages/database
COPY apps/api ./apps/api
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN cd apps/api && npx tsc --project tsconfig.json

# Production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
# Source for prisma/seed-legal.ts (Terms and Privacy pages)
COPY docs/legal ./docs/legal

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
