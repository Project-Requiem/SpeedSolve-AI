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
  // New gamification defaults
  combo: 0,
  bestCombo: 0,
  totalXP: 0,
  powerUps: { timeFreeze: 1, shield: 1, hint: 1, doubleXP: 0, comboBoost: 0 }, // start with 1 of each basic
  unlockedAchievements: [],
  completedLevels: [],
  levelStars: {},
  towerFloor: 0,
  heatStreak: 0,
  lastPlayDate: '',
  cosmetics: {
    equippedTheme: 'theme-default',
    equippedFrame: 'frame-none',
    equippedEffect: 'effect-none',
    equippedTitle: 'title-challenger',
    owned: ['theme-default', 'frame-none', 'effect-none', 'title-challenger'],
  },
  bossDefeated: [],
  solutionPaths: {},
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
    return { ...DEFAULT_STATS, ...parsed, powerUps: { ...DEFAULT_STATS.powerUps, ...parsed.powerUps }, cosmetics: { ...DEFAULT_STATS.cosmetics, ...parsed.cosmetics } }
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
