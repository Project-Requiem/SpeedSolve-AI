export type BTMDifficulty = 'rookie' | 'scholar' | 'expert' | 'nightmare' | 'requiem'

export type BTMSubject = 'mathematics' | 'physics' | 'chemistry'

export type TrapType =
  | 'hidden_wording'    // question asks for X but numbers suggest Y
  | 'unit_trap'         // mixed units (km/h + m/s)
  | 'formula_trap'      // obvious formula is wrong
  | 'sign_trap'         // positive/negative direction
  | 'average_trap'      // misunderstanding of 'average'
  | 'irrelevant_info'   // extra unused numbers
  | null

export interface BTMProblem {
  id: string
  subject: BTMSubject
  difficulty: BTMDifficulty
  question: string
  correctAnswer: number
  unit: string
  solution: string         // step-by-step explanation
  concept: string         // e.g. "Kinematic Equations"
  trapType: TrapType
  steps: number           // number of calculation steps
  complexity: number      // 0-1 score
  generatedValues: Record<string, number>  // for debugging
}

export interface BTMBenchmark {
  aiTimeMs: number
  aiAnswer: string
  aiCorrect: boolean
  solution: string
}

export interface BTMChallengeResponse {
  problem: BTMProblem
  benchmark: BTMBenchmark
}

export interface BTMValidationResponse {
  correct: boolean
  userAnswer: number | null
  correctAnswer: number
  tolerance: number
  unitMatch: boolean
  trapDetected: boolean
  trapExplanation?: string
  mistakeExplanation?: string
}

export interface BTMStats {
  xp: number
  level: number
  totalWins: number
  totalLosses: number
  totalWrong: number
  streak: number
  bestStreak: number
  bestTimeMs: number | null
  problemsAttempted: number
  subjectStats: Record<string, { wins: number; losses: number; wrong: number; bestTime: number | null }>
  difficultyStats: Record<string, { wins: number; losses: number; wrong: number; bestTime: number | null }>
  trapStats: { detected: number; fallen: number; bestTime: number | null }
  dailyChallenge: {
    date: string       // YYYY-MM-DD
    completed: boolean
    result?: 'win' | 'loss' | 'wrong'
    timeMs?: number
  }
  history: BTMHistoryEntry[]
}

export interface BTMHistoryEntry {
  id: string
  date: string
  subject: BTMSubject
  difficulty: BTMDifficulty
  problemText: string
  userAnswer: string
  correctAnswer: number
  unit: string
  correct: boolean
  timeMs: number
  aiTimeMs: number
  xpGained: number
  trapType: TrapType
}

export const DIFFICULTY_XP: Record<BTMDifficulty, number> = {
  rookie: 100,
  scholar: 150,
  expert: 200,
  nightmare: 300,
  requiem: 500,
}

export const LEVEL_THRESHOLDS = [0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000, 25000, 30000, 36000, 43000, 50000, 60000, 72000, 85000, 100000]

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getXPForNextLevel(xp: number): { current: number; needed: number; level: number } {
  const level = getLevelFromXP(xp)
  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0
  const nextLevelXP = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 15000
  return { current: xp - currentLevelXP, needed: nextLevelXP - currentLevelXP, level }
}
