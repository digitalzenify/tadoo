export function splitTask(title) {
  const clean = title.trim().replace(/[.!?]+$/, '')
  if (!clean) return []
  return ['Define what done looks like', 'Gather the required materials', 'Complete the first small step']
}

const minutes = value => value.split(':').map(Number).reduce((h, m) => h * 60 + m)
const time = total => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

export function buildSchedule(tasks, focusBlocks) {
  const sorted = [...tasks].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (b.durationMinutes ?? 15) - (a.durationMinutes ?? 15))
  const output = []
  let cursor = 0
  for (const task of sorted) {
    let placed = false
    for (let i = cursor; i < focusBlocks.length; i++) {
      const blockStart = minutes(focusBlocks[i].start)
      const blockEnd = minutes(focusBlocks[i].end)
      const start = Math.max(blockStart, i === cursor && output.length ? minutes(output.at(-1).end) : blockStart)
      if (start + task.durationMinutes <= blockEnd) {
        output.push({ taskId: task.id, title: task.title, start: time(start), end: time(start + task.durationMinutes), reason: task.priority === 1 ? 'highest priority' : 'fits your available time' })
        cursor = i
        placed = true
        break
      }
    }
    if (!placed) output.push({ taskId: task.id, title: task.title, unscheduled: true, reason: 'not enough open focus time' })
  }
  return output
}

export function estimateDuration(title, context = '') {
  const words = `${title} ${context}`.toLowerCase().split(/\s+/).length
  if (/call|reply|send|book|water|pay/.test(title.toLowerCase())) return 15
  if (/review|write|outline|plan/.test(title.toLowerCase())) return Math.min(60, Math.max(25, words * 2))
  return Math.min(90, Math.max(15, words * 2))
}
