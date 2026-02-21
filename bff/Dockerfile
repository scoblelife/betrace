# BeTrace BFF - Multi-stage Docker build
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Build
FROM deps AS build
COPY . .
ENV VITE_DEMO_MODE=true
ENV VITE_BETRACE_API_URL=/api
RUN pnpm build

# Production - serve with lightweight static server
FROM node:22-slim AS production
RUN npm install -g serve@14
WORKDIR /app
COPY --from=build /app/dist ./dist

EXPOSE 3000
ENV NODE_ENV=production

CMD ["serve", "-s", "dist", "-l", "3000"]
