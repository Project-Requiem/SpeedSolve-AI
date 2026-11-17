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
import type { BTMLevel } from './types'
import { RelicSlot, Relic, ALL_RELICS, getRelicById, computeGearEffects, GearEffects } from './relics'
import { BOSSES, Boss, getBossByWorldId, getBossById } from './bosses'
import { Quest, QuestProgress, generateDailyQuests, generateWeeklyQuests } from './quests'

// ─── Types ──────────────────────────────────────────────────
type Screen =
  | 'setup'
  | 'home'
  | 'journey'
  | 'worldMap'
  | 'levelPlay'
  | 'bossIntro'
  | 'bossVictory'
  | 'bossDefeat'
  | 'loading'
  | 'challenge'
  | 'result'
  | 'stats'
  | 'tower'
  | 'towerResult'
  | 'shop'
  | 'achievements'
  | 'verification'
  | 'quests'
  | 'gear'

interface ResultData {
  userTimeMs: number
  aiTimeMs: number
  correct: boolean
  validation: BTMValidationResponse | null
  xpGained: number
  goldGained: number
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
  isBoss: boolean
  bossId: string | null
  forgivenUsed: boolean
}

export interface BossVictoryState {
  bossId: string
  firstClear: boolean
  relicId: string
  goldEarned: number
  xpEarned: number
  rank: string
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

  // ── Gold economy ──
  gold: number                       // currency for the Armory & power-ups
  earnGold: (amount: number) => void
  spendGold: (amount: number) => boolean

  // ── Boss state ──
  activeBoss: Boss | null            // boss currently fought
  bossVictory: BossVictoryState | null
  startBossBattle: (bossId: string) => Promise<void>
  startBossIntro: (bossId: string) => void
  dismissBossVictory: () => void

  // ── Gear (equipment) state ──
  ownedRelics: string[]              // relic ids
  equippedRelics: Record<RelicSlot, string | null>  // one relic per slot
  getGearEffects: () => GearEffects  // active passives from equipped gear

  // ── Quest state ──
  activeQuests: QuestProgress[]      // current daily/weekly contracts
  lastQuestRefresh: string           // YYYY-MM-DD

  // Actions
  generateChallenge: (difficulty: BTMDifficulty, subject: BTMSubject, daily?: boolean) => Promise<void>
  startTimer: () => void
  stopTimer: () => number
  submitAnswer: () => Promise<void>
  rematch: () => void
  goToHome: () => void

  // ── Gear actions ──
  buyRelic: (relicId: string) => void
  equipRelic: (relicId: string, slot: RelicSlot) => void
  unequipRelic: (slot: RelicSlot) => void

  // ── Quest actions ──
  refreshQuests: () => void
  updateQuestProgress: (type: string, amount: number) => void
  claimQuestReward: (questId: string) => void

}

export const useBTMStore = create<BTMStore>((set, get) => {
  // ── RPG persistence helper ──
  const persistRPG = () => {
    const s = get()
    saveRPGState({
      gold: s.gold,
      ownedRelics: s.ownedRelics,
      equippedRelics: s.equippedRelics,
      activeQuests: s.activeQuests,
      lastQuestRefresh: s.lastQuestRefresh,
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
    let levelDef: BTMLevel | null = null
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

    // Start with first problem — apply gear passives
    const gear = computeGearEffects(Object.values(get().equippedRelics))
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
        isBoss: levelDef.isBoss,
        bossId: levelDef.isBoss ? getBossByWorldId(levelDef.worldId)?.id || null : null,
        forgivenUsed: false,
      },
      userInput: '',
      submitted: false,
      timerRunning: false,
      timerStartedAt: null,
      elapsedMs: 0,
      keystrokeTracker: tracker,
      keystrokeData: null,
      activePowerUps: [],
      shieldActive: gear.startShields > 0,
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

    // Gear passives
    const gear = computeGearEffects(Object.values(get().equippedRelics))
    const graceMult = 1 + gear.timeGracePct / 100
    const isWin = validation.correct && userTimeMs < benchmark.aiTimeMs * graceMult

    // Second Chance: forgive the first wrong answer of the battle
    let forgiven = false
    if (!validation.correct && !levelPlay.forgivenUsed && gear.secondChance > 0 && !levelPlay.forgivenUsed) {
      forgiven = true
    }
    const effectiveCorrect = validation.correct || forgiven

    // Gold from this problem
    let goldGained = 0
    if (isWin) {
      goldGained += 12
      if (userTimeMs < benchmark.aiTimeMs * 0.5) goldGained += 6
      goldGained = Math.round(goldGained * (1 + gear.goldBoostPct / 100))
    }

    // Update level play state
    const newUserTimes = [...levelPlay.userTimes, userTimeMs]
    const newResults = [...levelPlay.results, effectiveCorrect]
    const nextIndex = levelPlay.currentIndex + 1
    const isComplete = nextIndex >= levelPlay.problems.length

    // Calculate stars if complete
    let stars = 0
    if (isComplete) {
      stars = calculateStars(newUserTimes, levelPlay.benchmarks.map(b => b.aiTimeMs))
    }

    // XP for this problem
    let xpGained = 0
    if (forgiven) {
      xpGained = 0  // forgiven mistake: survive, but no XP
    } else if (isWin) {
      xpGained += DIFFICULTY_XP[problem.difficulty]
      // Speed bonus
      if (userTimeMs < benchmark.aiTimeMs * 0.5) xpGained += 50
      xpGained = Math.round(xpGained * (1 + gear.xpBoostPct / 100))
    } else if (validation.correct) {
      xpGained += Math.floor(DIFFICULTY_XP[problem.difficulty] * 0.3)
      xpGained = Math.round(xpGained * (1 + gear.xpBoostPct / 100))
    } else {
      xpGained = -(problem.difficulty === 'rookie' ? 10 : problem.difficulty === 'scholar' ? 20 : 35)
    }

    // Combo
    const newCombo = (isWin || forgiven) ? stats.combo + 1 : 0
    const comboMult = getComboMultiplier(newCombo) + gear.comboPower

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
      // Level complete — check for Machine Lord conquest
      let bossVictoryState: BossVictoryState | null = null
      let finalStats = newStats
      let finalGold = goldGained

      if (levelPlay.isBoss && levelPlay.bossId && stars > 0) {
        const boss = getBossById(levelPlay.bossId)
        if (boss) {
          const firstClear = !newStats.bossDefeated.includes(boss.id)
          const goldFromBoss = Math.round((firstClear ? boss.drops.gold : Math.round(boss.drops.gold * 0.3)) * (1 + gear.goldBoostPct / 100))
          const xpFromBoss = Math.round((firstClear ? boss.drops.xp : Math.round(boss.drops.xp * 0.3)) * (1 + gear.xpBoostPct / 100))
          finalGold += goldFromBoss

          const completedBosses = firstClear ? [...newStats.bossDefeated, boss.id] : newStats.bossDefeated
          const newXPWithBoss = newStats.xp + xpFromBoss
          finalStats = {
            ...newStats,
            xp: newXPWithBoss,
            totalXP: newStats.totalXP + xpFromBoss,
            level: getLevelFromXP(newXPWithBoss),
            bossDefeated: completedBosses,
          }

          if (firstClear) {
            // Grant the boss artifact — auto-equip into its slot
            const relic = getRelicById(boss.drops.relicId)
            const currentOwned = get().ownedRelics
            const currentEquipped = get().equippedRelics
            const newOwned = currentOwned.includes(boss.drops.relicId)
              ? currentOwned
              : [...currentOwned, boss.drops.relicId]
            const equipped = relic
              ? { ...currentEquipped, [relic.slot]: relic.id }
              : currentEquipped
            bossVictoryState = {
              bossId: boss.id,
              firstClear: true,
              relicId: boss.drops.relicId,
              goldEarned: goldFromBoss,
              xpEarned: xpFromBoss,
              rank: boss.drops.rank,
              stars,
            }
            set({ ownedRelics: newOwned, equippedRelics: equipped, gold: get().gold + finalGold })
            persistRPG()
          } else {
            bossVictoryState = {
              bossId: boss.id,
              firstClear: false,
              relicId: boss.drops.relicId,
              goldEarned: goldFromBoss,
              xpEarned: xpFromBoss,
              rank: boss.drops.rank,
              stars,
            }
            set({ gold: get().gold + finalGold })
            persistRPG()
          }
        }
      } else if (goldGained > 0) {
        set({ gold: get().gold + goldGained })
        persistRPG()
      }

      // Quest progress hooks
      get().updateQuestProgress('level', 1)
      if (stars >= 3) get().updateQuestProgress('stars', 1)
      if (levelPlay.isBoss && stars > 0) get().updateQuestProgress('boss', 1)

      set({
        stats: finalStats,
        problem: null,
        benchmark: null,
        result: {
          userTimeMs,
          aiTimeMs: benchmark.aiTimeMs,
          correct: effectiveCorrect,
          validation,
          xpGained,
          goldGained: finalGold,
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
          forgivenUsed: levelPlay.forgivenUsed || forgiven,
        },
        bossVictory: bossVictoryState,
        screen: bossVictoryState ? 'bossVictory' : (levelPlay.isBoss ? 'bossDefeat' : 'result'),
        achievementPopup,
        comboDisplay: newCombo,
      })
    } else {
      // Next problem in level
      const tracker = createKeystrokeTracker()
      if (goldGained > 0) {
        set({ gold: get().gold + goldGained })
        persistRPG()
      }
      // Quest progress hooks
      get().updateQuestProgress('win', isWin ? 1 : 0)
      if (isWin) get().updateQuestProgress('combo', 1)
      if (isWin && userTimeMs < benchmark.aiTimeMs * 0.5) get().updateQuestProgress('speed', 1)
      set({
        stats: newStats,
        problem: levelPlay.problems[nextIndex],
        benchmark: levelPlay.benchmarks[nextIndex],
        levelPlay: {
          ...levelPlay,
          currentIndex: nextIndex,
          userTimes: newUserTimes,
          results: newResults,
          forgivenUsed: levelPlay.forgivenUsed || forgiven,
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
    if (isWin) {
      const goldT = Math.round((10 + tower.currentFloor * 4) * (1 + computeGearEffects(Object.values(get().equippedRelics)).goldBoostPct / 100))
      set({ gold: get().gold + goldT })
      persistRPG()
      get().updateQuestProgress('tower', 1)
    }

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
    const base = POWER_UPS[type].cost
    const gearS = computeGearEffects(Object.values(get().equippedRelics))
    const cost = type === 'hint'
      ? Math.round(base * (1 - Math.min(gearS.hintDiscountPct, 80) / 100))
      : base
    if (!get().spendGold(cost)) return false

    const stats = get().stats
    const newPowerUps = { ...stats.powerUps, [type]: (stats.powerUps[type] || 0) + 1 }
    const newStats = { ...stats, powerUps: newPowerUps }
    saveStats(newStats)
    set({ stats: newStats })
    return true
  },

  buyCosmetic: (id, cost) => {
    const { stats } = get()
    if (stats.cosmetics.owned.includes(id)) return false
    if (!get().spendGold(cost)) return false

    const newCosmetics = { ...stats.cosmetics, owned: [...stats.cosmetics.owned, id] }
    const newStats = { ...stats, cosmetics: newCosmetics }
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

  // ── Gold economy ──
  gold: loadRPGState().gold,
  earnGold: (amount) => {
    set(s => ({ gold: s.gold + amount }))
    persistRPG()
  },
  spendGold: (amount) => {
    if (get().gold < amount) return false
    set(s => ({ gold: s.gold - amount }))
    persistRPG()
    return true
  },

  // ── Boss state ──
  activeBoss: null,
  bossVictory: null,
  startBossIntro: (bossId) => {
    const boss = getBossById(bossId)
    if (!boss) return
    set({ activeBoss: boss, screen: 'bossIntro' })
  },
  startBossBattle: async (bossId) => {
    const boss = getBossById(bossId)
    if (!boss) return
    set({ activeBoss: boss })
    await get().startLevel(`${boss.worldId}-5`)
  },
  dismissBossVictory: () => {
    set({ bossVictory: null, screen: 'journey' })
  },

  // ── Gear state ──
  ownedRelics: loadRPGState().ownedRelics,
  equippedRelics: loadRPGState().equippedRelics,
  getGearEffects: () => {
    const { equippedRelics } = get()
    return computeGearEffects(Object.values(equippedRelics))
  },

  // ── Quest state ──
  activeQuests: loadRPGState().activeQuests,
  lastQuestRefresh: loadRPGState().lastQuestRefresh,

  // ── Actions ──
  generateChallenge: async (difficulty, subject, daily = false) => {
    const tracker = createKeystrokeTracker()
    const gear0 = computeGearEffects(Object.values(get().equippedRelics))
    set({ screen: 'loading', submitted: false, userInput: '', result: null, timerRunning: false, timerStartedAt: null, elapsedMs: 0, keystrokeTracker: tracker, keystrokeData: null, activePowerUps: [], shieldActive: gear0.startShields > 0, hintRevealed: false, doubleXPActive: false, timeFreezeEnd: null })
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

    // Calculate XP and update stats — gear passives apply here too
    const gearC = computeGearEffects(Object.values(get().equippedRelics))
    const graceMultC = 1 + gearC.timeGracePct / 100
    let goldGainedC = 0
    let xpGained = 0
    const isWin = validation.correct && userTimeMs < benchmark.aiTimeMs * graceMultC
    const isLoss = validation.correct && userTimeMs >= benchmark.aiTimeMs * graceMultC
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

    // Gold (quick challenge)
    if (isWin) {
      goldGainedC = Math.round((12 + (userTimeMs < benchmark.aiTimeMs * 0.5 ? 6 : 0)) * (1 + gearC.goldBoostPct / 100))
      set({ gold: get().gold + goldGainedC })
      persistRPG()
      get().updateQuestProgress('win', 1)
      get().updateQuestProgress('combo', 1)
      if (userTimeMs < benchmark.aiTimeMs * 0.5) get().updateQuestProgress('speed', 1)
    }

    // Combo
    const newCombo = isWin ? stats.combo + 1 : 0
    const comboMultiplier = getComboMultiplier(newCombo) + gearC.comboPower
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
    let verificationChallenge: VerificationChallenge | null = null
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
        goldGained: goldGainedC,
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
  // ── Relic actions ──
  buyRelic: (relicId) => {
    const { ownedRelics } = get()
    const relic = getRelicById(relicId)
    if (!relic || relic.bossDrop) return
    if (ownedRelics.includes(relicId)) return
    if (!get().spendGold(relic.cost)) return

    set({ ownedRelics: [...ownedRelics, relicId] })
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

    // Add XP + gold reward
    const questGold = questDef.reward.gold || 60
    const newStats = { ...stats, xp: stats.xp + questDef.reward.xp, totalXP: stats.totalXP + questDef.reward.xp }
    saveStats(newStats)
    set({ gold: get().gold + questGold })

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
