// ─── Beat the Machine — Warrior Contracts (Daily / Weekly) ────────────────────
// Procedurally selected objectives that reward gold, XP and relics.

export type QuestType = 'win' | 'streak' | 'speed' | 'tower' | 'combo' | 'level' | 'boss' | 'stars'

export interface Quest {
  id: string
  name: string
  description: string
  type: QuestType
  icon: string
  target: number
  reward: {
    xp: number
    gold?: number
    relics?: string[]
  }
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  timeLimit: 'daily' | 'weekly' | 'season'
}

export interface QuestProgress {
  questId: string
  current: number
  completed: boolean
  claimed: boolean
}

// ─── Quest template pool ──────────────────────────────────────────────────────

const QUEST_POOL: Quest[] = [

  // ── WINS (daily grind) ────────────────────────────────────────────────────
  { id: 'q-win-3',   name: 'First Blood',        description: 'Win 3 races against the Machine',        type: 'win',    icon: '⚔',  target: 3,  reward: { xp: 80,  gold: 60 },   difficulty: 'easy',     timeLimit: 'daily' },
  { id: 'q-win-5',   name: 'Warmachine Hunter',  description: 'Win 5 races against the Machine',        type: 'win',    icon: '⚔',  target: 5,  reward: { xp: 150, gold: 120 },  difficulty: 'easy',     timeLimit: 'daily' },
  { id: 'q-win-10',  name: 'Gladiator Protocol', description: 'Win 10 races against the Machine',       type: 'win',    icon: '⚔',  target: 10, reward: { xp: 350, gold: 250 },  difficulty: 'medium',   timeLimit: 'weekly' },
  { id: 'q-win-20',  name: 'Sovereign Slayer',   description: 'Win 20 races against the Machine',       type: 'win',    icon: '🗡', target: 20, reward: { xp: 700, gold: 500 },  difficulty: 'hard',     timeLimit: 'weekly' },
  { id: 'q-win-50',  name: 'Legend Maker',       description: 'Win 50 races against the Machine',       type: 'win',    icon: '🏆', target: 50, reward: { xp: 1500, gold: 1200 }, difficulty: 'legendary', timeLimit: 'season' },

  // ── STREAKS ───────────────────────────────────────────────────────────────
  { id: 'q-streak-3',  name: 'Unbroken',         description: 'Reach a 3-win streak',                   type: 'streak', icon: '🔗', target: 3,  reward: { xp: 100, gold: 80 },   difficulty: 'easy',     timeLimit: 'daily' },
  { id: 'q-streak-5',  name: 'Iron Chain',       description: 'Reach a 5-win streak',                   type: 'streak', icon: '🔗', target: 5,  reward: { xp: 200, gold: 150 },  difficulty: 'medium',   timeLimit: 'daily' },
  { id: 'q-streak-10', name: 'Tempered Soul',    description: 'Reach a 10-win streak',                  type: 'streak', icon: '⛓', target: 10, reward: { xp: 450, gold: 350, relics: ['r-sigil-momentum'] }, difficulty: 'hard', timeLimit: 'weekly' },
  { id: 'q-streak-20', name: 'Unstoppable',      description: 'Reach a 20-win streak',                  type: 'streak', icon: '⛓', target: 20, reward: { xp: 1000, gold: 800 }, difficulty: 'legendary', timeLimit: 'season' },

  // ── SPEED ─────────────────────────────────────────────────────────────────
  { id: 'q-speed-3',  name: 'Quickblade',        description: 'Beat the Machine by 50% speed, 3 times', type: 'speed',  icon: '⚡', target: 3,  reward: { xp: 120, gold: 90 },   difficulty: 'medium',   timeLimit: 'daily' },
  { id: 'q-speed-5',  name: 'Lightning Mind',    description: 'Beat the Machine by 50% speed, 5 times', type: 'speed',  icon: '💨', target: 5,  reward: { xp: 280, gold: 220 },  difficulty: 'hard',     timeLimit: 'daily' },
  { id: 'q-speed-7',  name: 'Impossible Pace',   description: 'Beat the Machine by 50% speed, 7 times', type: 'speed',  icon: '💨', target: 7,  reward: { xp: 500, gold: 400 },  difficulty: 'hard',     timeLimit: 'weekly' },
  { id: 'q-flash-1',  name: 'Faster Than Thought', description: 'Solve any problem in under 3 seconds and win', type: 'speed', icon: '⏱', target: 1, reward: { xp: 300, gold: 200 }, difficulty: 'medium', timeLimit: 'daily' },

  // ── TOWER ─────────────────────────────────────────────────────────────────
  { id: 'q-tower-3',  name: 'Climb the Spire',   description: 'Reach floor 3 of the Tower',             type: 'tower',  icon: '🏰', target: 3,  reward: { xp: 120, gold: 90 },   difficulty: 'easy',     timeLimit: 'daily' },
  { id: 'q-tower-5',  name: 'Spire Sentinel',    description: 'Reach floor 5 of the Tower',             type: 'tower',  icon: '🏰', target: 5,  reward: { xp: 250, gold: 180 },  difficulty: 'medium',   timeLimit: 'daily' },
  { id: 'q-tower-10', name: 'Above the Clouds',  description: 'Reach floor 10 of the Tower',            type: 'tower',  icon: '🗼', target: 10, reward: { xp: 600, gold: 450, relics: ['h-crown-clarity'] }, difficulty: 'hard', timeLimit: 'weekly' },
  { id: 'q-tower-20', name: 'Sky Warden',        description: 'Reach floor 20 of the Tower',            type: 'tower',  icon: '🗼', target: 20, reward: { xp: 1200, gold: 900 }, difficulty: 'legendary', timeLimit: 'season' },

  // ── COMBO ─────────────────────────────────────────────────────────────────
  { id: 'q-combo-5',  name: 'Chain Reaction',    description: 'Reach a 5x combo',                       type: 'combo',  icon: '🔥', target: 5,  reward: { xp: 100, gold: 70 },   difficulty: 'easy',     timeLimit: 'daily' },
  { id: 'q-combo-8',  name: 'Wildfire',          description: 'Reach an 8x combo',                      type: 'combo',  icon: '🔥', target: 8,  reward: { xp: 220, gold: 160 },  difficulty: 'medium',   timeLimit: 'daily' },
  { id: 'q-combo-12', name: 'Inferno Mind',      description: 'Reach a 12x combo',                      type: 'combo',  icon: '☄',  target: 12, reward: { xp: 500, gold: 380 },  difficulty: 'hard',     timeLimit: 'weekly' },

  // ── LEVELS (the journey) ─────────────────────────────────────────────────
  { id: 'q-level-2',  name: 'Pathfinder',        description: 'Complete 2 journey levels',              type: 'level',  icon: '🗺', target: 2,  reward: { xp: 120, gold: 100 },  difficulty: 'easy',     timeLimit: 'daily' },
  { id: 'q-level-4',  name: 'Domain Conqueror',  description: 'Complete 4 journey levels',              type: 'level',  icon: '🗺', target: 4,  reward: { xp: 300, gold: 240 },  difficulty: 'medium',   timeLimit: 'daily' },
  { id: 'q-level-8',  name: 'Cartographer',      description: 'Complete 8 journey levels',              type: 'level',  icon: '🧭', target: 8,  reward: { xp: 600, gold: 450 },  difficulty: 'hard',     timeLimit: 'weekly' },
  { id: 'q-stars-3',  name: 'Star Collector',    description: 'Earn a 3-star rating on any level',      type: 'stars',  icon: '⭐', target: 1,  reward: { xp: 200, gold: 150 },  difficulty: 'medium',   timeLimit: 'daily' },

  // ── BOSSES ────────────────────────────────────────────────────────────────
  { id: 'q-boss-any',   name: 'Lordkiller',      description: 'Defeat any Machine Lord',                type: 'boss',   icon: '💀', target: 1,  reward: { xp: 400, gold: 300 },  difficulty: 'hard',     timeLimit: 'weekly' },
  { id: 'q-boss-3',    name: 'Ash and Retry',     description: 'Defeat Machine Lords 3 times',           type: 'boss',   icon: '☠',  target: 3,  reward: { xp: 300, gold: 240 },  difficulty: 'hard',     timeLimit: 'weekly' },
  { id: 'q-boss-omega', name: 'The Final Word',  description: 'Defeat REQUIEM Ω',                       type: 'boss',   icon: '✦',  target: 1,  reward: { xp: 2000, gold: 1500 }, difficulty: 'legendary', timeLimit: 'season' },
]

// ─── Selection ────────────────────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateDailyQuests(playerLevel: number): Quest[] {
  const today = new Date().toISOString().slice(0, 10)
  let seed = 0
  for (const ch of today) seed = (seed * 31 + ch.charCodeAt(0)) % 99991
  seed += playerLevel

  const eligible = QUEST_POOL.filter(q => q.timeLimit === 'daily')
  const shuffled = seededShuffle(eligible, seed)
  const count = 3 + (playerLevel >= 5 ? 1 : 0) + (playerLevel >= 10 ? 1 : 0)
  return shuffled.slice(0, count)
}

export function generateWeeklyQuests(playerLevel: number): Quest[] {
  const d = new Date()
  const week = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6) / 7)}`
  let seed = 0
  for (const ch of week) seed = (seed * 37 + ch.charCodeAt(0)) % 99991

  const eligible = QUEST_POOL.filter(q => q.timeLimit === 'weekly' || q.timeLimit === 'season')
  const shuffled = seededShuffle(eligible, seed)
  const count = 2 + (playerLevel >= 8 ? 1 : 0)
  return shuffled.slice(0, count)
}

export function getQuestById(id: string): Quest | undefined {
  return QUEST_POOL.find(q => q.id === id)
}
