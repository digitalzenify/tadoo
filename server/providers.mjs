import { estimateDuration, splitTask } from './domain.mjs'

const jsonHeaders = { 'Content-Type': 'application/json' }
async function safeJson(response) { const text = await response.text(); try { return JSON.parse(text) } catch { return { text } } }

export async function askOpenCode(messages, fallback, config = {}) {
  const base = config.baseUrl || 'https://api.opencode.ai/v1'
  const key = config.apiKey
  if (!key) return fallback()
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { ...jsonHeaders, Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: config.model || 'opencode-go', messages, temperature: 0.2 }) })
    if (!response.ok) throw new Error(`OpenCode returned ${response.status}`)
    const result = await safeJson(response); return result.choices?.[0]?.message?.content || fallback()
  } catch (error) { console.warn('[provider:opencode]', error.message); return fallback() }
}

export async function transcribeGroq(audioBase64, mimeType = 'audio/webm', config = {}) {
  if (!config.apiKey) return null
  const binary = Buffer.from(audioBase64, 'base64')
  const form = new FormData(); form.append('file', new Blob([binary], { type: mimeType }), 'ramble.webm'); form.append('model', config.whisperModel || 'whisper-large-v3-turbo'); form.append('response_format', 'json')
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}` }, body: form })
  if (!response.ok) throw new Error(`Groq returned ${response.status}`)
  return (await safeJson(response)).text || null
}

export async function fetchHindsightContext(user, query, config = {}) {
  if (!config.url) return ''
  try {
    const response = await fetch(`${String(config.url).replace(/\/$/, '')}/v1/recall`, { method: 'POST', headers: { ...jsonHeaders, Authorization: `Bearer ${config.apiKey || ''}` }, body: JSON.stringify({ bank: config.bank || 'tadoo', query, userId: user.id, maxTokens: 1200 }) })
    if (!response.ok) throw new Error(`Hindsight returned ${response.status}`)
    const result = await safeJson(response); return result.text || result.content || result.memories?.map(item => item.text || item.content).join('\n') || ''
  } catch (error) { console.warn('[provider:hindsight]', error.message); return '' }
}

export async function createTasksFromRamble(user, text, config = {}) {
  const context = await fetchHindsightContext(user, text, config.hindsight)
  const fallback = () => [{ title: text.trim(), project: 'Inbox', priority: 2, durationMinutes: estimateDuration(text, context), notes: context ? `Context used:\n${context}` : '' }]
  const response = await askOpenCode([{ role: 'system', content: 'Turn a user ramble into a JSON array of actionable Tadoo tasks. Each task must be a short verb-first action. Return JSON only with title, project, priority (1-3), durationMinutes (5-90), notes, labels (array of short lowercase tags).' }, { role: 'user', content: `Ramble: ${text}\nContext: ${context}` }], () => JSON.stringify(fallback()), config.opencode)
  try { const parsed = JSON.parse(response); return Array.isArray(parsed) ? parsed : fallback() } catch { return fallback() }
}

export async function aiBreakdown(user, task, config = {}) {
  const context = await fetchHindsightContext(user, task.title, config.hindsight)
  const fallback = () => splitTask(task.title)
  const response = await askOpenCode([{ role: 'system', content: 'Break a task into exactly three short, actionable checklist items. Return JSON array of strings only.' }, { role: 'user', content: `Task: ${task.title}\nContext: ${context}` }], () => JSON.stringify(fallback()), config.opencode)
  try { const parsed = JSON.parse(response); return Array.isArray(parsed) ? parsed.slice(0, 6) : fallback() } catch { return fallback() }
}

export async function aiEstimate(user, task, config = {}) {
  const context = await fetchHindsightContext(user, task.title, config.hindsight)
  const fallback = () => estimateDuration(task.title, context)
  const response = await askOpenCode([{ role: 'system', content: 'Estimate task duration in minutes. Return an integer only.' }, { role: 'user', content: `Task: ${task.title}\nContext: ${context}` }], () => String(fallback()), config.opencode)
  const parsed = Number.parseInt(String(response).replace(/\D/g, ''), 10); return Number.isFinite(parsed) ? Math.min(180, Math.max(5, parsed)) : fallback()
}

export async function getScheduleAdvice(user, tasks, calendar, focusBlocks, config = {}) {
  return askOpenCode([{ role: 'system', content: 'Suggest a realistic daily task schedule. Return JSON array with taskId, start, end, reason.' }, { role: 'user', content: JSON.stringify({ tasks, calendar, focusBlocks }) }], () => '', config.opencode)
}
