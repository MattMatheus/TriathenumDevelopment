FROM node:22-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

ENV PORT=4174
ENV HOST=0.0.0.0
EXPOSE 4174

CMD ["pnpm", "exec", "tsx", "server/index.ts"]
