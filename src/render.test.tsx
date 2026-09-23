import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { buildAgentPrompt } from './agent'
import { EMPTY_FILTERS } from './filters'
import { SettingsView } from './settings'
import { DocsView, FiltersView, LabelsView } from './views'
import type { ProviderStatus, WorkspaceSettings } from './api'

// Render smoke tests: the shell, the settings page and the panel views must survive a
// render pass without throwing, which is what catches a broken view switch or a missing prop.
const settings: WorkspaceSettings = {
  theme: 'dark', textSize: 'large',
  opencodeBaseUrl: '', opencodeModel: '', groqWhisperModel: '', hindsightUrl: '', hindsightBank: '',
  opencodeApiKey: '', opencodeApiKeySet: true, groqApiKey: '', groqApiKeySet: false, hindsightApiKey: '', hindsightApiKeySet: false,
}
const providers: ProviderStatus = { opencode: true, groq: false, hindsight: false, opencodeSource: 'workspace', groqSource: 'none', hindsightSource: 'none' }

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
})

describe('app shell', () => {
  it('renders the sign-in screen when there is no session', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Welcome back.')
    expect(html).toContain('Sign in')
  })
})

describe('settings page', () => {
  const render = () => renderToStaticMarkup(<SettingsView token="td_test" user={{ id: 'u1', email: 'alex@example.com', createdAt: 'now' }} settings={settings} providers={providers} onSave={async () => undefined} onOpenDocs={() => undefined} onSignOut={() => undefined} />)

  it('exposes appearance, text size and every provider section', () => {
    const html = render()
    for (const marker of ['Appearance', 'Text size', 'Small', 'Default', 'Large', 'Extra large', 'Light', 'Dark', 'AI providers', 'OpenCode Go', 'Groq Whisper', 'Hindsight memory', 'Save provider settings']) {
      expect(html).toContain(marker)
    }
  })

  it('offers API key management and the agent connection prompt', () => {
    const html = render()
    for (const marker of ['Tadoo API keys', 'Create key', 'Connect your AI agent', 'Create a key for my agent', 'Documentation', 'Signed in as', 'alex@example.com']) {
      expect(html).toContain(marker)
    }
  })

  it('shows a stored secret as set without leaking a value', () => {
    const html = render()
    expect(html).toContain('Stored, hidden')
    expect(html).toContain('Clear stored key')
    expect(html).toContain('your key')
  })
})

describe('panel views', () => {
  it('renders labels with their counts', () => {
    const html = renderToStaticMarkup(<LabelsView labels={[{ name: 'client', count: 3 }, { name: 'home', count: 1 }]} active="client" onSelect={() => undefined} />)
    expect(html).toContain('client')
    expect(html).toContain('3')
    expect(html).toContain('label-chip active')
  })

  it('renders the filter form with the current selection', () => {
    const html = renderToStaticMarkup(<FiltersView filters={{ ...EMPTY_FILTERS, priority: 'high', status: 'open' }} projects={['Work', 'Personal']} labels={['client']} matched={2} onChange={() => undefined} onReset={() => undefined} />)
    expect(html).toContain('Priority')
    expect(html).toContain('Priority 1')
    expect(html).toContain('Open only')
    expect(html).toContain('Personal')
    expect(html).toContain('2 tasks match')
  })

  it('renders the API documentation and a link into settings', () => {
    const html = renderToStaticMarkup(<DocsView onOpenSettings={() => undefined} />)
    for (const marker of ['Authentication', 'Tasks', 'Capture and AI', 'Planning and reminders', 'Workspace', '/api/keys', '/api/settings', 'X-Tadoo-API-Key', 'Examples']) {
      expect(html).toContain(marker)
    }
  })
})

describe('agent prompt', () => {
  it('carries the key, the base URL and the working rules', () => {
    const prompt = buildAgentPrompt({ apiKey: 'tdk_example', email: 'alex@example.com', baseUrl: 'https://tadoo.example' })
    expect(prompt).toContain('X-Tadoo-API-Key: tdk_example')
    expect(prompt).toContain('https://tadoo.example')
    expect(prompt).toContain('alex@example.com')
    for (const endpoint of ['GET /api/tasks', 'POST /api/tasks', 'PATCH /api/tasks/:id', 'POST /api/ramble/preview', 'GET /api/schedule/day', 'GET /api/health']) {
      expect(prompt).toContain(endpoint)
    }
    expect(prompt).toContain('Never ask me for a password')
  })
})
