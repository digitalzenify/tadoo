# Tadoo

Tadoo is an open source, calm task workspace designed for short attention spans. This repository now contains a connected frontend PWA and a persistence-backed API for personal use, multi-device sync, AI providers, and Hermes automation.

## Included

- Focused Today, Inbox, and Upcoming views
- SQLite task persistence with projects, priorities, durations, due dates, notes, subtasks, and completion state
- Email/password authentication with 30-day sessions
- Personal API keys for Hermes agents and other automations
- CRUD task API
- Ramble endpoint accepting text or base64 audio
- Groq Whisper transcription when `GROQ_API_KEY` is configured
- OpenCode Go-compatible task parsing, breakdown, and duration estimation
- Hindsight context retrieval before AI operations
- Reminder CRUD endpoints
- Local auto-scheduler with priority, duration, focus blocks, and replanning
- Dark mode, responsive mobile UI, PWA manifest, and service worker
- Production Docker image for the frontend and a separate API image

## Run locally

```bash
npm install
cp .env.example .env
npm run dev:api
npm run dev
```

The frontend runs on `http://localhost:5173`. The API runs on `http://localhost:8787`.

Build and test:

```bash
npm run test
npm run build
```

## API quick start

Register and store the returned token:

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"use-a-long-password"}'
```

Create, read, edit, and delete tasks with either the session token or a personal API key:

```bash
curl -X POST http://localhost:8787/api/tasks \
  -H "Authorization: Bearer $TADOO_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title":"Write the project brief","priority":1,"durationMinutes":30}'

curl http://localhost:8787/api/tasks -H "Authorization: Bearer $TADOO_TOKEN"
curl -X PATCH http://localhost:8787/api/tasks/TASK_ID -H "Authorization: Bearer $TADOO_TOKEN" -H 'content-type: application/json' -d '{"completed":true}'
curl -X DELETE http://localhost:8787/api/tasks/TASK_ID -H "Authorization: Bearer $TADOO_TOKEN"
```

Create a key for a Hermes agent. The raw key is returned only once:

```bash
curl -X POST http://localhost:8787/api/auth/api-key \
  -H "Authorization: Bearer $TADOO_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Hermes desktop"}'
```

Use it as `X-Tadoo-API-Key` for agent requests. Key permissions currently match the owning user. It is intentionally scoped to task and scheduling operations by the API surface, not arbitrary database access.

Important endpoints:

- `POST /api/ramble`, body `{ "text": "..." }` or `{ "audioBase64": "...", "mimeType": "audio/webm" }`
- `POST /api/tasks/:id/breakdown`
- `POST /api/tasks/:id/estimate`
- `GET /api/schedule/day`
- `POST /api/schedule/replan`, optional `{ "focusBlocks": [{ "start": "09:00", "end": "12:00" }], "reason": "fell behind" }`
- `GET /api/reminders`
- `POST /api/tasks/:id/reminders`, body `{ "remindAt": "2026-09-23T14:00:00Z" }`

## Provider configuration

All secrets remain server-side in `.env`:

- `OPENCODE_API_KEY`, `OPENCODE_BASE_URL`, and `OPENCODE_MODEL`
- `GROQ_API_KEY` and `GROQ_WHISPER_MODEL`
- `HINDSIGHT_URL`, `HINDSIGHT_API_KEY`, and `HINDSIGHT_BANK`

Every AI provider has a local fallback, so the API remains usable without external credentials. The local scheduler is deterministic and does not require an LLM.

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The web container is exposed on port `8080`, the API on port `8787`, and SQLite data is kept in the named `tadoo-data` volume.

## Container images

Every push to `main` runs `verify` (tests and frontend build) and then publishes two images to GitHub Container Registry:

- `ghcr.io/digitalzenify/tadoo-web`, the built PWA served by nginx on port 80
- `ghcr.io/digitalzenify/tadoo-api`, the Node API on port 8787

The web image bakes its API base URL in at build time from the repository variable `VITE_API_URL`. To point the frontend at a different API host, set that variable and re-run the publish workflow.

```bash
docker pull ghcr.io/digitalzenify/tadoo-web:main
docker pull ghcr.io/digitalzenify/tadoo-api:main
```

Deploying the API needs `DATA_DIR` pointed at a mounted volume, since the SQLite file lives there, and `CORS_ORIGIN` set to the exact web origin. Provider keys stay optional: with none configured, the API answers from its local fallbacks.

Tag a release to publish versioned tags as well:

```bash
git tag v0.1.0 && git push origin v0.1.0
```
