# ============================================
# ProofPoint Dashboard - Production Dockerfile
# ============================================
# Multi-stage build for optimized Next.js image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production=false

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for build-time env vars
ARG NEXT_PUBLIC_SUPABASE_PROJECT_ID
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_URL

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV ESLINT_NO_DEV_ERRORS=true
ENV CI=true

# Build the application (skip lint for production builds)
RUN npm run build -- --no-lint

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl postgresql-client

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy database migrations and scripts
COPY --chown=nextjs:nodejs database ./database

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
