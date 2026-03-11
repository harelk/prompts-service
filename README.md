# Prompts Service

A personal Hebrew mobile-first tool for managing AI prompts with voice recording.

## Features

- Create, read, update, delete AI prompts
- Voice recording with automatic Hebrew transcription (OpenAI Whisper)
- AI cleanup and title suggestion (Claude)
- Tag prompts with services (Claude, GPT, Gemini, Midjourney, Cursor, etc.)
- Status workflow: draft / active / done / archived
- RTL Hebrew interface built with React + Tailwind CSS
- Bearer token authentication
- Mobile-first design (max 480px, bottom nav, FAB button)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Fastify 4, TypeScript, Drizzle ORM |
| Database | PostgreSQL 16 (Docker) |
| Frontend | React 18, Vite, Tailwind CSS 3.4, React Router 6 |
| AI | OpenAI Whisper (transcription), Anthropic Claude (cleanup) |
| Dev | concurrently, tsx watch |

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- OpenAI API key (for voice transcription)
- Anthropic API key (for text cleanup)

## Quick Start

```bash
# 1. Clone and enter the project
cd prompts-service

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys and desired AUTH_PASSWORD

# 3. Start PostgreSQL
docker compose up -d

# 4. Install dependencies
npm install

# 5. Push database schema
npm run db:push

# 6. Seed default services (Claude, GPT, Gemini, Midjourney, Cursor)
npm run db:seed

# 7. Start dev servers (API + client concurrently)
npm run dev
```

Then open http://localhost:5176 in your browser.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://prompts:prompts_dev@localhost:5436/prompts_service` |
| `AUTH_PASSWORD` | Bearer token for API authentication | `change-me` |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | required for voice |
| `OPENAI_API_KEY` | OpenAI API key for Whisper | required for voice |
| `CLAUDE_MODEL` | Claude model to use | `claude-sonnet-4-20250514` |
| `PORT` | API server port | `4300` |

## Ports

| Service | Port |
|---|---|
| PostgreSQL | 5436 |
| API server | 4300 |
| Vite dev server | 5176 |

## Scripts

```bash
npm run dev          # Start both server and client in watch mode
npm run db:push      # Push Drizzle schema to database
npm run db:seed      # Seed default services
npm test             # Run API integration tests
npm run build        # Production build
```

## API Reference

All endpoints require `Authorization: Bearer <AUTH_PASSWORD>` except `GET /api/health`.

### Health
```
GET /api/health → { status: "ok", timestamp: "..." }
```

### Services
```
GET    /api/services             → Service[]
POST   /api/services  { name }   → Service (201)
DELETE /api/services/:id         → 204
```

### Prompts
```
GET    /api/prompts?status=draft,active&search=text → Prompt[]
GET    /api/prompts/:id                             → Prompt
POST   /api/prompts { title, content, status?, serviceIds?, rawTranscription? } → Prompt (201)
PATCH  /api/prompts/:id { title?, content?, status?, serviceIds? }              → Prompt
DELETE /api/prompts/:id                             → 204
```

### Voice
```
POST /api/voice/transcribe  multipart (audio file, max 25MB)
→ { rawTranscription, cleanedText, suggestedTitle }
```

Supported audio formats: `audio/webm`, `audio/mp4`, `audio/wav`, `audio/mpeg`

## Error Format

All errors return a consistent envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "statusCode": 400
  }
}
```

## Project Structure

```
prompts-service/
├── package.json              # Root workspace (concurrently)
├── docker-compose.yml        # PostgreSQL 16
├── .env.example
├── shared/
│   └── types.ts              # Shared TypeScript types
├── server/
│   ├── drizzle.config.ts
│   └── src/
│       ├── server.ts         # Entry point
│       ├── app.ts            # Fastify app builder
│       ├── db/               # Drizzle ORM schema + client
│       ├── plugins/          # auth, cors, error-handler, multipart
│       ├── routes/           # health, prompts, services, voice
│       ├── services/         # whisper.ts, claude-cleanup.ts
│       └── tests/            # Integration tests (Node test runner)
└── client/
    └── src/
        ├── api/client.ts     # Typed API client
        ├── hooks/            # usePrompts, useServices, useAuth
        ├── components/       # Layout, BottomNav, AuthGate, etc.
        └── pages/            # PromptsListPage, CreatePromptPage, etc.
```

## Running Tests

Tests require a running PostgreSQL instance.

```bash
npm test
# or from server workspace:
cd server && npx tsx --test src/tests/api.test.ts
```

The test suite covers: health check, authentication, full CRUD for services and prompts, status filtering, and search.

## Voice Recording Flow

1. Browser captures audio via `MediaRecorder` (WebM/Opus)
2. Audio is uploaded to `POST /api/voice/transcribe`
3. Server validates MIME type, sends to OpenAI Whisper (Hebrew language)
4. Raw transcription is captured immediately
5. Claude cleans up the text and suggests a title
6. Frontend pre-fills the form with the cleaned result; raw transcription shown in collapsible
