import { Achievement, BTMStats } from './types'

export const ACHIEVEMENTS: Achievement[] = [
  // ── SPEED ──
  { id: 'first_blood', name: 'First Blood', description: 'Beat the machine for the first time', icon: '🩸', category: 'speed', rarity: 'common', condition: s => s.totalWins >= 1, xpReward: 50 },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Beat AI by more than 50% time', icon: '⚡', category: 'speed', rarity: 'rare', condition: s => s.bestTimeMs !== null && s.history.some(h => h.correct && h.timeMs < h.aiTimeMs * 0.5), xpReward: 150 },
  { id: 'lightning', name: 'Lightning Reflexes', description: 'Solve a problem in under 3 seconds', icon: '⚡', category: 'speed', rarity: 'epic', condition: s => s.history.some(h => h.correct && h.timeMs < 3000), xpReward: 200 },
  { id: 'sub_second', name: 'Sub-Second', description: 'Beat the machine in under 1 second', icon: '💫', category: 'speed', rarity: 'legendary', condition: s => s.history.some(h => h.correct && h.timeMs < 1000), xpReward: 500 },
  { id: 'ten_under_5', name: 'Blitz', description: '10 wins with time under 5 seconds each', icon: '🏃', category: 'speed', rarity: 'epic', condition: s => s.history.filter(h => h.correct && h.timeMs < 5000).length >= 10, xpReward: 300 },

  // ── ACCURACY ──
  { id: 'sharpshooter', name: 'Sharpshooter', description: '10 wins with 0 wrong answers in between', icon: '🎯', category: 'accuracy', rarity: 'rare', condition: s => s.bestStreak >= 10, xpReward: 150 },
  { id: 'no_miss', name: 'Perfect Session', description: '20 consecutive correct answers', icon: '💎', category: 'accuracy', rarity: 'epic', condition: s => s.bestStreak >= 20, xpReward: 300 },
  { id: 'trap_master', name: 'Trap Master', description: 'Detect 10 traps without falling for them', icon: '🪤', category: 'accuracy', rarity: 'rare', condition: s => s.trapStats.detected >= 10, xpReward: 200 },
  { id: 'trap_immunity', name: 'Trap Immunity', description: 'Detect 50 traps', icon: '🛡️', category: 'accuracy', rarity: 'legendary', condition: s => s.trapStats.detected >= 50, xpReward: 500 },

  // ── STREAK ──
  { id: 'on_fire', name: 'On Fire', description: '5 win streak', icon: '🔥', category: 'streak', rarity: 'common', condition: s => s.bestStreak >= 5, xpReward: 100 },
  { id: 'unstoppable', name: 'Unstoppable', description: '25 win streak', icon: '💥', category: 'streak', rarity: 'epic', condition: s => s.bestStreak >= 25, xpReward: 400 },
  { id: 'godlike', name: 'Godlike', description: '50 win streak', icon: '👑', category: 'streak', rarity: 'legendary', condition: s => s.bestStreak >= 50, xpReward: 1000 },
  { id: 'combo_king', name: 'Combo King', description: 'Reach 10x combo multiplier', icon: '🎪', category: 'streak', rarity: 'epic', condition: s => s.bestCombo >= 10, xpReward: 350 },

  // ── MASTERY ──
  { id: 'math_master', name: 'Math Master', description: '100 math wins', icon: '∑', category: 'mastery', rarity: 'rare', condition: s => (s.subjectStats.mathematics?.wins || 0) >= 100, xpReward: 200 },
  { id: 'physics_master', name: 'Physics Master', description: '100 physics wins', icon: '⚛️', category: 'mastery', rarity: 'rare', condition: s => (s.subjectStats.physics?.wins || 0) >= 100, xpReward: 200 },
  { id: 'chem_master', name: 'Chemistry Master', description: '100 chemistry wins', icon: '⚗️', category: 'mastery', rarity: 'rare', condition: s => (s.subjectStats.chemistry?.wins || 0) >= 100, xpReward: 200 },
  { id: 'triple_threat', name: 'Triple Threat', description: '50 wins in each subject', icon: '🔱', category: 'mastery', rarity: 'epic', condition: s => ['mathematics', 'physics', 'chemistry'].every(sub => (s.subjectStats[sub]?.wins || 0) >= 50), xpReward: 500 },
  { id: 'nightmare_conqueror', name: 'Nightmare Conqueror', description: 'Win 10 nightmare difficulty problems', icon: '😱', category: 'mastery', rarity: 'epic', condition: s => (s.difficultyStats.nightmare?.wins || 0) >= 10, xpReward: 400 },
  { id: 'requiem_survivor', name: 'Requiem Survivor', description: 'Win a requiem difficulty problem', icon: '☠️', category: 'mastery', rarity: 'legendary', condition: s => (s.difficultyStats.requiem?.wins || 0) >= 1, xpReward: 750 },

  // ── SPECIAL ──
  { id: 'century', name: 'Century', description: 'Attempt 100 problems', icon: '💯', category: 'special', rarity: 'common', condition: s => s.problemsAttempted >= 100, xpReward: 100 },
  { id: 'marathon', name: 'Marathon', description: 'Attempt 500 problems', icon: '🏃', category: 'special', rarity: 'rare', condition: s => s.problemsAttempted >= 500, xpReward: 250 },
  { id: 'xp_10k', name: '10K XP', description: 'Earn 10,000 lifetime XP', icon: '✨', category: 'special', rarity: 'rare', condition: s => s.totalXP >= 10000, xpReward: 200 },
  { id: 'xp_50k', name: '50K XP', description: 'Earn 50,000 lifetime XP', icon: '🌟', category: 'special', rarity: 'epic', condition: s => s.totalXP >= 50000, xpReward: 500 },
  { id: 'tower_10', name: 'Tower Climber', description: 'Reach floor 10 in Tower Climb', icon: '🏗️', category: 'special', rarity: 'rare', condition: s => s.towerFloor >= 10, xpReward: 200 },
  { id: 'tower_25', name: 'Sky Scraper', description: 'Reach floor 25 in Tower Climb', icon: '🌆', category: 'special', rarity: 'epic', condition: s => s.towerFloor >= 25, xpReward: 400 },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat 3 boss battles', icon: '⚔️', category: 'special', rarity: 'epic', condition: s => s.bossDefeated.length >= 3, xpReward: 350 },
  { id: 'heat_7', name: 'Weekly Warrior', description: '7 day heat streak', icon: '📅', category: 'special', rarity: 'rare', condition: s => s.heatStreak >= 7, xpReward: 200 },
  { id: 'heat_30', name: 'Monthly Machine', description: '30 day heat streak', icon: '🗓️', category: 'special', rarity: 'legendary', condition: s => s.heatStreak >= 30, xpReward: 1000 },
]

export function checkNewAchievements(stats: BTMStats, existingIds: string[]): Achievement[] {
  return ACHIEVEMENTS.filter(a => !existingIds.includes(a.id) && a.condition(stats))
}

export function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common': return '#94a3b8'
    case 'rare': return '#3b82f6'
    case 'epic': return '#a855f7'
    case 'legendary': return '#f59e0b'
  }
}

export function getRarityLabel(rarity: Achievement['rarity']): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1)
}
