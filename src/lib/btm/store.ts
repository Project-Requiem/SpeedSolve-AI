import { create } from 'zustand'
import {
  BTMProblem, BTMBenchmark, BTMDifficulty, BTMSubject,
  BTMStats, BTMHistoryEntry, BTMValidationResponse,
  DIFFICULTY_XP, getLevelFromXP, getXPForNextLevel,
} from './types'
import { loadStats, saveStats, addHistoryEntry, getSubjectStats, getDifficultyStats } from './storage'
import { validateAnswer } from './answer-validator'
import { BTMUser, getActiveUser, createUser, switchUser, getAllUsers, updateUserActivity } from './user'

// ─── Types ──────────────────────────────────────────────────
type Screen =
  | 'setup'
  | 'home'
  | 'difficulty'
  | 'loading'
  | 'challenge'
  | 'result'
  | 'stats'

interface ResultData {
  userTimeMs: number
  aiTimeMs: number
  correct: boolean
  validation: BTMValidationResponse | null
  xpGained: number
  isPersonalBest: boolean
  wasStreakMilestone: boolean
  newLevel: number | null
}

// ─── Store ──────────────────────────────────────────────────
interface BTMStore {
  // User
  user: BTMUser | null
  allUsers: BTMUser[]
  initUser: (username: string) => void
  selectUser: (userId: string) => void
  logout: () => void

  // Navigation
  screen: Screen
  setScreen: (s: Screen) => void

  // Game state
  subject: BTMSubject
  difficulty: BTMDifficulty
  setSubject: (s: BTMSubject) => void
  setDifficulty: (d: BTMDifficulty) => void

  // Challenge
  problem: BTMProblem | null
  benchmark: BTMBenchmark | null
  isDaily: boolean

  // Timer
  timerRunning: boolean
  timerStartedAt: number | null
  elapsedMs: number

  // Input
  userInput: string
  setUserInput: (v: string) => void
  submitted: boolean

  // Result
  result: ResultData | null

  // Stats
  stats: BTMStats
  refreshStats: () => void

  // Actions
  generateChallenge: (difficulty: BTMDifficulty, subject: BTMSubject, daily?: boolean) => Promise<void>
  startTimer: () => void
  stopTimer: () => number
  submitAnswer: () => Promise<void>
  rematch: () => void
  goToHome: () => void
}

export const useBTMStore = create<BTMStore>((set, get) => ({
  // ── User ──
  user: null,
  allUsers: [],

  initUser: (username) => {
    const user = createUser(username)
    set({ user, allUsers: getAllUsers(), stats: loadStats(), screen: 'home' })
  },

  selectUser: (userId) => {
    const user = switchUser(userId)
    if (user) {
      set({ user, allUsers: getAllUsers(), stats: loadStats(), screen: 'home' })
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('speedsolve-btm-active-user')
    set({ user: null, screen: 'setup', allUsers: getAllUsers() })
  },

  // ── Navigation ──
  screen: 'setup',
  setScreen: (s) => set({ screen: s }),

  // ── Game state ──
  subject: 'mathematics',
  difficulty: 'scholar',
  setSubject: (s) => set({ subject: s }),
  setDifficulty: (d) => set({ difficulty: d }),

  // ── Challenge ──
  problem: null,
  benchmark: null,
  isDaily: false,

  // ── Timer ──
  timerRunning: false,
  timerStartedAt: null,
  elapsedMs: 0,

  // ── Input ──
  userInput: '',
  setUserInput: (v) => set({ userInput: v }),
  submitted: false,

  // ── Result ──
  result: null,

  // ── Stats ──
  stats: loadStats(),
  refreshStats: () => set({ stats: loadStats() }),

  // ── Actions ──
  generateChallenge: async (difficulty, subject, daily = false) => {
    set({ screen: 'loading', submitted: false, userInput: '', result: null, timerRunning: false, timerStartedAt: null, elapsedMs: 0 })
    try {
      const res = await fetch('/api/btm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: daily ? 'daily' : 'generate', subject, difficulty }),
      })
      const data = await res.json()
      if (data.problem) {
        set({ problem: data.problem, benchmark: data.benchmark, isDaily: daily, screen: 'challenge' })
      } else {
        // Retry once on failure
        const retry = await fetch('/api/btm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate', subject, difficulty }),
        })
        const retryData = await retry.json()
        if (retryData.problem) {
          set({ problem: retryData.problem, benchmark: retryData.benchmark, isDaily: false, screen: 'challenge' })
        } else {
          set({ screen: 'home' })
        }
      }
    } catch {
      set({ screen: 'home' })
    }
  },

  startTimer: () => {
    set({ timerRunning: true, timerStartedAt: performance.now(), elapsedMs: 0 })
  },

  stopTimer: () => {
    const { timerStartedAt } = get()
    if (!timerStartedAt) return 0
    const elapsed = performance.now() - timerStartedAt
    set({ timerRunning: false, elapsedMs: elapsed })
    return elapsed
  },

  submitAnswer: async () => {
    const { problem, userInput, stats, benchmark } = get()
    if (!problem || !benchmark || !userInput.trim()) return

    set({ submitted: true })
    const userTimeMs = get().stopTimer()
    const validation = validateAnswer(userInput, problem)

    // Calculate XP and update stats
    let xpGained = 0
    const isWin = validation.correct && userTimeMs < benchmark.aiTimeMs
    const isLoss = validation.correct && userTimeMs >= benchmark.aiTimeMs
    const isWrong = !validation.correct

    // Base XP
    if (isWin) xpGained += DIFFICULTY_XP[problem.difficulty]
    else if (isLoss) xpGained += Math.floor(DIFFICULTY_XP[problem.difficulty] * 0.3)
    else xpGained += 10

    // Speed bonus
    if (isWin && userTimeMs < benchmark.aiTimeMs * 0.5) xpGained += 50

    // Personal best
    const oldBest = stats.bestTimeMs
    const isPersonalBest = isWin && (oldBest === null || userTimeMs < oldBest)
    if (isPersonalBest) xpGained += 100

    // Streak
    let newStreak = isWin ? stats.streak + 1 : 0
    const wasStreakMilestone = newStreak > 0 && newStreak % 10 === 0
    if (wasStreakMilestone) xpGained += 200

    const bestStreak = Math.max(stats.bestStreak, newStreak)

    // Level check
    const newXP = stats.xp + xpGained
    const oldLevel = getLevelFromXP(stats.xp)
    const newLevel = getLevelFromXP(newXP)
    const leveledUp = newLevel > oldLevel

    // Update subject/difficulty stats
    const subj = getSubjectStats(stats, problem.subject)
    const diff = getDifficultyStats(stats, problem.difficulty)
    const newSubjectStats = { ...stats.subjectStats }
    const newDifficultyStats = { ...stats.difficultyStats }

    if (isWin) {
      newSubjectStats[problem.subject] = { ...subj, wins: subj.wins + 1, bestTime: subj.bestTime === null || userTimeMs < subj.bestTime ? userTimeMs : subj.bestTime }
      newDifficultyStats[problem.difficulty] = { ...diff, wins: diff.wins + 1, bestTime: diff.bestTime === null || userTimeMs < diff.bestTime ? userTimeMs : diff.bestTime }
    } else if (isLoss) {
      newSubjectStats[problem.subject] = { ...subj, losses: subj.losses + 1 }
      newDifficultyStats[problem.difficulty] = { ...diff, losses: diff.losses + 1 }
    } else {
      newSubjectStats[problem.subject] = { ...subj, wrong: subj.wrong + 1 }
      newDifficultyStats[problem.difficulty] = { ...diff, wrong: diff.wrong + 1 }
    }

    // History entry
    const entry: BTMHistoryEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      subject: problem.subject,
      difficulty: problem.difficulty,
      problemText: problem.question,
      userAnswer: userInput,
      correctAnswer: problem.correctAnswer,
      unit: problem.unit,
      correct: validation.correct,
      timeMs: userTimeMs,
      aiTimeMs: benchmark.aiTimeMs,
      xpGained,
      trapType: problem.trapType,
    }

    const newStats: BTMStats = {
      ...stats,
      xp: newXP,
      level: newLevel,
      totalWins: stats.totalWins + (isWin ? 1 : 0),
      totalLosses: stats.totalLosses + (isLoss ? 1 : 0),
      totalWrong: stats.totalWrong + (isWrong ? 1 : 0),
      streak: newStreak,
      bestStreak,
      bestTimeMs: isPersonalBest ? userTimeMs : stats.bestTimeMs,
      problemsAttempted: stats.problemsAttempted + 1,
      subjectStats: newSubjectStats,
      difficultyStats: newDifficultyStats,
      trapStats: {
        detected: stats.trapStats.detected + (validation.trapDetected ? 1 : 0),
        fallen: stats.trapStats.fallen + (validation.trapDetected ? 0 : (problem.trapType ? 1 : 0)),
        bestTime: stats.trapStats.bestTime,
      },
      history: [...stats.history, entry],
    }

    saveStats(newStats)
    updateUserActivity()

    set({
      stats: newStats,
      result: {
        userTimeMs,
        aiTimeMs: benchmark.aiTimeMs,
        correct: validation.correct,
        validation,
        xpGained,
        isPersonalBest,
        wasStreakMilestone,
        newLevel: leveledUp ? newLevel : null,
      },
      screen: 'result',
    })
  },

  rematch: () => {
    const { difficulty, subject, problem, isDaily } = get()
    if (isDaily) {
      get().generateChallenge('scholar', subject, true)
    } else if (problem) {
      get().generateChallenge(problem.difficulty, problem.subject)
    } else {
      get().generateChallenge(difficulty, subject)
    }
  },

  goToHome: () => set({ screen: 'home', problem: null, benchmark: null, result: null, userInput: '', submitted: false }),
}))

// ─── Derived helpers ────────────────────────────────────────
export function fmtTime(ms: number): string {
  if (ms < 1000) return ms.toFixed(0) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

export function getAIResponse(streak: number): string {
  if (streak >= 7) return 'Recalibrating.'
  if (streak >= 5) return 'Interesting.'
  if (streak >= 3) return 'You got me.'
  return 'Machine wins.'
}

export const DIFFICULTIES: { key: BTMDifficulty; label: string; desc: string; color: string; minLevel: number }[] = [
  { key: 'rookie', label: 'ROOKIE', desc: 'Basic calculations', color: '#22c55e', minLevel: 1 },
  { key: 'scholar', label: 'SCHOLAR', desc: 'Multi-step problems', color: '#3b82f6', minLevel: 1 },
  { key: 'expert', label: 'EXPERT', desc: 'Complex reasoning', color: '#8b5cf6', minLevel: 2 },
  { key: 'nightmare', label: 'NIGHTMARE', desc: 'Olympiad-style challenges', color: '#ef4444', minLevel: 4 },
  { key: 'requiem', label: 'REQUIEM', desc: 'The machine has stopped holding back.', color: '#e2e8f0', minLevel: 7 },
]
