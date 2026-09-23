import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('Tadoo API client', () => {
  it('adds bearer authentication and parses login responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: 'td_test', user: { id: 'u1', email: 'alex@example.com', createdAt: 'now' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await api.login('alex@example.com', 'password123')
    expect(result.token).toBe('td_test')
    expect(fetchMock.mock.calls[0][1].headers.get('Content-Type')).toBe('application/json')
  })

  it('turns network failures into a user-facing ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(api.tasks('td_test')).rejects.toMatchObject({ name: 'ApiError', status: 0 })
  })
})
