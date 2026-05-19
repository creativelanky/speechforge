export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim()
}

export function formatDurationHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === now.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#34C759'
  if (score >= 60) return '#FF9500'
  return '#FF3B30'
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Fair'
  return 'Needs Work'
}

export function modeName(mode: string): string {
  const map: Record<string, string> = {
    interview: 'Interview Prep',
    speaking: 'Public Speaking',
    conversation: 'Conversations',
  }
  return map[mode] ?? mode
}

export function modeColor(mode: string): string {
  const map: Record<string, string> = {
    interview: '#007AFF',
    speaking: '#E8590C',
    conversation: '#34C759',
  }
  return map[mode] ?? '#E8590C'
}

export function difficultyColor(difficulty: string): string {
  const map: Record<string, string> = {
    easy: '#34C759',
    medium: '#FF9500',
    hard: '#FF3B30',
  }
  return map[difficulty] ?? '#FF9500'
}
