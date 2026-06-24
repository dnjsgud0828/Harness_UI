# 폐쇄망 전제: 사내 미러 레지스트리 사용 권장.
# 단계: deps → builder → runner (next.js standalone)
ARG NODE_IMAGE=node:22-alpine
ARG PY_IMAGE=python:3.13-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=optional

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN apk add --no-cache python3 py3-pip
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 하네스 설정 트리는 호스트 볼륨으로 마운트 (~/.claude/skills → /opt/harness-config)
ENV HARNESS_SKILLS_DIR=/opt/harness-config

EXPOSE 3000
CMD ["node", "server.js"]
