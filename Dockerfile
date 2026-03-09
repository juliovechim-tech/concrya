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

# Build apenas o client (vite → dist/public)
RUN pnpm --filter @concrya/platform exec vite build

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20-slim AS production

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copiar manifests + instalar TODAS as deps (tsx é devDep)
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

RUN pnpm install --frozen-lockfile

# Copiar source code dos packages (tsx precisa resolver .ts em runtime)
COPY --from=builder /app/packages packages/

# Copiar server source + shared + client build artifacts
COPY --from=builder /app/apps/platform/server apps/platform/server
COPY --from=builder /app/apps/platform/shared apps/platform/shared
COPY --from=builder /app/apps/platform/dist apps/platform/dist

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@concrya/platform", "exec", "tsx", "server/_core/prod.ts"]
