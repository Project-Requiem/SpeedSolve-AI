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
  // ─── NEW GAMIFICATION FIELDS ───
  combo: number                    // current combo count
  bestCombo: number               // best combo ever
  totalXP: number                 // lifetime XP earned (never decreases, unlike xp which can go down)
  powerUps: Record<PowerUpType, number>  // inventory
  unlockedAchievements: string[]  // achievement IDs
  completedLevels: string[]       // e.g. "world1-3"
  levelStars: Record<string, number>  // e.g. "world1-3": 2
  towerFloor: number              // highest tower climb floor
  heatStreak: number              // consecutive days played
  lastPlayDate: string            // YYYY-MM-DD
  cosmetics: CosmeticState        // equipped cosmetics
  bossDefeated: string[]          // boss IDs defeated
  solutionPaths: Record<string, string>  // anti-cheat: stores solution method chosen
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORLD MAP & LEVEL SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BTMWorld {
  id: string
  name: string
  description: string
  color: string
  gradient: string
  icon: string
  levels: BTMLevel[]
  requiredStars: number  // total stars needed to unlock this world
}

export interface BTMLevel {
  id: string           // e.g. "world1-3"
  worldId: string
  number: number       // level number within world
  name: string
  difficulty: BTMDifficulty
  subject: BTMSubject
  problemCount: number // problems to complete this level
  isBoss: boolean
  starsRequired: number // stars from previous levels to unlock
  xpReward: number     // bonus XP for completing level
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POWER-UPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type PowerUpType = 'timeFreeze' | 'shield' | 'hint' | 'doubleXP' | 'comboBoost'

export interface PowerUp {
  type: PowerUpType
  name: string
  description: string
  icon: string
  color: string
  cost: number          // XP cost in shop
  duration?: number     // ms duration for timed effects
}

export const POWER_UPS: Record<PowerUpType, PowerUp> = {
  timeFreeze: { type: 'timeFreeze', name: 'TIME FREEZE', description: 'Pauses the timer for 3 seconds', icon: '❄️', color: '#38bdf8', cost: 200, duration: 3000 },
  shield: { type: 'shield', name: 'SHIELD', description: 'Blocks XP loss from one wrong answer', icon: '🛡️', color: '#a78bfa', cost: 150 },
  hint: { type: 'hint', name: 'HINT', description: 'Reveals the first step of the solution', icon: '💡', color: '#fbbf24', cost: 100 },
  doubleXP: { type: 'doubleXP', name: 'DOUBLE XP', description: 'Next win gives 2x XP', icon: '⭐', color: '#34d399', cost: 300 },
  comboBoost: { type: 'comboBoost', name: 'COMBO+', description: 'Combo multiplier +1 for next answer', icon: '🔥', color: '#f97316', cost: 250 },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'speed' | 'accuracy' | 'streak' | 'mastery' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition: (stats: BTMStats) => boolean
  xpReward: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANTI-CHEAT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface KeystrokeData {
  timestamps: number[]      // ms offsets from first keystroke
  chars: string[]           // characters typed
  totalDuration: number     // ms from first to last keystroke
  isPaste: boolean          // detected paste event
  isSuspicious: boolean     // flagged as potentially AI-assisted
  suspiciousReason?: string
}

export interface VerificationChallenge {
  id: string
  question: string
  options: string[]
  correctIndex: number
  concept: string          // which concept the original problem tested
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BOSS BATTLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BossBattle {
  id: string
  name: string
  description: string
  phases: BossPhase[]
  color: string
  icon: string
}

export interface BossPhase {
  problem: BTMProblem
  benchmark: BTMBenchmark
  timeLimit: number   // ms - stricter than normal
  phaseNumber: number
  totalPhases: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOWER CLIMB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TowerFloor {
  floor: number
  problem: BTMProblem
  benchmark: BTMBenchmark
  bonusXP: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COSMETICS / SHOP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CosmeticItem {
  id: string
  name: string
  type: 'theme' | 'frame' | 'effect' | 'title'
  cost: number          // XP cost
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  preview: string       // CSS class or color
  description: string
}

export interface CosmeticState {
  equippedTheme: string    // theme id
  equippedFrame: string    // frame id
  equippedEffect: string   // effect id
  equippedTitle: string    // title id
  owned: string[]          // owned cosmetic ids
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// XP & LEVELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

// ─── Combo Multiplier ─────────────────────────────────────
export function getComboMultiplier(combo: number): number {
  if (combo < 2) return 1
  if (combo < 5) return 1.5
  if (combo < 10) return 2
  if (combo < 20) return 3
  if (combo < 30) return 4
  return 5
}

export function getComboColor(combo: number): string {
  if (combo < 2) return '#94a3b8'
  if (combo < 5) return '#fbbf24'
  if (combo < 10) return '#f97316'
  if (combo < 20) return '#ef4444'
  if (combo < 30) return '#a855f7'
  return '#f43f5e'
}
