# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace config and lockfile first for better layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy workspace packages
COPY packages/ ./packages/

# Copy drizzle config and migrations
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/

# Copy SvelteKit source and config
COPY svelte.config.js vite.config.ts tsconfig.json CHANGELOG.md ./
COPY src/ ./src/
COPY static/ ./static/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Placeholder env vars for SvelteKit static env imports at build time.
# adapter-node reads actual values from the runtime environment, so these
# are never used — they just satisfy the Vite build-time check.
# These do NOT persist in the final image (multi-stage build).
ENV DATABASE_URL=postgresql://x:x@localhost/x \
    GITHUB_CLIENT_ID=x \
    GITHUB_CLIENT_SECRET=x \
    PUBLIC_SITE_URL=https://placeholder.example.com

# Build the SvelteKit app
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine AS runtime

RUN apk add --no-cache curl

WORKDIR /app

# Copy built app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Copy node_modules (full, includes drizzle-kit for migrations)
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages (needed for workspace:* resolution)
COPY --from=builder /app/packages ./packages

# Copy drizzle migrations and config
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

# Copy scripts (entrypoint + seed)
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Copy seed script and its dependencies (for `docker exec` seeding)
COPY scripts/seed-dev.ts ./scripts/seed-dev.ts
COPY scripts/reset-db.ts ./scripts/reset-db.ts
COPY --from=builder /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/v1/health || exit 1

CMD ["./docker-entrypoint.sh"]
