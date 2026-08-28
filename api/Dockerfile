FROM node:22-alpine

# 1. Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# 2. Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 3. Copy file package & pnpm-lock
COPY package.json pnpm-lock.yaml* ./

# 4. Set environment variable agar pnpm mengizinkan build scripts paket dependency
ENV PNPM_ALLOW_BUILD=unrs-resolver

# 5. Install dependencies
RUN pnpm install --no-frozen-lockfile

# 6. Copy seluruh kode backend
COPY . .

# 7. Build aplikasi NestJS
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/main"]