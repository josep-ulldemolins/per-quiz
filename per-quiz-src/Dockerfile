# PER Quiz: web + API in one container. Build from per-quiz-src/:
#   docker build -t per-quiz .
# Accounts and progress live in SQLite under /data; mount a volume there.

FROM node:26-slim AS build
WORKDIR /src/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
COPY web/data /src/web/data
RUN npm run build

FROM node:26-slim
ENV NODE_ENV=production \
    API_PORT=8787 \
    DB_PATH=/data/per-quiz.db
WORKDIR /srv/app
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY app/server ./server
COPY app/shared ./shared
COPY app/scripts/backup.ts ./scripts/backup.ts
COPY --from=build /src/app/dist ./dist
COPY web/data /srv/web/data
RUN mkdir -p /data /backups && chown node:node /data /backups
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:8787/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server/index.ts"]
