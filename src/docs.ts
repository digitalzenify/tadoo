import { API_URL } from './api'

// Single source of truth for the documented API surface. Keep it in step with
// server/index.mjs and with the README endpoint list.
export const API_DOC_GROUPS: Array<{ group: string; blurb: string; items: Array<{ method: string; path: string; summary: string; body?: string }> }> = [
  {
    group: 'Authentication',
    blurb: 'Every task, settings and AI endpoint needs a credential. Sessions come from signing in. Agents use a personal API key sent as X-Tadoo-API-Key.',
    items: [
      { method: 'POST', path: '/api/auth/register', summary: 'Create an account. Requires the workspace sign-up code when one is configured.', body: '{"email":"you@example.com","password":"at-least-8-chars","signupCode":"optional"}' },
      { method: 'POST', path: '/api/auth/login', summary: 'Exchange email and password for a 30-day session token.', body: '{"email":"you@example.com","password":"..."}' },
      { method: 'POST', path: '/api/auth/logout', summary: 'Revoke the current session token.' },
      { method: 'GET', path: '/api/auth/me', summary: 'The account behind the credential in use.' },
      { method: 'GET', path: '/api/auth/config', summary: 'Public auth config, currently whether a sign-up code is required.' },
      { method: 'GET', path: '/api/keys', summary: 'List your API keys. Only names and creation dates exist server side.' },
      { method: 'POST', path: '/api/keys', summary: 'Mint an API key. The raw key is returned once and stored only as a hash.', body: '{"name":"Hermes agent"}' },
      { method: 'DELETE', path: '/api/keys/:id', summary: 'Revoke an API key immediately.' },
    ],
  },
  {
    group: 'Tasks',
    blurb: 'Tasks carry a project, a priority (1 highest, 3 lowest), a duration, an optional due date, notes, labels and a completion flag.',
    items: [
      { method: 'GET', path: '/api/tasks', summary: 'All tasks for the authenticated user, ordered by open first, then due date, priority and recency.' },
      { method: 'POST', path: '/api/tasks', summary: 'Create a task. Title is required; everything else has a sensible default.', body: '{"title":"Write the brief","project":"Work","priority":1,"durationMinutes":30,"dueDate":"2026-09-24","labels":["deep-work"]}' },
      { method: 'PATCH', path: '/api/tasks/:id', summary: 'Update any subset of fields, including {"completed":true}.' },
      { method: 'DELETE', path: '/api/tasks/:id', summary: 'Delete a task. Returns 204.' },
    ],
  },
  {
    group: 'Capture and AI',
    blurb: 'Text or recorded audio becomes tasks. Every AI call has a deterministic local fallback, so the API stays useful without provider credentials.',
    items: [
      { method: 'POST', path: '/api/ramble', summary: 'Turn a messy note into stored tasks. Accepts text or base64 audio.', body: '{"text":"dentist tuesday, renew passport, call dad"}' },
      { method: 'POST', path: '/api/ramble/preview', summary: 'Same input, returns candidate tasks without saving them.' },
      { method: 'POST', path: '/api/tasks/:id/breakdown', summary: 'Three short checklist steps for one task.' },
      { method: 'POST', path: '/api/tasks/:id/estimate', summary: 'Re-estimate the duration with the configured provider.' },
    ],
  },
  {
    group: 'Planning and reminders',
    blurb: 'The scheduler is local and deterministic, so plans are reproducible without an LLM.',
    items: [
      { method: 'GET', path: '/api/schedule/day', summary: 'Plan for a day. Pass start and end query parameters for the focus block, or date for the label.' },
      { method: 'POST', path: '/api/schedule/replan', summary: 'Replan the open tasks, optionally with custom focus blocks and a reason.', body: '{"focusBlocks":[{"start":"09:00","end":"12:00"}],"reason":"fell behind"}' },
      { method: 'GET', path: '/api/reminders', summary: 'List reminders with their task titles.' },
      { method: 'POST', path: '/api/tasks/:id/reminders', summary: 'Add a reminder.', body: '{"remindAt":"2026-09-23T14:00:00Z"}' },
      { method: 'DELETE', path: '/api/reminders/:id', summary: 'Remove a reminder.' },
    ],
  },
  {
    group: 'Workspace',
    blurb: 'Settings are per account: appearance, text size and the AI provider credentials used for your AI calls.',
    items: [
      { method: 'GET', path: '/api/settings', summary: 'Your settings with secrets masked, plus whether each provider is configured and from where.' },
      { method: 'PUT', path: '/api/settings', summary: 'Merge a settings patch. Send null to clear a stored secret, or omit a field to keep it.', body: '{"theme":"dark","textSize":"large","opencodeApiKey":"sk-..."}' },
      { method: 'GET', path: '/api/health', summary: 'Unauthenticated liveness probe.' },
    ],
  },
]

export const CURL_EXAMPLE = `# list your tasks with an API key
curl ${API_URL}/api/tasks -H 'X-Tadoo-API-Key: $TADOO_API_KEY'

# capture a ramble
curl -X POST ${API_URL}/api/ramble \\
  -H 'X-Tadoo-API-Key: $TADOO_API_KEY' \\
  -H 'content-type: application/json' \\
  -d '{"text":"renew the passport, book the dentist, call dad"}'

# what is planned for today
curl '${API_URL}/api/schedule/day?start=09:00&end=12:00' -H 'X-Tadoo-API-Key: $TADOO_API_KEY'`
