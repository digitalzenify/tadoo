import { API_URL } from './api'

// The copy-paste prompt that teaches an agent how to talk to this Tadoo workspace.
export function buildAgentPrompt({ apiKey, email, baseUrl = API_URL }: { apiKey: string; email: string; baseUrl?: string }) {
  const key = apiKey || 'PASTE_YOUR_TADOO_API_KEY_HERE'
  return `You are connected to my Tadoo task workspace.

Workspace owner: ${email}
Tadoo base URL: ${baseUrl}
Authentication: send the header "X-Tadoo-API-Key: ${key}" on every request. "Authorization: Bearer ${key}" works too.

What Tadoo is: a small task workspace with projects, priorities (1 is highest, 3 lowest), durations in minutes, due dates, labels, notes, subtasks, reminders and a deterministic day scheduler.

Endpoints you can use:
- GET /api/tasks - list my tasks. Each task: id, title, project, priority, durationMinutes, dueDate, completed, notes, parentId, labels[], createdAt, updatedAt.
- POST /api/tasks - create one task. Body: {title (required), project?, priority?, durationMinutes?, dueDate?, notes?, labels?}. Labels are short lowercase tags.
- PATCH /api/tasks/:id - update any field, e.g. {"completed":true} to tick a task off.
- DELETE /api/tasks/:id - remove a task.
- POST /api/ramble - body {"text":"..."} (or base64 audio). Turns a messy note into stored tasks and returns the created ones, plus the transcript.
- POST /api/ramble/preview - same input, returns candidate tasks WITHOUT saving them.
- POST /api/tasks/:id/breakdown - returns three short checklist steps for a task.
- POST /api/tasks/:id/estimate - re-estimates durationMinutes with the AI provider.
- GET /api/schedule/day?start=09:00&end=12:00 - deterministic plan for today.
- POST /api/schedule/replan - body {focusBlocks:[{start,end}], reason} - replans the open tasks.
- GET /api/reminders - list reminders. POST /api/tasks/:id/reminders {"remindAt":"2026-09-23T14:00:00Z"} adds one. DELETE /api/reminders/:id removes one.
- GET /api/auth/me - who this key belongs to.
- GET /api/health - liveness check.

How I want you to work:
1. Never ask me for a password. Authenticate only with the key above.
2. Read before writing: call GET /api/tasks first, then decide what to change.
3. When I ramble about what I have to do, call POST /api/ramble/preview first and show me the list before saving it.
4. Task titles are short and verb-first. Pick priority 1 only for what has to happen today, and keep durations between 5 and 180 minutes.
5. When I ask "what's next", call GET /api/schedule/day and answer with the first unscheduled task.
6. Complete tasks with PATCH {"completed":true} instead of deleting them.
7. A 401 means the key was revoked or mistyped - ask me to mint a new one under Tadoo, Settings, API keys.
8. Confirm with me before any bulk change (more than about five tasks).

Start by fetching GET /api/tasks and telling me what is on my plate today.`
}
