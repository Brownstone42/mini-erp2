FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Generate the client on Linux; never copy Windows node_modules or .env.
RUN npm ci --ignore-scripts && npm run db:generate

FROM dependencies AS ci
RUN npx playwright install --with-deps chromium
COPY . .
ENV CI=true E2E_TEST=1 NEXT_TELEMETRY_DISABLED=1
CMD ["npm", "run", "ci:check"]

FROM dependencies AS migration
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 DOCKER_BUILD=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
