# Stage 1: Build — install deps (compiles better-sqlite3 native module), build Vite frontend
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_TMDB_API_TOKEN
ENV VITE_TMDB_API_TOKEN=$VITE_TMDB_API_TOKEN

RUN npm run build

# Stage 2: Runtime
FROM node:22-bookworm-slim

# Install gh CLI (required by Copilot SDK)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
      dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
      tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built Vite frontend, compiled native modules, and server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY package*.json ./

RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production

# Install gh copilot extension on startup (requires GH_TOKEN env var), then start server
CMD ["sh", "-c", "gh extension install github/gh-copilot --force 2>/dev/null || true && node --no-warnings ./node_modules/.bin/tsx server/index.ts"]
