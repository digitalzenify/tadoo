// Task filtering shared by the list, the Labels view and the Filters view. Pure so the
// rules can be tested without rendering anything.
export type TaskFilters = {
  priority: 'all' | 'high' | 'medium' | 'low'
  project: string
  label: string
  status: 'all' | 'open' | 'done'
  due: 'all' | 'today' | 'upcoming' | 'none'
}

export type FilterableTask = { project: string; priority: 'high' | 'medium' | 'low'; completed?: boolean; due?: string; labels?: string[] }

export const EMPTY_FILTERS: TaskFilters = { priority: 'all', project: 'all', label: 'all', status: 'all', due: 'all' }

export function matchesFilters(task: FilterableTask, filters: TaskFilters) {
  if (filters.priority !== 'all' && task.priority !== filters.priority) return false
  if (filters.project !== 'all' && task.project !== filters.project) return false
  if (filters.label !== 'all' && !(task.labels || []).includes(filters.label)) return false
  if (filters.status === 'open' && task.completed) return false
  if (filters.status === 'done' && !task.completed) return false
  if (filters.due === 'today' && task.due !== 'Today') return false
  if (filters.due === 'upcoming' && (!task.due || task.due === 'Today')) return false
  if (filters.due === 'none' && task.due) return false
  return true
}

export const activeFilterCount = (filters: TaskFilters) => Object.values(filters).filter(value => value !== 'all').length

export function collectLabels(tasks: FilterableTask[]) {
  const counts = new Map<string, number>()
  for (const task of tasks) for (const label of task.labels || []) counts.set(label, (counts.get(label) || 0) + 1)
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function collectProjects(tasks: FilterableTask[]) {
  return [...new Set(tasks.map(task => task.project).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
