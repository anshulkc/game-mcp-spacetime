FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=development
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


FROM base AS builder
COPY pnpm-lock.yaml package.json ./
COPY . .
ENV PNPM_CONFIG_PRODUCTION=false
RUN pnpm install --frozen-lockfile

RUN echo "===== FILES IN /app (depth ≤ 2) =====" \
 && find . -maxdepth 2 -type f | sort

 
RUN pnpm build 
RUN pnpm prune --prod


FROM base AS runner
COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.cjs"]
