import { describe, expect, it } from 'vitest'
import { mergeSettings, providerStatus, publicSettings, resolveProviderConfig } from './settings.mjs'

describe('workspace settings', () => {
  it('never returns stored secrets, only whether they are set', () => {
    const stored = { opencodeApiKey: 'sk-secret', groqApiKey: '', theme: 'dark', textSize: 'large' }
    const view = publicSettings(stored)
    expect(view.opencodeApiKey).toBe('')
    expect(view.opencodeApiKeySet).toBe(true)
    expect(view.groqApiKeySet).toBe(false)
    expect(view.theme).toBe('dark')
    expect(view.textSize).toBe('large')
    expect(JSON.stringify(view)).not.toContain('sk-secret')
  })

  it('merges only known keys and treats null as clear and empty as unchanged', () => {
    const merged = mergeSettings({ opencodeApiKey: 'kept', theme: 'dark' }, { theme: '', textSize: 'small', bogus: 'nope', groqApiKey: 'new-key' })
    expect(merged).toEqual({ opencodeApiKey: 'kept', theme: 'dark', textSize: 'small', groqApiKey: 'new-key' })
    expect(mergeSettings({ groqApiKey: 'gone' }, { groqApiKey: null })).toEqual({})
  })

  it('drops invalid appearance values', () => {
    expect(mergeSettings({}, { textSize: 'enormous', theme: 'neon' })).toEqual({})
  })

  it('prefers workspace providers over server env and reports the source', () => {
    const env = { OPENCODE_API_KEY: 'env-key', GROQ_API_KEY: 'env-groq', HINDSIGHT_URL: 'http://hindsight:8888' }
    const workspace = resolveProviderConfig({ opencodeApiKey: 'ws-key' }, env)
    expect(workspace.opencode.apiKey).toBe('ws-key')
    expect(workspace.groq.apiKey).toBe('env-groq')
    expect(workspace.opencode.baseUrl).toBe('https://api.opencode.ai/v1')
    expect(providerStatus({ opencodeApiKey: 'ws-key' }, env)).toMatchObject({ opencode: true, groq: true, hindsight: true, opencodeSource: 'workspace', groqSource: 'server' })
    expect(providerStatus({}, {})).toMatchObject({ opencode: false, groq: false, hindsight: false, opencodeSource: 'none' })
  })
})
