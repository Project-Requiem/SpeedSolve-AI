// ─── Beat the Machine — The Armory: Weapons, Armor & Artifacts ────────────────
// Gear grants REAL passives that change battles. Boss artifacts cannot be
// bought — they are claimed by conquering the Machine Lords.

export type RelicSlot = 'weapon' | 'armor' | 'helm' | 'ring' | 'amulet'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface Relic {
  id: string
  name: string
  description: string
  lore: string
  slot: RelicSlot
  rarity: Rarity
  icon: string
  color: string
  bossDrop?: boolean          // cannot be purchased — claimed from a Machine Lord
  passive: {
    timeGrace?: number        // % extra time allowance before losing the race
    xpBoost?: number          // % extra XP on wins
    goldBoost?: number        // % extra gold on wins
    startShields?: number     // shields active at battle start
    comboPower?: number       // flat bonus added to combo multiplier
    hintDiscount?: number     // % cheaper hints
    secondChance?: number     // wrong answers forgiven per battle
    omni?: number             // (Omega Core) % amplify all other passives
  }
  requiredLevel: number
  cost: number                // gold cost (0 for boss drops)
}

// ─── Slot metadata ────────────────────────────────────────────────────────────

export const RELIC_SLOT_INFO: Record<RelicSlot, { label: string; icon: string; desc: string }> = {
  weapon: { label: 'Weapon',  icon: '⚔', desc: 'Edge & momentum' },
  armor:  { label: 'Armor',   icon: '🛡', desc: 'Protection & endurance' },
  helm:   { label: 'Helm',    icon: '头盔', desc: 'Focus & insight' },
  ring:   { label: 'Ring',    icon: '💍', desc: 'Fortune & power' },
  amulet: { label: 'Amulet',  icon: '🔮', desc: 'Forbidden knowledge' },
}

// ─── Rarity palette ───────────────────────────────────────────────────────────

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#9aa5b1',
  rare:      '#4da3ff',
  epic:      '#b06bff',
  legendary: '#f5a524',
  mythic:    '#ff4d5e',
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic',
}

const C = RARITY_COLORS

// ─── Boss Artifact Definitions (drops from Machine Lords) ─────────────────────

const BOSS_ARTIFACTS: Relic[] = [
  {
    id: 'sentinel-core',
    name: 'Sentinel Core',
    description: 'The furnace heart of the Gate Warden. Time bends around it.',
    lore: 'Torn from the chest of SENTINEL PRIME. It still ticks with the patience of a fortress.',
    slot: 'amulet', rarity: 'legendary', icon: '🔥', color: '#e0a83c', bossDrop: true,
    passive: { timeGrace: 10 }, requiredLevel: 1, cost: 0,
  },
  {
    id: 'axiom-sigil',
    name: 'Axiom Sigil',
    description: 'A badge of pure proof. All victories teach you more.',
    lore: 'Struck from the halo of THE ARCHITECT. Its light rewrites experience into wisdom.',
    slot: 'helm', rarity: 'legendary', icon: '📐', color: '#5eb0ff', bossDrop: true,
    passive: { xpBoost: 20 }, requiredLevel: 1, cost: 0,
  },
  {
    id: 'prism-aegis',
    name: 'Prism Aegis',
    description: 'A shard-shield that absorbs the first blow of every battle.',
    lore: 'Forged from THE GEOMANCER\'s mirror-cloak. It stands where you would have fallen.',
    slot: 'armor', rarity: 'epic', icon: '🔮', color: '#a86bff', bossDrop: true,
    passive: { startShields: 1 }, requiredLevel: 1, cost: 0,
  },
  {
    id: 'volt-gauntlets',
    name: 'Volt Gauntlets',
    description: 'Storm-forged fists. Your combos strike far harder.',
    lore: 'Ripped from OVERLORD VOLT\'s raised fist. The arcs still hunger.',
    slot: 'weapon', rarity: 'legendary', icon: '⚡', color: '#ffc14d', bossDrop: true,
    passive: { comboPower: 0.3 }, requiredLevel: 1, cost: 0,
  },
  {
    id: 'elixir-philosophicum',
    name: 'Elixir Philosophicum',
    description: 'A vial of distilled insight. Hints cost half their price.',
    lore: 'Poured from THE TYRANT\'s own veins. Knowledge, made drinkable.',
    slot: 'ring', rarity: 'epic', icon: '⚗', color: '#52e892', bossDrop: true,
    passive: { hintDiscount: 50 }, requiredLevel: 1, cost: 0,
  },
  {
    id: 'void-crown',
    name: 'Void Crown',
    description: 'A crown of silence. One mistake per battle is erased.',
    lore: 'Lifted from NULL SOVEREIGN\'s brow. It whispers forgiveness in a dead language.',
    slot: 'helm', rarity: 'mythic', icon: '👑', color: '#8fb4ff', bossDrop: true,
    passive: { secondChance: 1 }, requiredLevel: 1, cost: 0,
  },
  {
    id: 'omega-core',
    name: 'Omega Core',
    description: 'The heart of the God-Engine. ALL artifacts grow +25% stronger.',
    lore: 'REQUIEM\'s final heartbeat. It resonates with everything you own.',
    slot: 'amulet', rarity: 'mythic', icon: '✦', color: '#ffe9b0', bossDrop: true,
    passive: { omni: 25 }, requiredLevel: 1, cost: 0,
  },
]

// ─── Regular Armory Stock (bought with gold) ──────────────────────────────────

const ARMORY: Relic[] = [
  // ── WEAPONS ──
  {
    id: 'w-solvers-blade', name: 'Solver\'s Blade',
    description: 'A duelist\'s edge. +3% time allowance in races.',
    lore: 'Standard issue for those who swear the Solver\'s Oath.',
    slot: 'weapon', rarity: 'common', icon: '🗡', color: C.common,
    passive: { timeGrace: 3 }, requiredLevel: 1, cost: 120,
  },
  {
    id: 'w-arithmetic-axe', name: 'Arithmetic Axe',
    description: 'Brutal and efficient. +5% time allowance.',
    lore: 'Every swing resolves an operation. Cleaves doubt in two.',
    slot: 'weapon', rarity: 'rare', icon: '🪓', color: C.rare,
    passive: { timeGrace: 5 }, requiredLevel: 3, cost: 320,
  },
  {
    id: 'w-proof-spear', name: 'Proof Spear',
    description: 'Reaches conclusions first. +8% time allowance.',
    lore: 'Its point was proven sharp by contradiction.',
    slot: 'weapon', rarity: 'epic', icon: '🔱', color: C.epic,
    passive: { timeGrace: 8 }, requiredLevel: 6, cost: 750,
  },
  {
    id: 'w-logos-edge', name: 'Logos Edge',
    description: 'The argument that ends all arguments. +12% time, +10% gold.',
    lore: 'Said to cut the space between question and answer.',
    slot: 'weapon', rarity: 'legendary', icon: '⚔', color: C.legendary,
    passive: { timeGrace: 12, goldBoost: 10 }, requiredLevel: 10, cost: 1500,
  },

  // ── ARMOR ──
  {
    id: 'a-scholar-plate', name: 'Scholar\'s Plate',
    description: 'Sturdy study-wear. Start 25% of battles with a shield.',
    lore: 'Reinforced with the covers of a thousand solved workbooks.',
    slot: 'armor', rarity: 'common', icon: '🛡', color: C.common,
    passive: { startShields: 0 }, requiredLevel: 1, cost: 100,
  },
  {
    id: 'a-lamellar-logic', name: 'Lamellar of Logic',
    description: 'Overlapping proofs. +15% XP from wins.',
    lore: 'Each plate is an axiom. Together, they are argument itself.',
    slot: 'armor', rarity: 'rare', icon: '🥋', color: C.rare,
    passive: { xpBoost: 15 }, requiredLevel: 4, cost: 400,
  },
  {
    id: 'a-bulwark-reason', name: 'Bulwark of Reason',
    description: 'Immovable conviction. Start every battle with a shield.',
    lore: 'Forged in the foundries where doubt goes to die.',
    slot: 'armor', rarity: 'epic', icon: '🛡', color: C.epic,
    passive: { startShields: 1 }, requiredLevel: 7, cost: 850,
  },

  // ── HELMS ──
  {
    id: 'h-focus-hood', name: 'Focus Hood',
    description: 'Silences the crowd. +10% XP from wins.',
    lore: 'The library at midnight, stitched into cloth.',
    slot: 'helm', rarity: 'common', icon: '🧢', color: C.common,
    passive: { xpBoost: 10 }, requiredLevel: 1, cost: 110,
  },
  {
    id: 'h-signal-helm', name: 'Signal Helm',
    description: 'Hears the Machine thinking. +5% gold from wins.',
    lore: 'Tuned to the frequency of machine contemplation.',
    slot: 'helm', rarity: 'rare', icon: '⛑', color: C.rare,
    passive: { goldBoost: 5 }, requiredLevel: 3, cost: 300,
  },
  {
    id: 'h-crown-clarity', name: 'Crown of Clarity',
    description: 'No thought is wasted. +25% XP from wins.',
    lore: 'Worn briefly by a scholar who never blinked.',
    slot: 'helm', rarity: 'legendary', icon: '👑', color: C.legendary,
    passive: { xpBoost: 25 }, requiredLevel: 9, cost: 1300,
  },

  // ── RINGS ──
  {
    id: 'r-combo-band', name: 'Combo Band',
    description: 'A pulse of momentum. Combo multiplier +0.1x.',
    lore: 'It tightens when your streak grows.',
    slot: 'ring', rarity: 'common', icon: '💍', color: C.common,
    passive: { comboPower: 0.1 }, requiredLevel: 2, cost: 180,
  },
  {
    id: 'r-ledger-ring', name: 'Ledger Ring',
    description: 'Counts every coin twice. +15% gold from wins.',
    lore: 'Once owned by the accountant of a fallen empire.',
    slot: 'ring', rarity: 'rare', icon: '💳', color: C.rare,
    passive: { goldBoost: 15 }, requiredLevel: 4, cost: 350,
  },
  {
    id: 'r-sigil-momentum', name: 'Sigil of Momentum',
    description: 'The chain refuses to break. Combo multiplier +0.2x.',
    lore: 'Engraved with the word "again" in eleven dead languages.',
    slot: 'ring', rarity: 'epic', icon: '💠', color: C.epic,
    passive: { comboPower: 0.2 }, requiredLevel: 8, cost: 800,
  },

  // ── AMULETS ──
  {
    id: 'm-ember-charm', name: 'Ember Charm',
    description: 'A coal that never cools. +10% gold from wins.',
    lore: 'Warm to the touch. It remembers the forge.',
    slot: 'amulet', rarity: 'common', icon: '🔥', color: C.common,
    passive: { goldBoost: 10 }, requiredLevel: 1, cost: 130,
  },
  {
    id: 'm-hourglass-pendant', name: 'Hourglass Pendant',
    description: 'Borrowed seconds. +6% time allowance in races.',
    lore: 'The sand falls slower for those who study it.',
    slot: 'amulet', rarity: 'rare', icon: '⏳', color: C.rare,
    passive: { timeGrace: 6 }, requiredLevel: 3, cost: 340,
  },
  {
    id: 'm-mask-truth', name: 'Mask of Truth',
    description: 'Traps cannot hide. One wrong answer forgiven per battle.',
    lore: 'It reads the problem before your eyes finish moving.',
    slot: 'amulet', rarity: 'mythic', icon: '🎭', color: C.mythic,
    passive: { secondChance: 1 }, requiredLevel: 12, cost: 2200,
  },
]

export const ALL_RELICS: Relic[] = [...ARMORY, ...BOSS_ARTIFACTS]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRelicsBySlot(slot: RelicSlot): Relic[] {
  return ALL_RELICS.filter(r => r.slot === slot)
}

export function getRelicsByRarity(rarity: Rarity): Relic[] {
  return ALL_RELICS.filter(r => r.rarity === rarity)
}

export function getRelicById(id: string): Relic | undefined {
  return ALL_RELICS.find(r => r.id === id)
}

export interface GearEffects {
  timeGracePct: number
  xpBoostPct: number
  goldBoostPct: number
  startShields: number
  comboPower: number
  hintDiscountPct: number
  secondChance: number
}

export function computeGearEffects(equippedIds: (string | null)[]): GearEffects {
  const effects: GearEffects = {
    timeGracePct: 0, xpBoostPct: 0, goldBoostPct: 0,
    startShields: 0, comboPower: 0, hintDiscountPct: 0, secondChance: 0,
  }
  const relics = equippedIds
    .map(id => (id ? getRelicById(id) : null))
    .filter((r): r is Relic => r !== null)

  for (const r of relics) {
    effects.timeGracePct += r.passive.timeGrace || 0
    effects.xpBoostPct += r.passive.xpBoost || 0
    effects.goldBoostPct += r.passive.goldBoost || 0
    effects.startShields += r.passive.startShields || 0
    effects.comboPower += r.passive.comboPower || 0
    effects.hintDiscountPct += r.passive.hintDiscount || 0
    effects.secondChance += r.passive.secondChance || 0
  }

  // Omega Core: amplify all other passives by its omni value
  const omega = relics.find(r => r.id === 'omega-core')
  const omni = omega ? (omega.passive.omni || 25) / 100 : 0
  if (omni > 0) {
    effects.timeGracePct *= 1 + omni
    effects.xpBoostPct *= 1 + omni
    effects.goldBoostPct *= 1 + omni
    effects.comboPower *= 1 + omni
    effects.hintDiscountPct *= 1 + omni
  }

  // Round for display sanity
  effects.timeGracePct = Math.round(effects.timeGracePct * 10) / 10
  effects.xpBoostPct = Math.round(effects.xpBoostPct * 10) / 10
  effects.goldBoostPct = Math.round(effects.goldBoostPct * 10) / 10
  effects.comboPower = Math.round(effects.comboPower * 100) / 100

  return effects
}
