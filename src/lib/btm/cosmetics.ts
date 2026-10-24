import { CosmeticItem } from './types'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COSMETICS SHOP — Themes, Frames, Effects, Titles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const COSMETIC_ITEMS: CosmeticItem[] = [
  // ── THEMES ──
  { id: 'theme-default', name: 'Midnight', type: 'theme', cost: 0, rarity: 'common', preview: '#0f172a', description: 'The original dark theme' },
  { id: 'theme-cyberpunk', name: 'Cyberpunk', type: 'theme', cost: 500, rarity: 'rare', preview: '#ff00ff', description: 'Neon city vibes' },
  { id: 'theme-forest', name: 'Enchanted Forest', type: 'theme', cost: 500, rarity: 'rare', preview: '#065f46', description: 'Deep forest greens' },
  { id: 'theme-ocean', name: 'Deep Ocean', type: 'theme', cost: 750, rarity: 'rare', preview: '#0c4a6e', description: 'Ocean depths' },
  { id: 'theme-inferno', name: 'Inferno', type: 'theme', cost: 1000, rarity: 'epic', preview: '#dc2626', description: 'Burning hot' },
  { id: 'theme-aurora', name: 'Aurora', type: 'theme', cost: 2000, rarity: 'legendary', preview: '#7c3aed', description: 'Northern lights' },

  // ── FRAMES ──
  { id: 'frame-none', name: 'No Frame', type: 'frame', cost: 0, rarity: 'common', preview: 'none', description: 'Clean and simple' },
  { id: 'frame-gold', name: 'Gold Frame', type: 'frame', cost: 300, rarity: 'common', preview: '#fbbf24', description: 'Classic gold border' },
  { id: 'frame-neon', name: 'Neon Frame', type: 'frame', cost: 600, rarity: 'rare', preview: '#22d3ee', description: 'Glowing neon border' },
  { id: 'frame-fire', name: 'Fire Frame', type: 'frame', cost: 800, rarity: 'rare', preview: '#f97316', description: 'Blazing fire border' },
  { id: 'frame-diamond', name: 'Diamond Frame', type: 'frame', cost: 1500, rarity: 'epic', preview: '#67e8f9', description: 'Prismatic diamond border' },
  { id: 'frame-legend', name: 'Legend Frame', type: 'frame', cost: 3000, rarity: 'legendary', preview: '#f43f5e', description: 'For the worthy only' },

  // ── EFFECTS ──
  { id: 'effect-none', name: 'No Effect', type: 'effect', cost: 0, rarity: 'common', preview: 'none', description: 'Default win effect' },
  { id: 'effect-sparkle', name: 'Sparkle', type: 'effect', cost: 400, rarity: 'common', preview: '#fbbf24', description: 'Sparkle on win' },
  { id: 'effect-lightning', name: 'Lightning', type: 'effect', cost: 700, rarity: 'rare', preview: '#38bdf8', description: 'Lightning strike on win' },
  { id: 'effect-confetti', name: 'Mega Confetti', type: 'effect', cost: 700, rarity: 'rare', preview: '#34d399', description: 'Double confetti explosion' },
  { id: 'effect-quake', name: 'Earthquake', type: 'effect', cost: 1200, rarity: 'epic', preview: '#a855f7', description: 'Screen shakes on every win' },
  { id: 'effect-requiem', name: 'Requiem', type: 'effect', cost: 2500, rarity: 'legendary', preview: '#e2e8f0', description: 'Reality distorts on win' },

  // ── TITLES ──
  { id: 'title-challenger', name: 'Challenger', type: 'title', cost: 0, rarity: 'common', preview: '#94a3b8', description: 'Default title' },
  { id: 'title-speedster', name: 'Speedster', type: 'title', cost: 300, rarity: 'common', preview: '#38bdf8', description: 'Fast and furious' },
  { id: 'title-scholar', name: 'Scholar', type: 'title', cost: 500, rarity: 'rare', preview: '#8b5cf6', description: 'Learned and precise' },
  { id: 'title-maverick', name: 'Maverick', type: 'title', cost: 800, rarity: 'rare', preview: '#f97316', description: 'Unconventional genius' },
  { id: 'title-titan', name: 'Titan', type: 'title', cost: 1500, rarity: 'epic', preview: '#ef4444', description: 'Unstoppable force' },
  { id: 'title-machine', name: 'The Machine', type: 'title', cost: 5000, rarity: 'legendary', preview: '#e2e8f0', description: 'You ARE the machine now' },
]

export function getOwnedCosmetics(ownedIds: string[]): CosmeticItem[] {
  return COSMETIC_ITEMS.filter(c => ownedIds.includes(c.id))
}

export function getEquippedTitle(cosmetics: { equippedTitle: string; owned: string[] }): string {
  const item = COSMETIC_ITEMS.find(c => c.id === cosmetics.equippedTitle)
  return item?.name || 'Challenger'
}

export function getRarityGradient(rarity: CosmeticItem['rarity']): string {
  switch (rarity) {
    case 'common': return 'linear-gradient(135deg, #475569, #94a3b8)'
    case 'rare': return 'linear-gradient(135deg, #1d4ed8, #3b82f6)'
    case 'epic': return 'linear-gradient(135deg, #7c3aed, #a855f7)'
    case 'legendary': return 'linear-gradient(135deg, #f59e0b, #fbbf24)'
  }
}
