export type User = { id: string; email: string; createdAt: string }
export type ApiTask = { id: string; title: string; project: string; priority: number; durationMinutes: number; dueDate: string | null; completed: boolean; notes: string; parentId: string | null; createdAt: string; updatedAt: string }
export type RambleResult = { transcript: string; tasks: ApiTask[]; provider: string }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export class ApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.name = 'ApiError'; this.status = status } }

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers })
    if (response.status === 204) return undefined as T
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new ApiError(data.error || `Request failed (${response.status})`, response.status)
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('Tadoo API is unavailable. Your cached tasks are still available.', 0)
  }
}

export const api = {
  register: (email: string, password: string) => request<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<{ user: User }>('/api/auth/me', {}, token),
  logout: (token: string) => request<void>('/api/auth/logout', { method: 'POST' }, token),
  tasks: (token: string) => request<{ tasks: ApiTask[] }>('/api/tasks', {}, token),
  createTask: (token: string, input: Partial<ApiTask> & { title: string }) => request<{ task: ApiTask }>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }, token),
  updateTask: (token: string, id: string, input: Partial<ApiTask>) => request<{ task: ApiTask }>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deleteTask: (token: string, id: string) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }, token),
  breakdown: (token: string, id: string) => request<{ taskId: string; items: string[]; provider: string }>(`/api/tasks/${id}/breakdown`, { method: 'POST' }, token),
  estimate: (token: string, id: string) => request<{ task: ApiTask; provider: string }>(`/api/tasks/${id}/estimate`, { method: 'POST' }, token),
  schedule: (token: string) => request<{ plan: Array<{ taskId: string; title: string; start?: string; end?: string; unscheduled?: boolean; reason: string }> }>('/api/schedule/day', {}, token),
  ramblePreview: (token: string, payload: { text?: string; audio?: Blob }): Promise<RambleResult> => {
    if (payload.audio) return blobToBase64(payload.audio).then(audioBase64 => request<RambleResult>('/api/ramble/preview', { method: 'POST', body: JSON.stringify({ audioBase64, mimeType: payload.audio?.type || 'audio/webm' }) }, token))
    return request<RambleResult>('/api/ramble/preview', { method: 'POST', body: JSON.stringify({ text: payload.text }) }, token)
  },
  ramble: (token: string, payload: { text?: string; audio?: Blob }): Promise<RambleResult> => {
    if (payload.audio) return blobToBase64(payload.audio).then(audioBase64 => request<RambleResult>('/api/ramble', { method: 'POST', body: JSON.stringify({ audioBase64, mimeType: payload.audio?.type || 'audio/webm' }) }, token))
    return request<RambleResult>('/api/ramble', { method: 'POST', body: JSON.stringify({ text: payload.text }) }, token)
  },
  reminder: (token: string, taskId: string, remindAt: string) => request(`/api/tasks/${taskId}/reminders`, { method: 'POST', body: JSON.stringify({ remindAt }) }, token),
}

function blobToBase64(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(blob) }) }

export const session = {
  read: () => localStorage.getItem('tadoo:session'),
  write: (token: string) => localStorage.setItem('tadoo:session', token),
  clear: () => localStorage.removeItem('tadoo:session'),
}

export { API_URL }
