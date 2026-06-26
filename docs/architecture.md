# EnjaRole — Architecture Document

## Overview

EnjaRole is a character-based social network where each account represents a single roleplay character. All public interactions are in-character (IC). Email/password exist only for authentication.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Vite, TypeScript, Pinia, Tailwind CSS |
| Backend | NestJS, TypeScript, Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Storage | MinIO (dev) / S3 (prod) |
| Real-time | Socket.io |
| Auth | JWT (access + refresh) |

## Entity Relationship

```
Character (1) ──< Post
Character (1) ──< Story
Character (1) ──< Comment
Character (1) ──< Like
Character (M) ──< Follow >── (M) Character
Character (M) ──< ConversationMember >── (M) Conversation
Conversation (1) ──< Message
Character (1) ──< Notification
```

## Design Decisions

1. **1 account = 1 character** — User and Character merged into single `Character` entity
2. **Username as identity** — `@username` is the public handle
3. **Feed modes** — `following` (default) and `explore` (all public posts)
4. **Soft delete** — Posts and comments use `deletedAt` flag
5. **Cursor pagination** — Stable infinite scroll for feeds

## Module Structure (Backend)

- `auth` — Register, login, JWT refresh
- `characters` — Profile CRUD, public profile view
- `posts` — Post CRUD, like, comment
- `social` — Follow/unfollow, feed aggregation
- `stories` — 24h ephemeral stories
- `messaging` — DM conversations, WebSocket gateway
- `notifications` — Push notifications via WebSocket
- `media` — Presigned upload URLs to MinIO/S3

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:new` | Server → Client | New DM received |
| `message:read` | Bidirectional | Read receipt |
| `notification:new` | Server → Client | New notification |
| `typing:start` | Client → Server → Client | Typing indicator |
| `typing:stop` | Client → Server → Client | Stop typing |
| `presence:online` | Server → Client | Character came online |
| `presence:offline` | Server → Client | Character went offline |
