import { BTMStats, BTMHistoryEntry } from './types'
import { getActiveUser, getStatsKey } from './user'

const LEGACY_KEY = 'speedsolve-btm-stats' // pre-user migration

const DEFAULT_STATS: BTMStats = {
  xp: 0,
  level: 1,
  totalWins: 0,
  totalLosses: 0,
  totalWrong: 0,
  streak: 0,
  bestStreak: 0,
  bestTimeMs: null,
  problemsAttempted: 0,
  subjectStats: {},
  difficultyStats: {},
  trapStats: { detected: 0, fallen: 0, bestTime: null },
  dailyChallenge: { date: '', completed: false },
  history: [],
}

function getStorageKey(): string {
  const user = getActiveUser()
  return user ? getStatsKey(user.id) : LEGACY_KEY
}

export function loadStats(): BTMStats {
  if (typeof window === 'undefined') return DEFAULT_STATS
  try {
    const raw = localStorage.getItem(getStorageKey())
    if (!raw) return DEFAULT_STATS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_STATS, ...parsed }
  } catch {
    return DEFAULT_STATS
  }
}

export function saveStats(stats: BTMStats): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = { ...stats, history: stats.history.slice(-100) }
    localStorage.setItem(getStorageKey(), JSON.stringify(trimmed))
  } catch { /* silently fail */ }
}

export function addHistoryEntry(stats: BTMStats, entry: BTMHistoryEntry): BTMStats {
  return { ...stats, history: [...stats.history, entry] }
}

export function getSubjectStats(stats: BTMStats, subject: string) {
  return stats.subjectStats[subject] || { wins: 0, losses: 0, wrong: 0, bestTime: null }
}

export function getDifficultyStats(stats: BTMStats, difficulty: string) {
  return stats.difficultyStats[difficulty] || { wins: 0, losses: 0, wrong: 0, bestTime: null }
}
