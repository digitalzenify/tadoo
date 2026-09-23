import { estimateDuration, splitTask } from './domain.mjs'

const jsonHeaders = { 'Content-Type': 'application/json' }
async function safeJson(response) { const text = await response.text(); try { return JSON.parse(text) } catch { return { text } } }

export async function askOpenCode(messages, fallback) {
  const base = process.env.OPENCODE_BASE_URL || 'https://api.opencode.ai/v1'
  const key = process.env.OPENCODE_API_KEY
  if (!key) return fallback()
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { ...jsonHeaders, Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.OPENCODE_MODEL || 'opencode-go', messages, temperature: 0.2 }) })
    if (!response.ok) throw new Error(`OpenCode returned ${response.status}`)
    const result = await safeJson(response); return result.choices?.[0]?.message?.content || fallback()
  } catch (error) { console.warn('[provider:opencode]', error.message); return fallback() }
}

export async function transcribeGroq(audioBase64, mimeType = 'audio/webm') {
  if (!process.env.GROQ_API_KEY) return null
  const binary = Buffer.from(audioBase64, 'base64')
  const form = new FormData(); form.append('file', new Blob([binary], { type: mimeType }), 'ramble.webm'); form.append('model', process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo'); form.append('response_format', 'json')
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form })
  if (!response.ok) throw new Error(`Groq returned ${response.status}`)
  return (await safeJson(response)).text || null
}

export async function fetchHindsightContext(user, query) {
  if (!process.env.HINDSIGHT_URL) return ''
  try {
    const response = await fetch(`${process.env.HINDSIGHT_URL.replace(/\/$/, '')}/v1/recall`, { method: 'POST', headers: { ...jsonHeaders, Authorization: `Bearer ${process.env.HINDSIGHT_API_KEY || ''}` }, body: JSON.stringify({ bank: process.env.HINDSIGHT_BANK || 'tadoo', query, userId: user.id, maxTokens: 1200 }) })
    if (!response.ok) throw new Error(`Hindsight returned ${response.status}`)
    const result = await safeJson(response); return result.text || result.content || result.memories?.map(item => item.text || item.content).join('\n') || ''
  } catch (error) { console.warn('[provider:hindsight]', error.message); return '' }
}

export async function createTasksFromRamble(user, text) {
  const context = await fetchHindsightContext(user, text)
  const fallback = () => [{ title: text.trim(), project: 'Inbox', priority: 2, durationMinutes: estimateDuration(text, context), notes: context ? `Context used:\n${context}` : '' }]
  const response = await askOpenCode([{ role: 'system', content: 'Turn a user ramble into a JSON array of actionable Tadoo tasks. Each task must be a short verb-first action. Return JSON only with title, project, priority (1-3), durationMinutes (5-90), notes.' }, { role: 'user', content: `Ramble: ${text}\nContext: ${context}` }], () => JSON.stringify(fallback()))
  try { const parsed = JSON.parse(response); return Array.isArray(parsed) ? parsed : fallback() } catch { return fallback() }
}

export async function aiBreakdown(user, task) {
  const context = await fetchHindsightContext(user, task.title)
  const fallback = () => splitTask(task.title)
  const response = await askOpenCode([{ role: 'system', content: 'Break a task into exactly three short, actionable checklist items. Return JSON array of strings only.' }, { role: 'user', content: `Task: ${task.title}\nContext: ${context}` }], () => JSON.stringify(fallback()))
  try { const parsed = JSON.parse(response); return Array.isArray(parsed) ? parsed.slice(0, 6) : fallback() } catch { return fallback() }
}

export async function aiEstimate(user, task) {
  const context = await fetchHindsightContext(user, task.title)
  const fallback = () => estimateDuration(task.title, context)
  const response = await askOpenCode([{ role: 'system', content: 'Estimate task duration in minutes. Return an integer only.' }, { role: 'user', content: `Task: ${task.title}\nContext: ${context}` }], () => String(fallback()))
  const parsed = Number.parseInt(String(response).replace(/\D/g, ''), 10); return Number.isFinite(parsed) ? Math.min(180, Math.max(5, parsed)) : fallback()
}

export async function getScheduleAdvice(user, tasks, calendar, focusBlocks) {
  return askOpenCode([{ role: 'system', content: 'Suggest a realistic daily task schedule. Return JSON array with taskId, start, end, reason.' }, { role: 'user', content: JSON.stringify({ tasks, calendar, focusBlocks }) }], () => '')
}
