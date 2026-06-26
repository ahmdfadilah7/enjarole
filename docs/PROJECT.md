# EnjaRole — Panduan Proyek

Dokumen ini menjelaskan teknologi, tema UI, plugin, struktur kode, dan konvensi pengembangan agar siapa pun (termasuk Cursor AI di device lain setelah `git pull`) dapat melanjutkan proyek dengan alur yang sama.

---

## 1. Tentang Proyek

**EnjaRole** adalah jejaring sosial berbasis karakter roleplay: **1 akun = 1 karakter**. Interaksi publik bersifat in-character (IC). Email/password hanya untuk autentikasi.

- Bahasa UI: **Bahasa Indonesia** (`lang="id"`)
- Identitas publik: `@username`
- Repo: monorepo ringan — **backend** dan **frontend** adalah proyek npm terpisah (tidak ada root `package.json`)

---

## 2. Tech Stack

| Lapisan | Teknologi | Versi (package.json) |
|---------|-----------|----------------------|
| Frontend framework | Vue 3 + TypeScript | `vue ^3.5.13` |
| Build tool | Vite | `^6.1.0` |
| State management | Pinia | `^2.3.1` |
| Routing | Vue Router | `^4.5.0` |
| HTTP client | Axios | `^1.7.9` |
| Styling | Tailwind CSS v4 | `^4.0.6` via `@tailwindcss/vite` |
| Real-time | socket.io-client | `^4.8.1` |
| Backend framework | NestJS | `^11.0.0` |
| ORM | Prisma | `^6.4.0` |
| Database | PostgreSQL 16 | Docker |
| Cache | Redis 7 | Docker |
| Object storage | MinIO (dev) / S3 (prod) | AWS SDK `^3.750.0` |
| WebSocket server | Socket.io (NestJS gateway) | `^4.8.1` |
| Auth | JWT access + refresh, Passport | bcrypt cost 12 |
| Validasi DTO | class-validator + class-transformer | |
| API docs | Swagger | `/api/docs` |

**Node.js:** 20+

---

## 3. Plugin & Library Khusus

### Frontend

| Package | Fungsi |
|---------|--------|
| `@tailwindcss/vite` | Integrasi Tailwind v4 ke Vite (tanpa `tailwind.config.js`) |
| `@vitejs/plugin-vue` | SFC Vue 3 |
| `@heroicons/vue` | Ikon outline (navigasi, tombol, dll.) |
| `@headlessui/vue` | Terpasang, **belum dipakai** di `src/` — prefer pola CSS `neo-*` yang ada |
| `@mediapipe/tasks-vision` | Face Landmarker untuk efek AR wajah di kamera |
| `@dicebear/core` + `@dicebear/collection` | Generator avatar ilustrasi **Adventurer** (efek kartun kamera) |
| `scripts/copy-mediapipe-wasm.mjs` | Menyalin WASM MediaPipe ke `public/mediapipe/wasm/` saat `postinstall` / `dev` / `build` |

### Backend

| Package | Fungsi |
|---------|--------|
| `@nestjs/swagger` | Dokumentasi API |
| `@nestjs/throttler` | Rate limit global (100 req/menit) |
| `@nestjs/schedule` | Cron hapus story kedaluwarsa |
| `@nestjs/websockets` + `@nestjs/platform-socket.io` | Gateway real-time |
| `ioredis` | Presence online, typing indicator |
| `uuid` | Key unik upload MinIO |

### Infrastruktur

| File | Fungsi |
|------|--------|
| `docker-compose.yml` | Dev: Postgres, Redis, MinIO + init bucket |
| `docker-compose.prod.yml` | Prod: infra + backend + frontend nginx + reverse proxy |
| `deploy/nginx/enjarole.conf` | Routing prod: `/`, `/api/`, `/socket.io/`, `/media/` |
| `.github/workflows/ci.yml` | CI: backend build + frontend build (Node 20) |

---

## 4. Tema & Desain UI

### Gaya: Neobrutalism

Desain sistem bernama **`neo-*`** — kesan playful, tegas, Instagram-adjacent dengan sentuhan kartun.

**File utama tema:** `frontend/src/style.css`

### Token warna (`@theme` di style.css)

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `neo-black` | `#0a0a0a` | Border, teks, shadow |
| `neo-bg` | `#fff9e6` | Background krem + dot grid |
| `neo-cream` | `#fff3d4` | Variasi permukaan |
| `neo-surface` | `#ffffff` | Kartu, modal |
| `neo-yellow` | `#ffe066` | Header, highlight nav |
| `neo-pink` | `#ff6b9d` | Aksen |
| `neo-blue` | `#74c0fc` | Aksen |
| `neo-purple` | `#b197fc` | Aksen |
| `primary-500` | `#3ddc78` | Tombol utama, CTA hijau |

### Tipografi & layout

- Font: **Space Grotesk** (Google Fonts)
- Lebar feed: `--width-feed: 470px`
- Sidebar: `244px` / collapsed `72px`
- Mobile: safe-area inset, bottom nav `4.25rem`

### Pola visual wajib

- Border **`3px`** hitam (`border-neo-black`)
- Shadow offset: `box-shadow: 4px 4px 0 0 #0a0a0a` (kelas `neo-shadow`, `card`, `btn-primary`)
- Background body: dot grid `radial-gradient` 24×24px

### Kelas komponen umum (gunakan ulang, jangan buat gaya baru)

```
page-bg, auth-bg, neo-deco, neo-shadow, card, btn-primary, btn-secondary
neo-modal, neo-avatar, neo-bubble-sent, neo-bubble-received
story-ring, camera-*, feed-*
```

**Aturan:** komponen baru harus memakai token `neo-*` / `primary-*` dan pola border+shadow yang sudah ada. Jangan menambah library UI baru tanpa alasan kuat.

---

## 5. Struktur Folder

```
EnjaRole/
├── backend/
│   ├── prisma/              # schema, migrations, seed.ts
│   └── src/
│       ├── auth/
│       ├── characters/
│       ├── posts/
│       ├── social/
│       ├── stories/
│       ├── messaging/
│       ├── notifications/
│       ├── media/
│       ├── events/          # WebSocket gateway
│       ├── common/          # guards, decorators, cors-origin, types
│       ├── prisma/
│       └── redis/
├── frontend/
│   └── src/
│       ├── api/             # axios client
│       ├── components/      # Vue SFC (PascalCase)
│       ├── composables/     # useXxx.ts
│       ├── data/            # cameraFilters, cameraFaceEffects, emojis
│       ├── layouts/         # AppLayout.vue
│       ├── router/
│       ├── stores/          # Pinia
│       ├── types/           # TypeScript interfaces terpusat
│       ├── utils/
│       └── views/
├── docs/                    # Dokumentasi proyek
├── deploy/                  # Nginx, skrip deploy
└── .cursor/rules/           # Aturan Cursor AI (ikut di git)
```

---

## 6. Konvensi Kode

### Backend (NestJS)

1. **Satu fitur = satu modul** (`module` → `controller` → `service` → DTO)
2. DTO dengan `class-validator` + `@ApiProperty` Swagger
3. DB: **snake_case** (`@map` di Prisma); TypeScript: **camelCase**
4. Response karakter publik: selalu lewat `toPublicCharacter()` — jangan bocorkan email/password/refreshToken
5. Guard: `JwtAuthGuard` (wajib login), `OptionalJwtAuthGuard` (feed publik + opsional auth)
6. Decorator: `@CurrentUser()`, `@OptionalCurrentUser()`
7. Soft delete: `deletedAt` pada post/komentar
8. Pagination feed: **cursor-based** (bukan offset)
9. Prefix API global: `/api`
10. Perubahan schema: buat migration Prisma, jangan edit DB manual

### Frontend (Vue 3)

1. **Composition API** + `<script setup lang="ts">` — tidak pakai Options API
2. Composable: `useNamaFitur.ts` di `composables/`
3. Komponen: `PascalCase.vue` di `components/`
4. Tipe: pusatkan di `types/index.ts`
5. API: pakai `api/client.ts` (axios + auto refresh token)
6. Error user-facing: `getApiErrorMessage()` dari `utils/errors.ts` (Bahasa Indonesia)
7. Socket: `useSocket.ts` — namespace `/events`, path `/socket.io`
8. State global: Pinia stores (`auth`, `notifications`, dll.)
9. Route profil: `/@:username`, post: `/@:username/p/:postId`
10. **Minimalkan scope diff** — ikuti pola file sekitar, jangan over-engineer

### Penamaan

| Area | Pola | Contoh |
|------|------|--------|
| Tabel DB | snake_case plural | `conversation_members` |
| Model Prisma | PascalCase | `ConversationMember` |
| Redis key | `prefix:{id}` | `presence:{characterId}` |
| Upload MinIO | `uploads/{uuid}.{ext}` | |
| CSS design | prefix `neo-` | `neo-modal` |
| Socket namespace | `/events` | |

---

## 7. Fitur yang Sudah Dibangun

### Inti sosial
- Registrasi/login karakter (bio, backstory, personality traits)
- Feed `following` / `explore` dengan infinite scroll
- Post teks + multi-gambar, like, komentar, emoji picker
- Profil `/@username`, follow/unfollow, daftar follower
- Story 24 jam: gambar / video / teks, story ring, `StoryViewer`

### Pesan & notifikasi
- DM 1:1, typing indicator, read receipt
- Presence online (Redis TTL 300s)
- Notifikasi real-time: like, comment, follow, message

### Media
- Upload via presigned URL MinIO → simpan `publicUrl` di post/story/avatar

### Kamera (`CameraCaptureModal.vue`)
- Mode foto & video, flip kamera depan/belakang
- Filter Instagram-style (`data/cameraFilters.ts`)
- Efek AR wajah MediaPipe (`data/cameraFaceEffects.ts`): doodle, neon, glitter, kacamata, telinga kelinci/kucing, mahkota, dll.
- **Efek Adventurer (kartun):** sampling warna wajah → DiceBear Adventurer SVG → PNG (`utils/adventurerAvatarGenerator.ts`, `composables/useCartoonGenerator.ts`)
  - Hanya mode **Foto** (disembunyikan di mode video)
  - Overlay blocking saat proses generate
  - Preview Gunakan/Ulangi; video element tetap di DOM saat retake

---

## 8. Setup Development

### Prasyarat
- Node.js 20+, Docker, npm

### Langkah

```bash
# 1. Infra
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run prisma:seed    # opsional: data demo (password Demo1234!)
npm run start:dev

# 3. Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Port & URL

| Layanan | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MinIO API | localhost:9000 (konsol :9001) |

### Environment

**Backend** (`backend/.env` — salin dari `.env.example`):
- `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `MINIO_*`
- `CORS_ORIGIN` — di dev, origin LAN otomatis diizinkan (`common/cors-origin.ts`)
- `MINIO_PUBLIC_URL` — untuk media bisa diakses device lain

**Frontend** (`frontend/.env`):
- `VITE_API_URL` — default `/api` (proxy Vite) cukup untuk dev
- `VITE_WS_URL` — **kosongkan di dev LAN** agar pakai origin halaman + proxy Vite

### Akses dari device lain (LAN)

1. Vite: `host: true` + proxy `/api` dan `/socket.io`
2. Backend: listen `0.0.0.0`
3. Buka `http://<IP-PC>:5173` dari HP/laptop di WiFi sama
4. Set `MINIO_PUBLIC_URL=http://<IP-PC>:9000/enjarole-media` di backend `.env`
5. Izinkan port **5173** (dan **9000** untuk gambar) di Windows Firewall
6. **Catatan:** kamera di HP via HTTP sering diblokir browser; upload file tetap jalan

---

## 9. WebSocket

| Event | Arah | Deskripsi |
|-------|------|-----------|
| `message:new` | Server → Client | Pesan DM baru |
| `message:read` | Dua arah | Read receipt |
| `notification:new` | Server → Client | Notifikasi baru |
| `typing:start` / `typing:stop` | Client ↔ Server | Indikator mengetik |
| `presence:online` / `offline` | Server → Client | Status online |

- Gateway: `backend/src/events/events.gateway.ts`
- Client: `frontend/src/composables/useSocket.ts`
- Auth socket: JWT di `handshake.auth.token`
- Room: `character:{characterId}`

---

## 10. Dokumentasi Terkait

| File | Isi |
|------|-----|
| [architecture.md](./architecture.md) | Arsitektur, ERD, keputusan desain |
| [api-contract.yaml](./api-contract.yaml) | Kontrak OpenAPI |
| [wireframes.md](./wireframes.md) | Wireframe UI |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy VPS Hostinger, nginx, SSL |
| [../.cursor/rules/](../.cursor/rules/) | Aturan Cursor AI (ikut commit ke git) |

---

## 11. Melanjutkan di Device Lain

Setelah `git pull`:

```bash
docker compose up -d
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run start:dev
cd frontend && npm install && npm run dev
```

1. Salin `.env` secara manual (file `.env` **tidak** di-commit — buat dari `.env.example`)
2. Cursor akan memuat aturan dari `.cursor/rules/` otomatis
3. Baca dokumen ini + `architecture.md` sebelum menambah fitur besar
4. Ikuti konvensi di bagian 6 — jangan ubah pola tanpa diskusi

### Prinsip pengembangan (untuk manusia & AI)

- **Minimize scope** — diff kecil, fokus pada task
- **Reuse** — kelas `neo-*`, composable, service yang sudah ada
- **Bahasa Indonesia** untuk teks UI dan pesan error user
- **Tidak over-engineer** — hindari abstraksi untuk 1–2 baris kode
- **Migration Prisma** untuk setiap perubahan schema
- **Jangan commit** `.env`, `node_modules`, `dist`

---

## 12. Seed Data Demo

```bash
cd backend && npm run prisma:seed
```

Akun demo dengan password `Demo1234!` — lihat `prisma/seed.ts` untuk username.
