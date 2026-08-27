# Web Aplikasi Pengonversi Video ke MP3

Membuat web aplikasi pengonversi video ke MP3 menggunakan Next.js dan Nest.js. Aplikasi ini akan memiliki fitur upload video, konversi ke MP3, dan download hasil konversi.

## Struktur Proyek

```
converter-video-apps/
├── api/  # Backend Nest.js
│   ├── src/
│   │   ├── compress/
│   │   └── ...
│   ├── temp/           # File video sementara (Dihapus saat restart)
│   ├── temp_raw/       # File video mentah (Dihapus saat restart)
│   └── ...
├── web/  # Frontend Next.js
│   ├── app/
│   │   ├── page.tsx
│   │   └── ...
│   └── ...
└── ...
```

## Setup

### Backend (Nest.js)

1. Masuk ke direktori backend:
```bash
cd api
```

2. Install dependencies:
```bash
pnpm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```

4. Isi environment variables di .env:
```env
PORT=3000
FFMPEG_PATH=C:\Users\HP\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

5. Jalankan server:
```bash
pnpm start:dev
```

### Frontend (Next.js)

1. Masuk ke direktori frontend:
```bash
cd web
```

2. Install dependencies:
```bash
pnpm install
```

3. Setup environment variables:
```bash
cp .env.local.example .env.local
```

4. Isi environment variables di .env.local:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

5. Jalankan server:
```bash
pnpm dev
```

## Akses Aplikasi

Buka browser dan akses: http://localhost:3001