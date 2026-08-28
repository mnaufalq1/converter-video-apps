# 1. Base image dengan Node.js & Alpine Linux (ringan)
FROM node:22-alpine

# 2. Install FFmpeg di dalam container server
RUN apk add --no-cache ffmpeg

# 3. Tentukan working directory
WORKDIR /app

# 4. Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 5. Salin package.json dan pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 6. Install dependencies
RUN pnpm install --frozen-lockfile
RUN pnpm approve-builds unrs-resolver ffmpeg-static

# 7. Salin seluruh source code backend
COPY . .

# 8. Build projek NestJS
RUN pnpm build

# 9. Expose port (default NestJS biasanya 3000)
EXPOSE 3000

# 10. Jalankan aplikasi hasil build
CMD ["node", "dist/main"]