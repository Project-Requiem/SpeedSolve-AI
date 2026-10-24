import { BTMWorld, BTMLevel, BTMDifficulty, BTMSubject } from './types'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORLD MAP — 7 Worlds, 5 Levels Each = 35 Levels + 7 Bosses
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function makeLevels(worldId: string, subject: BTMSubject, difficulty: BTMDifficulty, worldNum: number): BTMLevel[] {
  const levelNames = [
    ['The Basics', 'Foundations', 'Building Up', 'Stepping Stone', 'First Trial'],
    ['Deeper In', 'Connections', 'Crossroads', 'Rising Tide', 'The Gauntlet'],
    ['Complex Web', 'Triple Threat', 'Mind Bend', 'Critical Path', 'Pressure Point'],
    ['Dark Waters', 'Iron Gate', 'Shadow Step', 'Death Spiral', 'The Abyss'],
    ['Final Form', 'Zero Hour', 'Point Break', 'Event Horizon', 'Omega'],
    ['Beyond Logic', 'Infinite Loop', 'Paradox', 'Singularity', 'The Void'],
    ['Requiem I', 'Requiem II', 'Requiem III', 'Requiem IV', 'REQUIEM Ω'],
  ][worldNum - 1] || ['Unknown', 'Unknown', 'Unknown', 'Unknown', 'Unknown']

  return levelNames.map((name, i) => ({
    id: `${worldId}-${i + 1}`,
    worldId,
    number: i + 1,
    name,
    difficulty,
    subject: i === 4 ? 'mathematics' as BTMSubject : subject, // boss level can be any
    problemCount: i === 4 ? 3 : (i + 2), // boss = 3 problems, others scale
    isBoss: i === 4,
    starsRequired: worldNum === 1 ? 0 : (worldNum - 1) * 6 + i * 2, // progressive unlock
    xpReward: (worldNum * 100) + (i + 1) * 50,
  }))
}

export const WORLDS: BTMWorld[] = [
  {
    id: 'world1',
    name: 'Tutorial Island',
    description: 'Warm up. The machine is gentle here.',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #064e3b, #22c55e)',
    icon: '🏝️',
    requiredStars: 0,
    levels: makeLevels('world1', 'mathematics', 'rookie', 1),
  },
  {
    id: 'world2',
    name: 'Number Nexus',
    description: 'Arithmetic meets strategy. Think fast.',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
    icon: '🔢',
    requiredStars: 6,
    levels: makeLevels('world2', 'mathematics', 'scholar', 2),
  },
  {
    id: 'world3',
    name: 'Algebra Abyss',
    description: 'Variables, equations, and the unknown.',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #4c1d95, #8b5cf6)',
    icon: '📐',
    requiredStars: 12,
    levels: makeLevels('world3', 'mathematics', 'expert', 3),
  },
  {
    id: 'world4',
    name: 'Physics Frontier',
    description: 'Forces, motion, energy — the real world.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #78350f, #f59e0b)',
    icon: '⚡',
    requiredStars: 20,
    levels: makeLevels('world4', 'physics', 'expert', 4),
  },
  {
    id: 'world5',
    name: 'Chemistry Core',
    description: 'Reactions, moles, and molecular puzzles.',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #7f1d1d, #ef4444)',
    icon: '🧪',
    requiredStars: 28,
    levels: makeLevels('world5', 'chemistry', 'nightmare', 5),
  },
  {
    id: 'world6',
    name: 'Nightmare Nexus',
    description: 'The machine stops holding back.',
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #450a0a, #dc2626)',
    icon: '💀',
    requiredStars: 36,
    levels: makeLevels('world6', 'physics', 'nightmare', 6),
  },
  {
    id: 'world7',
    name: 'Requiem Realm',
    description: 'Only the worthy enter. No mercy.',
    color: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #0f172a, #94a3b8)',
    icon: '👑',
    requiredStars: 45,
    levels: makeLevels('world7', 'mathematics', 'requiem', 7),
  },
]

export function getTotalStars(stats: { levelStars: Record<string, number> }): number {
  return Object.values(stats.levelStars).reduce((sum, s) => sum + s, 0)
}

export function isWorldUnlocked(world: BTMWorld, stats: { levelStars: Record<string, number> }): boolean {
  return getTotalStars(stats) >= world.requiredStars
}

export function isLevelUnlocked(level: BTMLevel, stats: { levelStars: Record<string, number>; completedLevels: string[] }): boolean {
  // First level of a world is unlocked if the world is unlocked
  if (level.number === 1) return true
  // Subsequent levels require previous level to be completed
  const prevLevelId = `${level.worldId}-${level.number - 1}`
  return stats.completedLevels.includes(prevLevelId)
}

export function getLevelStars(levelId: string, stats: { levelStars: Record<string, number> }): number {
  return stats.levelStars[levelId] || 0
}

// Stars based on how fast you beat the AI
export function calculateStars(userTimes: number[], aiTimes: number[]): number {
  const wins = userTimes.filter((t, i) => t < aiTimes[i]).length
  const total = userTimes.length
  if (wins === total) {
    // All wins - check speed advantage
    const avgAdvantage = userTimes.reduce((sum, t, i) => sum + (aiTimes[i] - t) / aiTimes[i], 0) / total
    if (avgAdvantage > 0.5) return 3  // Beat AI by >50% on average
    if (avgAdvantage > 0.2) return 2   // Beat AI by >20%
    return 1                            // Just beat it
  }
  if (wins >= total * 0.7) return 1    // Won most but not all
  return 0                              // Failed
}
