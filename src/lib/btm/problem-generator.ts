import { BTMProblem, BTMDifficulty, BTMSubject, TrapType } from './types'

// ─── Utility ───────────────────────────────────────────────────
function rand(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min
  return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val)
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function uid(): string { return Math.random().toString(36).slice(2, 10) }

// ─── Template Registry ─────────────────────────────────────────
interface Template {
  subject: BTMSubject
  difficulties: BTMDifficulty[]
  generate: (diff: BTMDifficulty) => Omit<BTMProblem, 'id'>
}

const TEMPLATES: Template[] = [
  // ═══════════════════════════════════════════════════════
  // MATHEMATICS — ROOKIE (very easy, build confidence)
  // ═══════════════════════════════════════════════════════
  // Ultra-easy: single digit addition (first few questions)
  {
    subject: 'mathematics',
    difficulties: ['rookie'],
    generate: () => {
      const a = rand(1, 9), b = rand(1, 9)
      const ans = a + b
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `What is ${a} + ${b}?`,
        correctAnswer: ans, unit: '',
        solution: `${a} + ${b} = ${ans}`,
        concept: 'Addition', trapType: null, steps: 1, complexity: 0.03,
        generatedValues: { a, b },
      }
    },
  },
  // Single digit subtraction (result always positive)
  {
    subject: 'mathematics',
    difficulties: ['rookie'],
    generate: () => {
      const a = rand(5, 18), b = rand(1, a - 1)
      const ans = a - b
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `What is ${a} − ${b}?`,
        correctAnswer: ans, unit: '',
        solution: `${a} − ${b} = ${ans}`,
        concept: 'Subtraction', trapType: null, steps: 1, complexity: 0.03,
        generatedValues: { a, b },
      }
    },
  },
  // Small multiplication (times tables)
  {
    subject: 'mathematics',
    difficulties: ['rookie'],
    generate: () => {
      const a = rand(2, 10), b = rand(2, 10)
      const ans = a * b
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `What is ${a} × ${b}?`,
        correctAnswer: ans, unit: '',
        solution: `${a} × ${b} = ${ans}`,
        concept: 'Multiplication', trapType: null, steps: 1, complexity: 0.05,
        generatedValues: { a, b },
      }
    },
  },
  // Clean division (always whole number)
  {
    subject: 'mathematics',
    difficulties: ['rookie'],
    generate: () => {
      const b = rand(2, 10), ans = rand(2, 10)
      const a = b * ans
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `What is ${a} ÷ ${b}?`,
        correctAnswer: ans, unit: '',
        solution: `${a} ÷ ${b} = ${ans}`,
        concept: 'Division', trapType: null, steps: 1, complexity: 0.05,
        generatedValues: { a, b },
      }
    },
  },
  // Two-digit addition (slightly harder)
  {
    subject: 'mathematics',
    difficulties: ['rookie'],
    generate: () => {
      const a = rand(10, 30), b = rand(5, 20)
      const ans = a + b
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `What is ${a} + ${b}?`,
        correctAnswer: ans, unit: '',
        solution: `${a} + ${b} = ${ans}`,
        concept: 'Addition', trapType: null, steps: 1, complexity: 0.06,
        generatedValues: { a, b },
      }
    },
  },
  // Two-digit subtraction
  {
    subject: 'mathematics',
    difficulties: ['rookie'],
    generate: () => {
      const a = rand(20, 50), b = rand(5, a - 1)
      const ans = a - b
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `What is ${a} − ${b}?`,
        correctAnswer: ans, unit: '',
        solution: `${a} − ${b} = ${ans}`,
        concept: 'Subtraction', trapType: null, steps: 1, complexity: 0.06,
        generatedValues: { a, b },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['rookie', 'scholar'],
    generate: () => {
      const a = rand(2, 10), b = rand(2, 8), c = rand(1, 10)
      const ans = a * b + c
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `Find the value of ${a} × ${b} + ${c}.`,
        correctAnswer: ans, unit: '',
        solution: `Step 1: Multiply ${a} × ${b} = ${a * b}\nStep 2: Add ${c}: ${a * b} + ${c} = ${ans}`,
        concept: 'Arithmetic Operations', trapType: null, steps: 2, complexity: 0.1,
        generatedValues: { a, b, c },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['rookie'],
    generate: () => {
      const pct = pick([10, 20, 25, 50]), total = pick([100, 200, 300, 400, 500])
      const ans = (pct / 100) * total
      return {
        subject: 'mathematics', difficulty: 'rookie',
        question: `What is ${pct}% of ${total}?`,
        correctAnswer: ans, unit: '',
        solution: `${pct}% of ${total} = (${pct}/100) × ${total} = ${ans}`,
        concept: 'Percentage', trapType: null, steps: 2, complexity: 0.1,
        generatedValues: { pct, total },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['scholar'],
    generate: () => {
      const a = rand(5, 25), b = rand(5, 25)
      const ans = Math.sqrt(a * a + b * b)
      return {
        subject: 'mathematics', difficulty: 'scholar',
        question: `A right triangle has legs of length ${a} cm and ${b} cm. Find the length of the hypotenuse in cm (round to 2 decimal places).`,
        correctAnswer: parseFloat(ans.toFixed(2)), unit: 'cm',
        solution: `By Pythagoras theorem: c = √(a² + b²) = √(${a}² + ${b}²) = √(${a*a} + ${b*b}) = √${a*a+b*b} ≈ ${ans.toFixed(2)}`,
        concept: 'Pythagoras Theorem', trapType: null, steps: 3, complexity: 0.25,
        generatedValues: { a, b },
      }
    },
  },
  // ═══════════════════════════════════════════════════════
  // MATHEMATICS — SCHOLAR & ABOVE
  // ═══════════════════════════════════════════════════════
  {
    subject: 'mathematics',
    difficulties: ['scholar', 'expert'],
    generate: (diff) => {
      const a = rand(2, 12, 1), b = rand(-20, 5)
      const c = rand(-50, -5)
      const discriminant = b * b - 4 * a * c
      const root = Math.sqrt(Math.max(0, discriminant))
      const x = (-b + root) / (2 * a)
      const isRequiem = diff === 'expert'
      const ans = isRequiem ? parseFloat(x.toFixed(2)) : parseFloat(x.toFixed(2))
      return {
        subject: 'mathematics', difficulty: diff,
        question: isRequiem
          ? `Solve the quadratic equation ${a}x² + (${b < 0 ? '' : '+ '}${b})x + (${c < 0 ? '' : '+ '}${c}) = 0. Find the larger root (round to 2 decimal places).`
          : `Solve ${a}x² + ${b}x + ${c} = 0. Find the positive root (round to 2 decimal places).`,
        correctAnswer: ans, unit: '',
        solution: `Using quadratic formula: x = (-b ± √(b² - 4ac)) / 2a\nDiscriminant = ${b}² - 4(${a})(${c}) = ${b*b} - ${4*a*c} = ${discriminant}\n√${discriminant} = ${root.toFixed(2)}\nx = (${-b} + ${root.toFixed(2)}) / ${2*a} = ${x.toFixed(2)}`,
        concept: 'Quadratic Equations', trapType: null, steps: 4, complexity: diff === 'expert' ? 0.55 : 0.4,
        generatedValues: { a, b, c },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['scholar', 'expert'],
    generate: (diff) => {
      const p = rand(5000, 50000, -3), r = rand(5, 15), t = rand(1, 5)
      const si = (p * r * t) / 100
      const ci = p * Math.pow(1 + r / 100, t) - p
      const askCI = Math.random() > 0.5
      const ans = askCI ? parseFloat(ci.toFixed(2)) : parseFloat(si.toFixed(2))
      const conceptName = askCI ? 'Compound Interest' : 'Simple Interest'
      const qStr = 'A sum of Rs ' + p.toLocaleString() + ' is invested at ' + r + '% per annum for ' + t + ' year' + (t > 1 ? 's' : '') + '. Find the ' + conceptName + ' (round to 2 decimal places).'
      const sStr = askCI
        ? 'CI = P(1 + r/100)^t - P = ' + ci.toFixed(2)
        : 'SI = PRT/100 = ' + si.toFixed(2)
      return {
        subject: 'mathematics', difficulty: diff,
        question: qStr,
        correctAnswer: ans, unit: '',
        solution: sStr,
        concept: conceptName, trapType: null, steps: 3, complexity: 0.4,
        generatedValues: { p, r, t, si, ci },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['expert', 'nightmare'],
    generate: (diff) => {
      const n = rand(5, 15)
      const a1 = rand(1, 10)
      const d = rand(2, 8)
      const last = a1 + (n - 1) * d
      const sum = n * (a1 + last) / 2
      const askSum = Math.random() > 0.3
      const ans = askSum ? sum : last
      return {
        subject: 'mathematics', difficulty: diff,
        question: `An AP has first term ${a1}, common difference ${d}, and ${n} terms. Find the ${askSum ? 'sum of all terms' : `${n}th term`}.`,
        correctAnswer: ans, unit: '',
        solution: askSum
          ? `S_n = n(a1 + a_n)/2 = ${n}(${a1} + ${last})/2 = ${sum}`
          : `a_n = a1 + (n-1)d = ${a1} + ${n-1}×${d} = ${last}`,
        concept: 'Arithmetic Progression', trapType: null, steps: 3, complexity: 0.5,
        generatedValues: { n, a1, d, last, sum },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['expert', 'nightmare', 'requiem'],
    generate: (diff) => {
      const a = rand(2, 6), n = diff === 'requiem' ? rand(3, 6) : 2
      const k = rand(1, 5)
      let fn: string, ans: number
      if (diff === 'requiem') {
        // x^n - k
        fn = `f(x) = x^${n} - ${k}`
        ans = parseFloat((n * Math.pow(k, (n - 1) / n) / n).toFixed(4))
        // Actually: derivative of x^n - k is n*x^(n-1), and we want f'(x) where x = k^(1/n)
        const x = Math.pow(k, 1 / n)
        ans = parseFloat((n * Math.pow(x, n - 1)).toFixed(4))
      } else {
        fn = `f(x) = ${a}x² + ${rand(1, 10)}x + ${rand(1, 10)}`
        const x = k
        ans = parseFloat((2 * a * x + rand(1, 10)).toFixed(2))
        // Simplify: use specific values
        const c2 = rand(1, 10), c1 = rand(1, 10), c0 = rand(1, 10)
        fn = `f(x) = ${a}x² + ${c1}x + ${c0}`
        ans = 2 * a * k + c1
      }
      return {
        subject: 'mathematics', difficulty: diff,
        question: `Find the derivative of ${fn} at x = ${k}.`,
        correctAnswer: ans, unit: '',
        solution: `Differentiate and substitute x = ${k}.`,
        concept: 'Differentiation', trapType: null, steps: 3, complexity: diff === 'requiem' ? 0.8 : 0.55,
        generatedValues: { a, n, k },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['nightmare', 'requiem'],
    generate: (diff) => {
      const a = rand(2, 8), b = rand(1, 5)
      const upper = rand(1, 6)
      const lower = 0
      const ans = parseFloat(((a * upper * upper / 2 + b * upper) - (a * lower * lower / 2 + b * lower)).toFixed(2))
      return {
        subject: 'mathematics', difficulty: diff,
        question: `Evaluate the definite integral of ${a}x + ${b} dx from x = ${lower} to x = ${upper}.`,
        correctAnswer: ans, unit: '',
        solution: `∫(${a}x + ${b})dx = ${a}x²/2 + ${b}x\nAt x=${upper}: ${a}*${upper}²/2 + ${b}*${upper} = ${a*upper*upper/2} + ${b*upper}\nAt x=${lower}: ${a}*${lower}²/2 + ${b}*${lower} = ${a*lower*lower/2 + b*lower}\nDifference = ${ans}`,
        concept: 'Definite Integration', trapType: null, steps: 5, complexity: diff === 'requiem' ? 0.75 : 0.6,
        generatedValues: { a, b, upper, lower },
      }
    },
  },
  // ═══════════════════════════════════════════════════════
  // PHYSICS — ROOKIE (very easy)
  // ═══════════════════════════════════════════════════════
  // Ultra-easy: simple distance (small numbers)
  {
    subject: 'physics',
    difficulties: ['rookie'],
    generate: () => {
      const v = rand(2, 8), t = rand(2, 6)
      return {
        subject: 'physics', difficulty: 'rookie',
        question: `A car travels at ${v} m/s for ${t} seconds. Find the distance in metres.`,
        correctAnswer: v * t, unit: 'm',
        solution: `Distance = speed \u00d7 time = ${v} \u00d7 ${t} = ${v * t} m`,
        concept: 'Speed = Distance/Time', trapType: null, steps: 1, complexity: 0.05,
        generatedValues: { v, t },
      }
    },
  },
  // Slightly harder speed
  {
    subject: 'physics',
    difficulties: ['rookie'],
    generate: () => {
      const v = rand(5, 15), t = rand(3, 10)
      return {
        subject: 'physics', difficulty: 'rookie',
        question: `A car travels at ${v} m/s for ${t} seconds. Find the distance in metres.`,
        correctAnswer: v * t, unit: 'm',
        solution: `Distance = speed \u00d7 time = ${v} \u00d7 ${t} = ${v * t} m`,
        concept: 'Speed = Distance/Time', trapType: null, steps: 1, complexity: 0.08,
        generatedValues: { v, t },
      }
    },
  },
  // Simple momentum (small numbers)
  {
    subject: 'physics',
    difficulties: ['rookie'],
    generate: () => {
      const m = rand(2, 6), v = rand(2, 6)
      return {
        subject: 'physics', difficulty: 'rookie',
        question: `An object has mass ${m} kg and velocity ${v} m/s. Find its momentum in kg\u00b7m/s.`,
        correctAnswer: m * v, unit: 'kg\u00b7m/s',
        solution: `p = mv = ${m} \u00d7 ${v} = ${m * v} kg\u00b7m/s`,
        concept: 'Momentum', trapType: null, steps: 1, complexity: 0.05,
        generatedValues: { m, v },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['rookie'],
    generate: () => {
      const m = rand(2, 8), v = rand(2, 8)
      return {
        subject: 'physics', difficulty: 'rookie',
        question: `An object has mass ${m} kg and velocity ${v} m/s. Find its momentum in kg\u00b7m/s.`,
        correctAnswer: m * v, unit: 'kg\u00b7m/s',
        solution: `p = mv = ${m} \u00d7 ${v} = ${m * v} kg\u00b7m/s`,
        concept: 'Momentum', trapType: null, steps: 1, complexity: 0.08,
        generatedValues: { m, v },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['rookie', 'scholar'],
    generate: () => {
      const m = rand(2, 12, 1), a = rand(2, 10, 1)
      return {
        subject: 'physics', difficulty: 'rookie',
        question: `A body of mass ${m} kg accelerates at ${a} m/s\u00b2. Find the force in Newtons.`,
        correctAnswer: parseFloat((m * a).toFixed(1)), unit: 'N',
        solution: `F = ma = ${m} \u00d7 ${a} = ${(m * a).toFixed(1)} N`,
        concept: 'Newton\u2019s Second Law', trapType: null, steps: 2, complexity: 0.12,
        generatedValues: { m, a },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['rookie', 'scholar'],
    generate: () => {
      const m = rand(2, 10, 1), g = 10, h = rand(2, 20)
      return {
        subject: 'physics', difficulty: 'rookie',
        question: `A ${m} kg object is at height ${h} m. Take g = 10 m/s\u00b2. Find its potential energy in Joules.`,
        correctAnswer: m * g * h, unit: 'J',
        solution: `PE = mgh = ${m} \u00d7 10 \u00d7 ${h} = ${m * g * h} J`,
        concept: 'Potential Energy', trapType: null, steps: 2, complexity: 0.12,
        generatedValues: { m, g, h },
      }
    },
  },
  // ═══════════════════════════════════════════════════════
  // PHYSICS — SCHOLAR & ABOVE (kinematics, KE)
  // ═══════════════════════════════════════════════════════
  {
    subject: 'physics',
    difficulties: ['scholar'],
    generate: () => {
      const m = rand(2, 10, 1), v = rand(5, 20, 1)
      const ke = 0.5 * m * v * v
      return {
        subject: 'physics', difficulty: 'scholar',
        question: `A ${m} kg object moves at ${v} m/s. Find its kinetic energy in Joules.`,
        correctAnswer: parseFloat(ke.toFixed(1)), unit: 'J',
        solution: `KE = ½mv² = 0.5 × ${m} × ${v}² = 0.5 × ${m} × ${v*v} = ${ke.toFixed(1)} J`,
        concept: 'Kinetic Energy', trapType: null, steps: 3, complexity: 0.25,
        generatedValues: { m, v },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['scholar', 'expert'],
    generate: (diff) => {
      const u = rand(0, 15, 1), a = rand(2, 10, 1), t = rand(2, 8)
      const v = u + a * t
      const s = u * t + 0.5 * a * t * t
      const askV = Math.random() > 0.5
      const ans = askV ? parseFloat(v.toFixed(2)) : parseFloat(s.toFixed(2))
      return {
        subject: 'physics', difficulty: diff,
        question: `An object starts with velocity ${u} m/s and accelerates at ${a} m/s² for ${t} seconds. Find the ${askV ? 'final velocity' : 'distance travelled'} in ${askV ? 'm/s' : 'metres'} (round to 2 decimal places).`,
        correctAnswer: ans, unit: askV ? 'm/s' : 'm',
        solution: askV
          ? `v = u + at = ${u} + ${a}×${t} = ${v.toFixed(2)} m/s`
          : `s = ut + ½at² = ${u}×${t} + 0.5×${a}×${t}² = ${u*t} + ${0.5*a*t*t} = ${s.toFixed(2)} m`,
        concept: 'Kinematic Equations', trapType: null, steps: 3, complexity: 0.4,
        generatedValues: { u, a, t, v, s },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['expert', 'nightmare'],
    generate: (diff) => {
      const v1 = rand(10, 30, 1), v2 = rand(10, 30, 1), m1 = rand(2, 10, 1), m2 = rand(2, 10, 1)
      const vf = (m1 * v1 + m2 * v2) / (m1 + m2)
      const askV = Math.random() > 0.4
      const ans = askV ? parseFloat(vf.toFixed(2)) : parseFloat((m1 * v1 + m2 * v2).toFixed(2))
      return {
        subject: 'physics', difficulty: diff,
        question: `A ${m1} kg body moving at ${v1} m/s collides with a ${m2} kg body moving at ${v2} m/s in the same direction and they stick together. Find the ${askV ? 'final velocity' : 'total momentum before collision'} (round to 2 decimal places).`,
        correctAnswer: ans, unit: askV ? 'm/s' : 'kg m/s',
        solution: askV
          ? `Conservation of momentum: m1v1 + m2v2 = (m1+m2)vf\nvf = (${m1}×${v1} + ${m2}×${v2}) / (${m1}+${m2}) = ${m1*v1 + m2*v2} / ${m1+m2} = ${vf.toFixed(2)} m/s`
          : `Total momentum = m1v1 + m2v2 = ${m1}×${v1} + ${m2}×${v2} = ${m1*v1} + ${m2*v2} = ${m1*v1 + m2*v2} kg m/s`,
        concept: 'Conservation of Momentum', trapType: null, steps: 4, complexity: 0.55,
        generatedValues: { m1, m2, v1, v2, vf },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['expert', 'nightmare', 'requiem'],
    generate: (diff) => {
      const R = rand(2, 20), V = rand(5, 24)
      const I = V / R
      const P = V * I
      const askP = Math.random() > 0.5
      const ans = askP ? parseFloat(P.toFixed(2)) : parseFloat(I.toFixed(2))
      return {
        subject: 'physics', difficulty: diff,
        question: `A ${R} Ω resistor is connected to a ${V} V battery. Find the ${askP ? 'power dissipated' : 'current flowing'} in ${askP ? 'Watts' : 'Amperes'} (round to 2 decimal places).`,
        correctAnswer: ans, unit: askP ? 'W' : 'A',
        solution: askP
          ? `I = V/R = ${V}/${R} = ${I.toFixed(2)} A\nP = VI = ${V} × ${I.toFixed(2)} = ${P.toFixed(2)} W`
          : `I = V/R = ${V}/${R} = ${I.toFixed(2)} A`,
        concept: 'Ohm’s Law & Power', trapType: null, steps: askP ? 3 : 2, complexity: 0.45,
        generatedValues: { R, V, I, P },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['nightmare', 'requiem'],
    generate: (diff) => {
      const M = rand(10, 100, 1) * 1e6, r = rand(1000, 10000)
      const G = 6.67e-11
      const g_surface = (G * M) / (r * r)
      const ans = parseFloat(g_surface.toFixed(4))
      return {
        subject: 'physics', difficulty: diff,
        question: `A planet has mass ${M / 1e6}×10⁶ kg and radius ${r} m. Find the acceleration due to gravity on its surface in m/s² (round to 4 decimal places). Use G = 6.67×10⁻¹¹ Nm²/kg².`,
        correctAnswer: ans, unit: 'm/s²',
        solution: `g = GM/r² = (6.67e-11 × ${M}) / ${r}² = ${(G * M).toExponential(2)} / ${(r*r).toExponential(2)} = ${ans} m/s²`,
        concept: 'Gravitation', trapType: null, steps: 4, complexity: diff === 'requiem' ? 0.8 : 0.65,
        generatedValues: { M, r },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['requiem'],
    generate: () => {
      const u = 0, theta = rand(30, 60)
      const v0 = rand(20, 50, 1)
      const g = 10
      const thetaRad = (theta * Math.PI) / 180
      const R = (v0 * v0 * Math.sin(2 * thetaRad)) / g
      const ans = parseFloat(R.toFixed(2))
      return {
        subject: 'physics', difficulty: 'requiem',
        question: `A projectile is launched at ${v0} m/s at an angle of ${theta}° to the horizontal from ground level. Take g = 10 m/s². Find the horizontal range in metres (round to 2 decimal places).`,
        correctAnswer: ans, unit: 'm',
        solution: `R = v₀² sin(2θ) / g = ${v0}² × sin(2×${theta}°) / 10 = ${v0*v0} × ${Math.sin(2*thetaRad).toFixed(4)} / 10 = ${ans} m`,
        concept: 'Projectile Motion', trapType: null, steps: 4, complexity: 0.82,
        generatedValues: { v0, theta, R },
      }
    },
  },
  // ═══════════════════════════════════════════════════════
  // CHEMISTRY — ROOKIE (very easy)
  // ═══════════════════════════════════════════════════════
  // Ultra-easy: moles × molar mass (small round numbers)
  {
    subject: 'chemistry',
    difficulties: ['rookie'],
    generate: () => {
      const moles = rand(1, 3), molarMass = rand(2, 5) * 10
      return {
        subject: 'chemistry', difficulty: 'rookie',
        question: `What is the mass of ${moles} moles of a substance with molar mass ${molarMass} g/mol?`,
        correctAnswer: moles * molarMass, unit: 'g',
        solution: `mass = moles × molar mass = ${moles} × ${molarMass} = ${moles * molarMass} g`,
        concept: 'Moles and Mass', trapType: null, steps: 1, complexity: 0.05,
        generatedValues: { moles, molarMass },
      }
    },
  },
  {
    subject: 'chemistry',
    difficulties: ['rookie'],
    generate: () => {
      const moles = rand(2, 6), molarMass = rand(2, 10) * 10
      return {
        subject: 'chemistry', difficulty: 'rookie',
        question: `What is the mass of ${moles} moles of a substance with molar mass ${molarMass} g/mol?`,
        correctAnswer: moles * molarMass, unit: 'g',
        solution: `mass = moles × molar mass = ${moles} × ${molarMass} = ${moles * molarMass} g`,
        concept: 'Moles and Mass', trapType: null, steps: 1, complexity: 0.08,
        generatedValues: { moles, molarMass },
      }
    },
  },
  // Ultra-easy: atoms in O2 (small numbers)
  {
    subject: 'chemistry',
    difficulties: ['rookie'],
    generate: () => {
      const molecules = rand(1, 4)
      return {
        subject: 'chemistry', difficulty: 'rookie',
        question: `How many atoms are in ${molecules} molecules of O\u2082?`,
        correctAnswer: molecules * 2, unit: 'atoms',
        solution: `Each O\u2082 molecule has 2 oxygen atoms.\n${molecules} × 2 = ${molecules * 2} atoms`,
        concept: 'Atoms in Molecules', trapType: null, steps: 1, complexity: 0.04,
        generatedValues: { molecules },
      }
    },
  },
  {
    subject: 'chemistry',
    difficulties: ['rookie'],
    generate: () => {
      const molecules = rand(2, 6)
      return {
        subject: 'chemistry', difficulty: 'rookie',
        question: `How many atoms are in ${molecules} molecules of O\u2082?`,
        correctAnswer: molecules * 2, unit: 'atoms',
        solution: `Each O\u2082 molecule has 2 oxygen atoms.\n${molecules} × 2 = ${molecules * 2} atoms`,
        concept: 'Atoms in Molecules', trapType: null, steps: 1, complexity: 0.06,
        generatedValues: { molecules },
      }
    },
  },
  {
    subject: 'chemistry',
    difficulties: ['rookie', 'scholar'],
    generate: () => {
      const moles = rand(1, 5), molarMass = rand(2, 10) * 10
      return {
        subject: 'chemistry', difficulty: 'rookie',
        question: `Calculate the mass of ${moles} moles of a substance with molar mass ${molarMass} g/mol in grams.`,
        correctAnswer: moles * molarMass, unit: 'g',
        solution: `mass = moles × molar mass = ${moles} × ${molarMass} = ${moles * molarMass} g`,
        concept: 'Moles and Mass', trapType: null, steps: 2, complexity: 0.1,
        generatedValues: { moles, molarMass },
      }
    },
  },
  // ═══════════════════════════════════════════════════════
  // CHEMISTRY — SCHOLAR & ABOVE
  // ═══════════════════════════════════════════
  {
    subject: 'chemistry',
    difficulties: ['scholar', 'expert'],
    generate: () => {
      const concentration = rand(1, 10, 1), volume = rand(100, 500, -2) / 1000 // in L
      const moles = concentration * volume
      const molarMass = rand(40, 100, 1)
      const mass = moles * molarMass
      const askMass = Math.random() > 0.4
      const ans = askMass ? parseFloat(mass.toFixed(2)) : parseFloat((moles * 1000).toFixed(2))
      return {
        subject: 'chemistry', difficulty: 'scholar',
        question: `What ${askMass ? 'mass in grams' : 'amount in millimoles'} of solute is present in ${(volume * 1000).toFixed(0)} mL of a ${concentration} M solution? (Molar mass = ${molarMass} g/mol${askMass ? '' : ''})`,
        correctAnswer: ans, unit: askMass ? 'g' : 'mmol',
        solution: askMass
          ? `moles = M × V = ${concentration} × ${volume.toFixed(3)} = ${moles.toFixed(4)} mol\nmass = moles × M = ${moles.toFixed(4)} × ${molarMass} = ${mass.toFixed(2)} g`
          : `moles = M × V = ${concentration} × ${volume.toFixed(3)} = ${moles.toFixed(4)} mol\nmmol = ${moles.toFixed(4)} × 1000 = ${(moles * 1000).toFixed(2)} mmol`,
        concept: 'Molarity', trapType: null, steps: 3, complexity: 0.35,
        generatedValues: { concentration, volume, moles, molarMass, mass },
      }
    },
  },
  {
    subject: 'chemistry',
    difficulties: ['scholar', 'expert'],
    generate: () => {
      const pH = rand(1, 13, 1)
      const H = Math.pow(10, -pH)
      const askH = Math.random() > 0.5
      const ans = askH ? parseFloat(H.toExponential(2).replace('e-', 'e-')) : parseFloat((14 - pH).toFixed(2))
      return {
        subject: 'chemistry', difficulty: 'expert',
        question: `The pH of a solution is ${pH}. Find the ${askH ? 'hydrogen ion concentration' : 'pOH'} ${askH ? 'in mol/L (in scientific notation, e.g. 1e-5)' : ''}.`,
        correctAnswer: ans, unit: askH ? 'mol/L' : '',
        solution: askH
          ? `[H⁺] = 10^(-pH) = 10^(-${pH}) = ${H.toExponential(2)} mol/L`
          : `pOH = 14 - pH = 14 - ${pH} = ${14 - pH}`,
        concept: 'pH and pOH', trapType: null, steps: 2, complexity: 0.4,
        generatedValues: { pH, H },
      }
    },
  },
  {
    subject: 'chemistry',
    difficulties: ['expert', 'nightmare'],
    generate: (diff) => {
      const P = rand(1, 5, 1), V = rand(1, 20, 1), n = rand(0.5, 3, 1)
      const R = 0.0821
      const T = (P * V) / (n * R)
      const ans = parseFloat(T.toFixed(2))
      return {
        subject: 'chemistry', difficulty: diff,
        question: `${n} moles of an ideal gas at ${P} atm occupy ${V} L. Find the temperature in Kelvin using the ideal gas law. (R = 0.0821 L·atm/mol·K, round to 2 decimal places.)`,
        correctAnswer: ans, unit: 'K',
        solution: `PV = nRT \nT = PV/(nR) = (${P}×${V}) / (${n}×0.0821) = ${P * V} / ${(n * R).toFixed(4)} = ${ans} K`,
        concept: 'Ideal Gas Law', trapType: null, steps: 3, complexity: 0.5,
        generatedValues: { P, V, n, T },
      }
    },
  },
  {
    subject: 'chemistry',
    difficulties: ['nightmare', 'requiem'],
    generate: (diff) => {
      const M1 = rand(1, 6, 1), V1 = rand(10, 50), M2 = rand(1, 6, 1)
      const V2 = (M1 * V1) / M2
      const ans = parseFloat(V2.toFixed(2))
      return {
        subject: 'chemistry', difficulty: diff,
        question: `${V1} mL of a ${M1} M HCl solution is titrated with a ${M2} M NaOH solution. Find the volume of NaOH required to reach the equivalence point in mL (round to 2 decimal places).`,
        correctAnswer: ans, unit: 'mL',
        solution: `At equivalence point: M1V1 = M2V2\nV2 = M1V1/M2 = (${M1}×${V1}) / ${M2} = ${M1 * V1} / ${M2} = ${ans} mL`,
        concept: 'Titration', trapType: null, steps: 3, complexity: 0.6,
        generatedValues: { M1, V1, M2, V2 },
      }
    },
  },
  // ═══════════════════════════════════════════════════════
  // TRAP QUESTIONS
  // ═══════════════════════════════════════════════════════
  {
    subject: 'mathematics',
    difficulties: ['scholar', 'expert', 'nightmare', 'requiem'],
    generate: () => {
      // UNIT TRAP: mixed units
      const speedKmh = rand(36, 108)
      const timeMin = rand(5, 30)
      const speedMs = speedKmh / 3.6
      const timeSec = timeMin * 60
      const dist = speedMs * timeSec
      return {
        subject: 'mathematics', difficulty: 'scholar',
        question: `A car travels at ${speedKmh} km/h for ${timeMin} minutes. Find the distance travelled in metres.`,
        correctAnswer: parseFloat(dist.toFixed(0)), unit: 'm',
        solution: `Convert: ${speedKmh} km/h = ${speedKmh}/3.6 = ${speedMs.toFixed(2)} m/s\nTime = ${timeMin} min = ${timeSec} s\nDistance = speed × time = ${speedMs.toFixed(2)} × ${timeSec} = ${dist.toFixed(0)} m`,
        concept: 'Unit Conversion + Speed', trapType: 'unit_trap' as TrapType, steps: 4, complexity: 0.5,
        generatedValues: { speedKmh, timeMin, speedMs, timeSec, dist },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['expert', 'nightmare', 'requiem'],
    generate: () => {
      // HIDDEN WORDING TRAP: asks for remaining, not used
      const total = rand(500, 2000)
      const usedPct = rand(20, 60)
      const used = (usedPct / 100) * total
      const remaining = total - used
      // Most students will calculate 'used' but question asks for 'remaining'
      return {
        subject: 'mathematics', difficulty: 'expert',
        question: `A tank holds ${total} litres of water. ${usedPct}% of the water is used. How much water remains in the tank in litres?`,
        correctAnswer: remaining, unit: 'L',
        solution: `Used = ${usedPct}% of ${total} = ${used.toFixed(0)} L\nRemaining = ${total} - ${used.toFixed(0)} = ${remaining.toFixed(0)} L`,
        concept: 'Percentage', trapType: 'hidden_wording' as TrapType, steps: 3, complexity: 0.45,
        generatedValues: { total, usedPct, used, remaining },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['expert', 'nightmare', 'requiem'],
    generate: () => {
      // SIGN TRAP: deceleration
      const u = rand(20, 40, 1)
      const a = rand(2, 8, 1)
      const t = rand(2, 5)
      const v = u - a * t
      const ans = parseFloat(Math.max(0, v).toFixed(2))
      return {
        subject: 'physics', difficulty: 'expert',
        question: `A car moving at ${u} m/s applies brakes and decelerates at ${a} m/s² for ${t} seconds. Find the final velocity in m/s (round to 2 decimal places).`,
        correctAnswer: ans, unit: 'm/s',
        solution: `v = u - at (deceleration means a is subtracted)\nv = ${u} - ${a}×${t} = ${u} - ${a * t} = ${Math.max(0, v).toFixed(2)} m/s`,
        concept: 'Deceleration', trapType: 'sign_trap' as TrapType, steps: 3, complexity: 0.5,
        generatedValues: { u, a, t, v },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['scholar', 'expert', 'nightmare'],
    generate: () => {
      // IRRELEVANT INFO TRAP
      const price = rand(50, 200)
      const quantity = rand(3, 12)
      const irrelevantTax = rand(5, 18)
      const total = price * quantity
      return {
        subject: 'mathematics', difficulty: 'scholar',
        question: `A shop sells pens at ₹${price} each. A customer buys ${quantity} pens. The shop’s tax registration number is ${rand(10000, 99999)} and the GST rate is ${irrelevantTax}%. Find the total cost before tax in rupees.`,
        correctAnswer: total, unit: '',
        solution: `Total = price × quantity = ${price} × ${quantity} = ${total}\nNote: The tax rate and registration number are irrelevant — the question asks for the cost BEFORE tax.`,
        concept: 'Arithmetic', trapType: 'irrelevant_info' as TrapType, steps: 2, complexity: 0.4,
        generatedValues: { price, quantity, irrelevantTax },
      }
    },
  },
  {
    subject: 'physics',
    difficulties: ['expert', 'nightmare', 'requiem'],
    generate: () => {
      // AVERAGE TRAP: average speed vs average of speeds
      const d1 = rand(100, 300), v1 = rand(30, 60, 1)
      const d2 = rand(100, 300), v2 = rand(40, 80, 1)
      const t1 = d1 / v1, t2 = d2 / v2
      const avgSpeed = (d1 + d2) / (t1 + t2)
      return {
        subject: 'physics', difficulty: 'nightmare',
        question: `A person travels ${d1} km at ${v1} km/h and then ${d2} km at ${v2} km/h. Find the average speed for the entire journey in km/h (round to 2 decimal places).`,
        correctAnswer: parseFloat(avgSpeed.toFixed(2)), unit: 'km/h',
        solution: `Average speed = Total distance / Total time\nTime 1 = ${d1}/${v1} = ${t1.toFixed(2)} h\nTime 2 = ${d2}/${v2} = ${t2.toFixed(2)} h\nAvg speed = (${d1}+${d2}) / (${t1.toFixed(2)}+${t2.toFixed(2)}) = ${d1+d2} / ${(t1+t2).toFixed(2)} = ${avgSpeed.toFixed(2)} km/h\nNote: Average speed is NOT (${v1}+${v2})/2.`,
        concept: 'Average Speed', trapType: 'average_trap' as TrapType, steps: 5, complexity: 0.65,
        generatedValues: { d1, v1, d2, v2, t1, t2, avgSpeed },
      }
    },
  },
  {
    subject: 'mathematics',
    difficulties: ['expert', 'nightmare', 'requiem'],
    generate: () => {
      // FORMULA TRAP: area of triangle vs perimeter
      const a = rand(3, 12), b = rand(4, 13), c = rand(5, 14)
      const s = (a + b + c) / 2
      const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)))
      // Make sure it's a valid triangle - if not, return a simple perimeter question
      if (a + b <= c || a + c <= b || b + c <= a) {
        const pa = rand(3, 15), pb = rand(3, 15), pc = rand(3, 15)
        const peri = pa + pb + pc
        return {
          subject: 'mathematics', difficulty: 'expert',
          question: 'A triangle has sides of length ' + pa + ' cm, ' + pb + ' cm, and ' + pc + ' cm. Find its perimeter in cm.',
          correctAnswer: peri, unit: 'cm',
          solution: 'Perimeter = a + b + c = ' + pa + ' + ' + pb + ' + ' + pc + ' = ' + peri + ' cm',
          concept: 'Perimeter', trapType: null, steps: 2, complexity: 0.3,
          generatedValues: { a: pa, b: pb, c: pc },
        }
      }
      const ans = parseFloat(area.toFixed(2))
      return {
        subject: 'mathematics', difficulty: 'expert',
        question: `A triangle has sides of length ${a} cm, ${b} cm, and ${c} cm. Find its area in cm² using Heron’s formula (round to 2 decimal places).`,
        correctAnswer: ans, unit: 'cm²',
        solution: `s = (a+b+c)/2 = (${a}+${b}+${c})/2 = ${s}\nArea = √[s(s-a)(s-b)(s-c)] = √[${s}×${(s-a).toFixed(2)}×${(s-b).toFixed(2)}×${(s-c).toFixed(2)}] = ${ans} cm²`,
        concept: 'Heron’s Formula', trapType: 'formula_trap' as TrapType, steps: 4, complexity: 0.55,
        generatedValues: { a, b, c, s, area },
      }
    },
  },
]

// ─── Public API ───────────────────────────────────────────────
export function generateProblem(
  subject?: BTMSubject,
  difficulty?: BTMDifficulty,
  forceTrap = false,
  attemptCount = 0,
): BTMProblem {
  let pool = TEMPLATES.filter((t) => {
    if (subject && t.subject !== subject) return false
    if (difficulty && !t.difficulties.includes(difficulty)) return false
    return true
  })

  // ── Gradual difficulty: for the first few attempts at any difficulty,
  //    prefer simpler templates (lower complexity) ──
  if (attemptCount <= 3 && difficulty && difficulty !== 'rookie' && !forceTrap) {
    // Dry-run each template to get its complexity, then sort by it
    const scored = pool.map((t) => {
      try {
        const sample = t.generate(difficulty)
        return { template: t, complexity: sample.complexity }
      } catch { return { template: t, complexity: 1 } }
    }).sort((a, b) => a.complexity - b.complexity)

    // For first 2 attempts, only pick from the bottom 40% (easiest)
    // For attempts 3-5, pick from bottom 70%
    // After that, pick from all
    const pctCutoff = attemptCount <= 1 ? 0.4 : 0.7
    const cutoff = Math.max(1, Math.floor(scored.length * pctCutoff))
    pool = scored.slice(0, cutoff).map((s) => s.template)
  }

  // For rookie, also prefer easier templates in the first 3 attempts
  if (difficulty === 'rookie' && attemptCount <= 2) {
    const scored = pool.map((t) => {
      try {
        const sample = t.generate('rookie')
        return { template: t, complexity: sample.complexity }
      } catch { return { template: t, complexity: 1 } }
    }).sort((a, b) => a.complexity - b.complexity)
    const cutoff = Math.max(1, Math.floor(scored.length * 0.5))
    pool = scored.slice(0, cutoff).map((s) => s.template)
  }

  if (forceTrap) {
    const traps = pool.filter((t) => {
      try {
        const sample = t.generate(difficulty || 'scholar')
        return sample.trapType !== null
      } catch { return false }
    })
    if (traps.length > 0) pool = traps
  }

  if (pool.length === 0) {
    pool = TEMPLATES.filter((t) => t.difficulties.includes(difficulty || 'rookie'))
    if (pool.length === 0) pool = [TEMPLATES[0]]
  }

  const template = pick(pool)
  const result = template.generate(difficulty || pick(template.difficulties))
  return { ...result, id: uid() }
}

export function generateDailyChallenge(): BTMProblem {
  const today = new Date().toISOString().slice(0, 10)
  // Use date as seed for deterministic daily problem
  const seed = today.split('-').join('')
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  // Use hash to pick template and set seed for Math.random
  const templates = TEMPLATES.filter((t) => t.difficulties.includes('scholar') || t.difficulties.includes('expert'))
  const idx = Math.abs(hash) % templates.length
  const template = templates[idx]
  // Seed random with date for reproducibility
  const savedRandom = Math.random
  let seedState = Math.abs(hash)
  Math.random = () => {
    seedState = (seedState * 16807 + 0) % 2147483647
    return seedState / 2147483647
  }
  const result = template.generate('scholar')
  Math.random = savedRandom
  return { ...result, id: `daily-${today}` }
}

export function getDifficultyLabel(d: BTMDifficulty): string {
  const labels: Record<BTMDifficulty, string> = {
    rookie: 'ROOKIE', scholar: 'SCHOLAR', expert: 'EXPERT',
    nightmare: 'NIGHTMARE', requiem: 'REQUIEM',
  }
  return labels[d]
}

export function getDifficultyEmoji(d: BTMDifficulty): string {
  const emojis: Record<BTMDifficulty, string> = {
    rookie: '🟢', scholar: '🜵', expert: '🟣',
    nightmare: '🔴', requiem: '⚫',
  }
  return emojis[d]
}