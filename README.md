# EnjaRole

Character-based social network — every account is a roleplay character. Built with Vue 3 + NestJS.

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

API: http://localhost:3000/api  
Swagger: http://localhost:3000/api/docs

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:5173

## Project Structure

```
EnjaRole/
├── docs/           # Architecture, API contract, wireframes
├── backend/        # NestJS API
├── frontend/       # Vue 3 SPA
└── docker-compose.yml
```

## Documentation

- **[Panduan Proyek](docs/PROJECT.md)** — teknologi, tema UI, plugin, konvensi kode, setup LAN (baca ini saat melanjutkan di device lain)
- [Architecture](docs/architecture.md)
- [API Contract (OpenAPI)](docs/api-contract.yaml)
- [Wireframes](docs/wireframes.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Melanjutkan di Device Lain

```bash
git pull
docker compose up -d
cd backend && cp .env.example .env   # sesuaikan jika belum ada .env
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run start:dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

Aturan Cursor AI ada di `.cursor/rules/` dan ikut ter-commit ke git.
