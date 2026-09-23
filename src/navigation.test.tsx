// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import App from './App'

// Navigation smoke test: clicking through the sidebar must render each panel instead of
// crashing the shell. This is the regression test for a render error that blanked the app
// on every panel view and stayed invisible until someone clicked.
const user = { id: 'u1', email: 'alex@example.com', createdAt: '2026-09-23T09:00:00.000Z' }
const task = { id: 't1', title: 'Write the launch brief', project: 'Work', priority: 1, durationMinutes: 30, dueDate: new Date().toISOString().slice(0, 10), completed: false, notes: '', parentId: null, labels: ['client', 'deep-work'], createdAt: 'now', updatedAt: 'now' }
const settings = {
  theme: 'light', textSize: 'default', opencodeBaseUrl: '', opencodeModel: '', groqWhisperModel: '', hindsightUrl: '', hindsightBank: '',
  opencodeApiKey: '', opencodeApiKeySet: false, groqApiKey: '', groqApiKeySet: false, hindsightApiKey: '', hindsightApiKeySet: false,
}
const providers = { opencode: false, groq: false, hindsight: false, opencodeSource: 'none', groqSource: 'none', hindsightSource: 'none' }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function apiMock(createdKey?: { key: string; id: string }) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method || 'GET').toUpperCase()
    if (url.endsWith('/api/auth/me')) return Promise.resolve(json({ user }))
    if (url.endsWith('/api/tasks')) return Promise.resolve(json({ tasks: [task] }))
    if (url.endsWith('/api/settings')) return Promise.resolve(json({ settings, providers }))
    if (url.endsWith('/api/keys') && method === 'POST') return Promise.resolve(json(createdKey || { key: 'tdk_fresh_example', id: 'k1' }, 201))
    if (url.endsWith('/api/keys')) return Promise.resolve(json({ keys: [] }))
    return Promise.resolve(json({ error: 'not found' }, 404))
  })
}

const content = () => document.querySelector('.content')?.textContent || ''
const clickNav = (label: string) => {
  const button = [...document.querySelectorAll('.side-link, .nav-item')].find(element => element.textContent?.includes(label))
  if (!button) throw new Error(`no sidebar entry for ${label}`)
  fireEvent.click(button)
}

beforeEach(() => {
  localStorage.setItem('tadoo:session', 'td_test')
  vi.stubGlobal('fetch', apiMock())
})

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('sidebar navigation', () => {
  it('shows the workspace after sign-in', async () => {
    render(<App />)
    await waitFor(() => expect(content()).toContain('Write the launch brief'))
    expect(content()).toContain('client')
  })

  it('opens settings, labels, filters and the docs without losing the shell', async () => {
    render(<App />)
    await waitFor(() => expect(content()).toContain('Write the launch brief'))

    clickNav('Settings')
    await waitFor(() => expect(content()).toContain('AI providers'))
    for (const marker of ['Appearance', 'Text size', 'Tadoo API keys', 'Connect your AI agent', 'Signed in as']) expect(content()).toContain(marker)
    expect(document.querySelector('.app')).toBeTruthy()

    clickNav('Labels')
    await waitFor(() => expect(content()).toContain('Labels live on tasks'))
    expect(content()).toContain('client')

    clickNav('Filters')
    await waitFor(() => expect(content()).toContain('Any priority'))
    expect(content()).toContain('Any label')

    clickNav('API docs')
    await waitFor(() => expect(content()).toContain('/api/keys'))
    expect(content()).toContain('Authentication')

    clickNav('Today')
    await waitFor(() => expect(content()).toContain('Write the launch brief'))
    expect(document.querySelectorAll('.task-row')).toHaveLength(1)
  })

  it('creates an API key and shows the agent prompt built from it', async () => {
    vi.stubGlobal('fetch', apiMock({ key: 'tdk_fresh_example', id: 'k1' }))
    render(<App />)
    await waitFor(() => expect(content()).toContain('Write the launch brief'))
    clickNav('Settings')
    await waitFor(() => expect(content()).toContain('Tadoo API keys'))

    const input = document.querySelector('.key-create input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Hermes agent' } })
    fireEvent.click([...document.querySelectorAll('.key-create button')].pop() as HTMLElement)

    await waitFor(() => expect(content()).toContain('tdk_fresh_example'))
    expect(content()).toContain('Copy this key now')
    expect(document.querySelector('.prompt-block')?.textContent).toContain('X-Tadoo-API-Key: tdk_fresh_example')
  })
})
