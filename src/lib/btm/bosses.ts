// ─── Beat the Machine — The Machine Lords ──────────────────────────────────────
// Seven domain bosses guard the end of each region. Defeating one awards a
// unique Artifact whose passive genuinely changes future battles.

export type BossPassiveType =
  | 'timeGrace'      // % extra time allowance before you lose the race
  | 'xpBoost'        // % extra XP from wins
  | 'startShield'    // begin every battle with N shields
  | 'comboPower'     // flat bonus added to combo multiplier
  | 'hintDiscount'   // % discount on hint power-up cost
  | 'secondChance'   // wrong answers forgiven per battle (no combo break, still counts solved)
  | 'goldBoost'      // % extra gold from wins
  | 'omniBoost'      // multiplies all other passives

export interface BossPassive {
  type: BossPassiveType
  value: number
  label: string
  description: string
}

export interface Boss {
  id: string               // matches world id, e.g. 'world1'
  worldId: string
  name: string
  title: string
  domain: string           // world name
  portrait: string         // /images/btm/bossN.jpg
  regionArt: string        // /images/btm/regionN.jpg
  color: string
  glowColor: string
  threat: string           // short dramatic descriptor
  taunt: string            // boss speech on intro screen
  defeatLine: string       // line shown when defeated
  hpLabel: string          // "3 PROBLEMS" etc.
  drops: {
    relicId: string        // must exist in relics.ts (bossDrop: true)
    gold: number
    xp: number
    rank: string           // warrior rank granted
  }
  passive: BossPassive
}

export const BOSSES: Boss[] = [
  {
    id: 'boss1',
    worldId: 'world1',
    name: 'SENTINEL PRIME',
    title: 'Warden of the Iron Gate',
    domain: 'The Rust Marches',
    portrait: '/images/btm/boss1.jpg',
    regionArt: '/images/btm/region1.jpg',
    color: '#c9a227',
    glowColor: '#e0a83c',
    threat: 'GUARDIAN CLASS · THREAT I',
    taunt: '"None pass the gate unworthy. Show me a mind sharper than my gears — or be ground to dust beneath them."',
    defeatLine: 'The Gate falls silent. The path beyond is yours.',
    hpLabel: '3 TRIALS',
    drops: { relicId: 'sentinel-core', gold: 250, xp: 200, rank: 'Gatebreaker' },
    passive: {
      type: 'timeGrace', value: 10,
      label: 'Sentinel\'s Grace',
      description: '+10% time allowance in every race. You may finish after the AI and still win.',
    },
  },
  {
    id: 'boss2',
    worldId: 'world2',
    name: 'THE ARCHITECT',
    title: 'Builder of Axioms',
    domain: 'The Axiom Citadels',
    portrait: '/images/btm/boss2.jpg',
    regionArt: '/images/btm/region2.jpg',
    color: '#4da3ff',
    glowColor: '#5eb0ff',
    threat: 'CONSTRUCTOR CLASS · THREAT II',
    taunt: '"Every theorem you know, I wrote. Every proof you love, I perfected. You fight with borrowed knowledge, little solver."',
    defeatLine: 'The Architect\'s panels shatter. Its equations scatter like birds.',
    hpLabel: '3 TRIALS',
    drops: { relicId: 'axiom-sigil', gold: 400, xp: 350, rank: 'Axiom Bearer' },
    passive: {
      type: 'xpBoost', value: 20,
      label: 'Axiom Insight',
      description: '+20% XP from every victory. Learn twice as fast from every battle.',
    },
  },
  {
    id: 'boss3',
    worldId: 'world3',
    name: 'THE GEOMANCER',
    title: 'Sovereign of Impossible Angles',
    domain: 'The Fractured Mirrors',
    portrait: '/images/btm/boss3.jpg',
    regionArt: '/images/btm/region3.jpg',
    color: '#9d5cff',
    glowColor: '#a86bff',
    threat: 'WARLOCK CLASS · THREAT III',
    taunt: '"Straight lines are a cage. I have escaped geometry itself. Let me bend the space around your certainty."',
    defeatLine: 'The mirrors fold inward. The warlock is a reflection no more.',
    hpLabel: '3 TRIALS',
    drops: { relicId: 'prism-aegis', gold: 600, xp: 500, rank: 'Shardwalker' },
    passive: {
      type: 'startShield', value: 1,
      label: 'Prism Aegis',
      description: 'Begin every battle with 1 Shield — your first mistake costs nothing.',
    },
  },
  {
    id: 'boss4',
    worldId: 'world4',
    name: 'OVERLORD VOLT',
    title: 'Tyrant of the Storm Pylons',
    domain: 'The Thunder Highlands',
    portrait: '/images/btm/boss4.jpg',
    regionArt: '/images/btm/region4.jpg',
    color: '#ffb020',
    glowColor: '#ffc14d',
    threat: 'DYNAMO CLASS · THREAT IV',
    taunt: '"I drank the storm and wore it as a crown. Your streaks of glory? I shall eat those too."',
    defeatLine: 'The dynamos go dark. The highlands breathe again.',
    hpLabel: '3 TRIALS',
    drops: { relicId: 'volt-gauntlets', gold: 900, xp: 750, rank: 'Stormcaller' },
    passive: {
      type: 'comboPower', value: 0.3,
      label: 'Volt Momentum',
      description: 'Combo multiplier is permanently +0.3x stronger. Chains feed you more.',
    },
  },
  {
    id: 'boss5',
    worldId: 'world5',
    name: 'THE TYRANT',
    title: 'Alchemist of Ruin',
    domain: 'The Toxic Foundry',
    portrait: '/images/btm/boss5.jpg',
    regionArt: '/images/btm/region5.jpg',
    color: '#3ddc84',
    glowColor: '#52e892',
    threat: 'REACTOR CLASS · THREAT V',
    taunt: '"Every mind has a formula. Mine happens to be poison. Breathe deep, challenger."',
    defeatLine: 'The vats crack open. The foundry exhales its last poison.',
    hpLabel: '3 TRIALS',
    drops: { relicId: 'elixir-philosophicum', gold: 1200, xp: 1000, rank: 'Transmuter' },
    passive: {
      type: 'hintDiscount', value: 50,
      label: 'Philosophicum',
      description: 'Hints cost 50% less gold. Knowledge becomes affordable.',
    },
  },
  {
    id: 'boss6',
    worldId: 'world6',
    name: 'NULL SOVEREIGN',
    title: 'Emperor of the Silent Void',
    domain: 'The Event Horizon',
    portrait: '/images/btm/boss6.jpg',
    regionArt: '/images/btm/region6.jpg',
    color: '#7fa8ff',
    glowColor: '#8fb4ff',
    threat: 'ANNIHILATOR CLASS · THREAT VI',
    taunt: '"I have erased worlds from memory. Failure here is not death. It is being forgotten."',
    defeatLine: 'The Sovereign folds into its own darkness. The abyss stands empty.',
    hpLabel: '3 TRIALS',
    drops: { relicId: 'void-crown', gold: 1800, xp: 1500, rank: 'Voidtouched' },
    passive: {
      type: 'secondChance', value: 1,
      label: 'Null Absolution',
      description: 'One wrong answer per battle is forgiven — your combo survives, and the trial continues.',
    },
  },
  {
    id: 'boss7',
    worldId: 'world7',
    name: 'REQUIEM Ω',
    title: 'The God-Engine',
    domain: 'The Requiem Cathedral',
    portrait: '/images/btm/boss7.jpg',
    regionArt: '/images/btm/region7.jpg',
    color: '#f2e6c9',
    glowColor: '#ffe9b0',
    threat: 'OMEGA CLASS · FINAL JUDGMENT',
    taunt: '"I am the sum of every solver who fell before you. Kneel, and be computed. Stand, and be legend."',
    defeatLine: 'The God-Engine kneels. You are the legend it could not compute.',
    hpLabel: '3 FINAL TRIALS',
    drops: { relicId: 'omega-core', gold: 3000, xp: 2500, rank: 'Requiem Slayer' },
    passive: {
      type: 'omniBoost', value: 25,
      label: 'Omega Resonance',
      description: 'ALL other artifact passives are +25% stronger. The core sings with your power.',
    },
  },
]

export function getBossByWorldId(worldId: string): Boss | undefined {
  return BOSSES.find(b => b.worldId === worldId)
}

export function getBossById(bossId: string): Boss | undefined {
  return BOSSES.find(b => b.id === bossId)
}
