# =====================================================================
# AI Agent Office — single image, runs either the web app or the worker.
# Compose overrides the command; migrations run via a one-shot service.
# =====================================================================
FROM node:20-slim AS deps
WORKDIR /app
# openssl is required by Prisma's query engine on Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `build` = `prisma generate && next build`. DB-touching pages are guarded, so
# the build does not need a live database.
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Full app: the worker runs TypeScript via tsx and both processes use the
# generated Prisma client + migration files.
COPY --from=builder /app ./
EXPOSE 3000
# Default: the web server. Worker service overrides with: npm run worker:start
CMD ["npm", "run", "start"]
