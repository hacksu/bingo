# syntax=docker/dockerfile:1.7

# ─── Install full deps (dev + prod) ─────────────────────────────────────────
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY bun.lock* bun.lockb* ./
RUN bun install

# ─── Build the SvelteKit app ────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ─── Install production-only deps for runtime ───────────────────────────────
FROM oven/bun:1.2-alpine AS prod-deps
WORKDIR /app
COPY package.json ./
COPY bun.lock* bun.lockb* ./
RUN bun install --production

# ─── Final runtime image ────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder  /app/build         ./build
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY src/lib/server/db ./src/lib/server/db

EXPOSE 3000
CMD ["bun", "build/index.js"]
