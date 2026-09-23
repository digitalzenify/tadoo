import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, activeFilterCount, collectLabels, collectProjects, matchesFilters } from './filters'

const tasks = [
  { project: 'Work', priority: 'high' as const, completed: false, due: 'Today', labels: ['deep-work', 'client'] },
  { project: 'Inbox', priority: 'low' as const, completed: true, due: undefined, labels: ['home'] },
  { project: 'Personal', priority: 'medium' as const, completed: false, due: '2026-10-01', labels: ['client'] },
]

describe('task filters', () => {
  it('matches everything by default', () => {
    expect(tasks.filter(task => matchesFilters(task, EMPTY_FILTERS))).toHaveLength(3)
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
  })

  it('filters by priority, project, label, status and due bucket', () => {
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, priority: 'high' }))).toHaveLength(1)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, project: 'Inbox' }))).toHaveLength(1)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, label: 'client' }))).toHaveLength(2)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, status: 'open' }))).toHaveLength(2)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, status: 'done' }))).toHaveLength(1)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, due: 'today' }))).toHaveLength(1)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, due: 'upcoming' }))).toHaveLength(1)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, due: 'none' }))).toHaveLength(1)
    expect(activeFilterCount({ ...EMPTY_FILTERS, status: 'open', label: 'client' })).toBe(2)
  })

  it('combines filters', () => {
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, project: 'Work', label: 'client' }))).toHaveLength(1)
    expect(tasks.filter(task => matchesFilters(task, { ...EMPTY_FILTERS, project: 'Work', status: 'done' }))).toHaveLength(0)
  })

  it('collects labels with counts and projects without duplicates', () => {
    expect(collectLabels(tasks)).toEqual([{ name: 'client', count: 2 }, { name: 'deep-work', count: 1 }, { name: 'home', count: 1 }])
    expect(collectProjects(tasks)).toEqual(['Inbox', 'Personal', 'Work'])
  })
})
