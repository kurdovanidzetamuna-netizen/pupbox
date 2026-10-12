FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/content/package.json ./packages/content/
COPY apps/admin/package.json ./apps/admin/
RUN npm ci --ignore-scripts

FROM deps AS build
COPY packages/database ./packages/database
COPY packages/content ./packages/content
COPY apps/admin ./apps/admin
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN cd apps/admin && npx next build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/admin/.next/standalone ./
COPY --from=build /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /app/apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/admin/server.js"]
