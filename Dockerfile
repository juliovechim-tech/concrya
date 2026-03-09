# CONCRYA Platform — Multi-stage Dockerfile
# Build: docker build -t concrya-platform .
# Run:   docker run -p 3004:3004 --env-file apps/platform/.env concrya-platform

# ── Stage 1: Install + Build ────────────────────────────────────
FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copiar manifests primeiro (cache de dependências)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/platform/package.json apps/platform/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/aion/package.json packages/aion/package.json
COPY packages/ecorisk/package.json packages/ecorisk/package.json
COPY packages/compensa/package.json packages/compensa/package.json
COPY packages/nivelix/package.json packages/nivelix/package.json
COPY packages/nexus/package.json packages/nexus/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --frozen-lockfile

# Copiar source code
COPY packages/ packages/
COPY apps/platform/ apps/platform/

# Build: vite (client → dist/public) + esbuild (server → dist/server.js)
RUN pnpm --filter @concrya/platform build
RUN cd apps/platform && node_modules/.bin/esbuild \
  server/_core/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/server.js \
  --external:mysql2 \
  --external:drizzle-orm \
  --external:better-sqlite3 \
  --external:@node-rs/argon2 \
  --external:sharp \
  --resolve-extensions=.ts,.js,.tsx,.jsx \
  --loader:.ts=ts

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20-slim AS production

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copiar manifests + instalar apenas prod deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/platform/package.json apps/platform/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/aion/package.json packages/aion/package.json
COPY packages/ecorisk/package.json packages/ecorisk/package.json
COPY packages/compensa/package.json packages/compensa/package.json
COPY packages/nivelix/package.json packages/nivelix/package.json
COPY packages/nexus/package.json packages/nexus/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --frozen-lockfile --prod

# Copiar build artifacts do stage anterior
COPY --from=builder /app/apps/platform/dist apps/platform/dist
COPY --from=builder /app/apps/platform/dist/server.js apps/platform/dist/server.js

ENV NODE_ENV=production

CMD ["node", "apps/platform/dist/server.js"]
