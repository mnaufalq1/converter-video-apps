FROM node:22-alpine

# 1. Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# 2. Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 3. Copy file package
COPY package.json pnpm-lock.yaml* ./

# 4. Konfigurasi pnpm agar tidak memblokir build script dependency
RUN pnpm config set build-suppress-pnpm-version-warning true
RUN pnpm install --no-frozen-lockfile --ignore-scripts=false

# 5. Copy seluruh kode backend
COPY . .

# 6. Build aplikasi NestJS
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/main"]