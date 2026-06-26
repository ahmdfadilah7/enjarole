# Deployment Guide — EnjaRole

## Prerequisites

- **Hostinger VPS** (disarankan KVM 2+ — Node.js, Docker, WebSocket, PostgreSQL)
- Domain: `enjarole.hachiedigitation.com` → A record ke IP VPS
- Git, Docker & Docker Compose di server

> **Catatan:** Shared hosting Hostinger (tanpa VPS) **tidak** cocok untuk stack ini (NestJS + PostgreSQL + Redis + WebSocket).

---

## Local Development

```bash
docker compose up -d

cd backend && cp .env.example .env && npm install
npx prisma migrate deploy && npm run start:dev

cd frontend && cp .env.example .env && npm install && npm run dev
```

---

## Production — Hostinger VPS

Target URL: **https://enjarole.hachiedigitation.com**

### Arsitektur

```
Internet → Nginx (80/443)
            ├── /           → Frontend (Vue static)
            ├── /api/       → Backend (NestJS)
            ├── /socket.io/ → WebSocket (pesan real-time)
            └── /media/     → MinIO (upload gambar/video)
         Postgres + Redis + MinIO (internal Docker network)
```

### 1. DNS di Hostinger

Di panel DNS domain `hachiedigitation.com`:

| Type | Name    | Value        | TTL |
|------|---------|--------------|-----|
| A    | enjarole | IP_VPS_ANDA | 300 |

Tunggu propagasi DNS (5–30 menit).

### 2. Setup awal VPS (sekali)

SSH ke VPS:

```bash
ssh root@IP_VPS_ANDA
```

Jalankan script setup (install Docker, firewall):

```bash
git clone https://github.com/USERNAME/EnjaRole.git
cd EnjaRole
sudo bash deploy/scripts/setup-hostinger.sh
```

### 3. Konfigurasi environment

```bash
cp deploy/.env.production.example .env.production
nano .env.production
```

**Wajib diganti:**

- `POSTGRES_PASSWORD` — password database kuat
- `JWT_SECRET` & `JWT_REFRESH_SECRET` — generate: `openssl rand -base64 48`
- `MINIO_ACCESS_KEY` & `MINIO_SECRET_KEY` — kredensial MinIO production

Pastikan URL sudah benar:

```env
CORS_ORIGIN=https://enjarole.hachiedigitation.com
VITE_API_URL=https://enjarole.hachiedigitation.com/api
VITE_WS_URL=https://enjarole.hachiedigitation.com
MINIO_PUBLIC_URL=https://enjarole.hachiedigitation.com/media
```

### 4. Deploy pertama (HTTP)

Sebelum SSL, gunakan config HTTP:

```bash
cp deploy/nginx/enjarole.http.conf deploy/nginx/enjarole.conf
bash deploy/scripts/deploy.sh
```

Cek: `http://enjarole.hachiedigitation.com` harus menampilkan halaman login.

### 5. Pasang SSL (Let's Encrypt)

```bash
# Install certbot di host (bukan container)
sudo apt-get install -y certbot

# Minta sertifikat (nginx harus sudah jalan di port 80)
sudo certbot certonly --webroot \
  -w "$(pwd)/deploy/certbot/www" \
  -d enjarole.hachiedigitation.com \
  --email email@anda.com \
  --agree-tos \
  --no-eff-email

# Ganti dari config HTTP ke HTTPS (file enjarole.conf di repo sudah berisi SSL)
# Jika deploy pertama pakai enjarole.http.conf, salin ulang:
git checkout deploy/nginx/enjarole.conf

docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx
```

Atau salin manual cert ke `deploy/certbot/conf/live/enjarole.hachiedigitation.com/`.

Buka: **https://enjarole.hachiedigitation.com**

### 6. Seed data demo (opsional)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npx prisma db seed
```

Akun demo: `aldric@demo.enjarole` / `Demo1234!`

### 7. Update deploy berikutnya

```bash
git pull
bash deploy/scripts/deploy.sh
```

---

## Perintah berguna

```bash
# Log backend
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# Restart satu service
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend

# Backup database
docker compose -f docker-compose.prod.yml --env-file .env.production exec postgres \
  pg_dump -U enjarole enjarole > backup-$(date +%Y%m%d).sql
```

---

## Alternatif: Railway + Vercel

Jika tidak memakai VPS Hostinger:

### Backend (Railway)

1. Root directory: `backend`
2. Tambah PostgreSQL + Redis
3. Build: `npm run build`
4. Start: `npx prisma migrate deploy && npm run start:prod`

### Frontend (Vercel)

- `VITE_API_URL=https://your-api.railway.app/api`
- `VITE_WS_URL=https://your-api.railway.app`

### Media (S3 / Cloudflare R2)

Ganti MinIO dengan object storage:

```env
MINIO_ENDPOINT=your-account.r2.cloudflarestorage.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_PUBLIC_URL=https://cdn.hachiedigitation.com/enjarole-media
```

---

## Security Checklist

- [ ] Ganti semua secret di `.env.production`
- [ ] HTTPS aktif
- [ ] `CORS_ORIGIN` hanya domain production
- [ ] Firewall: hanya port 22, 80, 443
- [ ] Backup database rutin
- [ ] Rate limiting aktif (`@nestjs/throttler` — 100 req/min)
