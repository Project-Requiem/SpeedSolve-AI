// =============================================================================
// Neo Monsters — Mind Beasts Collection System
// Every math/science concept IS a monster you capture by beating the AI.
// =============================================================================

// ─── Types ───────────────────────────────────────────────────────────────────

export type Element =
  | 'algebraic'
  | 'geometric'
  | 'kinetic'
  | 'thermal'
  | 'quantum'
  | 'chemical'
  | 'analytic'
  | 'topologic'

export type MonsterRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type EvolutionStage = 1 | 2 | 3

export interface MonsterAbility {
  id: string
  name: string
  description: string
  icon: string
  effect:
    | 'timeFreeze'
    | 'hint'
    | 'shield'
    | 'doubleXP'
    | 'comboBoost'
    | 'autoCalc'
    | 'skipPenalty'
    | 'revealAnswer'
    | 'slowTimer'
    | 'healStreak'
  cooldown: number  // problems between uses
  power: number     // 1-10
}

export interface MindBeast {
  id: string
  name: string
  codexName: string        // scientific name like "Algebraicus Primus"
  element: Element
  rarity: MonsterRarity
  stage: EvolutionStage
  evolvesFrom?: string     // id of prev evolution
  evolvesTo?: string       // id of next evolution
  evolveCondition?: string // e.g. "Win 10 battles" or "Reach Level 15"
  stats: {
    speed: number    // affects time bonus (1-100)
    power: number    // affects XP gain (1-100)
    wisdom: number   // affects hint quality (1-100)
    luck: number     // affects rare drops (1-100)
  }
  abilities: MonsterAbility[]
  description: string
  lore: string          // 2-3 sentence lore entry
  color: string         // primary color hex
  gradient: string      // CSS gradient for card
  icon: string          // emoji icon
  captureRate: number   // 0.0-1.0 base capture rate
  difficulty: string    // BTMDifficulty this monster appears at
  subject: string       // BTMSubject
}

// ─── Element Data ────────────────────────────────────────────────────────────

export const ELEMENTS: Record<
  Element,
  { name: string; icon: string; color: string; gradient: string; description: string }
> = {
  algebraic: {
    name: 'Algebraic',
    icon: '🧮',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    description: 'Beasts of equations, polynomials, and algebraic structures',
  },
  geometric: {
    name: 'Geometric',
    icon: '📐',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #22C55E, #16A34A)',
    description: 'Beasts of shapes, angles, volumes, and spatial reasoning',
  },
  kinetic: {
    name: 'Kinetic',
    icon: '⚡',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316, #EA580C)',
    description: 'Beasts of motion, forces, and mechanical energy',
  },
  thermal: {
    name: 'Thermal',
    icon: '🔥',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    description: 'Beasts of heat, entropy, and thermodynamic laws',
  },
  quantum: {
    name: 'Quantum',
    icon: '🌀',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #9333EA)',
    description: 'Beasts of wave functions, uncertainty, and quantum mechanics',
  },
  chemical: {
    name: 'Chemical',
    icon: '🧪',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    description: 'Beasts of reactions, bonding, and chemical equilibrium',
  },
  analytic: {
    name: 'Analytic',
    icon: '∫',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    description: 'Beasts of derivatives, integrals, limits, and analysis',
  },
  topologic: {
    name: 'Topologic',
    icon: '🍩',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
    description: 'Beasts of surfaces, manifolds, knots, and abstract spaces',
  },
}

// ─── Rarity Data ─────────────────────────────────────────────────────────────

export const RARITY_DATA: Record<
  MonsterRarity,
  { label: string; color: string; glow: string; chance: number }
> = {
  common:    { label: 'Common',    color: '#9CA3AF', glow: 'none',                            chance: 0.60 },
  rare:      { label: 'Rare',      color: '#3B82F6', glow: '0 0 8px #3B82F6',               chance: 0.25 },
  epic:      { label: 'Epic',      color: '#A855F7', glow: '0 0 12px #A855F7',              chance: 0.10 },
  legendary: { label: 'Legendary', color: '#F59E0B', glow: '0 0 16px #F59E0B, 0 0 32px #F59E0B', chance: 0.04 },
  mythic:    { label: 'Mythic',    color: '#EF4444', glow: '0 0 20px #EF4444, 0 0 40px #EF4444, 0 0 60px #EF4444', chance: 0.01 },
}

// ─── Mind Beasts ─────────────────────────────────────────────────────────────

// ── Algebraic Element ────────────────────────────────────────────────────────

const ALGEBRAIC_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'algebrat',
    name: 'Algebrat',
    codexName: 'Algebraicus Rattus',
    element: 'algebraic',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'equinox',
    evolveCondition: 'Solve 20 algebra problems',
    stats: { speed: 30, power: 20, wisdom: 25, luck: 30 },
    abilities: [
      { id: 'quick-solve', name: 'Quick Solve', description: 'Reveals a hint for the current problem', icon: '💡', effect: 'hint', cooldown: 3, power: 3 },
    ],
    description: 'A small rat-like beast with equation symbols scrawled across its fur.',
    lore: 'Algebrats scurry through the corridors of algebra, leaving tiny equations in their wake. Scholars say wherever an unknown needs finding, an Algebrat is nearby. Their whiskers twitch at the sight of variables.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
    icon: '🐀',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'formulark',
    name: 'Formulark',
    codexName: 'Algebraicus Formulii',
    element: 'algebraic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 25, power: 28, wisdom: 30, luck: 20 },
    abilities: [
      { id: 'formula-flash', name: 'Formula Flash', description: 'Briefly slows the timer', icon: '⏱️', effect: 'slowTimer', cooldown: 4, power: 2 },
    ],
    description: 'A bird-like beast that carries formula fragments in its beak.',
    lore: 'Formularks nest in the rafters of lecture halls, dropping formula scraps on unsuspecting students. They are born knowing the quadratic formula by heart. Their songs sound like recited identities.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #60A5FA, #93C5FD)',
    icon: '🐦',
    captureRate: 0.65,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'coefficien',
    name: 'Coefficien',
    codexName: 'Algebraicus Coefficientis',
    element: 'algebraic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 35, power: 22, wisdom: 20, luck: 35 },
    abilities: [
      { id: 'coeff-pull', name: 'Coeff Pull', description: 'Doubles XP for the next problem', icon: '✨', effect: 'doubleXP', cooldown: 5, power: 2 },
    ],
    description: 'A slime-like beast whose body is a jiggling mass of numeric coefficients.',
    lore: 'Coefficiens absorb numbers from solved equations, growing larger with each coefficient consumed. They are harmless unless you drop a zero near them—then they multiply uncontrollably.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    icon: '🫧',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'mathematics',
  },

  // Rare — Stage 1-2
  {
    id: 'equinox',
    name: 'Equinox',
    codexName: 'Algebraicus Aequalis',
    element: 'algebraic',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'algebrat',
    evolvesTo: 'matrigon',
    evolveCondition: 'Win 10 battles with Equinox',
    stats: { speed: 45, power: 35, wisdom: 40, luck: 30 },
    abilities: [
      { id: 'balance', name: 'Balance', description: 'Shields you from one wrong answer penalty', icon: '🛡️', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A balanced beast with equal signs for eyes, perpetually maintaining equilibrium.',
    lore: 'Equinox appears when both sides of an equation are truly equal. Its gaze forces any expression into balance. Legends say it was born from the first equation ever set equal.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #2563EB, #3B82F6)',
    icon: '⚖️',
    captureRate: 0.40,
    difficulty: 'scholar',
    subject: 'mathematics',
  },
  {
    id: 'vandermonde',
    name: 'Vandermonde',
    codexName: 'Algebraicus Determinantis',
    element: 'algebraic',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 40, power: 45, wisdom: 38, luck: 25 },
    abilities: [
      { id: 'det-rush', name: 'Det Rush', description: 'Boosts combo multiplier by 1.5x', icon: '🔥', effect: 'comboBoost', cooldown: 5, power: 5 },
    ],
    description: 'A crystalline beast whose facets are determinants of famous matrices.',
    lore: 'Vandermonde crystallizes when a matrix gains full rank. Its body refracts problems into parallel solution paths. It despises singular matrices with a burning passion.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
    icon: '💎',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'mathematics',
  },

  // Epic — Stage 2
  {
    id: 'matrigon',
    name: 'Matrigon',
    codexName: 'Algebraicus Matrixis',
    element: 'algebraic',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'equinox',
    evolvesTo: 'polydrake',
    evolveCondition: 'Solve 50 matrix problems',
    stats: { speed: 60, power: 55, wisdom: 65, luck: 40 },
    abilities: [
      { id: 'matrix-shield', name: 'Matrix Shield', description: 'Blocks all penalties for 3 problems', icon: '🛡️', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'row-reduce', name: 'Row Reduce', description: 'Simplifies the next problem to an easier form', icon: '💡', effect: 'hint', cooldown: 4, power: 5 },
    ],
    description: 'A matrix-shaped beast with rows of glowing numbers rippling across its body.',
    lore: 'Matrigons form when a system of equations becomes self-aware. Their rows glow with the echelon form of pure understanding. To face one is to face linear algebra itself.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #1D4ED8, #1E40AF)',
    icon: '🔢',
    captureRate: 0.20,
    difficulty: 'expert',
    subject: 'mathematics',
  },
  {
    id: 'polymorph',
    name: 'Polymorph',
    codexName: 'Algebraicus Polymorphis',
    element: 'algebraic',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 55, power: 60, wisdom: 50, luck: 45 },
    abilities: [
      { id: 'shape-shift', name: 'Shape Shift', description: 'Heals your streak if it was about to break', icon: '💚', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'factor-eyes', name: 'Factor Eyes', description: 'Reveals partial factors of the answer', icon: '👁️', effect: 'hint', cooldown: 3, power: 6 },
    ],
    description: 'A shapeshifting beast that morphs between polynomial forms at will.',
    lore: 'Polymorphs can be a linear, quadratic, or cubic beast depending on their mood. They teach that every polynomial can be factored—given enough patience and the right field.',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
    icon: '🔮',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'mathematics',
  },

  // Legendary — Stage 2
  {
    id: 'polydrake',
    name: 'Polydrake',
    codexName: 'Algebraicus Draconis',
    element: 'algebraic',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'algebraicus-rex',
    evolveCondition: 'Defeat 5 nightmare battles',
    stats: { speed: 75, power: 80, wisdom: 70, luck: 50 },
    abilities: [
      { id: 'degree-storm', name: 'Degree Storm', description: 'Massively boosts combo for 5 problems', icon: '🌪️', effect: 'comboBoost', cooldown: 8, power: 8 },
      { id: 'factor-breath', name: 'Factor Breath', description: 'Fully reveals the answer to one problem', icon: '🐉', effect: 'revealAnswer', cooldown: 10, power: 9 },
    ],
    description: 'A dragon made of polynomial curves, its wings spanning degrees of infinite possibility.',
    lore: 'Polydrake was forged when every polynomial equation in existence shared a single root. Its breath factors the unfactorable. Only those who have mastered algebra can approach it without being reduced to echelon form.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    icon: '🐲',
    captureRate: 0.08,
    difficulty: 'nightmare',
    subject: 'mathematics',
  },

  // Mythic — Stage 3
  {
    id: 'algebraicus-rex',
    name: 'Algebraicus Rex',
    codexName: 'Algebraicus Rex Supremus',
    element: 'algebraic',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'polydrake',
    stats: { speed: 95, power: 98, wisdom: 92, luck: 80 },
    abilities: [
      { id: 'complete-factor', name: 'Complete Factorization', description: 'Reveals the full answer with step-by-step factoring', icon: '🌟', effect: 'revealAnswer', cooldown: 12, power: 10 },
      { id: 'fundamental-thm', name: 'Fundamental Theorem', description: 'Auto-solves the current problem instantly', icon: '👑', effect: 'autoCalc', cooldown: 15, power: 10 },
      { id: 'galois-fury', name: 'Galois Fury', description: 'Freezes time for 15 seconds', icon: '⏳', effect: 'timeFreeze', cooldown: 10, power: 9 },
    ],
    description: 'The ultimate algebra beast—a towering dragon-king with every algebra symbol orbiting its crown.',
    lore: 'Algebraicus Rex is the embodiment of the Fundamental Theorem of Algebra. Galois himself glimpsed it in a dream and wept. Its very existence proves that every polynomial has a root—and every root has a beast.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F59E0B, #EF4444)',
    icon: '👑',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'mathematics',
  },
]

// ── Geometric Element ────────────────────────────────────────────────────────

const GEOMETRIC_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'angler',
    name: 'Angler',
    codexName: 'Geometricus Angulus',
    element: 'geometric',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'trigonox',
    evolveCondition: 'Solve 20 geometry problems',
    stats: { speed: 28, power: 25, wisdom: 30, luck: 25 },
    abilities: [
      { id: 'angle-sense', name: 'Angle Sense', description: 'Gives a hint about geometric relationships', icon: '📐', effect: 'hint', cooldown: 3, power: 3 },
    ],
    description: 'A fish-like beast with a protractor growing from its head like a lantern.',
    lore: 'Anglers swim through Euclidean space, their protractor-light revealing hidden angles. They are drawn to intersections like moths to parallel lines. Some say they can see in 360 degrees.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #22C55E, #4ADE80)',
    icon: '🐟',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'perimetra',
    name: 'Perimetra',
    codexName: 'Geometricus Perimetris',
    element: 'geometric',
    rarity: 'common',
    stage: 1,
    stats: { speed: 32, power: 22, wisdom: 28, luck: 30 },
    abilities: [
      { id: 'boundary-walk', name: 'Boundary Walk', description: 'Slows the timer by 30%', icon: '🚶', effect: 'slowTimer', cooldown: 4, power: 3 },
    ],
    description: 'A centipede-like beast whose legs perfectly trace the perimeter of any shape it touches.',
    lore: 'Perimetras instinctively walk the boundaries of geometric figures, counting steps as they go. Their body segments are always regular polygons. They dream of shapes with fractional dimensions.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #4ADE80, #86EFAC)',
    icon: '🐛',
    captureRate: 0.68,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'vertexia',
    name: 'Vertexia',
    codexName: 'Geometricus Vertexis',
    element: 'geometric',
    rarity: 'common',
    stage: 1,
    stats: { speed: 35, power: 18, wisdom: 32, luck: 28 },
    abilities: [
      { id: 'vertex-glow', name: 'Vertex Glow', description: 'Doubles XP for one problem', icon: '⭐', effect: 'doubleXP', cooldown: 5, power: 2 },
    ],
    description: 'A tiny star-shaped beast that sits at the vertex of every angle, glowing softly.',
    lore: 'Vertexias are the points where geometry begins. Every polygon has a Vertexia at each corner, whispering coordinates to those who listen. They hate when vertices get rounded off.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #22C55E, #16A34A)',
    icon: '⭐',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'mathematics',
  },

  // Rare — Stage 1-2
  {
    id: 'trigonox',
    name: 'Trigonox',
    codexName: 'Geometricus Trigonometricus',
    element: 'geometric',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'angler',
    evolvesTo: 'icosian',
    evolveCondition: 'Win 10 battles with Trigonox',
    stats: { speed: 42, power: 38, wisdom: 45, luck: 28 },
    abilities: [
      { id: 'sine-wave', name: 'Sine Wave', description: 'Shields from one wrong answer', icon: '🌊', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A serpentine beast whose body undulates in perfect sinusoidal waves.',
    lore: 'Trigonox slides through problems leaving sine and cosine trails behind. Its three heads represent sin, cos, and tan—always in perfect Pythagorean harmony. It knows the unit circle by heart.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #16A34A, #22C55E)',
    icon: '🐍',
    captureRate: 0.38,
    difficulty: 'scholar',
    subject: 'mathematics',
  },
  {
    id: 'parabolix',
    name: 'Parabolix',
    codexName: 'Geometricus Parabolicus',
    element: 'geometric',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 38, power: 42, wisdom: 35, luck: 32 },
    abilities: [
      { id: 'focus-beam', name: 'Focus Beam', description: 'Boosts combo multiplier', icon: '🎯', effect: 'comboBoost', cooldown: 5, power: 5 },
    ],
    description: 'A dish-shaped beast that reflects all incoming knowledge to its focal point.',
    lore: 'Parabolix channels everything toward its focus, where understanding becomes brightest. It was first spotted reflecting starlight into equations. Its curve is always perfect—never elliptic, never hyperbolic.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #15803D, #22C55E)',
    icon: '📡',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'mathematics',
  },

  // Epic — Stage 2
  {
    id: 'icosian',
    name: 'Icosian',
    codexName: 'Geometricus Icosahedrus',
    element: 'geometric',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'trigonox',
    evolvesTo: 'fractalis',
    evolveCondition: 'Solve 40 geometry problems',
    stats: { speed: 58, power: 52, wisdom: 60, luck: 42 },
    abilities: [
      { id: 'platonic-wall', name: 'Platonic Wall', description: 'Blocks penalties for 3 problems', icon: '🛡️', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'symmetry-sight', name: 'Symmetry Sight', description: 'Reveals symmetry-based hints', icon: '🪞', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'An icosahedron-shaped beast with 20 triangular faces of pure geometric energy.',
    lore: 'Icosian is the most symmetric of the Platonic beasts. Its 20 faces each represent a geometric truth. Hamilton sought it across the edges of a dodecahedron—and found it waiting.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #16A34A, #15803D)',
    icon: '💠',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'mathematics',
  },
  {
    id: 'tesseract',
    name: 'Tesseract',
    codexName: 'Geometricus Hypercubicus',
    element: 'geometric',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 62, power: 48, wisdom: 68, luck: 38 },
    abilities: [
      { id: 'dim-shift', name: 'Dimension Shift', description: 'Heals a broken streak', icon: '💫', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'hyper-hint', name: 'Hyper Hint', description: 'Provides a multi-dimensional hint', icon: '🔮', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'A four-dimensional cube beast that phases in and out of visible space.',
    lore: 'Tesseract exists partly in the fourth dimension, making it nearly impossible to fully perceive. What we see is merely its 3D shadow. It folds space the way you fold paper.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #22C55E, #06B6D4)',
    icon: '◻️',
    captureRate: 0.16,
    difficulty: 'expert',
    subject: 'mathematics',
  },

  // Legendary — Stage 2
  {
    id: 'fractalis',
    name: 'Fractalis',
    codexName: 'Geometricus Fractalis',
    element: 'geometric',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'geometricus-prime',
    evolveCondition: 'Reach Level 40',
    stats: { speed: 72, power: 75, wisdom: 78, luck: 55 },
    abilities: [
      { id: 'infinite-zoom', name: 'Infinite Zoom', description: 'Freezes time while you examine the problem', icon: '🔍', effect: 'timeFreeze', cooldown: 8, power: 8 },
      { id: 'self-similar', name: 'Self-Similar', description: 'Auto-completes a portion of the calculation', icon: '🌀', effect: 'autoCalc', cooldown: 10, power: 8 },
    ],
    description: 'A fractal beast that contains infinite copies of itself at every scale.',
    lore: 'Fractalis exists at every magnification simultaneously. Zoom in and you see Fractalis again, forever. Mandelbrot documented its boundary—where chaos meets geometry in infinite self-similar recursion.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #22C55E)',
    icon: '🌀',
    captureRate: 0.07,
    difficulty: 'nightmare',
    subject: 'mathematics',
  },

  // Mythic — Stage 3
  {
    id: 'geometricus-prime',
    name: 'Geometricus Prime',
    codexName: 'Geometricus Primus Eternis',
    element: 'geometric',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'fractalis',
    stats: { speed: 92, power: 95, wisdom: 96, luck: 78 },
    abilities: [
      { id: 'euclidean-dream', name: 'Euclidean Dream', description: 'Reveals full answer with geometric proof', icon: '🌟', effect: 'revealAnswer', cooldown: 12, power: 10 },
      { id: 'pythagorean-fury', name: 'Pythagorean Fury', description: 'Auto-solves via geometric construction', icon: '📏', effect: 'autoCalc', cooldown: 15, power: 10 },
      { id: 'golden-ratio', name: 'Golden Ratio', description: 'Freezes time and doubles all XP earned', icon: '✨', effect: 'timeFreeze', cooldown: 10, power: 9 },
    ],
    description: 'The supreme geometric beast—its body is every shape simultaneously, from point to infinity.',
    lore: 'Geometricus Prime is the shape that contains all shapes. Euclid saw it in a dream and wrote the Elements. Its proportions are the Golden Ratio incarnate. Where it walks, space itself becomes Euclidean.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F59E0B, #22C55E)',
    icon: '🌟',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'mathematics',
  },
]

// ── Kinetic Element ──────────────────────────────────────────────────────────

const KINETIC_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'momentum',
    name: 'Momentum',
    codexName: 'Kineticus Momentum',
    element: 'kinetic',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'accelero',
    evolveCondition: 'Solve 20 physics problems',
    stats: { speed: 38, power: 22, wisdom: 20, luck: 28 },
    abilities: [
      { id: 'push-through', name: 'Push Through', description: 'Skips the penalty for one wrong answer', icon: '💨', effect: 'skipPenalty', cooldown: 4, power: 3 },
    ],
    description: 'A rolling sphere beast that gains speed relentlessly and refuses to stop.',
    lore: 'Momentum follows Newton\'s first law with religious devotion—it never stops unless forced. The faster it rolls, the harder it is to catch. It embodies mass times velocity in pure form.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316, #FB923C)',
    icon: '🔵',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'physics',
  },
  {
    id: 'velocet',
    name: 'Velocet',
    codexName: 'Kineticus Velocitas',
    element: 'kinetic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 45, power: 18, wisdom: 22, luck: 25 },
    abilities: [
      { id: 'speed-boost', name: 'Speed Boost', description: 'Slows the timer, giving you more time', icon: '⚡', effect: 'slowTimer', cooldown: 3, power: 3 },
    ],
    description: 'A cheetah-like beast made of velocity vectors, always accelerating forward.',
    lore: 'Velocets are the fastest common beasts, outrunning even time itself on good days. Their spots are directional arrows. They leave trails of dx/dt wherever they sprint.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #FB923C, #FDBA74)',
    icon: '🐆',
    captureRate: 0.68,
    difficulty: 'rookie',
    subject: 'physics',
  },
  {
    id: 'pulser',
    name: 'Pulser',
    codexName: 'Kineticus Pulsis',
    element: 'kinetic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 30, power: 28, wisdom: 25, luck: 32 },
    abilities: [
      { id: 'pulse-heal', name: 'Pulse Heal', description: 'Heals your streak counter', icon: '💓', effect: 'healStreak', cooldown: 5, power: 2 },
    ],
    description: 'A heart-shaped beast that beats with kinetic energy, pulsing force outward.',
    lore: 'Pulsers beat in harmonic rhythm, converting potential to kinetic energy with every pulse. They synchronize with solvers who find their rhythm. A steady pulse means a steady mind.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316, #EA580C)',
    icon: '💓',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'physics',
  },

  // Rare — Stage 1-2
  {
    id: 'accelero',
    name: 'Accelero',
    codexName: 'Kineticus Accelerantis',
    element: 'kinetic',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'momentum',
    evolvesTo: 'torquida',
    evolveCondition: 'Win 10 battles with Accelero',
    stats: { speed: 48, power: 40, wisdom: 35, luck: 28 },
    abilities: [
      { id: 'force-field', name: 'Force Field', description: 'Shields you from one penalty', icon: '🛡️', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A beast that exists in constant acceleration, warping the space around it.',
    lore: 'Acceleros generate a personal force field proportional to their mass times acceleration. They never move at constant velocity—it\'s against their nature. F=ma is not just their equation; it\'s their identity.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #EA580C, #F97316)',
    icon: '🚀',
    captureRate: 0.38,
    difficulty: 'scholar',
    subject: 'physics',
  },
  {
    id: 'impulsa',
    name: 'Impulsa',
    codexName: 'Kineticus Impulsus',
    element: 'kinetic',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 42, power: 45, wisdom: 38, luck: 30 },
    abilities: [
      { id: 'impulse-strike', name: 'Impulse Strike', description: 'Boosts combo multiplier sharply', icon: '💥', effect: 'comboBoost', cooldown: 5, power: 6 },
    ],
    description: 'A beast of sudden force—appears in a flash, delivers massive impulse, vanishes.',
    lore: 'Impulsa proves that force over time creates lasting change. Its strikes are brief but transformative. Engineers fear and respect it in equal measure, for it shows why walls need padding.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #C2410C, #F97316)',
    icon: '💥',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'physics',
  },

  // Epic — Stage 2
  {
    id: 'torquida',
    name: 'Torquida',
    codexName: 'Kineticus Torquis',
    element: 'kinetic',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'accelero',
    evolvesTo: 'newtonia',
    evolveCondition: 'Solve 50 mechanics problems',
    stats: { speed: 55, power: 60, wisdom: 55, luck: 38 },
    abilities: [
      { id: 'twist-guard', name: 'Twist Guard', description: 'Blocks all penalties for 3 problems', icon: '🔄', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'lever-hint', name: 'Lever Hint', description: 'Provides a physics-based hint using leverage', icon: '🔧', effect: 'hint', cooldown: 4, power: 5 },
    ],
    description: 'A spiraling beast of rotational force, twisting reality around its axis.',
    lore: 'Torquida embodies τ = r × F in living form. It can rotate any problem to a more favorable angle. Archimedes promised to move the earth with a lever—Torquida actually does it.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #EA580C, #9A3412)',
    icon: '🌀',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'physics',
  },
  {
    id: 'gyronix',
    name: 'Gyronix',
    codexName: 'Kineticus Gyroscopis',
    element: 'kinetic',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 65, power: 50, wisdom: 62, luck: 40 },
    abilities: [
      { id: 'precession', name: 'Precession', description: 'Heals your streak with gyroscopic stability', icon: '⚙️', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'spin-sight', name: 'Spin Sight', description: 'Reveals rotational symmetry hints', icon: '👁️', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'A gyroscope beast that maintains perfect stability regardless of external forces.',
    lore: 'Gyronix defies tipping through conservation of angular momentum. Its three rings spin in eternal stability. Even on the iciest problem, Gyronix keeps its balance and yours.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316, #F59E0B)',
    icon: '⚙️',
    captureRate: 0.16,
    difficulty: 'expert',
    subject: 'physics',
  },

  // Legendary — Stage 2
  {
    id: 'newtonia',
    name: 'Newtonia',
    codexName: 'Kineticus Newtonis',
    element: 'kinetic',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'kineticus-omega',
    evolveCondition: 'Defeat 5 nightmare battles',
    stats: { speed: 78, power: 82, wisdom: 72, luck: 52 },
    abilities: [
      { id: 'third-law', name: 'Third Law', description: 'Reflects a wrong answer back as a hint', icon: '⚖️', effect: 'revealAnswer', cooldown: 8, power: 8 },
      { id: 'gravity-well', name: 'Gravity Well', description: 'Freezes time as all problems gravitate to solutions', icon: '🕳️', effect: 'timeFreeze', cooldown: 10, power: 8 },
    ],
    description: 'A gravitational beast that warps spacetime, embodying all three of Newton\'s laws.',
    lore: 'Newtonia is the beast Newton saw when the apple fell. It carries the weight of classical mechanics on its shoulders. For every wrong answer you give, it gives an equal and opposite correct hint.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #F97316)',
    icon: '🍎',
    captureRate: 0.07,
    difficulty: 'nightmare',
    subject: 'physics',
  },

  // Mythic — Stage 3
  {
    id: 'kineticus-omega',
    name: 'Kineticus Omega',
    codexName: 'Kineticus Omega Ultima',
    element: 'kinetic',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'newtonia',
    stats: { speed: 96, power: 94, wisdom: 90, luck: 82 },
    abilities: [
      { id: 'omega-force', name: 'Omega Force', description: 'Auto-solves any mechanics problem', icon: '🌟', effect: 'autoCalc', cooldown: 12, power: 10 },
      { id: 'relativistic', name: 'Relativistic Shift', description: 'Freezes time and boosts all stats', icon: '⚡', effect: 'timeFreeze', cooldown: 10, power: 9 },
      { id: 'conservation', name: 'Conservation', description: 'Reveals answer via conservation laws', icon: '🔄', effect: 'revealAnswer', cooldown: 14, power: 10 },
    ],
    description: 'The ultimate kinetic beast—pure motion given form, from Newton to Einstein.',
    lore: 'Kineticus Omega transcends classical mechanics, existing where force, energy, and momentum become one. It is the beast at the end of physics—where every equation of motion resolves to understanding.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F97316, #F59E0B)',
    icon: '🌟',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'physics',
  },
]

// ── Thermal Element ──────────────────────────────────────────────────────────

const THERMAL_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'emberite',
    name: 'Emberite',
    codexName: 'Thermalicus Emberis',
    element: 'thermal',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'calorix',
    evolveCondition: 'Solve 20 thermodynamics problems',
    stats: { speed: 25, power: 30, wisdom: 22, luck: 28 },
    abilities: [
      { id: 'warm-hint', name: 'Warm Hint', description: 'Provides a warm, comforting hint', icon: '🔥', effect: 'hint', cooldown: 3, power: 3 },
    ],
    description: 'A small fire-sprite beast that flickers with thermal energy at the molecular level.',
    lore: 'Emberites are born from the random motions of heated molecules. They dance on the head of a pin, each one a tiny parcel of kinetic energy. They love exothermic reactions and hate the cold.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F87171)',
    icon: '🔥',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'physics',
  },
  {
    id: 'entropup',
    name: 'Entropup',
    codexName: 'Thermalicus Entropicus',
    element: 'thermal',
    rarity: 'common',
    stage: 1,
    stats: { speed: 22, power: 25, wisdom: 35, luck: 30 },
    abilities: [
      { id: 'chaos-bloom', name: 'Chaos Bloom', description: 'Doubles XP from disordered problems', icon: '🎲', effect: 'doubleXP', cooldown: 5, power: 2 },
    ],
    description: 'A pup-shaped beast of entropy that spreads delightful disorder wherever it goes.',
    lore: 'Entropups increase the disorder of any system they enter, but they do it with boundless enthusiasm. The Second Law is their favorite chew toy. They always make messes and never clean up.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #F87171, #FCA5A5)',
    icon: '🐕',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'physics',
  },
  {
    id: 'kelvinite',
    name: 'Kelvinite',
    codexName: 'Thermalicus Absolutis',
    element: 'thermal',
    rarity: 'common',
    stage: 1,
    stats: { speed: 28, power: 20, wisdom: 28, luck: 25 },
    abilities: [
      { id: 'absolute-zero', name: 'Absolute Zero', description: 'Slows the timer nearly to a stop', icon: '❄️', effect: 'slowTimer', cooldown: 4, power: 3 },
    ],
    description: 'A crystalline ice beast that exists at absolute zero, perfectly still until disturbed.',
    lore: 'Kelvinites are the coldest beasts in existence, their molecules frozen in perfect lattice order. They represent temperature\'s true zero. Disturb one and the phase transition is spectacular.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    icon: '❄️',
    captureRate: 0.68,
    difficulty: 'rookie',
    subject: 'physics',
  },

  // Rare — Stage 1-2
  {
    id: 'calorix',
    name: 'Calorix',
    codexName: 'Thermalicus Caloris',
    element: 'thermal',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'emberite',
    evolvesTo: 'carnotus',
    evolveCondition: 'Win 10 battles with Calorix',
    stats: { speed: 35, power: 42, wisdom: 38, luck: 28 },
    abilities: [
      { id: 'heat-shield', name: 'Heat Shield', description: 'Absorbs one penalty like heat capacity', icon: '🛡️', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A beast of specific heat that absorbs problems into its thermal mass.',
    lore: 'Calorix can absorb tremendous energy without changing temperature—its specific heat is legendary. It stores solved problems as thermal energy, releasing them as warmth when needed.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #DC2626, #EF4444)',
    icon: '☀️',
    captureRate: 0.38,
    difficulty: 'scholar',
    subject: 'physics',
  },
  {
    id: 'adiabat',
    name: 'Adiabat',
    codexName: 'Thermalicus Adiabaticus',
    element: 'thermal',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 40, power: 38, wisdom: 42, luck: 30 },
    abilities: [
      { id: 'no-exchange', name: 'No Exchange', description: 'Boosts combo—no energy lost to surroundings', icon: '🔄', effect: 'comboBoost', cooldown: 5, power: 5 },
    ],
    description: 'A self-contained beast that never exchanges heat with its environment.',
    lore: 'Adiabats are perfectly insulated from the world. They compress and expand without losing a joule. In a world of entropy, they stand alone—perfect, efficient, and slightly arrogant about it.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #B91C1C, #EF4444)',
    icon: '🧊',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'physics',
  },

  // Epic — Stage 2
  {
    id: 'carnotus',
    name: 'Carnotus',
    codexName: 'Thermalicus Carnotis',
    element: 'thermal',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'calorix',
    evolvesTo: 'thermax',
    evolveCondition: 'Solve 40 thermodynamics problems',
    stats: { speed: 55, power: 58, wisdom: 62, luck: 40 },
    abilities: [
      { id: 'ideal-cycle', name: 'Ideal Cycle', description: 'Blocks penalties with Carnot efficiency', icon: '🔄', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'efficiency-glow', name: 'Efficiency Glow', description: 'Reveals the most efficient solution path', icon: '💡', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'A cyclical beast that operates at maximum theoretical efficiency—no beast is more efficient.',
    lore: 'Carnotus is the benchmark by which all thermal beasts are measured. Its efficiency is (T_hot - T_cold)/T_hot and it will never let you forget it. Sadi Carnot dreamed it into existence.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #DC2626, #991B1B)',
    icon: '♻️',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'physics',
  },
  {
    id: 'phasemorph',
    name: 'Phasemorph',
    codexName: 'Thermalicus Phasis',
    element: 'thermal',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 50, power: 55, wisdom: 58, luck: 42 },
    abilities: [
      { id: 'phase-shift', name: 'Phase Shift', description: 'Heals streak by shifting to a better phase', icon: '💧', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'latent-heat', name: 'Latent Heat', description: 'Reveals hidden information like latent heat', icon: '♨️', effect: 'hint', cooldown: 4, power: 5 },
    ],
    description: 'A beast that phase-shifts between solid, liquid, and gas forms at will.',
    lore: 'Phasemorph absorbs latent heat to transform, hiding in whatever phase suits the problem. It teaches that change of state carries hidden energy. Boiling water was never just boiling water.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F97316)',
    icon: '🌊',
    captureRate: 0.16,
    difficulty: 'expert',
    subject: 'physics',
  },

  // Legendary — Stage 2
  {
    id: 'thermax',
    name: 'Thermax',
    codexName: 'Thermalicus Maximus',
    element: 'thermal',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'thermalis-infinite',
    evolveCondition: 'Reach Level 40',
    stats: { speed: 70, power: 85, wisdom: 75, luck: 50 },
    abilities: [
      { id: 'inferno', name: 'Inferno', description: 'Burns through a problem, auto-calculating', icon: '🔥', effect: 'autoCalc', cooldown: 8, power: 8 },
      { id: 'max-entropy', name: 'Max Entropy', description: 'Freezes time in maximum disorder', icon: '🌀', effect: 'timeFreeze', cooldown: 10, power: 8 },
    ],
    description: 'A furnace beast of maximum thermal output—the hottest thing in the Neo Monsters universe.',
    lore: 'Thermax operates at temperatures where physics itself starts to sweat. It is the heat death of the universe, personified and angry about it. Approach only with asbestos gloves and a firm grasp of the First Law.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    icon: '🌋',
    captureRate: 0.07,
    difficulty: 'nightmare',
    subject: 'physics',
  },

  // Mythic — Stage 3
  {
    id: 'thermalis-infinite',
    name: 'Thermalis Infinite',
    codexName: 'Thermalicus Infinitus',
    element: 'thermal',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'thermax',
    stats: { speed: 88, power: 97, wisdom: 94, luck: 75 },
    abilities: [
      { id: 'big-bang', name: 'Big Bang', description: 'Auto-solves with explosive thermal force', icon: '🌟', effect: 'autoCalc', cooldown: 12, power: 10 },
      { id: 'heat-death', name: 'Heat Death', description: 'Freezes time as entropy reaches maximum', icon: '🕳️', effect: 'timeFreeze', cooldown: 10, power: 9 },
      { id: 'maxwell-demon', name: 'Maxwell\'s Demon', description: 'Reveals answer by sorting fast from slow', icon: '😈', effect: 'revealAnswer', cooldown: 14, power: 10 },
    ],
    description: 'The ultimate thermal beast—from the Big Bang to the heat death of the universe, it is temperature itself.',
    lore: 'Thermalis Infinite was born in the Big Bang and will exist until heat death. It has seen temperatures from Planck hot to absolute zero. Maxwell\'s Demon is its pet, and the Second Law bends around it.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F59E0B, #A855F7)',
    icon: '🌟',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'physics',
  },
]

// ── Quantum Element ──────────────────────────────────────────────────────────

const QUANTUM_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'quarklet',
    name: 'Quarklet',
    codexName: 'Quantum Quarkis',
    element: 'quantum',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'superposix',
    evolveCondition: 'Solve 20 quantum problems',
    stats: { speed: 32, power: 18, wisdom: 28, luck: 35 },
    abilities: [
      { id: 'flavor-shift', name: 'Flavor Shift', description: 'Randomly boosts luck by changing flavor', icon: '🎲', effect: 'doubleXP', cooldown: 4, power: 3 },
    ],
    description: 'A tiny beast with three color charges—red, green, blue—flashing unpredictably.',
    lore: 'Quarklets are never found alone; they always appear in groups of three or with their antiquark. They have six flavors but you never know which one until you taste the problem.',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #C084FC)',
    icon: '✨',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'physics',
  },
  {
    id: 'spinor',
    name: 'Spinor',
    codexName: 'Quantum Spinoris',
    element: 'quantum',
    rarity: 'common',
    stage: 1,
    stats: { speed: 28, power: 25, wisdom: 32, luck: 28 },
    abilities: [
      { id: 'spin-up', name: 'Spin Up', description: 'Provides a hint with spin-up orientation', icon: '⬆️', effect: 'hint', cooldown: 3, power: 3 },
    ],
    description: 'A spinning top-like beast that must rotate 720° to return to its starting state.',
    lore: 'Spinors are the strangest of the common beasts—you must turn them around twice to get back to the start. They live in a world where 360° is only half a revolution. Dirac discovered them and never recovered.',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #C084FC, #D8B4FE)',
    icon: '🌀',
    captureRate: 0.68,
    difficulty: 'rookie',
    subject: 'physics',
  },
  {
    id: 'orbx',
    name: 'Orbx',
    codexName: 'Quantum Orbitalis',
    element: 'quantum',
    rarity: 'common',
    stage: 1,
    stats: { speed: 25, power: 22, wisdom: 30, luck: 32 },
    abilities: [
      { id: 'orbit-hint', name: 'Orbit Hint', description: 'Hovers around the answer like an electron cloud', icon: '☁️', effect: 'hint', cooldown: 4, power: 2 },
    ],
    description: 'A cloud-like beast shaped like an electron orbital—never in one place, always probable.',
    lore: 'Orbx never tells you exactly where the answer is, only the probability of finding it nearby. Its shape shifts between s, p, d, and f orbitals depending on its energy level. Heisenberg approves.',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #9333EA)',
    icon: '☁️',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'physics',
  },

  // Rare — Stage 1-2
  {
    id: 'superposix',
    name: 'Superposix',
    codexName: 'Quantum Superpositionis',
    element: 'quantum',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'quarklet',
    evolvesTo: 'eigenbeast',
    evolveCondition: 'Win 10 battles with Superposix',
    stats: { speed: 40, power: 35, wisdom: 45, luck: 35 },
    abilities: [
      { id: 'both-states', name: 'Both States', description: 'Shields—exists in both right and wrong simultaneously', icon: '🛡️', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A beast that exists in multiple states at once until you observe the answer.',
    lore: 'Superposix is right and wrong at the same time until you check. Observation collapses it into a single state. It refuses to be pinned down. Schrödinger would either love or hate it—both simultaneously.',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #9333EA, #A855F7)',
    icon: '👯',
    captureRate: 0.38,
    difficulty: 'scholar',
    subject: 'physics',
  },
  {
    id: 'entangel',
    name: 'Entangel',
    codexName: 'Quantum Entanglis',
    element: 'quantum',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 42, power: 40, wisdom: 48, luck: 30 },
    abilities: [
      { id: 'spooky-link', name: 'Spooky Link', description: 'Boosts combo via entangled problem pairs', icon: '🔗', effect: 'comboBoost', cooldown: 5, power: 6 },
    ],
    description: 'A twin-headed beast whose heads are entangled—measure one and you instantly know the other.',
    lore: 'Entangel\'s two heads share information faster than light, violating local realism with glee. Einstein called it "spooky action at a distance." Entangel considers that a compliment.',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)',
    icon: '🔗',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'physics',
  },

  // Epic — Stage 2
  {
    id: 'eigenbeast',
    name: 'Eigenbeast',
    codexName: 'Quantum Eigenis',
    element: 'quantum',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'superposix',
    evolvesTo: 'schrodrake',
    evolveCondition: 'Solve 50 quantum problems',
    stats: { speed: 58, power: 55, wisdom: 65, luck: 42 },
    abilities: [
      { id: 'eigen-shield', name: 'Eigen Shield', description: 'Unbreakable shield—eigenstates don\'t change under observation', icon: '🛡️', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'eigen-hint', name: 'Eigen Hint', description: 'Provides eigenvalue-quality hints', icon: '💡', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'A self-similar beast that is unchanged by observation—it IS its own eigenstate.',
    lore: 'Eigenbeasts are the only quantum creatures that don\'t collapse under observation. They know exactly what they are and refuse to be anything else. They are the fixed points of reality.',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #9333EA, #7C3AED)',
    icon: '🔮',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'physics',
  },
  {
    id: 'perturbix',
    name: 'Perturbix',
    codexName: 'Quantum Perturbatis',
    element: 'quantum',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 52, power: 60, wisdom: 58, luck: 38 },
    abilities: [
      { id: 'small-nudge', name: 'Small Nudge', description: 'Heals streak with a tiny perturbation', icon: '👆', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'approx-sight', name: 'Approx Sight', description: 'Reveals approximate answer to first order', icon: '👁️', effect: 'hint', cooldown: 4, power: 5 },
    ],
    description: 'A beast of small perturbations that solves problems by nudging them gently toward solutions.',
    lore: 'Perturbix believes that no problem is too hard if you can make it slightly easier first. It solves by successive approximations, each one a tiny step closer to truth. Feynman would have loved it.',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #06B6D4)',
    icon: '👆',
    captureRate: 0.16,
    difficulty: 'expert',
    subject: 'physics',
  },

  // Legendary — Stage 2
  {
    id: 'schrodrake',
    name: 'Schrodrake',
    codexName: 'Quantum Draconis',
    element: 'quantum',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'quantus-supreme',
    evolveCondition: 'Defeat 5 nightmare battles',
    stats: { speed: 75, power: 78, wisdom: 80, luck: 55 },
    abilities: [
      { id: 'wave-collapse', name: 'Wave Collapse', description: 'Collapses all possibilities into the correct answer', icon: '🌊', effect: 'revealAnswer', cooldown: 8, power: 8 },
      { id: 'probability-rain', name: 'Probability Rain', description: 'Freezes time as probability floods the space', icon: '🌧️', effect: 'timeFreeze', cooldown: 10, power: 8 },
    ],
    description: 'A wave-dragon beast that is both alive and dead until you solve the problem.',
    lore: 'Schrodrake is the most famous quantum beast—the dragon in the box. Until you open the problem, it exists in superposition. Its wave function is a thing of terrible beauty.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #A855F7)',
    icon: '🐉',
    captureRate: 0.07,
    difficulty: 'nightmare',
    subject: 'physics',
  },

  // Mythic — Stage 3
  {
    id: 'quantus-supreme',
    name: 'Quantus Supreme',
    codexName: 'Quantus Supreme Ultima',
    element: 'quantum',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'schrodrake',
    stats: { speed: 90, power: 96, wisdom: 98, luck: 80 },
    abilities: [
      { id: 'quantum-solve', name: 'Quantum Solve', description: 'Solves via quantum computation instantly', icon: '🌟', effect: 'autoCalc', cooldown: 12, power: 10 },
      { id: 'uncertain-freeze', name: 'Uncertain Freeze', description: 'Freezes time with Heisenberg certainty', icon: '⏳', effect: 'timeFreeze', cooldown: 10, power: 9 },
      { id: 'path-integral', name: 'Path Integral', description: 'Reveals answer by summing all possible paths', icon: '🛤️', effect: 'revealAnswer', cooldown: 14, power: 10 },
    ],
    description: 'The supreme quantum beast—where wave and particle become one, and all paths lead to truth.',
    lore: 'Quantus Supreme exists beyond wave-particle duality. It computes all possible solutions simultaneously via quantum superposition and collapses to the correct one. Feynman\'s path integral is its heartbeat.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #A855F7, #06B6D4)',
    icon: '🌟',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'physics',
  },
]

// ── Chemical Element ─────────────────────────────────────────────────────────

const CHEMICAL_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'ionette',
    name: 'Ionette',
    codexName: 'Chemicus Ionis',
    element: 'chemical',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'valencia',
    evolveCondition: 'Solve 20 chemistry problems',
    stats: { speed: 30, power: 22, wisdom: 25, luck: 28 },
    abilities: [
      { id: 'charge-hint', name: 'Charge Hint', description: 'Provides a positively charged hint', icon: '⚡', effect: 'hint', cooldown: 3, power: 3 },
    ],
    description: 'A spark-like beast carrying an electric charge, bouncing between molecules.',
    lore: 'Ionettes are the messengers of chemical reactions, carrying charge from atom to atom. They are never neutral—always slightly positive or negative about everything. Their spark is small but essential.',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6, #2DD4BF)',
    icon: '⚡',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'chemistry',
  },
  {
    id: 'moleculark',
    name: 'Moleculark',
    codexName: 'Chemicus Moleculis',
    element: 'chemical',
    rarity: 'common',
    stage: 1,
    stats: { speed: 25, power: 28, wisdom: 30, luck: 25 },
    abilities: [
      { id: 'bond-slow', name: 'Bond Slow', description: 'Slows timer like intermolecular forces', icon: '🔗', effect: 'slowTimer', cooldown: 4, power: 3 },
    ],
    description: 'A blob-like beast made of bonded atoms, jiggling with molecular motion.',
    lore: 'Molecularks teach that everything is made of smaller things bonded together. They vibrate with thermal energy and form unexpected bonds. They hate being alone—covalent or ionic, they need connection.',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #2DD4BF, #5EEAD4)',
    icon: '🧫',
    captureRate: 0.68,
    difficulty: 'rookie',
    subject: 'chemistry',
  },
  {
    id: 'catalix',
    name: 'Catalix',
    codexName: 'Chemicus Catalysis',
    element: 'chemical',
    rarity: 'common',
    stage: 1,
    stats: { speed: 35, power: 20, wisdom: 32, luck: 30 },
    abilities: [
      { id: 'lower-barrier', name: 'Lower Barrier', description: 'Reduces cooldown of next ability', icon: '⬇️', effect: 'doubleXP', cooldown: 5, power: 2 },
    ],
    description: 'A facilitator beast that lowers activation energy for everything around it.',
    lore: 'Catalix never gets consumed in a reaction—it just makes everything happen faster. It is patient, efficient, and always unchanged after helping. Enzymes worship it as their patron beast.',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    icon: '⚗️',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'chemistry',
  },

  // Rare — Stage 1-2
  {
    id: 'valencia',
    name: 'Valencia',
    codexName: 'Chemicus Valentis',
    element: 'chemical',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'ionette',
    evolvesTo: 'reactant',
    evolveCondition: 'Win 10 battles with Valencia',
    stats: { speed: 40, power: 38, wisdom: 42, luck: 28 },
    abilities: [
      { id: 'shell-shield', name: 'Shell Shield', description: 'Shields using electron shell protection', icon: '🛡️', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A beautiful beast whose electron shells shimmer with valence energy.',
    lore: 'Valencia\'s beauty lies in its outermost electrons—always seeking an octet. It bonds with any beast that has complementary valence. Chemistry is, at its heart, the story of Valencia.',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #0D9488, #14B8A6)',
    icon: '💎',
    captureRate: 0.38,
    difficulty: 'scholar',
    subject: 'chemistry',
  },
  {
    id: 'equilibrix',
    name: 'Equilibrix',
    codexName: 'Chemicus Aequilibris',
    element: 'chemical',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 38, power: 42, wisdom: 45, luck: 30 },
    abilities: [
      { id: 'le-chatelier', name: 'Le Chatelier', description: 'Boosts combo by shifting equilibrium', icon: '⚖️', effect: 'comboBoost', cooldown: 5, power: 5 },
    ],
    description: 'A balanced beast that always shifts to relieve stress on its equilibrium.',
    lore: 'Equilibrix exists in dynamic balance—always adjusting, never at rest but always steady. Add stress and it shifts to compensate. It is the embodiment of Le Chatelier\'s principle in living form.',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #0F766E, #14B8A6)',
    icon: '⚖️',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'chemistry',
  },

  // Epic — Stage 2
  {
    id: 'reactant',
    name: 'Reactant',
    codexName: 'Chemicus Reactantis',
    element: 'chemical',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'valencia',
    evolvesTo: 'alchemix',
    evolveCondition: 'Solve 40 chemistry problems',
    stats: { speed: 55, power: 58, wisdom: 55, luck: 38 },
    abilities: [
      { id: 'reaction-guard', name: 'Reaction Guard', description: 'Shields via exothermic protection', icon: '🛡️', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'yield-boost', name: 'Yield Boost', description: 'Increases XP yield like reaction yield', icon: '📈', effect: 'hint', cooldown: 4, power: 5 },
    ],
    description: 'A volatile beast of chemical reactions, always on the verge of transforming.',
    lore: 'Reactant\'s entire existence is potential energy waiting to become products. It teaches stoichiometry through its own transformation. Balance its equation and it will balance your score.',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #0D9488, #115E59)',
    icon: '🧨',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'chemistry',
  },
  {
    id: 'oxydrake',
    name: 'Oxydrake',
    codexName: 'Chemicus Oxydrakonis',
    element: 'chemical',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 50, power: 62, wisdom: 52, luck: 40 },
    abilities: [
      { id: 'oxidize', name: 'Oxidize', description: 'Heals streak through redox reaction', icon: '🔥', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'redox-sight', name: 'Redox Sight', description: 'Reveals electron transfer hints', icon: '👁️', effect: 'hint', cooldown: 4, power: 5 },
    ],
    description: 'A dragon of oxidation that breathes electron-stealing fire.',
    lore: 'Oxydrake is the reason iron rusts and apples brown. Its breath removes electrons from anything it touches. It gained its power from oxygen—the element that both gives life and takes it away.',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6, #F97316)',
    icon: '🐉',
    captureRate: 0.16,
    difficulty: 'expert',
    subject: 'chemistry',
  },

  // Legendary — Stage 2
  {
    id: 'alchemix',
    name: 'Alchemix',
    codexName: 'Chemicus Alchemis',
    element: 'chemical',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'chemicus-eternal',
    evolveCondition: 'Reach Level 40',
    stats: { speed: 72, power: 80, wisdom: 75, luck: 52 },
    abilities: [
      { id: 'transmute', name: 'Transmute', description: 'Auto-calculates by transforming the problem', icon: '🧿', effect: 'autoCalc', cooldown: 8, power: 8 },
      { id: 'philosopher-shield', name: 'Philosopher Shield', description: 'Freezes time with alchemical gold', icon: '⏳', effect: 'timeFreeze', cooldown: 10, power: 8 },
    ],
    description: 'An alchemist beast that transmutes problems into solutions—modern chemistry\'s philosopher\'s stone.',
    lore: 'Alchemix achieved what alchemists only dreamed: true transmutation. It doesn\'t turn lead to gold—it turns confusion to clarity. The periodic table is its scripture, and it has memorized every chapter.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #14B8A6)',
    icon: '🧿',
    captureRate: 0.07,
    difficulty: 'nightmare',
    subject: 'chemistry',
  },

  // Mythic — Stage 3
  {
    id: 'chemicus-eternal',
    name: 'Chemicus Eternal',
    codexName: 'Chemicus Aeternus',
    element: 'chemical',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'alchemix',
    stats: { speed: 90, power: 93, wisdom: 95, luck: 78 },
    abilities: [
      { id: 'periodic-surge', name: 'Periodic Surge', description: 'Auto-solves using all 118 elements', icon: '🌟', effect: 'autoCalc', cooldown: 12, power: 10 },
      { id: 'bond-eternal', name: 'Bond Eternal', description: 'Freezes time with bonds that never break', icon: '⏳', effect: 'timeFreeze', cooldown: 10, power: 9 },
      { id: 'reaction-complete', name: 'Reaction Complete', description: 'Reveals answer with complete reaction pathway', icon: '🧬', effect: 'revealAnswer', cooldown: 14, power: 10 },
    ],
    description: 'The eternal chemical beast—every reaction, every bond, every element in one living periodic table.',
    lore: 'Chemicus Eternal contains all 118 elements within its body, every bond type in its DNA. It is chemistry complete—the sum of every reaction that ever was or will be. Mendeleev saw it in a dream and wrote the table.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #14B8A6, #F59E0B)',
    icon: '🌟',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'chemistry',
  },
]

// ── Analytic Element ─────────────────────────────────────────────────────────

const ANALYTIC_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'differ',
    name: 'Differ',
    codexName: 'Analyticus Differensis',
    element: 'analytic',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'derivix',
    evolveCondition: 'Solve 20 calculus problems',
    stats: { speed: 28, power: 25, wisdom: 30, luck: 25 },
    abilities: [
      { id: 'small-change', name: 'Small Change', description: 'Provides a differential-sized hint', icon: '🔬', effect: 'hint', cooldown: 3, power: 3 },
    ],
    description: 'A tiny beast that only cares about infinitesimal changes in any quantity.',
    lore: 'Differ sees the world as infinitely small changes. It doesn\'t care about the big picture—only the rate at which things are changing right now. It is the spirit of dx made manifest.',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #22D3EE)',
    icon: '🔬',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'integrilla',
    name: 'Integrilla',
    codexName: 'Analyticus Integralis',
    element: 'analytic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 22, power: 30, wisdom: 28, luck: 30 },
    abilities: [
      { id: 'accumulate', name: 'Accumulate', description: 'Doubles XP by accumulating area', icon: '📊', effect: 'doubleXP', cooldown: 5, power: 2 },
    ],
    description: 'A gorilla-like beast that accumulates area under any curve it encounters.',
    lore: 'Integrilla doesn\'t do anything quickly—it accumulates. Every problem adds to its area, building understanding slice by slice. Riemann would be proud. Its fists are definite integrals.',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #22D3EE, #67E8F9)',
    icon: '🦍',
    captureRate: 0.68,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'limitus',
    name: 'Limitus',
    codexName: 'Analyticus Limitis',
    element: 'analytic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 32, power: 20, wisdom: 35, luck: 22 },
    abilities: [
      { id: 'approach', name: 'Approach', description: 'Slows timer as it approaches the answer', icon: '🎯', effect: 'slowTimer', cooldown: 4, power: 3 },
    ],
    description: 'A patient beast that approaches but never quite reaches its target—the spirit of limits.',
    lore: 'Limitus gets closer and closer to the answer but, philosophically, never touches it. It teaches epsilon-delta patience. For every epsilon, Limitus can find a delta—given enough time.',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    icon: '🎯',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'mathematics',
  },

  // Rare — Stage 1-2
  {
    id: 'derivix',
    name: 'Derivix',
    codexName: 'Analyticus Derivatis',
    element: 'analytic',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'differ',
    evolvesTo: 'jacobian',
    evolveCondition: 'Win 10 battles with Derivix',
    stats: { speed: 45, power: 40, wisdom: 42, luck: 28 },
    abilities: [
      { id: 'rate-shield', name: 'Rate Shield', description: 'Shields proportional to your solve rate', icon: '🛡️', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A sleek beast that knows the rate of change of everything it touches.',
    lore: 'Derivix can tell you how fast anything is changing at any instant. It moves at the speed of the tangent line. Its eyes glow brighter when the derivative is steep—it loves a challenge.',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #0891B2, #06B6D4)',
    icon: '📐',
    captureRate: 0.38,
    difficulty: 'scholar',
    subject: 'mathematics',
  },
  {
    id: 'converga',
    name: 'Converga',
    codexName: 'Analyticus Convergentis',
    element: 'analytic',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 38, power: 35, wisdom: 48, luck: 32 },
    abilities: [
      { id: 'series-boost', name: 'Series Boost', description: 'Boosts combo as the series converges', icon: '📈', effect: 'comboBoost', cooldown: 5, power: 5 },
    ],
    description: 'A spiraling beast that converges to the answer through infinite series.',
    lore: 'Converga always gets there in the end—one term at a time. It is patient beyond measure, adding smaller and smaller corrections until the answer is reached. Divergent series make it physically ill.',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #0E7490, #06B6D4)',
    icon: '🌀',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'mathematics',
  },

  // Epic — Stage 2
  {
    id: 'jacobian',
    name: 'Jacobian',
    codexName: 'Analyticus Jacobis',
    element: 'analytic',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'derivix',
    evolvesTo: 'eulerix',
    evolveCondition: 'Solve 40 calculus problems',
    stats: { speed: 60, power: 55, wisdom: 62, luck: 38 },
    abilities: [
      { id: 'transform-guard', name: 'Transform Guard', description: 'Shields via coordinate transformation', icon: '🛡️', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'multi-derivative', name: 'Multi-Derivative', description: 'Hints in multiple dimensions simultaneously', icon: '🌐', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'A multi-dimensional beast of partial derivatives and coordinate transformations.',
    lore: 'Jacobian maps between dimensions, transforming problems from hard coordinates to easy ones. Its determinant tells you when transformations are possible. It speaks in partial derivatives.',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #0891B2, #155E75)',
    icon: '🌐',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'mathematics',
  },
  {
    id: 'taylormaw',
    name: 'Taylormaw',
    codexName: 'Analyticus Tayloris',
    element: 'analytic',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 55, power: 58, wisdom: 60, luck: 40 },
    abilities: [
      { id: 'approx-heal', name: 'Approx Heal', description: 'Heals streak via Taylor approximation', icon: '💚', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'expand', name: 'Expand', description: 'Expands the problem into solvable terms', icon: '📖', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'A beast with infinitely many teeth, each one a higher-order term in a Taylor series.',
    lore: 'Taylormaw approximates any function by biting off higher-order terms. The more teeth you use, the better the approximation. Its bite is polynomial but its reach is infinite.',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #A855F7)',
    icon: '🦷',
    captureRate: 0.16,
    difficulty: 'expert',
    subject: 'mathematics',
  },

  // Legendary — Stage 2
  {
    id: 'eulerix',
    name: 'Eulerix',
    codexName: 'Analyticus Euleris',
    element: 'analytic',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'analytica-absolute',
    evolveCondition: 'Reach Level 40',
    stats: { speed: 75, power: 78, wisdom: 82, luck: 52 },
    abilities: [
      { id: 'e-identity', name: 'e^iπ + 1 = 0', description: 'The most beautiful equation auto-solves', icon: '✨', effect: 'autoCalc', cooldown: 8, power: 8 },
      { id: 'analytic-continuation', name: 'Analytic Continuation', description: 'Freezes time to continue into complex plane', icon: '🌀', effect: 'timeFreeze', cooldown: 10, power: 8 },
    ],
    description: 'A beast born from Euler\'s identity—where e, i, π, 1, and 0 unite in perfect beauty.',
    lore: 'Eulerix is the most beautiful beast in existence. It connects five fundamental constants in a single equation. Euler himself wept upon its discovery. Where it walks, analysis becomes art.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #06B6D4)',
    icon: '✨',
    captureRate: 0.07,
    difficulty: 'nightmare',
    subject: 'mathematics',
  },

  // Mythic — Stage 3
  {
    id: 'analytica-absolute',
    name: 'Analytica Absolute',
    codexName: 'Analyticus Absolutus',
    element: 'analytic',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'eulerix',
    stats: { speed: 94, power: 92, wisdom: 98, luck: 76 },
    abilities: [
      { id: 'fundamental-theorem-calc', name: 'Fundamental Theorem of Calculus', description: 'Auto-solves using the FTC itself', icon: '🌟', effect: 'autoCalc', cooldown: 12, power: 10 },
      { id: 'complex-dominion', name: 'Complex Dominion', description: 'Freezes time across the complex plane', icon: '⏳', effect: 'timeFreeze', cooldown: 10, power: 9 },
      { id: 'contour-reveal', name: 'Contour Reveal', description: 'Reveals answer via contour integration', icon: '🔄', effect: 'revealAnswer', cooldown: 14, power: 10 },
    ],
    description: 'The absolute analytic beast—differentiation and integration are one, and every function is known.',
    lore: 'Analytica Absolute is the living Fundamental Theorem of Calculus—the bridge between rate and accumulation. Its left hand differentiates while its right integrates, and they always agree. Cauchy and Riemann share its dreams.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #06B6D4, #A855F7)',
    icon: '🌟',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'mathematics',
  },
]

// ── Topologic Element ────────────────────────────────────────────────────────

const TOPOLOGIC_BEASTS: MindBeast[] = [
  // Common — Stage 1
  {
    id: 'knothole',
    name: 'Knothole',
    codexName: 'Topologicus Nodis',
    element: 'topologic',
    rarity: 'common',
    stage: 1,
    evolvesTo: 'toroid',
    evolveCondition: 'Solve 20 topology problems',
    stats: { speed: 25, power: 22, wisdom: 30, luck: 28 },
    abilities: [
      { id: 'tie-hint', name: 'Tie Hint', description: 'Provides a knotted, twisty hint', icon: '🪢', effect: 'hint', cooldown: 3, power: 3 },
    ],
    description: 'A small beast shaped like a trefoil knot, looping through itself endlessly.',
    lore: 'Knotholes are the simplest non-trivial knots given life. They cannot be untied without cutting, and they are proud of it. They teach that some problems require a different kind of cutting.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899, #F472B6)',
    icon: '🪢',
    captureRate: 0.70,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'surfacen',
    name: 'Surfacen',
    codexName: 'Topologicus Superficiis',
    element: 'topologic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 28, power: 20, wisdom: 32, luck: 25 },
    abilities: [
      { id: 'smooth-glide', name: 'Smooth Glide', description: 'Slows timer on smooth manifolds', icon: '🌊', effect: 'slowTimer', cooldown: 4, power: 3 },
    ],
    description: 'A flat beast that lives on surfaces, sliding smoothly along manifolds.',
    lore: 'Surfacen knows every surface intimately—spheres, tori, Klein bottles. It glides without friction along geodesics. It believes that every problem has a smooth solution if you choose the right coordinates.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #F472B6, #F9A8D4)',
    icon: '🫓',
    captureRate: 0.68,
    difficulty: 'rookie',
    subject: 'mathematics',
  },
  {
    id: 'gluonix',
    name: 'Gluonix',
    codexName: 'Topologicus Glutinis',
    element: 'topologic',
    rarity: 'common',
    stage: 1,
    stats: { speed: 30, power: 25, wisdom: 28, luck: 32 },
    abilities: [
      { id: 'glue-bond', name: 'Glue Bond', description: 'Doubles XP by gluing problems together', icon: '🧲', effect: 'doubleXP', cooldown: 5, power: 2 },
    ],
    description: 'A sticky beast that glues topological spaces together into new shapes.',
    lore: 'Gluonix follows the gluing axiom—paste two spaces together and it knows exactly what the result looks like. It turns disjoint pieces into connected wholes. Sheaves are its family tree.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
    icon: '🧲',
    captureRate: 0.72,
    difficulty: 'rookie',
    subject: 'mathematics',
  },

  // Rare — Stage 1-2
  {
    id: 'toroid',
    name: 'Toroid',
    codexName: 'Topologicus Toris',
    element: 'topologic',
    rarity: 'rare',
    stage: 1,
    evolvesFrom: 'knothole',
    evolvesTo: 'mobius',
    evolveCondition: 'Win 10 battles with Toroid',
    stats: { speed: 42, power: 35, wisdom: 45, luck: 30 },
    abilities: [
      { id: 'loop-shield', name: 'Loop Shield', description: 'Shields via fundamental group protection', icon: '🛡️', effect: 'shield', cooldown: 4, power: 5 },
    ],
    description: 'A donut-shaped beast whose fundamental group is the integers—it loops forever.',
    lore: 'Toroid knows it has genus 1 and is proud of the hole that makes it special. It cannot be deformed into a sphere and will fight anyone who suggests otherwise. Coffee and topology—it is both.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #DB2777, #EC4899)',
    icon: '🍩',
    captureRate: 0.38,
    difficulty: 'scholar',
    subject: 'mathematics',
  },
  {
    id: 'manifelda',
    name: 'Manifelda',
    codexName: 'Topologicus Manifoldis',
    element: 'topologic',
    rarity: 'rare',
    stage: 2,
    stats: { speed: 40, power: 38, wisdom: 48, luck: 28 },
    abilities: [
      { id: 'local-global', name: 'Local→Global', description: 'Boosts combo by extending local to global', icon: '🌍', effect: 'comboBoost', cooldown: 5, power: 5 },
    ],
    description: 'A shape-shifting beast that is locally Euclidean but globally extraordinary.',
    lore: 'Manifelda looks normal up close—like flat space—but zoom out and the true topology appears. It teaches that local understanding doesn\'t guarantee global truth. It is the soul of modern geometry.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #BE185D, #EC4899)',
    icon: '🗺️',
    captureRate: 0.35,
    difficulty: 'scholar',
    subject: 'mathematics',
  },

  // Epic — Stage 2
  {
    id: 'mobius',
    name: 'Möbius',
    codexName: 'Topologicus Mobiusis',
    element: 'topologic',
    rarity: 'epic',
    stage: 2,
    evolvesFrom: 'toroid',
    evolvesTo: 'euleris',
    evolveCondition: 'Solve 40 topology problems',
    stats: { speed: 55, power: 52, wisdom: 60, luck: 42 },
    abilities: [
      { id: 'one-sided', name: 'One-Sided Shield', description: 'Paradoxical shield with no back side', icon: '🛡️', effect: 'shield', cooldown: 6, power: 7 },
      { id: 'twist-reveal', name: 'Twist Reveal', description: 'Hints by twisting perspective', icon: '🔄', effect: 'hint', cooldown: 4, power: 6 },
    ],
    description: 'A one-sided beast with a single edge—it has no front and back, only Möbius.',
    lore: 'Möbius is a paradox made flesh—one surface, one edge, no inside or outside. Draw a line down its center and you end up where you started, on "both" sides. It defies intuition gracefully.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #DB2777, #9D174D)',
    icon: '♾️',
    captureRate: 0.18,
    difficulty: 'expert',
    subject: 'mathematics',
  },
  {
    id: 'betti',
    name: 'Betti',
    codexName: 'Topologicus Bettis',
    element: 'topologic',
    rarity: 'epic',
    stage: 2,
    stats: { speed: 52, power: 55, wisdom: 65, luck: 38 },
    abilities: [
      { id: 'homology-heal', name: 'Homology Heal', description: 'Heals streak via homology classes', icon: '💚', effect: 'healStreak', cooldown: 5, power: 6 },
      { id: 'cycle-detect', name: 'Cycle Detect', description: 'Detects and hints about cycles in problems', icon: '🔄', effect: 'hint', cooldown: 4, power: 5 },
    ],
    description: 'A beast of homology that counts the holes in any space—Betti numbers given life.',
    lore: 'Betti sees holes where others see solid space. Its namesake numbers count the voids that define topology. A sphere has no holes (Betti knows), a torus has two (Betti grins), and a Swiss cheese has Betti very excited.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899, #F97316)',
    icon: '🧀',
    captureRate: 0.16,
    difficulty: 'expert',
    subject: 'mathematics',
  },

  // Legendary — Stage 2
  {
    id: 'euleris',
    name: 'Euleris',
    codexName: 'Topologicus Euleris',
    element: 'topologic',
    rarity: 'legendary',
    stage: 2,
    evolvesTo: 'topologica-zenith',
    evolveCondition: 'Reach Level 40',
    stats: { speed: 72, power: 75, wisdom: 80, luck: 50 },
    abilities: [
      { id: 'characteristic', name: 'Euler Characteristic', description: 'Auto-calculates V-E+F for any space', icon: '🔺', effect: 'autoCalc', cooldown: 8, power: 8 },
      { id: 'genus-freeze', name: 'Genus Freeze', description: 'Freezes time on any genus surface', icon: '❄️', effect: 'timeFreeze', cooldown: 10, power: 8 },
    ],
    description: 'A legendary beast of the Euler characteristic—V - E + F = 2, always and forever.',
    lore: 'Euleris knows the shape of the universe through a single number. For any polyhedron, V-E+F = 2—it is the topological invariant that launched a thousand theorems. Euler saw it first; Euleris lives it.',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #EC4899)',
    icon: '🔺',
    captureRate: 0.07,
    difficulty: 'nightmare',
    subject: 'mathematics',
  },

  // Mythic — Stage 3
  {
    id: 'topologica-zenith',
    name: 'Topologica Zenith',
    codexName: 'Topologicus Zenithis',
    element: 'topologic',
    rarity: 'mythic',
    stage: 3,
    evolvesFrom: 'euleris',
    stats: { speed: 88, power: 90, wisdom: 98, luck: 80 },
    abilities: [
      { id: 'poincare', name: 'Poincaré Conjecture', description: 'Auto-solves—simply connected implies sphere', icon: '🌟', effect: 'autoCalc', cooldown: 12, power: 10 },
      { id: 'homeomorph', name: 'Homeomorph', description: 'Freezes time by deforming space continuously', icon: '⏳', effect: 'timeFreeze', cooldown: 10, power: 9 },
      { id: 'invariant-reveal', name: 'Invariant Reveal', description: 'Reveals answer through topological invariants', icon: '🔮', effect: 'revealAnswer', cooldown: 14, power: 10 },
    ],
    description: 'The zenith of topology—a beast that sees all spaces as they truly are, up to homeomorphism.',
    lore: 'Topologica Zenith perceives the essential shape of reality, ignoring all distortion. It proved the Poincaré Conjecture in a dream. Perelman glimpsed it and smiled. It is topology complete—the final classification.',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #EC4899, #A855F7)',
    icon: '🌟',
    captureRate: 0.01,
    difficulty: 'requiem',
    subject: 'mathematics',
  },
]

// ─── All Beasts ──────────────────────────────────────────────────────────────

export const ALL_BEASTS: MindBeast[] = [
  ...ALGEBRAIC_BEASTS,
  ...GEOMETRIC_BEASTS,
  ...KINETIC_BEASTS,
  ...THERMAL_BEASTS,
  ...QUANTUM_BEASTS,
  ...CHEMICAL_BEASTS,
  ...ANALYTIC_BEASTS,
  ...TOPOLOGIC_BEASTS,
]

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Get all beasts of a given element */
export function getMonstersByElement(element: Element): MindBeast[] {
  return ALL_BEASTS.filter((b) => b.element === element)
}

/** Get all beasts of a given rarity */
export function getMonstersByRarity(rarity: MonsterRarity): MindBeast[] {
  return ALL_BEASTS.filter((b) => b.rarity === rarity)
}

/** Get all beasts for a given BTM subject */
export function getMonstersBySubject(subject: string): MindBeast[] {
  return ALL_BEASTS.filter((b) => b.subject === subject)
}

/** Get the previous and next evolution for a given monster */
export function getMonsterEvolutions(monsterId: string): {
  prev?: MindBeast
  next?: MindBeast
} {
  const beast = ALL_BEASTS.find((b) => b.id === monsterId)
  if (!beast) return {}

  return {
    prev: beast.evolvesFrom
      ? ALL_BEASTS.find((b) => b.id === beast.evolvesFrom)
      : undefined,
    next: beast.evolvesTo
      ? ALL_BEASTS.find((b) => b.id === beast.evolvesTo)
      : undefined,
  }
}

/**
 * Calculate capture chance for a beast given player level and combo.
 *
 * - Starts from the beast's base captureRate
 * - +5% per player level (max +50%)
 * - +2% per combo count (max +20%)
 * - Mythic beasts always start at 1% base (very hard)
 * - Final result clamped to [0, 1]
 */
export function getCaptureChance(
  monster: MindBeast,
  playerLevel: number,
  comboCount: number,
): number {
  // Mythic beasts have a fixed 1% base rate regardless of their stored captureRate
  const baseRate = monster.rarity === 'mythic' ? 0.01 : monster.captureRate

  // Level bonus: +5% per level, max +50%
  const levelBonus = Math.min(playerLevel * 0.05, 0.50)

  // Combo bonus: +2% per combo, max +20%
  const comboBonus = Math.min(comboCount * 0.02, 0.20)

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, baseRate + levelBonus + comboBonus))
}
