// ─── Beat the Machine — Daily / Weekly Quest System ───────────────────────────
// Procedurally selected objectives that reward XP, relics, and monster unlocks.

export type QuestType = 'capture' | 'win' | 'streak' | 'speed' | 'tower' | 'combo' | 'element' | 'boss'

export interface Quest {
  id: string
  name: string
  description: string
  type: QuestType
  icon: string
  target: number
  reward: {
    xp: number
    relics?: string[]
    monsters?: string[]
  }
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  timeLimit: 'daily' | 'weekly' | 'season'
  element?: string
}

export interface QuestProgress {
  questId: string
  current: number
  completed: boolean
  claimed: boolean
}

// ─── Quest template pool (40+) ────────────────────────────────────────────────

const QUEST_POOL: Quest[] = [

  // ── CAPTURE (easy → legendary) ────────────────────────────────────────────

  {
    id: 'q-cap-algebra-3',
    name: 'Algebraic Tenderfoot',
    description: 'Capture 3 Algebraic Beasts',
    type: 'capture', icon: '🧮', target: 3,
    reward: { xp: 80 },
    difficulty: 'easy', timeLimit: 'daily', element: 'algebra',
  },
  {
    id: 'q-cap-algebra-6',
    name: 'Algebraic Wrangler',
    description: 'Capture 6 Algebraic Beasts',
    type: 'capture', icon: '🧮', target: 6,
    reward: { xp: 200 },
    difficulty: 'medium', timeLimit: 'daily', element: 'algebra',
  },
  {
    id: 'q-cap-geometry-3',
    name: 'Geometry Tracker',
    description: 'Capture 3 Geometric Beasts',
    type: 'capture', icon: '📐', target: 3,
    reward: { xp: 80 },
    difficulty: 'easy', timeLimit: 'daily', element: 'geometry',
  },
  {
    id: 'q-cap-geometry-5',
    name: 'Shape Shaper',
    description: 'Capture 5 Geometric Beasts',
    type: 'capture', icon: '📐', target: 5,
    reward: { xp: 180 },
    difficulty: 'medium', timeLimit: 'daily', element: 'geometry',
  },
  {
    id: 'q-cap-calculus-3',
    name: 'Calculus Collector',
    description: 'Capture 3 Calculus Beasts',
    type: 'capture', icon: '∫', target: 3,
    reward: { xp: 120 },
    difficulty: 'medium', timeLimit: 'daily', element: 'calculus',
  },
  {
    id: 'q-cap-calculus-5',
    name: 'Derivative Hunter',
    description: 'Capture 5 Calculus Beasts',
    type: 'capture', icon: '∫', target: 5,
    reward: { xp: 280 },
    difficulty: 'hard', timeLimit: 'weekly', element: 'calculus',
  },
  {
    id: 'q-cap-statistics-4',
    name: 'Statistics Sampler',
    description: 'Capture 4 Statistical Beasts',
    type: 'capture', icon: '📊', target: 4,
    reward: { xp: 100 },
    difficulty: 'easy', timeLimit: 'daily', element: 'statistics',
  },
  {
    id: 'q-cap-any-8',
    name: 'Beast Befriender',
    description: 'Capture 8 Beasts of any kind',
    type: 'capture', icon: '🪤', target: 8,
    reward: { xp: 250 },
    difficulty: 'medium', timeLimit: 'daily',
  },
  {
    id: 'q-cap-any-15',
    name: 'Master Collector',
    description: 'Capture 15 Beasts of any kind',
    type: 'capture', icon: '🪤', target: 15,
    reward: { xp: 600 },
    difficulty: 'hard', timeLimit: 'weekly',
  },
  {
    id: 'q-cap-legendary-1',
    name: 'Legendary Tamer',
    description: 'Capture a Legendary Beast',
    type: 'capture', icon: '🌟', target: 1,
    reward: { xp: 500, relics: ['infinity-gem'] },
    difficulty: 'legendary', timeLimit: 'weekly',
  },
  {
    id: 'q-cap-mythic-1',
    name: 'Mythic Whisperer',
    description: 'Capture a Mythic Beast',
    type: 'capture', icon: '💫', target: 1,
    reward: { xp: 1000, relics: ['quantum-aura'] },
    difficulty: 'legendary', timeLimit: 'season',
  },

  // ── WIN (easy → hard) ────────────────────────────────────────────────────

  {
    id: 'q-win-3',
    name: 'Warm Up',
    description: 'Win 3 battles',
    type: 'win', icon: '🏆', target: 3,
    reward: { xp: 60 },
    difficulty: 'easy', timeLimit: 'daily',
  },
  {
    id: 'q-win-5',
    name: 'Getting Serious',
    description: 'Win 5 battles',
    type: 'win', icon: '🏆', target: 5,
    reward: { xp: 120 },
    difficulty: 'easy', timeLimit: 'daily',
  },
  {
    id: 'q-win-10',
    name: 'Battle Hardened',
    description: 'Win 10 battles',
    type: 'win', icon: '⚔️', target: 10,
    reward: { xp: 300 },
    difficulty: 'medium', timeLimit: 'daily',
  },
  {
    id: 'q-win-20',
    name: 'Veteran Fighter',
    description: 'Win 20 battles',
    type: 'win', icon: '⚔️', target: 20,
    reward: { xp: 700 },
    difficulty: 'hard', timeLimit: 'weekly',
  },
  {
    id: 'q-win-50',
    name: 'Warlord',
    description: 'Win 50 battles',
    type: 'win', icon: '🗡️', target: 50,
    reward: { xp: 1500 },
    difficulty: 'legendary', timeLimit: 'season',
  },

  // ── STREAK (medium → legendary) ──────────────────────────────────────────

  {
    id: 'q-streak-5',
    name: 'Unbroken Chain',
    description: 'Achieve a 5-battle win streak',
    type: 'streak', icon: '🔗', target: 5,
    reward: { xp: 150 },
    difficulty: 'medium', timeLimit: 'daily',
  },
  {
    id: 'q-streak-10',
    name: 'Iron Will',
    description: 'Achieve a 10-battle win streak',
    type: 'streak', icon: '🔗', target: 10,
    reward: { xp: 400 },
    difficulty: 'hard', timeLimit: 'daily',
  },
  {
    id: 'q-streak-20',
    name: 'Unstoppable Force',
    description: 'Achieve a 20-battle win streak',
    type: 'streak', icon: '⛓️', target: 20,
    reward: { xp: 900, relics: ['chrono-gauntlet'] },
    difficulty: 'legendary', timeLimit: 'weekly',
  },

  // ── SPEED (easy → hard) ──────────────────────────────────────────────────

  {
    id: 'q-speed-under10-3',
    name: 'Speed Demon',
    description: 'Win 3 battles in under 10 seconds',
    type: 'speed', icon: '⚡', target: 3,
    reward: { xp: 100 },
    difficulty: 'easy', timeLimit: 'daily',
  },
  {
    id: 'q-speed-under10-5',
    name: 'Lightning Reflexes',
    description: 'Win 5 battles in under 10 seconds',
    type: 'speed', icon: '⚡', target: 5,
    reward: { xp: 250 },
    difficulty: 'medium', timeLimit: 'daily',
  },
  {
    id: 'q-speed-under5-3',
    name: 'Faster Than Thought',
    description: 'Win 3 battles in under 5 seconds',
    type: 'speed', icon: '💨', target: 3,
    reward: { xp: 350 },
    difficulty: 'hard', timeLimit: 'daily',
  },
  {
    id: 'q-speed-under5-7',
    name: 'Temporal Flash',
    description: 'Win 7 battles in under 5 seconds',
    type: 'speed', icon: '💨', target: 7,
    reward: { xp: 800 },
    difficulty: 'hard', timeLimit: 'weekly',
  },
  {
    id: 'q-speed-under3-3',
    name: 'Instant Solver',
    description: 'Win 3 battles in under 3 seconds',
    type: 'speed', icon: '⏱️', target: 3,
    reward: { xp: 600, relics: ['swift-crown'] },
    difficulty: 'legendary', timeLimit: 'weekly',
  },

  // ── TOWER (medium → legendary) ───────────────────────────────────────────

  {
    id: 'q-tower-floor5',
    name: 'Tower Initiate',
    description: 'Reach floor 5 of the Battle Tower',
    type: 'tower', icon: '🏰', target: 5,
    reward: { xp: 120 },
    difficulty: 'medium', timeLimit: 'daily',
  },
  {
    id: 'q-tower-floor10',
    name: 'Tower Climber',
    description: 'Reach floor 10 of the Battle Tower',
    type: 'tower', icon: '🏰', target: 10,
    reward: { xp: 300 },
    difficulty: 'hard', timeLimit: 'weekly',
  },
  {
    id: 'q-tower-floor20',
    name: 'Tower Conqueror',
    description: 'Reach floor 20 of the Battle Tower',
    type: 'tower', icon: '🗼', target: 20,
    reward: { xp: 700, relics: ['omega-diadem'] },
    difficulty: 'legendary', timeLimit: 'weekly',
  },
  {
    id: 'q-tower-floor30',
    name: 'Tower Sovereign',
    description: 'Reach floor 30 of the Battle Tower',
    type: 'tower', icon: '🗼', target: 30,
    reward: { xp: 1500, relics: ['void-mantle'] },
    difficulty: 'legendary', timeLimit: 'season',
  },

  // ── COMBO (medium → legendary) ───────────────────────────────────────────

  {
    id: 'q-combo-5x',
    name: 'Combo Starter',
    description: 'Reach a 5x combo',
    type: 'combo', icon: '🔄', target: 5,
    reward: { xp: 80 },
    difficulty: 'easy', timeLimit: 'daily',
  },
  {
    id: 'q-combo-10x',
    name: 'Combo Chain',
    description: 'Reach a 10x combo',
    type: 'combo', icon: '🔄', target: 10,
    reward: { xp: 200 },
    difficulty: 'medium', timeLimit: 'daily',
  },
  {
    id: 'q-combo-15x',
    name: 'Combo Maestro',
    description: 'Reach a 15x combo',
    type: 'combo', icon: '🔁', target: 15,
    reward: { xp: 400 },
    difficulty: 'hard', timeLimit: 'daily',
  },
  {
    id: 'q-combo-25x',
    name: 'Combo Virtuoso',
    description: 'Reach a 25x combo',
    type: 'combo', icon: '🔁', target: 25,
    reward: { xp: 900 },
    difficulty: 'hard', timeLimit: 'weekly',
  },
  {
    id: 'q-combo-50x',
    name: 'Infinite Loop',
    description: 'Reach a 50x combo',
    type: 'combo', icon: '♾️', target: 50,
    reward: { xp: 2000, relics: ['chaos-ring'] },
    difficulty: 'legendary', timeLimit: 'season',
  },

  // ── ELEMENT (easy → hard) ────────────────────────────────────────────────

  {
    id: 'q-elem-algebra-win5',
    name: 'Algebra Enforcer',
    description: 'Win 5 battles using only Algebraic Beasts',
    type: 'element', icon: '🧮', target: 5,
    reward: { xp: 150 },
    difficulty: 'medium', timeLimit: 'daily', element: 'algebra',
  },
  {
    id: 'q-elem-geometry-win5',
    name: 'Geometric Purist',
    description: 'Win 5 battles using only Geometric Beasts',
    type: 'element', icon: '📐', target: 5,
    reward: { xp: 150 },
    difficulty: 'medium', timeLimit: 'daily', element: 'geometry',
  },
  {
    id: 'q-elem-calculus-win5',
    name: 'Calculus Specialist',
    description: 'Win 5 battles using only Calculus Beasts',
    type: 'element', icon: '∫', target: 5,
    reward: { xp: 180 },
    difficulty: 'medium', timeLimit: 'daily', element: 'calculus',
  },
  {
    id: 'q-elem-statistics-win5',
    name: 'Data Crusader',
    description: 'Win 5 battles using only Statistical Beasts',
    type: 'element', icon: '📊', target: 5,
    reward: { xp: 180 },
    difficulty: 'medium', timeLimit: 'daily', element: 'statistics',
  },
  {
    id: 'q-elem-number-theory-win3',
    name: 'Prime Seeker',
    description: 'Win 3 battles using only Number Theory Beasts',
    type: 'element', icon: '🔢', target: 3,
    reward: { xp: 250 },
    difficulty: 'hard', timeLimit: 'weekly', element: 'number_theory',
  },
  {
    id: 'q-elem-trig-win3',
    name: 'Sine Rider',
    description: 'Win 3 battles using only Trigonometric Beasts',
    type: 'element', icon: '📈', target: 3,
    reward: { xp: 250 },
    difficulty: 'hard', timeLimit: 'weekly', element: 'trigonometry',
  },

  // ── BOSS (hard → legendary) ──────────────────────────────────────────────

  {
    id: 'q-boss-defeat-1',
    name: 'Boss Breaker',
    description: 'Defeat 1 Boss Beast',
    type: 'boss', icon: '👹', target: 1,
    reward: { xp: 200 },
    difficulty: 'hard', timeLimit: 'daily',
  },
  {
    id: 'q-boss-defeat-3',
    name: 'Boss Slayer',
    description: 'Defeat 3 Boss Beasts',
    type: 'boss', icon: '👹', target: 3,
    reward: { xp: 500 },
    difficulty: 'hard', timeLimit: 'weekly',
  },
  {
    id: 'q-boss-defeat-5',
    name: 'Boss Eradicator',
    description: 'Defeat 5 Boss Beasts',
    type: 'boss', icon: '💀', target: 5,
    reward: { xp: 900, relics: ['nova-armor'] },
    difficulty: 'legendary', timeLimit: 'weekly',
  },
  {
    id: 'q-boss-defeat-10',
    name: 'Boss Annihilator',
    description: 'Defeat 10 Boss Beasts',
    type: 'boss', icon: '💀', target: 10,
    reward: { xp: 2000, relics: ['oblivion-edge'] },
    difficulty: 'legendary', timeLimit: 'season',
  },
  {
    id: 'q-boss-speed-1',
    name: 'Speed-Boss Takedown',
    description: 'Defeat a Boss Beast in under 15 seconds',
    type: 'boss', icon: '⏱️', target: 1,
    reward: { xp: 400, relics: ['lens-of-truth'] },
    difficulty: 'legendary', timeLimit: 'weekly',
  },
]

// ─── Seeded shuffle (deterministic per day/week) ──────────────────────────────

function daySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function weekSeed(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return d.getFullYear() * 100 + week
}

/** Simple LCG-based shuffle so the same seed always gives the same order. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Difficulty tier gating by player level ──────────────────────────────────

function allowedDifficulties(playerLevel: number): Set<string> {
  const set = new Set<string>(['easy'])
  if (playerLevel >= 3)  set.add('medium')
  if (playerLevel >= 7)  set.add('hard')
  if (playerLevel >= 12) set.add('legendary')
  return set
}

// ─── Quest generators ────────────────────────────────────────────────────────

/**
 * Returns 3-5 daily quests appropriate for the player's level.
 * Selection is deterministic for a given day + level (same player sees same quests all day).
 */
export function generateDailyQuests(playerLevel: number): Quest[] {
  const allowed = allowedDifficulties(playerLevel)
  const eligible = QUEST_POOL.filter(
    (q) => q.timeLimit === 'daily' && allowed.has(q.difficulty),
  )
  const shuffled = seededShuffle(eligible, daySeed() + playerLevel)
  const count = Math.min(playerLevel >= 5 ? 5 : 3, shuffled.length)
  return shuffled.slice(0, count)
}

/**
 * Returns 2-3 weekly quests that are harder than daily quests.
 * Deterministic for a given week + level.
 */
export function generateWeeklyQuests(playerLevel: number): Quest[] {
  const allowed = allowedDifficulties(playerLevel)
  const eligible = QUEST_POOL.filter(
    (q) => (q.timeLimit === 'weekly' || q.timeLimit === 'season') && allowed.has(q.difficulty),
  )
  const shuffled = seededShuffle(eligible, weekSeed() + playerLevel)
  const count = Math.min(playerLevel >= 8 ? 3 : 2, shuffled.length)
  return shuffled.slice(0, count)
}
