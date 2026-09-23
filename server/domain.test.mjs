import { describe, expect, it } from 'vitest'
import { splitTask, buildSchedule } from './domain.mjs'

describe('task intelligence', () => {
  it('splits a broad task into short actionable steps', () => {
    expect(splitTask('Prepare the launch')).toEqual([
      'Define what done looks like',
      'Gather the required materials',
      'Complete the first small step'
    ])
  })

  it('schedules highest priority tasks into available focus blocks', () => {
    const plan = buildSchedule([
      { id: 'a', title: 'Deep work', durationMinutes: 45, priority: 1 },
      { id: 'b', title: 'Quick reply', durationMinutes: 15, priority: 3 }
    ], [{ start: '09:00', end: '10:00' }])
    expect(plan.map(item => item.taskId)).toEqual(['a', 'b'])
    expect(plan[0].start).toBe('09:00')
    expect(plan[1].start).toBe('09:45')
  })
})
