# Dockerfile for tongclass.ac.cn

# Stage 1: Install dependencies
FROM node:24.14.0-slim AS deps
WORKDIR /app
RUN npm install -g npm@11.11.0

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Stage 2: Build the application
FROM node:24.14.0-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g npm@11.11.0

# Allow passing public Convex URLs at build time so Next can embed them
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL
ARG CONVEX_DEPLOYMENT
ARG CONVEX_DEPLOY_KEY
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ENV NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL}
ENV CONVEX_DEPLOYMENT=${CONVEX_DEPLOYMENT}
ENV CONVEX_DEPLOY_KEY=${CONVEX_DEPLOY_KEY}

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 3: Run the application
FROM node:24.14.0-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer poppler-utils fontconfig fonts-liberation \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /opt/oa-fonts

ENV LIBREOFFICE_PATH=/usr/bin/libreoffice
ENV OA_TEMPLATE_FONT_DIR=/opt/oa-fonts
ENV OA_PDFINFO_PATH=/usr/bin/pdfinfo
ENV OA_PDFTOTEXT_PATH=/usr/bin/pdftotext
ENV OA_PDFTOPPM_PATH=/usr/bin/pdftoppm
ENV OA_PDFFONTS_PATH=/usr/bin/pdffonts

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
