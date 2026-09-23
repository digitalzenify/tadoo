import { describe, expect, it } from 'vitest'
import { aiBreakdown, aiEstimate, createTasksFromRamble } from './providers.mjs'

describe('AI provider fallbacks', () => {
  it('creates a usable task from a Ramble without provider credentials', async () => {
    const result = await createTasksFromRamble({ id: 'test-user' }, 'Call the dentist tomorrow')
    expect(result[0].title).toContain('Call the dentist')
    expect(result[0].durationMinutes).toBeGreaterThan(0)
  })

  it('breaks down and estimates a task locally when OpenCode is unavailable', async () => {
    const task = { title: 'Review the homepage copy' }
    expect((await aiBreakdown({ id: 'test-user' }, task)).length).toBeGreaterThan(0)
    expect(await aiEstimate({ id: 'test-user' }, task)).toBeGreaterThan(0)
  })
})
