import { create } from 'zustand'
import {
  BTMProblem, BTMBenchmark, BTMDifficulty, BTMSubject,
  BTMStats, BTMHistoryEntry, BTMValidationResponse,
  DIFFICULTY_XP, getLevelFromXP, getXPForNextLevel,
  PowerUpType, POWER_UPS, getComboMultiplier,
  KeystrokeData, VerificationChallenge,
} from './types'
import { loadStats, saveStats, addHistoryEntry, getSubjectStats, getDifficultyStats, loadRPGState, saveRPGState } from './storage'
import { validateAnswer } from './answer-validator'
import { BTMUser, getActiveUser, createUser, switchUser, getAllUsers, updateUserActivity } from './user'
import { checkNewAchievements } from './achievements'
import { createKeystrokeTracker, shouldTriggerVerification, generateVerificationChallenge, analyzeAnswerTiming } from './antiCheat'
import { WORLDS, calculateStars, getTotalStars } from './worldLevels'
import { Element, MonsterRarity, EvolutionStage, MindBeast, MonsterAbility, ALL_BEASTS, getCaptureChance } from './monsters'
import { RelicSlot, Relic, ALL_RELICS } from './relics'
import { Quest, QuestProgress, generateDailyQuests, generateWeeklyQuests } from './quests'

// ─── Types ──────────────────────────────────────────────────
type Screen =
  | 'setup'
  | 'home'
  | 'worldMap'
  | 'levelPlay'
  | 'loading'
  | 'challenge'
  | 'result'
  | 'stats'
  | 'tower'
  | 'towerResult'
  | 'shop'
  | 'achievements'
  | 'bossBattle'
  | 'bossResult'
  | 'verification'
  | 'collection'
  | 'codex'
  | 'monsterLab'
  | 'battleArena'
  | 'quests'
  | 'relics'
  | 'adventure'
  | 'beastDetail'

interface ResultData {
  userTimeMs: number
  aiTimeMs: number
  correct: boolean
  validation: BTMValidationResponse | null
  xpGained: number
  isPersonalBest: boolean
  wasStreakMilestone: boolean
  newLevel: number | null
  comboCount: number
  comboMultiplier: number
  newAchievements: string[]
  needsVerification: boolean
}

interface LevelPlayState {
  levelId: string
  problems: BTMProblem[]
  benchmarks: BTMBenchmark[]
  currentIndex: number
  userTimes: number[]
  results: boolean[]
  completed: boolean
  stars: number
}

interface TowerState {
  currentFloor: number
  problem: BTMProblem | null
  benchmark: BTMBenchmark | null
  userTimeMs: number
  correct: boolean
  totalBonusXP: number
}

// ─── RPG Types ────────────────────────────────────────────────
export interface CapturedBeast {
  instanceId: string   // unique id for this specific captured instance
  beastId: string      // references MindBeast.id
  level: number        // 1-50
  xp: number           // XP towards next level
  abilitiesUnlocked: string[]  // ability ids unlocked
  nickname?: string
  capturedAt: string   // date
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

  // Input & Anti-cheat
  userInput: string
  setUserInput: (v: string) => void
  submitted: boolean
  keystrokeTracker: ReturnType<typeof createKeystrokeTracker> | null
  keystrokeData: KeystrokeData | null

  // Active Power-ups
  activePowerUps: PowerUpType[]
  usePowerUp: (type: PowerUpType) => void
  timeFreezeEnd: number | null  // performance.now() when freeze ends
  shieldActive: boolean
  hintRevealed: boolean
  doubleXPActive: boolean

  // Result
  result: ResultData | null

  // Verification (anti-cheat)
  verificationChallenge: VerificationChallenge | null
  verificationPending: boolean
  verificationPassed: boolean | null
  submitVerification: (selectedIndex: number) => void

  // Stats
  stats: BTMStats
  refreshStats: () => void

  // Level Play
  levelPlay: LevelPlayState | null
  startLevel: (levelId: string) => Promise<void>
  submitLevelAnswer: () => Promise<void>

  // Tower Climb
  tower: TowerState | null
  startTower: () => Promise<void>
  submitTowerAnswer: () => Promise<void>
  nextTowerFloor: () => Promise<void>

  // Shop
  buyPowerUp: (type: PowerUpType) => boolean
  buyCosmetic: (id: string, cost: number) => boolean
  equipCosmetic: (type: 'theme' | 'frame' | 'effect' | 'title', id: string) => void

  // Achievement notifications
  achievementPopup: { id: string; name: string; icon: string; rarity: string } | null
  dismissAchievementPopup: () => void

  // Combo display
  comboDisplay: number
  comboFadeTimer: ReturnType<typeof setTimeout> | null

  // ── Monster collection state ──
  capturedBeasts: CapturedBeast[]
  activeTeam: string[]               // instanceIds of 3-5 monsters in active team (max 5)
  selectedBeast: string | null       // currently viewed beast id

  // ── Relic state ──
  ownedRelics: string[]              // relic ids
  equippedRelics: Record<RelicSlot, string | null>  // one relic per slot

  // ── Quest state ──
  activeQuests: QuestProgress[]      // current daily/weekly quests
  lastQuestRefresh: string           // YYYY-MM-DD

  // ── Adventure state ──
  adventureProgress: Record<string, boolean>  // node id → completed
  currentRegion: string              // current region id

  // Actions
  generateChallenge: (difficulty: BTMDifficulty, subject: BTMSubject, daily?: boolean) => Promise<void>
  startTimer: () => void
  stopTimer: () => number
  submitAnswer: () => Promise<void>
  rematch: () => void
  goToHome: () => void

  // ── Monster actions ──
  captureBeast: (beastId: string) => void
  addToTeam: (instanceId: string) => void
  removeFromTeam: (instanceId: string) => void
  levelUpBeast: (instanceId: string, xpGained: number) => void
  evolveBeast: (instanceId: string) => void
  feedBeast: (instanceId: string, xpAmount: number) => void
  renameBeast: (instanceId: string, nickname: string) => void
  selectBeast: (beastId: string) => void

  // ── Relic actions ──
  buyRelic: (relicId: string) => void
  equipRelic: (relicId: string, slot: RelicSlot) => void
  unequipRelic: (slot: RelicSlot) => void

  // ── Quest actions ──
  refreshQuests: () => void
  updateQuestProgress: (type: string, amount: number) => void
  claimQuestReward: (questId: string) => void

  // ── Adventure actions ──
  completeAdventureNode: (nodeId: string) => void
  setRegion: (regionId: string) => void
}

export const useBTMStore = create<BTMStore>((set, get) => {
  // ── RPG persistence helper ──
  const persistRPG = () => {
    const s = get()
    saveRPGState({
      capturedBeasts: s.capturedBeasts,
      activeTeam: s.activeTeam,
      selectedBeast: s.selectedBeast,
      ownedRelics: s.ownedRelics,
      equippedRelics: s.equippedRelics,
      activeQuests: s.activeQuests,
      lastQuestRefresh: s.lastQuestRefresh,
      adventureProgress: s.adventureProgress,
      currentRegion: s.currentRegion,
    })
  }

  return {
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

  // ── Input & Anti-cheat ──
  userInput: '',
  setUserInput: (v) => {
    set({ userInput: v })
    // Track keystrokes for anti-cheat
    const tracker = get().keystrokeTracker
    if (tracker && v.length > 0) {
      tracker.record(v[v.length - 1])
    }
  },
  submitted: false,
  keystrokeTracker: null,
  keystrokeData: null,

  // ── Active Power-ups ──
  activePowerUps: [],
  usePowerUp: (type) => {
    const { stats } = get()
    const inventory = stats.powerUps[type] || 0
    if (inventory <= 0) return

    const newPowerUps = { ...stats.powerUps, [type]: inventory - 1 }
    const newStats = { ...stats, powerUps: newPowerUps }
    saveStats(newStats)

    set(s => ({
      stats: newStats,
      activePowerUps: [...s.activePowerUps, type],
      timeFreezeEnd: type === 'timeFreeze' ? performance.now() + 3000 : s.timeFreezeEnd,
      shieldActive: type === 'shield' ? true : s.shieldActive,
      hintRevealed: type === 'hint' ? true : s.hintRevealed,
      doubleXPActive: type === 'doubleXP' ? true : s.doubleXPActive,
    }))
  },
  timeFreezeEnd: null,
  shieldActive: false,
  hintRevealed: false,
  doubleXPActive: false,

  // ── Result ──
  result: null,

  // ── Verification ──
  verificationChallenge: null,
  verificationPending: false,
  verificationPassed: null,
  submitVerification: (selectedIndex) => {
    const { verificationChallenge, result, stats } = get()
    if (!verificationChallenge || !result) return

    const passed = selectedIndex === verificationChallenge.correctIndex
    let xpAdjust = 0
    if (!passed) {
      // Failed verification — reduce XP reward
      xpAdjust = -Math.floor(result.xpGained * 0.5)
    }

    const newXP = Math.max(0, stats.xp + xpAdjust)
    const newStats = { ...stats, xp: newXP }
    saveStats(newStats)

    set({
      verificationPassed: passed,
      verificationPending: false,
      stats: newStats,
      result: { ...result, xpGained: result.xpGained + xpAdjust },
    })
  },

  // ── Stats ──
  stats: loadStats(),
  refreshStats: () => set({ stats: loadStats() }),

  // ── Level Play ──
  levelPlay: null,
  startLevel: async (levelId) => {
    // Find the level definition
    let levelDef = null
    for (const world of WORLDS) {
      const found = world.levels.find(l => l.id === levelId)
      if (found) { levelDef = found; break }
    }
    if (!levelDef) return

    set({ screen: 'loading' })

    // Generate all problems for this level
    const problems: BTMProblem[] = []
    const benchmarks: BTMBenchmark[] = []

    for (let i = 0; i < levelDef.problemCount; i++) {
      try {
        const res = await fetch('/api/btm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate', subject: levelDef.subject, difficulty: levelDef.difficulty, attemptCount: i }),
        })
        const data = await res.json()
        if (data.problem && data.benchmark) {
          problems.push(data.problem)
          benchmarks.push(data.benchmark)
        }
      } catch {
        // skip on error
      }
    }

    if (problems.length === 0) {
      set({ screen: 'worldMap' })
      return
    }

    // Start with first problem
    const tracker = createKeystrokeTracker()
    set({
      screen: 'levelPlay',
      problem: problems[0],
      benchmark: benchmarks[0],
      levelPlay: {
        levelId,
        problems,
        benchmarks,
        currentIndex: 0,
        userTimes: [],
        results: [],
        completed: false,
        stars: 0,
      },
      userInput: '',
      submitted: false,
      timerRunning: false,
      timerStartedAt: null,
      elapsedMs: 0,
      keystrokeTracker: tracker,
      keystrokeData: null,
      activePowerUps: [],
      shieldActive: false,
      hintRevealed: false,
      doubleXPActive: false,
      timeFreezeEnd: null,
    })
  },

  submitLevelAnswer: async () => {
    const { problem, userInput, benchmark, levelPlay, stats, keystrokeTracker } = get()
    if (!problem || !benchmark || !userInput.trim() || !levelPlay) return

    set({ submitted: true })
    const userTimeMs = get().stopTimer()
    const validation = validateAnswer(userInput, problem)
    const ksData = keystrokeTracker?.getData() || null

    const isWin = validation.correct && userTimeMs < benchmark.aiTimeMs

    // Update level play state
    const newUserTimes = [...levelPlay.userTimes, userTimeMs]
    const newResults = [...levelPlay.results, validation.correct]
    const nextIndex = levelPlay.currentIndex + 1
    const isComplete = nextIndex >= levelPlay.problems.length

    // Calculate stars if complete
    let stars = 0
    if (isComplete) {
      stars = calculateStars(newUserTimes, levelPlay.benchmarks.map(b => b.aiTimeMs))
    }

    // XP for this problem
    let xpGained = 0
    if (isWin) {
      xpGained += DIFFICULTY_XP[problem.difficulty]
      // Speed bonus
      if (userTimeMs < benchmark.aiTimeMs * 0.5) xpGained += 50
    } else if (validation.correct) {
      xpGained += Math.floor(DIFFICULTY_XP[problem.difficulty] * 0.3)
    } else {
      xpGained = -(problem.difficulty === 'rookie' ? 10 : problem.difficulty === 'scholar' ? 20 : 35)
    }

    // Combo
    const newCombo = isWin ? stats.combo + 1 : 0
    const comboMult = getComboMultiplier(newCombo)

    // Update stats
    const newXP = Math.max(0, stats.xp + xpGained)
    const newTotalXP = stats.totalXP + Math.max(0, xpGained)

    // Check achievements
    const newUnlocked = [...stats.unlockedAchievements]
    const achievements = checkNewAchievements(
      { ...stats, xp: newXP, totalXP: newTotalXP, combo: newCombo },
      newUnlocked,
    )
    achievements.forEach(a => {
      newUnlocked.push(a.id)
      // Show popup for first one
    })

    // Update level completion
    const completedLevels = [...stats.completedLevels]
    const levelStars = { ...stats.levelStars }
    if (isComplete && stars > 0) {
      if (!completedLevels.includes(levelPlay.levelId)) {
        completedLevels.push(levelPlay.levelId)
      }
      levelStars[levelPlay.levelId] = Math.max(levelStars[levelPlay.levelId] || 0, stars)
    }

    // Update heat streak
    const today = new Date().toISOString().slice(0, 10)
    const lastPlay = stats.lastPlayDate
    let heatStreak = stats.heatStreak
    if (lastPlay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      heatStreak = lastPlay === yesterday ? heatStreak + 1 : 1
    }

    const newStats: BTMStats = {
      ...stats,
      xp: newXP,
      totalXP: newTotalXP,
      level: getLevelFromXP(newXP),
      totalWins: stats.totalWins + (isWin ? 1 : 0),
      totalLosses: stats.totalLosses + (validation.correct && !isWin ? 1 : 0),
      totalWrong: stats.totalWrong + (!validation.correct ? 1 : 0),
      streak: isWin ? stats.streak + 1 : 0,
      bestStreak: Math.max(stats.bestStreak, isWin ? stats.streak + 1 : 0),
      combo: newCombo,
      bestCombo: Math.max(stats.bestCombo, newCombo),
      bestTimeMs: isWin && (!stats.bestTimeMs || userTimeMs < stats.bestTimeMs) ? userTimeMs : stats.bestTimeMs,
      problemsAttempted: stats.problemsAttempted + 1,
      unlockedAchievements: newUnlocked,
      completedLevels,
      levelStars,
      heatStreak,
      lastPlayDate: today,
    }
    saveStats(newStats)
    updateUserActivity()

    // Achievement popup
    const achievementPopup = achievements.length > 0
      ? { id: achievements[0].id, name: achievements[0].name, icon: achievements[0].icon, rarity: achievements[0].rarity }
      : null

    if (isComplete) {
      // Level complete - show result
      set({
        stats: newStats,
        problem: null,
        benchmark: null,
        result: {
          userTimeMs,
          aiTimeMs: benchmark.aiTimeMs,
          correct: validation.correct,
          validation,
          xpGained,
          isPersonalBest: false,
          wasStreakMilestone: false,
          newLevel: null,
          comboCount: newCombo,
          comboMultiplier: comboMult,
          newAchievements: achievements.map(a => a.id),
          needsVerification: false,
        },
        levelPlay: {
          ...levelPlay,
          currentIndex: nextIndex,
          userTimes: newUserTimes,
          results: newResults,
          completed: true,
          stars,
        },
        screen: 'result',
        achievementPopup,
        comboDisplay: newCombo,
      })
    } else {
      // Next problem in level
      const tracker = createKeystrokeTracker()
      set({
        stats: newStats,
        problem: levelPlay.problems[nextIndex],
        benchmark: levelPlay.benchmarks[nextIndex],
        levelPlay: {
          ...levelPlay,
          currentIndex: nextIndex,
          userTimes: newUserTimes,
          results: newResults,
        },
        userInput: '',
        submitted: false,
        timerRunning: false,
        timerStartedAt: null,
        elapsedMs: 0,
        keystrokeTracker: tracker,
        keystrokeData: ksData,
        achievementPopup,
        comboDisplay: newCombo,
      })
    }
  },

  // ── Tower Climb ──
  tower: null,
  startTower: async () => {
    set({ screen: 'loading' })
    try {
      const res = await fetch('/api/btm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', subject: 'mathematics', difficulty: 'rookie', attemptCount: 0 }),
      })
      const data = await res.json()
      if (data.problem && data.benchmark) {
        const tracker = createKeystrokeTracker()
        set({
          screen: 'tower',
          problem: data.problem,
          benchmark: data.benchmark,
          tower: {
            currentFloor: 1,
            problem: data.problem,
            benchmark: data.benchmark,
            userTimeMs: 0,
            correct: false,
            totalBonusXP: 0,
          },
          userInput: '',
          submitted: false,
          timerRunning: false,
          timerStartedAt: null,
          elapsedMs: 0,
          keystrokeTracker: tracker,
        })
      }
    } catch {
      set({ screen: 'home' })
    }
  },

  submitTowerAnswer: async () => {
    const { problem, userInput, benchmark, tower, stats } = get()
    if (!problem || !benchmark || !userInput.trim() || !tower) return

    set({ submitted: true })
    const userTimeMs = get().stopTimer()
    const validation = validateAnswer(userInput, problem)
    const isWin = validation.correct && userTimeMs < benchmark.aiTimeMs

    const bonusXP = isWin ? tower.currentFloor * 20 : 0

    const newStats = {
      ...stats,
      towerFloor: Math.max(stats.towerFloor, isWin ? tower.currentFloor : tower.currentFloor - 1),
      xp: Math.max(0, stats.xp + bonusXP),
      totalXP: stats.totalXP + bonusXP,
    }
    saveStats(newStats)

    set({
      tower: { ...tower, userTimeMs, correct: isWin, totalBonusXP: tower.totalBonusXP + bonusXP },
      stats: newStats,
      screen: isWin ? 'tower' : 'towerResult',
      timerRunning: false,
    })

    if (isWin) {
      // Generate next floor
      get().nextTowerFloor()
    }
  },

  nextTowerFloor: async () => {
    const { tower, stats } = get()
    if (!tower) return

    const nextFloor = tower.currentFloor + 1
    // Difficulty increases every 5 floors
    const difficulties: BTMDifficulty[] = ['rookie', 'scholar', 'expert', 'nightmare', 'requiem']
    const diffIndex = Math.min(Math.floor(nextFloor / 5), 4)
    const subjects: BTMSubject[] = ['mathematics', 'physics', 'chemistry']
    const subject = subjects[nextFloor % 3]

    try {
      const res = await fetch('/api/btm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', subject, difficulty: difficulties[diffIndex], attemptCount: nextFloor }),
      })
      const data = await res.json()
      if (data.problem && data.benchmark) {
        const tracker = createKeystrokeTracker()
        set({
          problem: data.problem,
          benchmark: data.benchmark,
          tower: {
            ...tower,
            currentFloor: nextFloor,
            problem: data.problem,
            benchmark: data.benchmark,
            correct: false,
          },
          userInput: '',
          submitted: false,
          timerRunning: false,
          timerStartedAt: null,
          elapsedMs: 0,
          keystrokeTracker: tracker,
        })
      }
    } catch {
      set({ screen: 'towerResult' })
    }
  },

  // ── Shop ──
  buyPowerUp: (type) => {
    const { stats } = get()
    const cost = POWER_UPS[type].cost
    if (stats.xp < cost) return false

    const newPowerUps = { ...stats.powerUps, [type]: (stats.powerUps[type] || 0) + 1 }
    const newStats = { ...stats, xp: stats.xp - cost, powerUps: newPowerUps }
    saveStats(newStats)
    set({ stats: newStats })
    return true
  },

  buyCosmetic: (id, cost) => {
    const { stats } = get()
    if (stats.xp < cost || stats.cosmetics.owned.includes(id)) return false

    const newCosmetics = { ...stats.cosmetics, owned: [...stats.cosmetics.owned, id] }
    const newStats = { ...stats, xp: stats.xp - cost, cosmetics: newCosmetics }
    saveStats(newStats)
    set({ stats: newStats })
    return true
  },

  equipCosmetic: (type, id) => {
    const { stats } = get()
    if (!stats.cosmetics.owned.includes(id)) return

    const newCosmetics = { ...stats.cosmetics }
    switch (type) {
      case 'theme': newCosmetics.equippedTheme = id; break
      case 'frame': newCosmetics.equippedFrame = id; break
      case 'effect': newCosmetics.equippedEffect = id; break
      case 'title': newCosmetics.equippedTitle = id; break
    }
    const newStats = { ...stats, cosmetics: newCosmetics }
    saveStats(newStats)
    set({ stats: newStats })
  },

  // ── Achievement popup ──
  achievementPopup: null,
  dismissAchievementPopup: () => set({ achievementPopup: null }),

  // ── Combo display ──
  comboDisplay: 0,
  comboFadeTimer: null,

  // ── Monster collection state (loaded from localStorage) ──
  capturedBeasts: loadRPGState().capturedBeasts,
  activeTeam: loadRPGState().activeTeam,
  selectedBeast: loadRPGState().selectedBeast,

  // ── Relic state ──
  ownedRelics: loadRPGState().ownedRelics,
  equippedRelics: loadRPGState().equippedRelics,

  // ── Quest state ──
  activeQuests: loadRPGState().activeQuests,
  lastQuestRefresh: loadRPGState().lastQuestRefresh,

  // ── Adventure state ──
  adventureProgress: loadRPGState().adventureProgress,
  currentRegion: loadRPGState().currentRegion,

  // ── Actions ──
  generateChallenge: async (difficulty, subject, daily = false) => {
    const tracker = createKeystrokeTracker()
    set({ screen: 'loading', submitted: false, userInput: '', result: null, timerRunning: false, timerStartedAt: null, elapsedMs: 0, keystrokeTracker: tracker, keystrokeData: null, activePowerUps: [], shieldActive: false, hintRevealed: false, doubleXPActive: false, timeFreezeEnd: null })
    try {
      const stats = get().stats
      const diffStats = stats.difficultyStats[difficulty]
      const attemptCount = diffStats ? diffStats.wins + diffStats.losses + diffStats.wrong : 0

      const res = await fetch('/api/btm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: daily ? 'daily' : 'generate', subject, difficulty, attemptCount }),
      })
      const data = await res.json()
      if (data.problem) {
        set({ problem: data.problem, benchmark: data.benchmark, isDaily: daily, screen: 'challenge' })
      } else {
        const retry = await fetch('/api/btm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate', subject, difficulty, attemptCount }),
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
    const { problem, userInput, stats, benchmark, keystrokeTracker, shieldActive, doubleXPActive } = get()
    if (!problem || !benchmark || !userInput.trim()) return

    set({ submitted: true })
    const userTimeMs = get().stopTimer()
    const validation = validateAnswer(userInput, problem)
    const ksData = keystrokeTracker?.getData() || null

    // Calculate XP and update stats
    let xpGained = 0
    const isWin = validation.correct && userTimeMs < benchmark.aiTimeMs
    const isLoss = validation.correct && userTimeMs >= benchmark.aiTimeMs
    const isWrong = !validation.correct

    // Base XP
    if (isWin) xpGained += DIFFICULTY_XP[problem.difficulty]
    else if (isLoss) xpGained += Math.floor(DIFFICULTY_XP[problem.difficulty] * 0.3)
    else {
      const NEGATIVE_XP: Record<string, number> = { rookie: -10, scholar: -20, expert: -35, nightmare: -50, requiem: -75 }
      if (shieldActive) {
        xpGained = 0  // Shield blocks XP loss
      } else {
        xpGained = NEGATIVE_XP[problem.difficulty] || -25
      }
    }

    // Speed bonus
    if (isWin && userTimeMs < benchmark.aiTimeMs * 0.5) xpGained += 50

    // Double XP power-up
    if (doubleXPActive && isWin) {
      xpGained *= 2
    }

    // Personal best
    const oldBest = stats.bestTimeMs
    const isPersonalBest = isWin && (oldBest === null || userTimeMs < oldBest)
    if (isPersonalBest) xpGained += 100

    // Streak
    let newStreak = isWin ? stats.streak + 1 : 0
    const wasStreakMilestone = newStreak > 0 && newStreak % 10 === 0
    if (wasStreakMilestone) xpGained += 200

    const bestStreak = Math.max(stats.bestStreak, newStreak)

    // Combo
    const newCombo = isWin ? stats.combo + 1 : 0
    const comboMultiplier = getComboMultiplier(newCombo)
    if (isWin && newCombo >= 2) {
      xpGained = Math.floor(xpGained * comboMultiplier)
    }

    // Level check
    const newXP = Math.max(0, stats.xp + xpGained)
    const newTotalXP = stats.totalXP + Math.max(0, xpGained)
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

    // Heat streak
    const today = new Date().toISOString().slice(0, 10)
    const lastPlay = stats.lastPlayDate
    let heatStreak = stats.heatStreak
    if (lastPlay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      heatStreak = lastPlay === yesterday ? heatStreak + 1 : 1
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

    // Check achievements
    const newUnlocked = [...stats.unlockedAchievements]
    const tempStats = {
      ...stats,
      xp: newXP, totalXP: newTotalXP, combo: newCombo, streak: newStreak,
      bestStreak, totalWins: stats.totalWins + (isWin ? 1 : 0),
      totalLosses: stats.totalLosses + (isLoss ? 1 : 0),
      totalWrong: stats.totalWrong + (isWrong ? 1 : 0),
      subjectStats: newSubjectStats,
      difficultyStats: newDifficultyStats,
    }
    const achievements = checkNewAchievements(tempStats, newUnlocked)
    achievements.forEach(a => { newUnlocked.push(a.id) })

    const newStats: BTMStats = {
      ...stats,
      xp: newXP,
      totalXP: newTotalXP,
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
      combo: newCombo,
      bestCombo: Math.max(stats.bestCombo, newCombo),
      unlockedAchievements: newUnlocked,
      heatStreak,
      lastPlayDate: today,
      history: [...stats.history, entry],
    }

    saveStats(newStats)
    updateUserActivity()

    // Check if verification needed (anti-cheat)
    const winRate = newStats.totalWins + newStats.totalLosses > 0
      ? newStats.totalWins / (newStats.totalWins + newStats.totalLosses) : 0
    const needsVerification = isWin && shouldTriggerVerification(ksData, validation.correct, problem.difficulty, winRate)
    let verificationChallenge = null
    if (needsVerification) {
      verificationChallenge = generateVerificationChallenge(problem)
    }

    const achievementPopup = achievements.length > 0
      ? { id: achievements[0].id, name: achievements[0].name, icon: achievements[0].icon, rarity: achievements[0].rarity }
      : null

    set({
      stats: newStats,
      keystrokeData: ksData,
      result: {
        userTimeMs,
        aiTimeMs: benchmark.aiTimeMs,
        correct: validation.correct,
        validation,
        xpGained,
        isPersonalBest,
        wasStreakMilestone,
        newLevel: leveledUp ? newLevel : null,
        comboCount: newCombo,
        comboMultiplier,
        newAchievements: achievements.map(a => a.id),
        needsVerification,
      },
      verificationChallenge,
      verificationPending: needsVerification,
      verificationPassed: null,
      screen: needsVerification ? 'verification' : 'result',
      achievementPopup,
      comboDisplay: newCombo,
    })
  },

  rematch: () => {
    const { difficulty, subject, problem, isDaily } = get()
    const tracker = createKeystrokeTracker()
    set({ keystrokeTracker: tracker, keystrokeData: null, activePowerUps: [], shieldActive: false, hintRevealed: false, doubleXPActive: false, timeFreezeEnd: null })
    if (isDaily) {
      get().generateChallenge('scholar', subject, true)
    } else if (problem) {
      get().generateChallenge(problem.difficulty, problem.subject)
    } else {
      get().generateChallenge(difficulty, subject)
    }
  },

  goToHome: () => set({ screen: 'home', problem: null, benchmark: null, result: null, userInput: '', submitted: false, levelPlay: null, tower: null }),

  // ── Monster actions ──
  captureBeast: (beastId) => {
    const beastDef = ALL_BEASTS.find(b => b.id === beastId)
    if (!beastDef) return

    const instanceId = `beast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    // Unlock all abilities of the base beast definition
    const initialAbilities = beastDef.abilities.map(a => a.id)

    const newBeast: CapturedBeast = {
      instanceId,
      beastId,
      level: 1,
      xp: 0,
      abilitiesUnlocked: initialAbilities,
      capturedAt: new Date().toISOString().slice(0, 10),
    }

    set(s => ({ capturedBeasts: [...s.capturedBeasts, newBeast] }))
    persistRPG()
  },

  addToTeam: (instanceId) => {
    const { activeTeam } = get()
    if (activeTeam.length >= 5) return
    if (activeTeam.includes(instanceId)) return
    set({ activeTeam: [...activeTeam, instanceId] })
    persistRPG()
  },

  removeFromTeam: (instanceId) => {
    set(s => ({ activeTeam: s.activeTeam.filter(id => id !== instanceId) }))
    persistRPG()
  },

  levelUpBeast: (instanceId, xpGained) => {
    set(s => {
      const beast = s.capturedBeasts.find(b => b.instanceId === instanceId)
      if (!beast) return s

      let newLevel = beast.level
      let newXp = beast.xp + xpGained
      const xpThreshold = () => 100 * newLevel

      // Level up loop (may level up multiple times)
      while (newXp >= xpThreshold() && newLevel < 50) {
        newXp -= xpThreshold()
        newLevel++
      }
      if (newLevel >= 50) { newXp = 0 }

      // Unlock new abilities at milestone levels (5, 10, 15, 20, 25, 30...)
      const beastDef = ALL_BEASTS.find(b => b.id === beast.beastId)
      const newAbilities = [...beast.abilitiesUnlocked]
      if (beastDef) {
        const milestoneLevels = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
        for (const ml of milestoneLevels) {
          if (beast.level < ml && newLevel >= ml) {
            // At each milestone, ensure all abilities for this beast are unlocked
            for (const a of beastDef.abilities) {
              if (!newAbilities.includes(a.id)) {
                newAbilities.push(a.id)
              }
            }
          }
        }
      }

      const updatedBeasts = s.capturedBeasts.map(b =>
        b.instanceId === instanceId
          ? { ...b, level: newLevel, xp: newXp, abilitiesUnlocked: newAbilities }
          : b
      )
      return { capturedBeasts: updatedBeasts }
    })
    persistRPG()
  },

  evolveBeast: (instanceId) => {
    const { capturedBeasts } = get()
    const beast = capturedBeasts.find(b => b.instanceId === instanceId)
    if (!beast) return

    const beastDef = ALL_BEASTS.find(b => b.id === beast.beastId)
    if (!beastDef || !beastDef.evolvesTo) return

    // Check evolution conditions
    const requiredLevel = beastDef.stage === 1 ? 15 : beastDef.stage === 2 ? 30 : 999
    if (beast.level < requiredLevel) return

    const evolvedDef = ALL_BEASTS.find(b => b.id === beastDef.evolvesTo)
    if (!evolvedDef) return

    // Create evolved beast instance
    const newInstance: CapturedBeast = {
      instanceId: `beast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      beastId: evolvedDef.id,
      level: beast.level,
      xp: beast.xp,
      abilitiesUnlocked: evolvedDef.abilities.map(a => a.id),
      nickname: beast.nickname,
      capturedAt: beast.capturedAt,
    }

    set(s => ({
      capturedBeasts: [
        ...s.capturedBeasts.filter(b => b.instanceId !== instanceId),
        newInstance,
      ],
      // Update activeTeam reference
      activeTeam: s.activeTeam.map(id => id === instanceId ? newInstance.instanceId : id),
      selectedBeast: s.selectedBeast === instanceId ? newInstance.instanceId : s.selectedBeast,
    }))
    persistRPG()
  },

  feedBeast: (instanceId, xpAmount) => {
    const { stats } = get()
    if (stats.xp < xpAmount) return

    // Deduct XP from player stats
    const newStats = { ...stats, xp: stats.xp - xpAmount }
    saveStats(newStats)
    set({ stats: newStats })

    // Apply XP to beast
    get().levelUpBeast(instanceId, xpAmount)
    persistRPG()
  },

  renameBeast: (instanceId, nickname) => {
    set(s => ({
      capturedBeasts: s.capturedBeasts.map(b =>
        b.instanceId === instanceId ? { ...b, nickname } : b
      ),
    }))
    persistRPG()
  },

  selectBeast: (beastId) => {
    set({ selectedBeast: beastId })
    persistRPG()
  },

  // ── Relic actions ──
  buyRelic: (relicId) => {
    const { stats, ownedRelics } = get()
    const relic = ALL_RELICS.find(r => r.id === relicId)
    if (!relic) return
    if (stats.xp < relic.cost) return
    if (ownedRelics.includes(relicId)) return

    const newStats = { ...stats, xp: stats.xp - relic.cost }
    saveStats(newStats)
    set({ stats: newStats, ownedRelics: [...ownedRelics, relicId] })
    persistRPG()
  },

  equipRelic: (relicId, slot) => {
    set(s => ({
      equippedRelics: { ...s.equippedRelics, [slot]: relicId },
    }))
    persistRPG()
  },

  unequipRelic: (slot) => {
    set(s => ({
      equippedRelics: { ...s.equippedRelics, [slot]: null },
    }))
    persistRPG()
  },

  // ── Quest actions ──
  refreshQuests: () => {
    const today = new Date().toISOString().slice(0, 10)
    const { lastQuestRefresh, stats } = get()
    if (lastQuestRefresh === today) return

    const dailyQuests = generateDailyQuests(stats.level)
    const weeklyQuests = generateWeeklyQuests(stats.level)
    const allQuests = [...dailyQuests, ...weeklyQuests]

    const activeQuests: QuestProgress[] = allQuests.map(q => ({
      questId: q.id,
      current: 0,
      completed: false,
      claimed: false,
    }))

    set({ activeQuests, lastQuestRefresh: today })
    persistRPG()
  },

  updateQuestProgress: (type, amount) => {
    set(s => {
      const updated = s.activeQuests.map(qp => {
        // Find the quest definition to check its type
        const allDaily = generateDailyQuests(s.stats.level)
        const allWeekly = generateWeeklyQuests(s.stats.level)
        const allQuests = [...allDaily, ...allWeekly]
        const questDef = allQuests.find(q => q.id === qp.questId)
        if (!questDef || questDef.type !== type) return qp
        if (qp.completed) return qp

        const newCurrent = qp.current + amount
        return {
          ...qp,
          current: newCurrent,
          completed: newCurrent >= questDef.target,
        }
      })
      return { activeQuests: updated }
    })
    persistRPG()
  },

  claimQuestReward: (questId) => {
    const { activeQuests, stats } = get()
    const questProgress = activeQuests.find(q => q.questId === questId)
    if (!questProgress || !questProgress.completed || questProgress.claimed) return

    // Find quest definition for reward
    const allDaily = generateDailyQuests(stats.level)
    const allWeekly = generateWeeklyQuests(stats.level)
    const allQuests = [...allDaily, ...allWeekly]
    const questDef = allQuests.find(q => q.id === questId)
    if (!questDef) return

    // Add XP reward
    const newStats = { ...stats, xp: stats.xp + questDef.reward.xp, totalXP: stats.totalXP + questDef.reward.xp }
    saveStats(newStats)

    // Mark as claimed
    const updatedQuests = activeQuests.map(q =>
      q.questId === questId ? { ...q, claimed: true } : q
    )

    // Grant relic rewards
    const newOwnedRelics = questDef.reward.relics
      ? [...get().ownedRelics, ...questDef.reward.relics]
      : get().ownedRelics

    set({ stats: newStats, activeQuests: updatedQuests, ownedRelics: newOwnedRelics })
    persistRPG()
  },

  // ── Adventure actions ──
  completeAdventureNode: (nodeId) => {
    set(s => ({
      adventureProgress: { ...s.adventureProgress, [nodeId]: true },
    }))
    persistRPG()
  },

  setRegion: (regionId) => {
    set({ currentRegion: regionId })
    persistRPG()
  },
}})

// ─── Derived helpers ────────────────────────────────────────
export function fmtTime(ms: number): string {
  if (ms < 1000) return ms.toFixed(0) + 'ms'
  if (ms < 10000) return (ms / 1000).toFixed(2) + 's'
  return (ms / 1000).toFixed(1) + 's'
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
