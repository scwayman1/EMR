# ==============================================================================
# Leafjourney EMR - Worker Subagents Container
# ==============================================================================
# This container runs the autonomous background agents (e.g. documentation drafter,
# triage analyzer, dosing anomaly detector) in an isolated, secure environment.
# ==============================================================================

# Use official Node.js Alpine for minimal attack surface
FROM node:20-alpine AS base

# Install necessary OS-level dependencies (e.g., for Prisma or native crypto)
RUN apk add --no-cache openssl libc6-compat

# Set working directory
WORKDIR /app

# ------------------------------------------------------------------------------
# Dependencies Phase
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
# Use npm ci for deterministic, clean installs
RUN npm ci

# ------------------------------------------------------------------------------
# Builder Phase
# ------------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the worker scripts (assuming a dedicated tsconfig or entrypoint)
# For V1, we just ensure TypeScript compiles the worker endpoints.
RUN npm run build

# ------------------------------------------------------------------------------
# Production Runner Phase
# ------------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production

# Create a non-root user for security (HIPAA requirement)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 leafworker

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
# Copy any specific worker execution scripts
COPY --from=builder /app/scripts ./scripts

# Set permissions
RUN chown -R leafworker:nodejs /app

# Drop root privileges
USER leafworker

# Expose port (if workers expose a health-check HTTP endpoint)
EXPOSE 8080
ENV PORT=8080

# Command to run the subagent orchestrator
# This depends on how the agents are kicked off (e.g., BullMQ worker or cron)
CMD ["node", "scripts/start-workers.js"]
