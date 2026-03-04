FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate needs DATABASE_URL from prisma.config.ts (format only, no connection)
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slicebuilder
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
WORKDIR /app/packages/api
RUN npm run build

FROM base AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
ENV NODE_ENV=production
WORKDIR /app/packages/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
