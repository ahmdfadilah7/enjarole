# Deployment Guide

## Prerequisites

- Docker Desktop (local development)
- Node.js 20+
- Railway/Render account (backend)
- Vercel/Netlify account (frontend)
- Managed PostgreSQL + Redis (production)

## Local Development

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev

# 3. Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Production Deployment

### Backend (Railway)

1. Create new project, connect GitHub repo
2. Set root directory: `backend`
3. Add PostgreSQL and Redis plugins
4. Set environment variables from `.env.example`
5. Build command: `npm run build`
6. Start command: `npx prisma migrate deploy && npm run start:prod`

### Frontend (Vercel)

1. Import repo, set root directory: `frontend`
2. Framework: Vite
3. Environment variables:
   - `VITE_API_URL=https://your-api.railway.app/api`
   - `VITE_WS_URL=https://your-api.railway.app`
4. Deploy

### Media Storage (Production)

Replace MinIO with AWS S3 or Cloudflare R2:

```
MINIO_ENDPOINT=your-bucket.s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=enjarole-media
MINIO_PUBLIC_URL=https://your-cdn.com/enjarole-media
```

## Security Checklist

- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to long random strings
- [ ] Enable HTTPS everywhere
- [ ] Set restrictive CORS origin
- [ ] Use managed database with backups
- [ ] Rate limiting is enabled via `@nestjs/throttler` (100 req/min)
