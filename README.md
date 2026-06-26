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

- [Architecture](docs/architecture.md)
- [API Contract (OpenAPI)](docs/api-contract.yaml)
- [Wireframes](docs/wireframes.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
