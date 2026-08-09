'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import katex from 'katex'
import dynamic from 'next/dynamic'

const SolutionGraph = dynamic(() => import('@/components/SolutionGraph'), { ssr: false })
const SolutionDiagram = dynamic(() => import('@/components/SolutionDiagram'), { ssr: false })

// ─── Types ───────────────────────────────────────────────────────
interface SampleProblem { text: string; label: string }
interface Step { desc: string; formula: string }
interface Solution {
  finalAnswer: string
  finalFormula: string
  steps: Step[]
  altSteps: Step[]
  similar: string[]
  mistakes: string[]
  examTips: string[]
  graph: any | null
  diagram: any | null
}

type Subject = 'mathematics' | 'physics' | 'chemistry'
type Board = 'icse' | 'cbse' | 'state'

const SUBJECTS: Subject[] = ['mathematics', 'physics', 'chemistry']

const SUBJECT_META: Record<Subject, { name: string; badge: string; gradient: string; color: string }> = {
  mathematics:     { name: 'Mathematics',     badge: 'Math',     gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#8b5cf6' },
  physics:         { name: 'Physics',         badge: 'Physics',   gradient: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#f97316' },
  chemistry:       { name: 'Chemistry',       badge: 'Chem',     gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#10b981' },
}

const TICKER_FORMULAS = [
  'E = mc^2', 'F = ma', 'a^2 + b^2 = c^2', 'PV = nRT', 'v = u + at',
  'x = (-b \\pm \\sqrt{b^2-4ac}) / 2a', 'sin^2\\theta + cos^2\\theta = 1',
  '\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}',
  '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
  'pH = -\\log[H^+]', 'KE = \\frac{1}{2}mv^2', '\\Sigma F = 0',
  'd = ut + \\frac{1}{2}at^2', '\\lambda = h/mv', 'W = Fd\\cos\\theta',
  'n = C/V', '\\Delta G = \\Delta H - T\\Delta S', 'P_1V_1 = P_2V_2',
]

// ─── LaTeX Cleanup: strip raw LaTeX commands users shouldn't see ─────
// IMPORTANT: Only call this on PLAIN TEXT, never on KaTeX-rendered HTML.
function cleanBareLatex(text: string): string {
  if (!text) return ''
  // Skip if text contains HTML tags (already KaTeX-rendered)
  // This prevents corruption like ;/J artifacts from regex on HTML
  if (/<[a-z][\s\S]*?>/i.test(text)) return text
  // Fix double-escaped backslashes from LLM JSON
  let t = text.replace(/\\\\/g, '\\')
  // Remove \text{...} and \mathrm{...} wrappers, keep inner content
  t = t.replace(/\\text\{([^}]*)\}/gi, ' $1 ')
  t = t.replace(/\\mathrm\{([^}]*)\}/gi, ' $1 ')
  t = t.replace(/\\mathbf\{([^}]*)\}/gi, ' $1 ')
  t = t.replace(/\\textbf\{([^}]*)\}/gi, ' $1 ')
  // Replace common Greek letters with Unicode
  const greeks: [RegExp, string][] = [
    [/\\theta(?![a-zA-Z])/g, '\u03B8'], [/\\alpha(?![a-zA-Z])/g, '\u03B1'],
    [/\\beta(?![a-zA-Z])/g, '\u03B2'], [/\\gamma(?![a-zA-Z])/g, '\u03B3'],
    [/\\delta(?![a-zA-Z])/g, '\u03B4'], [/\\lambda(?![a-zA-Z])/g, '\u03BB'],
    [/\\mu(?![a-zA-Z])/g, '\u03BC'], [/\\sigma(?![a-zA-Z])/g, '\u03C3'],
    [/\\omega(?![a-zA-Z])/g, '\u03C9'], [/\\pi(?![a-zA-Z])/g, '\u03C0'],
    [/\\rho(?![a-zA-Z])/g, '\u03C1'], [/\\tau(?![a-zA-Z])/g, '\u03C4'],
    [/\\phi(?![a-zA-Z])/g, '\u03C6'], [/\\psi(?![a-zA-Z])/g, '\u03C8'],
    [/\\epsilon(?![a-zA-Z])/g, '\u03B5'], [/\\eta(?![a-zA-Z])/g, '\u03B7'],
  ]
  for (const [re, uni] of greeks) t = t.replace(re, uni)
  // Replace common LaTeX symbols with Unicode
  t = t.replace(/\\times/g, '\u00D7').replace(/\\div/g, '\u00F7')
  t = t.replace(/\\pm/g, '\u00B1').replace(/\\neq/g, '\u2260')
  t = t.replace(/\\leq/g, '\u2264').replace(/\\geq/g, '\u2265')
  t = t.replace(/\\approx/g, '\u2248').replace(/\\infty/g, '\u221E')
  t = t.replace(/\\partial/g, '\u2202').replace(/\\angle/g, '\u2220')
  t = t.replace(/\\Rightarrow/g, '\u21D2')
  t = t.replace(/\\cdot(?![a-zA-Z])/g, '\u00B7')
  t = t.replace(/\\quad/g, ' ').replace(/\\qquad/g, '  ')
  // Replace \frac{a}{b} with a/b for bare fractions
  t = t.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
  // Replace \sqrt{x} with √(x)
  t = t.replace(/\\sqrt\{([^}]*)\}/g, '\u221A($1)')
  // Remove \left and \right
  t = t.replace(/\\left/g, '').replace(/\\right/g, '')
  // Remove LaTeX spacing commands that leave artifacts (\; \, \: \!)
  t = t.replace(/\\[;,:!]/g, ' ')
  // Remove any remaining backslash not followed by a letter
  t = t.replace(/\\(?![a-zA-Z])/g, '')
  // Convert arrow commands to Unicode BEFORE the catch-all \command removal
  t = t.replace(/\\rightarrow/g, '\u2192').replace(/\\to/g, '\u2192')
  t = t.replace(/\\leftarrow/g, '\u2190')
  // Remove any remaining \command patterns
  t = t.replace(/\\[a-zA-Z]+/g, '')
  // Convert bare _{X} to Unicode subscripts (e.g., O_{2} → O₂)
  const subDigits = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089'
  t = t.replace(/_\{(\d+)\}/g, (_, d: string) => d.split('').map(c => subDigits[parseInt(c)] || c).join(''))
  t = t.replace(/_(\d)/g, (_: string, d: string) => subDigits[parseInt(d)] || d)
  // Convert bare ^{X} to Unicode superscripts (e.g., x^{2} → x²)
  const supDigits = '\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079'
  t = t.replace(/\^\{(\d+)\}/g, (_: string, d: string) => d.split('').map(c => supDigits[parseInt(c)] || c).join(''))
  t = t.replace(/\^(\d)/g, (_: string, d: string) => supDigits[parseInt(d)] || d)
  // Clean up stray braces
  t = t.replace(/\\\{/g, '{').replace(/\\\}/g, '}')
  t = t.replace(/\{\s*\}/g, '')
  // Fix stray ;/X artifacts from broken LaTeX spacing commands
  t = t.replace(/;\s*(?=[A-Z/])/g, '')
  t = t.replace(/\/(?=[A-Z]\b)/g, ' ')
  // Collapse multiple spaces
  t = t.replace(/  +/g, ' ')
  return t.trim()
}

// ─── Auto Subject Detection ──────────────────────────────────────
function detectSubject(text: string): Subject | null {
  const lower = text.toLowerCase()
  const scores: Record<Subject, number> = { mathematics: 0, physics: 0, chemistry: 0 }

  // Physics indicators (strong signal)
  const physicsTerms = ['newton', 'velocity', 'acceleration', 'force', 'momentum', 'kinetic energy', 'potential energy', 'joule', 'watt', 'ohm', 'ampere', 'coulomb', 'voltage', 'current', 'resistance', 'capacit', 'induct', 'frequency', 'wavelength', 'refraction', 'reflection', 'lens', 'mirror', 'focal length', 'friction', 'gravity', 'gravitation', 'torque', 'angular', 'centripetal', 'pendulum', 'projectile', 'trajectory', 'circuit', 'magnetic field', 'electric field', 'wave', 'sound', 'light', 'speed of light', 'work done', 'power', 'thermal', 'heat capacity', 'specific heat', 'latent heat', 'conduction', 'convection', 'radiation', 'pressure', 'buoyancy', 'density', 'stress', 'strain', 'youngs modulus', 'hookes law', 'bernoulli', 'pascals law', 'archimedes', 'doppler', 'photoelectric', 'nuclear', 'radioactive', 'half-life', 'fission', 'fusion', 'quantum', 'photon', 'electron volt', 'mass of electron', 'charge on electron', 'planck', 'farad', 'henry', 'tesla', 'weber', 'flux', 'emf', 'pd', 'kg m/s', 'm/s²', 'n/c', 'v/m', 'hooke', 'kgf', 'dyne', 'erg', 'horse power']
  physicsTerms.forEach(t => { if (lower.includes(t)) scores.physics += 2 })

  // Physics formula patterns
  const physicsPatterns = [/\b\d+\s*(m\/s|km\/h|cm\/s)\b/, /\b\d+\s*(n|kn)\b/i, /\b\d+\s*(j|kj|mj)\b(?!ust)/i, /\b\d+\s*(w|kw)\b(?!ith|hen|hat)/i, /\b\d+\s*(pa|kpa|atm)\b/i, /\b\d+\s*(c|a)\b(?=.*(?:current|charge|circuit))/i, /\b\d+\s*ohm\b/i, /\b\d+\s*f\b(?=.*(?:farad|force))/i, /\bh\s*=\s*\d/, /\b[uv]\s*=\s*\d/]
  physicsPatterns.forEach(p => { if (p.test(lower)) scores.physics += 1.5 })

  // Chemistry indicators
  const chemTerms = ['mole', 'molar', 'molarity', 'molality', 'molecular mass', 'molecular weight', 'atomic mass', 'atomic weight', 'atomic number', 'mass number', 'isotope', 'isobar', 'isotone', 'electron configuration', 'valence', 'oxidation', 'reduction', 'redox', 'electrolysis', 'electrolyte', 'anode', 'cathode', 'electrode', 'cation', 'anion', 'ionic', 'covalent', 'metallic bond', 'hydrogen bond', 'van der waals', 'periodic table', 'element', 'compound', 'mixture', 'solution', 'solute', 'solvent', 'concentration', 'dilution', 'titration', 'neutralization', 'acid', 'base', 'alkali', 'ph scale', 'salt', 'precipitate', 'solubility', 'reactant', 'product', 'yield', 'catalyst', 'enzyme', 'hydrocarbon', 'alkane', 'alkene', 'alkyne', 'alcohol', 'carboxylic', 'ester', 'polymer', 'monomer', 'carbonate', 'sulphate', 'nitrate', 'chloride', 'oxide', 'sulphide', 'sulphuric', 'hydrochloric', 'nitric', 'acetic', 'ethanoic', 'methane', 'ethane', 'ethene', 'ethyne', 'propane', 'butane', 'benzene', 'glucose', 'sucrose', 'fructose', 'starch', 'cellulose', 'protein', 'amino acid', 'lipid', 'fatty acid', 'avogadro', 'stoichiometry', 'limiting reagent', 'theoretical yield', 'empirical formula', 'molecular formula', 'structural formula', 'balanced equation', 'exothermic', 'endothermic', 'enthalpy', 'entropy', 'gibbs', 'activation energy', 'le chatelier', 'equilibrium constant', 'rate of reaction', 'order of reaction', 'half life', 'radioactive decay', 'nuclear', 'fusion', 'fission', 'chromatography', 'distillation', 'crystallization', 'sublimation', 'decomposition', 'displacement', 'combustion', 'corrosion', 'rusting', 'galvanization', 'electroplating', 'dalton', 'bohr', 'rutherford', 'thomson', 'mendeleev', 'chemical equation', 'word equation', 'baeyer', 'friedel', 'grignard', 'hoffmann', 'sabseier', 'wurtz', 'kolbe', 'markovnikov', 'antimarkovnikov', 'ozonolysis', 'hydration', 'dehydration', 'hydrogenation', 'fermentation', 'saponification', 'esterification', 'polymerization', 'vulcanization', 'calcination', 'roasting', 'smelting', 'refining', 'bessemer', 'hall', 'downs', 'castner']
  chemTerms.forEach(t => { if (lower.includes(t)) scores.chemistry += 2 })

  // Chemistry formula patterns (chemical formulas, equations)
  const chemPatterns = [/\b[A-Z][a-z]?\d*\s*(?:\+|→|=|->)\s*[A-Z]/, /\b(?:H₂|O₂|N₂|CO₂|H₂O|NaCl|HCl|H₂SO₄|NaOH|CaCO₃|HNO₃|CH₄|C₂H|NH₃|Fe₂O₃|CuSO₄|KMnO₄|K₂Cr₂O₇|H₃PO₄|Ca(OH)₂|Na₂CO₃|Mg|Al|Zn|Fe|Cu|Ag|Au|Na|K|Ca)\b/]
  chemPatterns.forEach(p => { if (p.test(text)) scores.chemistry += 1.5 })

  // Math indicators
  const mathTerms = ['quadratic', 'polynomial', 'factoris', 'factorize', 'differentiat', 'integrat', 'derivative', 'integral', 'calculus', 'matrix', 'determinant', 'permutation', 'combination', 'probability', 'statistics', 'mean', 'median', 'mode', 'standard deviation', 'variance', 'arithmetic progression', 'geometric progression', 'ap gp', 'hp', 'harmonic', 'binomial', 'theorem', 'pythagor', 'trigonometr', 'sine', 'cosine', 'tangent', 'secant', 'cotangent', 'cosecant', 'sinθ', 'cosθ', 'tanθ', 'logarithm', 'log', 'exponential', 'simultaneous', 'linear equation', 'quadratic equation', 'cubic', 'inequalit', 'set theory', 'venn diagram', 'function', 'domain', 'range', 'limit', 'continuity', 'asymptote', 'conic section', 'ellipse', 'hyperbola', 'parabola', 'circle equation', 'coordinate geometry', 'slope', 'intercept', 'midpoint', 'distance formula', 'section formula', 'area of triangle', 'heron', 'surface area', 'volume', 'cylinder', 'cone', 'sphere', 'hemisphere', 'frustum', 'complex number', 'argand', 'modulus', 'argument', 'de moivre', 'vector', 'dot product', 'cross product', 'lcm', 'hcf', 'gcd', 'prime', 'co-prime', 'divisib', 'remainder', 'euclid', 'fibonacci', 'pascal', 'surd', 'rationalis', 'polynomial', 'roots', 'discriminant', 'vertex', 'axis of symmetry', 'sum of n', 'sum of squares', 'sum of cubes']
  mathTerms.forEach(t => { if (lower.includes(t)) scores.mathematics += 2 })

  // Math formula patterns
  const mathPatterns = [/\bx\^?\d?\s*[+=]\s*\d/, /\b(?:sin|cos|tan|log|ln)\s*\(/, /\b(?:sum|sigma|pi)\s*\(?\s*\d/, /\b\d+\s*\/\s*\d+\s*[+-]\s*\d+\s*\/\s*\d+/, /\b(?:f\(|g\(|h\()\s*x/]
  mathPatterns.forEach(p => { if (p.test(lower)) scores.mathematics += 1.5 })

  // Find the winner
  const entries = Object.entries(scores) as [Subject, number][]
  entries.sort((a, b) => b[1] - a[1])

  const top = entries[0]
  const second = entries[1]

  // Need a clear winner with a meaningful score gap
  if (top[1] >= 3 && top[1] > second[1] + 1) {
    return top[0]
  }
  return null
}

// ─── KaTeX Helper ────────────────────────────────────────────────
// Strip problematic LaTeX commands that cause rendering issues
function sanitizeLatexForKatex(text: string): string {
  if (!text) return ''
  let t = text
  // Remove \text{...} — content spills into plain text outside $
  t = t.replace(/\\text\{[^}]*\}/g, '')
  // Remove \mathrm{...} and \mathbf{...} — same issue
  t = t.replace(/\\mathrm\{[^}]*\}/g, '')
  t = t.replace(/\\mathbf\{[^}]*\}/g, '')
  // Remove \textbf{...}
  t = t.replace(/\\textbf\{[^}]*\}/g, '')
  return t
}

// Wrap bare LaTeX commands (not in $...$) so KaTeX can render them
function wrapBareLatex(text: string): string {
  let t = text
  // \frac{A}{B} → $\frac{A}{B}$
  t = t.replace(/\\frac(\{[^}]*\}\s*\{[^}]*\})/g, '$\\frac$1$$')
  // \sqrt{X}, \sqrt[X]{Y} → $\sqrt{X}$
  t = t.replace(/\\sqrt(\[[^\]]*\])?(\{[^}]*\})/g, '$\\sqrt$1$2$$')
  // \binom{A}{B} → $\binom{A}{B}$
  t = t.replace(/\\binom(\{[^}]*\}\s*\{[^}]*\})/g, '$\\binom$1$$')
  // \overline{X}, \underline{X}
  t = t.replace(/\\(overline|underline)(\{[^}]*\})/g, '$\\$1$2$$')
  // Greek letters and common math commands
  t = t.replace(/\\(theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|sum|prod|int|lim|log|ln|sin|cos|tan|cot|sec|csc|exp|det|rightarrow|leftarrow|Rightarrow|vec|hat|bar|tilde|dot|nabla)(?=[^a-zA-Z]|$)/g, '$\\$1$$')
  // Merge adjacent $$ into single $
  t = t.replace(/\$\$\s*\$/g, '$')
  return t
}

function renderLatex(text: string): string {
  if (!text) return ''
  // Pre-sanitize to remove problematic commands before any processing
  text = sanitizeLatexForKatex(text)
  // Fix double-escaped backslashes from LLM JSON output
  text = text.replace(/\\\\/g, '\\')
  // If no $ delimiters but text has LaTeX commands, auto-wrap them
  const hasDelimiters = /\$\$[\s\S]+?\$\$|\$[^$]+?\$/g.test(text)
  const hasLatexCommands = /\\[a-zA-Z]/.test(text)
  if (!hasDelimiters && hasLatexCommands) {
    const wrapped = wrapBareLatex(text)
    if (wrapped !== text) return renderLatex(wrapped)
  }
  // Split by math delimiters, clean non-math parts separately, then render math
  const mathBlockRegex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g
  const parts: string[] = []
  let lastIndex = 0
  let match
  while ((match = mathBlockRegex.exec(text)) !== null) {
    // Non-math text before this match — clean bare LaTeX artifacts
    if (match.index > lastIndex) {
      parts.push(cleanBareLatex(text.slice(lastIndex, match.index)))
    }
    // Render the math block with KaTeX
    const displayTex = match[1]
    const inlineTex = match[2]
    if (displayTex) {
      const sanitized = sanitizeLatexForKatex(displayTex.trim())
      try {
        parts.push(katex.renderToString(sanitized, { displayMode: true, throwOnError: false }))
      } catch { parts.push(cleanBareLatex(match[0])) }
    } else if (inlineTex) {
      const sanitized = sanitizeLatexForKatex(inlineTex.trim())
      try {
        parts.push(katex.renderToString(sanitized, { displayMode: false, throwOnError: false }))
      } catch { parts.push(cleanBareLatex(match[0])) }
    }
    lastIndex = match.index + match[0].length
  }
  // Remaining text after last math block
  if (lastIndex < text.length) {
    parts.push(cleanBareLatex(text.slice(lastIndex)))
  }
  return parts.join('')
}


function normalizeLatex(s: string): string {
  let out = s.replace(/\\\\/g, '\\')
  // If it has LaTeX math commands, it's worth trying KaTeX
  if (/\\(frac|sqrt|sum|int|prod|lim|log|ln|sin|cos|tan|cot|sec|csc|times|div|pm|alpha|beta|theta|gamma|delta|lambda|mu|sigma|omega|pi|infty|partial|cdot|mathrm|mathbf|angle|hat|vec|dot|bar|tilde|left|right|textbf|neq|leq|geq|approx|Rightarrow|rightarrow|infty|quad)/.test(out)) return out
  // If it has $ delimiters, also render
  if (out.includes('$')) return out
  // Otherwise it's plain text, no need for KaTeX
  return ''
}

function renderFormulaToHtml(formula: string): React.ReactNode {
  if (!formula) return null
  // Sanitize problematic commands before passing to KaTeX
  const sanitized = sanitizeLatexForKatex(formula)
  const normalized = normalizeLatex(sanitized)
  if (!normalized) return <span>{cleanBareLatex(formula)}</span>
  if (normalized.includes('$')) {
    return <span dangerouslySetInnerHTML={{ __html: renderLatex(normalized) }} />
  }
  try {
    const html = katex.renderToString(normalized, { displayMode: true, throwOnError: false })
    return <span dangerouslySetInnerHTML={{ __html }} />
  } catch {
    return <span>{cleanBareLatex(formula)}</span>
  }
}

// ─── Background Component ────────────────────────────────────────
const BG_SHAPES = [
  // Large hero shapes — big, prominent
  { t:'hex',    x:'15%',y:'15%',s:'160px',c:'var(--accent-start)',d:'0s',  dur:'22s',so:'0.28' },
  { t:'ring',   x:'80%',y:'25%',s:'180px',c:'var(--glow-purple)',  d:'-7s', dur:'30s',so:'0.22',spin:true },
  { t:'diamond',x:'50%',y:'72%',s:'130px',c:'var(--accent-end)',   d:'-14s',dur:'26s',so:'0.22' },
  // Medium scattered shapes
  { t:'tri',    x:'8%',y:'42%',s:'100px',c:'var(--glow-cyan)',    d:'-3s', dur:'20s',so:'0.24' },
  { t:'hex',    x:'90%',y:'60%',s:'110px',c:'var(--glow-pink)',    d:'-10s',dur:'24s',so:'0.2' },
  { t:'penta',  x:'35%',y:'8%',s:'90px', c:'var(--accent-start)',d:'-5s', dur:'18s',so:'0.22' },
  { t:'cross',  x:'68%',y:'90%',s:'80px', c:'var(--glow-purple)',  d:'-16s',dur:'22s',so:'0.18' },
  { t:'ring',   x:'25%',y:'80%',s:'120px',c:'var(--glow-cyan)',    d:'-11s',dur:'28s',so:'0.2',spin:true },
  { t:'diamond',x:'55%',y:'35%',s:'70px', c:'var(--accent-end)',   d:'-2s', dur:'16s',so:'0.2' },
  { t:'tri',    x:'75%',y:'48%',s:'95px', c:'var(--accent-start)',d:'-8s', dur:'21s',so:'0.2' },
  // Small accent shapes — subtle detail layer
  { t:'hex',    x:'42%',y:'55%',s:'55px', c:'var(--glow-cyan)',    d:'-13s',dur:'19s',so:'0.2' },
  { t:'dot-ring',x:'18%',y:'92%',s:'60px', c:'var(--accent-end)',  d:'-1s', dur:'25s',so:'0.22' },
  { t:'diamond',x:'95%',y:'5%',s:'65px', c:'var(--glow-pink)',    d:'-17s',dur:'23s',so:'0.18' },
  { t:'penta',  x:'5%',y:'22%',s:'50px', c:'var(--glow-purple)',  d:'-4s', dur:'17s',so:'0.2' },
  { t:'cross',  x:'62%',y:'15%',s:'45px', c:'var(--glow-cyan)',    d:'-9s', dur:'20s',so:'0.18' },
  { t:'tri',    x:'30%',y:'38%',s:'60px', c:'var(--glow-pink)',    d:'-15s',dur:'22s',so:'0.16' },
  { t:'dot-ring',x:'82%',y:'82%',s:'75px', c:'var(--accent-start)',d:'-6s', dur:'26s',so:'0.18' },
  { t:'hex',    x:'48%',y:'95%',s:'50px', c:'var(--accent-end)',   d:'-12s',dur:'18s',so:'0.2' },
  // Tiny sparkle shapes — barely-there depth
  { t:'diamond',x:'72%',y:'12%',s:'35px', c:'var(--glow-cyan)',   d:'-20s',dur:'15s',so:'0.16' },
  { t:'penta',  x:'12%',y:'58%',s:'40px', c:'var(--accent-start)',d:'-7s', dur:'19s',so:'0.18' },
  { t:'dot-ring',x:'88%',y:'42%',s:'50px', c:'var(--glow-purple)', d:'-14s',dur:'24s',so:'0.16' },
  { t:'cross',  x:'38%',y:'18%',s:'38px', c:'var(--accent-end)',   d:'-18s',dur:'16s',so:'0.14' },
  { t:'tri',    x:'58%',y:'58%',s:'42px', c:'var(--glow-cyan)',    d:'-3s', dur:'21s',so:'0.18' },
]

function Background() {
  return (
    <div className="bg-wrap">
      {/* Ambient glow orbs */}
      <div className="bg-orb bg-orb-1" style={{ '--d':'0s' } as React.CSSProperties} />
      <div className="bg-orb bg-orb-2" style={{ '--d':'-6s' } as React.CSSProperties} />
      <div className="bg-orb bg-orb-3" style={{ '--d':'-12s' } as React.CSSProperties} />
      <div className="bg-orb bg-orb-4" style={{ '--d':'-18s' } as React.CSSProperties} />
      <div className="bg-orb bg-orb-5" style={{ '--d':'-9s' } as React.CSSProperties} />
      {/* Geometric shapes — data-driven, spread everywhere */}
      {BG_SHAPES.map((sh, i) => (
        <div
          key={i}
          className={`bg-shape shape-${sh.t}${sh.spin ? ' spin' : ''}`}
          style={{
            '--x':sh.x, '--y':sh.y, '--s':sh.s, '--c':sh.c,
            '--d':sh.d, '--dur':sh.dur, '--so':sh.so,
          } as React.CSSProperties}
        />
      ))}
      {/* Grid overlay */}
      <div className="bg-grid"></div>
      {/* Particles */}
      {[
        {px:'8%',py:'12%',sz:'4px',sp:'22s',d:'-0s'},
        {px:'92%',py:'20%',sz:'5px',sp:'19s',d:'-3s'},
        {px:'15%',py:'85%',sz:'3px',sp:'25s',d:'-7s'},
        {px:'75%',py:'80%',sz:'6px',sp:'20s',d:'-11s'},
        {px:'45%',py:'5%',sz:'4px',sp:'28s',d:'-2s'},
        {px:'60%',py:'45%',sz:'5px',sp:'18s',d:'-5s'},
        {px:'30%',py:'55%',sz:'3px',sp:'24s',d:'-9s'},
        {px:'88%',py:'92%',sz:'4px',sp:'21s',d:'-13s'},
        {px:'5%',py:'40%',sz:'5px',sp:'26s',d:'-1s'},
        {px:'50%',py:'50%',sz:'3px',sp:'30s',d:'-15s'},
        {px:'25%',py:'30%',sz:'4px',sp:'23s',d:'-8s'},
        {px:'70%',py:'15%',sz:'5px',sp:'27s',d:'-4s'},
      ].map((p, i) => (
        <div key={i} className="bg-particle" style={{ '--px':p.px,'--py':p.py,'--sz':p.sz,'--sp':p.sp,'--d':p.d } as React.CSSProperties} />
      ))}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────
export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [subject, setSubject] = useState<Subject>('mathematics')
  const [board, setBoard] = useState<Board>('icse')
  const [problem, setProblem] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [solution, setSolution] = useState<Solution | null>(null)
  const [samples, setSamples] = useState<Record<string, SampleProblem[]>>({})
  const [showAlt, setShowAlt] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [solutionInView, setSolutionInView] = useState(true)

  // IntersectionObserver: detect if solution panel is in viewport (for floating button)
  useEffect(() => {
    if (!outputBodyRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { setSolutionInView(entry.isIntersecting) },
      { threshold: 0.1, rootMargin: '0px' }
    )
    observer.observe(outputBodyRef.current)
    return () => observer.disconnect()
  }, [solution]) // re-observe when solution changes (panel may not exist before)
  const [scrolled, setScrolled] = useState(false)
  const [flashAnswer, setFlashAnswer] = useState(false)
  const [solveSource, setSolveSource] = useState<'local' | 'ai' | 'error'>('local')
  const [autoSwitched, setAutoSwitched] = useState<string | null>(null)

  // ── Feature 1: Voice Typing ──
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // ── Feature 2: Copy Answer ──
  const [copied, setCopied] = useState(false)

  // ── Feature 5: Feedback Modal ──
  const [showFeedback, setShowFeedback] = useState(false)
  const [fbName, setFbName] = useState('')
  const [fbMsg, setFbMsg] = useState('')
  const [fbGrade, setFbGrade] = useState('')
  const [fbContact, setFbContact] = useState('')
  const [fbError, setFbError] = useState('')
  const [fbSubmitted, setFbSubmitted] = useState(false)

  // ── Feature 6: Subject button glow/transition on change ──
  const [subjectGlow, setSubjectGlow] = useState<Subject | null>(null)

  // ── Auto-detect subject as user types ──
  useEffect(() => {
    const detected = detectSubject(problem.trim())
    if (detected && detected !== subject) {
      setSubjectGlow(detected)
      setSubject(detected)
      setTimeout(() => setSubjectGlow(null), 500)
    }
  }, [problem])

  // ── Feature 7: Retry with AI / Regenerate ──
  const [retryingAI, setRetryingAI] = useState(false)

  // ── Smart Regenerate: sends previous answer context so AI corrects itself ──
  const smartRegenerate = useCallback(async () => {
    const trimmed = problem.trim()
    if (!trimmed || !solution) return

    setRetryingAI(true)
    setLoading(true)
    setError('')
    setShowAlt(false)
    setFlashAnswer(false)
    setProgress(0)

    // Build previous answer context for smart retry
    const prevAnswer = solution.finalAnswer || solution.finalFormula || ''
    const prevStepsSummary = solution.steps
      ?.slice(0, 5)
      .map((s, i) => `Step ${i + 1}: ${s.desc.slice(0, 100)}`)
      .join('; ') || ''

    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 8
      if (p > 92) p = 92
      setProgress(p)
    }, 400)

    try {
      // Call Groq directly from browser with previous context
      const aiResult = await callGroqFromBrowser(trimmed, subject, board, prevAnswer, prevStepsSummary)
      clearInterval(progressRef.current!)
      if (aiResult) {
        setSolution(aiResult)
        setSolveSource('ai')
        setProgress(100)
        setTimeout(() => {
          setLoading(false)
          setRetryingAI(false)
          setTimeout(() => setFlashAnswer(true), 50)
          setTimeout(() => setFlashAnswer(false), 800)
          setTimeout(() => {
            document.querySelectorAll('.steps-container.reveal').forEach(el => {
              el.classList.remove('reveal')
              void el.offsetWidth
              el.classList.add('reveal')
            })
          }, 100)
        }, 150)
      } else {
        // Browser Groq failed → try server-side as fallback
        try {
          const serverRes = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problem: trimmed, subject, board, forceAI: true }),
          })
          const serverData = await serverRes.json()
          if (serverData.data && isValidSolution(serverData.data)) {
            setSolution(serverData.data)
            setSolveSource(serverData.source === 'ai' ? 'ai' : 'local')
            setProgress(100)
            setTimeout(() => { setLoading(false); setRetryingAI(false) }, 150)
          } else {
            setError('AI is currently unavailable. Please try again.')
            setLoading(false)
            setRetryingAI(false)
          }
        } catch {
          setError('AI is currently unavailable. Please try again.')
          setLoading(false)
          setRetryingAI(false)
        }
      }
    } catch {
      clearInterval(progressRef.current!)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
      setRetryingAI(false)
    }
  }, [problem, subject, board, solution])

  // ── AI Answer Validation: reject junk/wrong/refusal answers ──
  function isValidSolution(sol: any): boolean {
    if (!sol || !sol.finalAnswer) return false
    const ans = (sol.finalAnswer || '').toLowerCase()
    if (ans.length < 2) return false
    const refusePhrases = ['i cannot', "i can't", 'i am unable', "i'm unable", 'not sure', 'don\'t know', 'unable to', 'cannot solve', 'no solution', 'insufficient', 'please provide', 'cannot be determined']
    if (refusePhrases.some(p => ans.includes(p))) return false
    if (sol.steps && Array.isArray(sol.steps)) {
      if (sol.steps.length > 0 && sol.steps.every((s: any) => (s.desc || '').length < 3)) return false
    }
    return true
  }

  const openNotSatisfied = useCallback(() => {
    const ans = solution?.finalAnswer || solution?.finalFormula || ''
    setFbMsg(`I'm not happy with this answer.\n\nQuestion: ${problem}\nAnswer given: ${ans}`)
    setFbName('')
    setFbContact('')
    setFbGrade('')
    setFbError('')
    setShowFeedback(true)
  }, [problem, solution])

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const solutionRef = useRef<HTMLDivElement>(null)
  const outputBodyRef = useRef<HTMLDivElement>(null)
  const feedbackOverlayRef = useRef<HTMLDivElement>(null)
  const auraRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Upload state ──
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; type: string } | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractPhase, setExtractPhase] = useState<'extracting' | 'preview' | 'solving'>('extracting')
  const [dragOver, setDragOver] = useState(false)
  const [extractedQuestions, setExtractedQuestions] = useState<string[] | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Close upload popover on outside click
  useEffect(() => {
    if (!showUploadMenu) return
    const handler = () => setShowUploadMenu(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showUploadMenu])

  // ── Feature 1: Check voice support in useEffect (no hydration mismatch) ──
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
      setVoiceSupported(supported)
    }
  }, [])

  // ── Feature 3: Theme persistence with localStorage ──
  useEffect(() => {
    // Read saved theme on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('speedsolve-theme')
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved)
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Persist theme to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('speedsolve-theme', theme)
    }
  }, [theme])

  // Fetch sample problems on mount
  useEffect(() => {
    fetch('/api/solve').then(r => r.json()).then(data => {
      if (data.samples) setSamples(data.samples)
    }).catch(() => {})
  }, [])

  // Scroll listeners
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Trigger fade-up animations after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'))
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // ── Feature 18: Cursor aura glow ──
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (auraRef.current) {
        auraRef.current.style.left = e.clientX + 'px'
        auraRef.current.style.top = e.clientY + 'px'
      }
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  // ── Feature 6: Subject change with shift animation ──
  const handleSubjectChange = useCallback((newSubject: Subject) => {
    if (newSubject === subject) return
    setSubjectGlow(newSubject)
    setSubject(newSubject)
    setTimeout(() => setSubjectGlow(null), 500)
  }, [subject])

  // ── Client-side Groq key pool + rotation ──
  const groqKeysRef = useRef<string[]>([])
  const keyHealthRef = useRef<Record<number, 'ok' | 'dead'>>({})
  const keyIndexRef = useRef(0) // stable round-robin counter
  const keysReadyRef = useRef(false)
  const keysLoadedPromiseRef = useRef<Promise<void>>(
    fetch('/api/config').then(r => r.json()).then(d => {
      groqKeysRef.current = (d.groqKeys || []).filter((k: string) => k.length > 10)
      keysReadyRef.current = true
    }).catch(() => { keysReadyRef.current = true })
  )
  useEffect(() => { keysLoadedPromiseRef.current }, [])

  const waitForKeys = async (): Promise<boolean> => {
    if (keysReadyRef.current) return groqKeysRef.current.length > 0
    await keysLoadedPromiseRef.current
    return groqKeysRef.current.length > 0
  }

  const getNextKey = (): string | null => {
    const keys = groqKeysRef.current
    if (keys.length === 0) return null
    // Stable round-robin: try each key, skip dead ones
    for (let i = 0; i < keys.length; i++) {
      const idx = (keyIndexRef.current + i) % keys.length
      if (keyHealthRef.current[idx] !== 'dead') {
        keyIndexRef.current = (idx + 1) % keys.length // advance for next call
        return keys[idx]
      }
    }
    // All marked dead — reset and try first
    keyHealthRef.current = {}
    keyIndexRef.current = 0
    return keys[0]
  }

  const markKeyDead = (key: string) => {
    const idx = groqKeysRef.current.indexOf(key)
    if (idx >= 0) keyHealthRef.current[idx] = 'dead'
  }

  const extractJSON = (text: string): any | null => {
    if (!text) return null
    let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
    try { return JSON.parse(cleaned) } catch {}
    let searchFrom = 0
    while (searchFrom < cleaned.length) {
      const start = cleaned.indexOf('{', searchFrom)
      if (start === -1) return null
      let depth = 0, inString = false, escape = false, end = -1
      for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i]
        if (escape) { escape = false; continue }
        if (ch === '\\') { escape = true; continue }
        if (ch === '"') { inString = !inString; continue }
        if (inString) continue
        if (ch === '{') depth++
        else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
      }
      if (end !== -1) {
        let candidate = cleaned.slice(start, end + 1)
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/\n/g, ' ').replace(/\t/g, ' ').replace(/  +/g, ' ').trim()
        try { return JSON.parse(candidate) } catch {}
        candidate = candidate.replace(/[\x00-\x1f\x7f]/g, '')
        try { return JSON.parse(candidate) } catch {}
      }
      searchFrom = start + 1
    }
    return null
  }

  // ── Client-side Groq call (bypasses server geo-block) ──
  const callGroqFromBrowser = async (problemText: string, activeSubject: string, activeBoard: string, prevAnswer?: string, prevSteps?: string): Promise<Solution | null> => {
    try {
      // Wait for keys to be loaded from /api/config
      const hasKeys = await waitForKeys()
      if (!hasKeys) return null

      // Get system prompt from server (lightweight, no AI call)
      const promptRes = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: activeBoard, subject: activeSubject, previousAnswer: prevAnswer, previousSteps: prevSteps }),
      })
      const promptData = await promptRes.json()
      if (!promptData.systemPrompt) return null

      const boardLabel = activeBoard === 'icse' ? 'ICSE' : activeBoard === 'cbse' ? 'CBSE' : 'State Board'
      let retryNote = ''
      if (prevAnswer) {
        retryNote = `\n\nIMPORTANT: This is a RETRY. The previous answer was: "${prevAnswer}"\nThe student was not satisfied. Please solve this CORRECTLY.`
      }
      const userPrompt = `Subject: ${activeSubject.toUpperCase()}\nBoard: ${boardLabel}\nProblem: ${problemText}${retryNote}\nSubstitute the given values into the formula and compute. Return JSON only.`

      const models = ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b']
      const seenKeys = new Set<string>()
      const totalKeys = groqKeysRef.current.length

      // Try ALL available keys (up to totalKeys)
      for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
        const key = getNextKey()
        if (!key || seenKeys.has(key)) break
        seenKeys.add(key)

        for (const model of models) {
          try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: promptData.systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                temperature: 0.1,
                max_tokens: 8192,
              }),
              signal: AbortSignal.timeout(30000),
            })
            if (res.status === 401 || res.status === 403) {
              markKeyDead(key)
              break // skip to next key
            }
            if (res.status === 429) {
              // Rate limited — try next key without marking dead
              break
            }
            if (!res.ok) continue
            const data = await res.json()
            const text = data?.choices?.[0]?.message?.content || ''
            if (text.trim().length < 20) continue
            // Parse JSON from response
            const parsed = extractJSON(text)
            if (parsed && parsed.finalAnswer && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
              // ── AI Answer Validation: reject junk/wrong/refusal answers ──
              const answerStr = (parsed.finalAnswer || '').toLowerCase()
              const refusePhrases = ['i cannot', "i can't", 'i am unable', "i'm unable", 'not sure', 'i don\'t know', "i don't know", 'unable to', 'cannot solve', 'no solution', 'insufficient information', 'please provide more', 'cannot be determined', 'unclear']
              if (refusePhrases.some(p => answerStr.includes(p))) continue
              if (parsed.finalAnswer.length < 2) continue
              if (parsed.steps.every((s: any) => (s.desc || '').length < 5)) continue
              // Check for garbage (too many special chars, not enough real content)
              const contentChars = (parsed.finalAnswer + parsed.steps.map((s: any) => s.desc || '').join('')).replace(/[^a-zA-Z0-9.\-+=%\s]/g, '')
              const totalChars = parsed.finalAnswer.length + parsed.steps.map((s: any) => s.desc || '').join('').length
              if (totalChars > 20 && contentChars.length / totalChars < 0.3) continue
              return {
                finalAnswer: parsed.finalAnswer || '',
                finalFormula: parsed.finalFormula || '',
                steps: (parsed.steps || []).map((s: any) => ({ desc: s.desc || '', formula: s.formula || '' })),
                altSteps: (parsed.altSteps || []).map((s: any) => ({ desc: s.desc || '', formula: s.formula || '' })),
                similar: Array.isArray(parsed.similar) ? parsed.similar.slice(0, 4) : [],
                mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.slice(0, 5) : [],
                examTips: [],
                graph: parsed.graph?.type ? parsed.graph : null,
                diagram: null,
              }
            }
            // JSON parse failed - build from raw text
            // Validate raw text isn't a refusal
            const lowerText = text.toLowerCase()
            const isRefusal = /i cannot|i can't|unable to|not sure|don't know|cannot solve|no solution|insufficient|please provide/i.test(lowerText)
            if (isRefusal) continue
            const lines = text.split('\n').filter((l: string) => l.trim().length > 5)
            const steps = lines.slice(0, 8).map((l: string) => ({
              desc: l.trim().replace(/^[\d.]+[).]\s*/, ''),
              formula: '',
            }))
            let answer = steps.length > 0 ? steps[steps.length - 1].desc : text.slice(0, 200)
            const answerLines = answer.split(/[\n=]/).map((l: string) => l.trim()).filter((l: string) => l.length > 0 && l.length < 80)
            if (answerLines.length > 0) answer = answerLines[answerLines.length - 1]
            return {
              finalAnswer: answer,
              finalFormula: '',
              steps: steps.length > 0 ? steps : [{ desc: text.slice(0, 300), formula: '' }],
              altSteps: [], similar: [], mistakes: [], examTips: [],
              graph: null, diagram: null,
            }
          } catch (e) { continue }
        }
      }
    } catch (e) {}
    return null
  }

  const solve = useCallback(async () => {
    const trimmed = problem.trim()
    if (!trimmed) return

    // Auto-detect subject if question doesn't match selected subject
    const detected = detectSubject(trimmed)
    let activeSubject = subject
    if (detected && detected !== subject) {
      setSubjectGlow(detected)
      setSubject(detected)
      setTimeout(() => setSubjectGlow(null), 500)
      activeSubject = detected
      setAutoSwitched(SUBJECT_META[detected].name)
      setTimeout(() => setAutoSwitched(null), 2500)
    }

    setLoading(true)
    setRetryingAI(false)
    setError('')
    setSolution(null)
    setShowAlt(false)
    setFlashAnswer(false)
    setSolveSource('local')
    setProgress(0)

    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 15
      if (p > 90) p = 90
      setProgress(p)
    }, 300)

    const showResult = (sol: Solution, source: 'ai' | 'local') => {
      clearInterval(progressRef.current!)
      setSolution(sol)
      setSolveSource(source)
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setTimeout(() => setFlashAnswer(true), 50)
        setTimeout(() => setFlashAnswer(false), 800)
        setTimeout(() => {
          document.querySelectorAll('.steps-container.reveal').forEach(el => {
            el.classList.remove('reveal')
            void el.offsetWidth
            el.classList.add('reveal')
          })
        }, 100)
        if (window.innerWidth <= 1024) {
          setTimeout(() => {
            const el = outputBodyRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const navH = window.innerWidth <= 768 ? 60 : 68
            if (rect.top > navH + 20) {
              const y = window.scrollY + rect.top - navH - 8
              window.scrollTo({ top: y, behavior: 'smooth' })
            }
          }, 200)
        }
      }, 150)
    }

    try {
      // For STEM subjects, try local solver first (instant)
      const stemSubjects = ['mathematics', 'physics', 'chemistry']
      if (stemSubjects.includes(activeSubject)) {
        const localRes = await fetch('/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem: trimmed, subject: activeSubject, board }),
        })
        const localData = await localRes.json()
        if (localData.data && localData.source === 'local') {
          showResult(localData.data, 'local')
          return
        }
      }

      // Local solver didn't handle it (or non-STEM) → call Groq directly from browser
      const aiResult = await callGroqFromBrowser(trimmed, activeSubject, board)
      if (aiResult) {
        showResult(aiResult, 'ai')
        return
      }

      // Browser Groq failed → try server-side as last resort
      const serverRes = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: trimmed, subject: activeSubject, board, forceAI: true }),
      })
      const serverData = await serverRes.json()
      if (serverData.error) {
        clearInterval(progressRef.current!)
        setError(serverData.error)
        setLoading(false)
      } else if (serverData.data && isValidSolution(serverData.data)) {
        showResult(serverData.data, serverData.source === 'ai' ? 'ai' : 'error')
      } else {
        clearInterval(progressRef.current!)
        setError('Could not solve this problem. Please try again.')
        setLoading(false)
      }
    } catch {
      clearInterval(progressRef.current!)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }, [problem, subject, board])

  // ── Feature 7: Retry with AI (client-side Groq) ──
  const retryWithAI = useCallback(async () => {
    const trimmed = problem.trim()
    if (!trimmed) return

    setRetryingAI(true)
    setLoading(true)
    setError('')
    setSolution(null)
    setShowAlt(false)
    setFlashAnswer(false)
    setProgress(0)

    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 8
      if (p > 92) p = 92
      setProgress(p)
    }, 400)

    try {
      // Call Groq directly from browser
      const aiResult = await callGroqFromBrowser(trimmed, subject, board)
      clearInterval(progressRef.current!)
      if (aiResult) {
        setSolution(aiResult)
        setSolveSource('ai')
        setProgress(100)
        setTimeout(() => {
          setLoading(false)
          setRetryingAI(false)
          setTimeout(() => setFlashAnswer(true), 50)
          setTimeout(() => setFlashAnswer(false), 800)
          setTimeout(() => {
            document.querySelectorAll('.steps-container.reveal').forEach(el => {
              el.classList.remove('reveal')
              void el.offsetWidth
              el.classList.add('reveal')
            })
          }, 100)
          if (window.innerWidth <= 1024) {
            setTimeout(() => {
              const el = outputBodyRef.current
              if (!el) return
              const rect = el.getBoundingClientRect()
              const navH = window.innerWidth <= 768 ? 60 : 68
              if (rect.top > navH + 20) {
                const y = window.scrollY + rect.top - navH - 8
                window.scrollTo({ top: y, behavior: 'smooth' })
              }
            }, 200)
          }
        }, 150)
      } else {
        // Browser Groq failed → try server-side as fallback
        try {
          const serverRes = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problem: trimmed, subject, board, forceAI: true }),
          })
          const serverData = await serverRes.json()
          if (serverData.data && isValidSolution(serverData.data)) {
            setSolution(serverData.data)
            setSolveSource(serverData.source === 'ai' ? 'ai' : 'local')
            setProgress(100)
            setTimeout(() => { setLoading(false); setRetryingAI(false) }, 150)
          } else {
            setError('AI is currently unavailable. Please try again.')
            setLoading(false)
            setRetryingAI(false)
          }
        } catch {
          setError('AI is currently unavailable. Please try again.')
          setLoading(false)
          setRetryingAI(false)
        }
      }
    } catch {
      clearInterval(progressRef.current!)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
      setRetryingAI(false)
    }
  }, [problem, subject, board, solution])

  // ── Feature 2: Copy answer ──
  const copyAnswer = useCallback(() => {
    if (!solution) return
    const lines: string[] = []

    // Problem
    lines.push(`Problem: ${cleanBareLatex(problem)}`)
    lines.push('')

    // Final Answer — use finalFormula (computed result) preferentially
    const answer = cleanBareLatex(solution.finalFormula || solution.finalAnswer)
    lines.push(`Final Answer: ${answer}`)
    lines.push('')

    // Steps
    if (solution.steps && solution.steps.length > 0) {
      lines.push('Step-by-Step Explanation:')
      lines.push('─'.repeat(40))
      solution.steps.forEach((step, i) => {
        const desc = cleanBareLatex(step.desc)
        lines.push(`Step ${i + 1}: ${desc}`)
        if (step.formula) {
          lines.push(`  → ${cleanBareLatex(step.formula)}`)
        }
        lines.push('')
      })
    }

    // Alternate Steps
    if (solution.altSteps && solution.altSteps.length > 0) {
      lines.push('Alternate Solution:')
      lines.push('─'.repeat(40))
      solution.altSteps.forEach((step, i) => {
        const desc = cleanBareLatex(step.desc)
        lines.push(`Step ${i + 1}: ${desc}`)
        if (step.formula) {
          lines.push(`  → ${cleanBareLatex(step.formula)}`)
        }
        lines.push('')
      })
    }

    // Common Mistakes
    if (solution.mistakes && solution.mistakes.length > 0) {
      lines.push('Common Mistakes to Avoid:')
      lines.push('─'.repeat(40))
      solution.mistakes.forEach((m, i) => {
        lines.push(`${i + 1}. ${cleanBareLatex(m)}`)
      })
      lines.push('')
    }

    // Exam Tips
    if (solution.examTips && solution.examTips.length > 0) {
      const boardLabel = board === 'icse' ? 'ICSE' : board === 'cbse' ? 'CBSE' : 'State Board'
      lines.push(`Exam Tips for ${boardLabel}:`)
      lines.push('─'.repeat(40))
      solution.examTips.forEach((tip, i) => {
        lines.push(`${i + 1}. ${tip}`)
      })
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [solution, problem, board])

  // ── Feature 5: Submit feedback ──
  const [fbSubmitting, setFbSubmitting] = useState(false)
  const submitFeedback = useCallback(async () => {
    if (!fbName.trim()) {
      setFbError('Please enter your name.')
      return
    }
    if (!fbMsg.trim()) {
      setFbError('Please enter a feedback message.')
      return
    }
    setFbError('')
    setFbSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fbName.trim(), feedback: fbMsg.trim(), subject, board, problem, grade: fbGrade, answer: solution?.finalAnswer || '', contact: fbContact.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setFbSubmitted(true)
        setTimeout(() => {
          setShowFeedback(false)
          setFbSubmitted(false)
          setFbName('')
          setFbMsg('')
          setFbContact('')
        }, 1500)
      } else {
        setFbError(data.error || 'Failed to submit. Please try again.')
      }
    } catch {
      setFbError('Network error. Check your connection and try again.')
    } finally {
      setFbSubmitting(false)
    }
  }, [fbName, fbMsg, fbContact, subject, board, fbGrade, problem, solution])

  const clearAll = () => {
    setProblem('')
    setSolution(null)
    setError('')
    setShowAlt(false)
    setCopied(false)
    setUploadedFile(null)
  }

  // ── File upload & extraction ──
  const handleFileUpload = useCallback(async (file: File) => {
    const maxSize = 15 * 1024 * 1024 // 15MB
    if (file.size > maxSize) {
      setError('File too large. Maximum 15MB.')
      return
    }

    setUploadedFile({ name: file.name, size: file.size, type: file.type })
    setExtracting(true)
    setExtractPhase('extracting')
    setError('')
    setShowUploadMenu(false)
    setExtractedQuestions(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/extract', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to extract text from file.')
        setUploadedFile(null)
        setExtracting(false)
        return
      }

      const extractedText = data.text || ''
      if (extractedText) {
        // Store multi-question data if available
        if (data.questions && data.questions.length > 1) {
          setExtractedQuestions(data.questions)
        }

        // Show preview for user to verify/edit before solving
        setProblem(extractedText)
        setExtractPhase('preview')
        setExtracting(false)
        return
      }
      setError('No text could be extracted from this file.')
    } catch {
      setError('Failed to process file. Please try again.')
    } finally {
      if (extractPhase !== 'preview') setExtracting(false)
    }
  }, [subject, board, extractPhase])

  // Solve from preview
  const solveExtracted = useCallback(async () => {
    if (!problem.trim()) return
    setExtractPhase('solving')
    setExtracting(true)
    setExtractedQuestions(null)
    setLoading(true)
    setSolveSource('local')
    setSolution(null)
    setError('')
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p
        return p + Math.random() * 15
      })
    }, 400)

    try {
      const solveRes = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: problem.trim(), subject, board }),
      })
      const solveData = await solveRes.json()
      clearInterval(progressInterval)
      setProgress(100)

      if (solveData.error) {
        setError(solveData.error)
      } else if (solveData.data) {
        setSolution(solveData.data)
        setSolveSource(solveData.source === 'ai' ? 'ai' : solveData.source === 'local' ? 'local' : 'error')
      }
      setTimeout(() => { setLoading(false); setExtracting(false); setUploadedFile(null) }, 200)
    } catch {
      clearInterval(progressInterval)
      setError('Failed to solve extracted problem.')
      setLoading(false)
      setExtracting(false)
    }
  }, [problem, subject, board])

  // Pick a specific question from multi-question extraction
  const pickQuestion = useCallback((q: string) => {
    setProblem(q)
    setExtractedQuestions(null)
  }, [])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = '' // reset so same file can be re-uploaded
  }, [handleFileUpload])

  const onCameraChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    e.target.value = ''
  }, [handleFileUpload])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const exportPDF = async () => {
    if (!solution) return
    try {
      const jsPDF = (await import('jspdf')).default
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 20
      const contentW = pageW - margin * 2
      let y = margin

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - 15) {
          pdf.addPage()
          y = margin
        }
      }

      // Simple LaTeX-to-plain-text for PDF (no rendering engine needed)
      const texToPlain = (s: string): string => {
        if (!s) return ''
        let t = s
          .replace(/\\\\/g, '\\')
          .replace(/\$\$([\s\\S]+?)\$\$|\$([^$]+?)\$/g, (_, a, b) => a || b || '')
          .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
          .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
          .replace(/\\times/g, ' x ')
          .replace(/\\div/g, ' / ')
          .replace(/\\pm/g, ' +/- ')
          .replace(/\\neq/g, ' != ')
          .replace(/\\leq/g, ' <= ')
          .replace(/\\geq/g, ' >= ')
          .replace(/\\approx/g, ' ~ ')
          .replace(/\\rightarrow/g, ' -> ')
          .replace(/\\Rightarrow/g, ' => ')
          .replace(/\\infty/g, 'inf')
          .replace(/\\partial/g, 'd')
          .replace(/\\cdot/g, '.')
          .replace(/\\theta/g, 'theta')
          .replace(/\\alpha/g, 'alpha')
          .replace(/\\beta/g, 'beta')
          .replace(/\\gamma/g, 'gamma')
          .replace(/\\delta/g, 'delta')
          .replace(/\\lambda/g, 'lambda')
          .replace(/\\mu/g, 'mu')
          .replace(/\\sigma/g, 'sigma')
          .replace(/\\omega/g, 'omega')
          .replace(/\\pi/g, 'pi')
          .replace(/\\sum/g, 'Sum')
          .replace(/\\int/g, 'Int')
          .replace(/\\prod/g, 'Prod')
          .replace(/\\lim/g, 'lim')
          .replace(/\\log/g, 'log')
          .replace(/\\ln/g, 'ln')
          .replace(/\\sin/g, 'sin')
          .replace(/\\cos/g, 'cos')
          .replace(/\\tan/g, 'tan')
          .replace(/\\text\{[^}]*\}/g, '')
          .replace(/\\mathrm\{[^}]*\}/g, '')
          .replace(/\\mathbf\{[^}]*\}/g, '')
          .replace(/\\left/g, '').replace(/\\right/g, '')
          .replace(/\\,/g, ' ')
          .replace(/\\; /g, ' ')
          .replace(/\{([^}]*)\}/g, '$1')
          .replace(/\\/g, '')
          .trim()
        return t
      }

      // Word-wrap helper
      const wrapText = (doc: any, text: string, maxWidth: number): string[] => {
        const lines: string[] = []
        const words = text.split(' ')
        let line = ''
        for (const word of words) {
          const test = line ? line + ' ' + word : word
          if (doc.getTextWidth(test) > maxWidth && line) {
            lines.push(line)
            line = word
          } else {
            line = test
          }
        }
        if (line) lines.push(line)
        return lines.length ? lines : ['']
      }

      const addWrapped = (text: string, x: number, fontSize: number, maxWidth: number, lineHeight?: number) => {
        pdf.setFontSize(fontSize)
        const lh = lineHeight || fontSize * 0.45
        const lines = wrapText(pdf, text, maxWidth)
        for (const l of lines) {
          ensureSpace(lh + 2)
          pdf.text(l, x, y)
          y += lh
        }
      }

      const addBullet = (text: string, fontSize: number) => {
        pdf.setFontSize(fontSize)
        const lh = fontSize * 0.45
        const lines = wrapText(pdf, text, contentW - 8)
        ensureSpace(lh + 2)
        pdf.text('•', margin + 2, y)
        pdf.text(lines[0], margin + 6, y)
        y += lh
        for (let i = 1; i < lines.length; i++) {
          ensureSpace(lh + 2)
          pdf.text(lines[i], margin + 6, y)
          y += lh
        }
      }

      // ─── HEADER ───
      pdf.setFillColor(37, 99, 235)
      pdf.rect(0, 0, pageW, 32, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('SpeedSolve AI', margin, 14)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      const boardLabel = board === 'icse' ? 'ICSE' : board === 'cbse' ? 'CBSE' : 'State Board'
      pdf.text(`${SUBJECT_META[subject].name}  |  ${boardLabel}  |  ${new Date().toLocaleDateString('en-IN')}`, margin, 22)

      // Source badge
      if (solveSource === 'ai') {
        pdf.setFillColor(16, 185, 129)
        pdf.roundedRect(pageW - margin - 38, 8, 38, 7, 2, 2, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'bold')
        pdf.text('AI POWERED', pageW - margin - 36, 13)
      } else {
        pdf.setFillColor(139, 92, 246)
        pdf.roundedRect(pageW - margin - 30, 8, 30, 7, 2, 2, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'bold')
        pdf.text('INSTANT', pageW - margin - 28, 13)
      }

      y = 42
      pdf.setTextColor(30, 30, 30)

      // ─── PROBLEM ───
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      ensureSpace(16)
      pdf.text('Problem:', margin, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      addWrapped(cleanBareLatex(problem), margin, 10, contentW)
      y += 4

      // ─── FINAL ANSWER ───
      ensureSpace(22)
      pdf.setDrawColor(37, 99, 235)
      pdf.setFillColor(240, 244, 255)
      pdf.roundedRect(margin, y - 3, contentW, 16, 3, 3, 'FD')
      pdf.setTextColor(30, 30, 246)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Final Answer:', margin + 4, y + 2)
      pdf.setFont('helvetica', 'normal')
      const answerText = texToPlain(solution.finalFormula || solution.finalAnswer)
      const ansLines = wrapText(pdf, answerText, contentW - 12)
      if (ansLines[0]) pdf.text(ansLines[0], margin + 4, y + 8)
      y += 18
      pdf.setTextColor(30, 30, 30)

      // ─── STEPS ───
      if (solution.steps && solution.steps.length > 0) {
        ensureSpace(12)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setDrawColor(37, 99, 235)
        pdf.line(margin, y - 1, margin + 30, y - 1)
        pdf.text('Step-by-Step Solution', margin, y + 3)
        y += 8

        solution.steps.forEach((step, i) => {
          ensureSpace(10)
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(37, 99, 235)
          pdf.text(`Step ${i + 1}`, margin, y)
          y += 4.5
          pdf.setTextColor(30, 30, 30)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9.5)

          // Description
          const descText = texToPlain(cleanBareLatex(step.desc))
          addWrapped(descText, margin + 2, 9.5, contentW - 4)

          // Formula (highlighted box)
          if (step.formula) {
            const formulaText = texToPlain(cleanBareLatex(step.formula))
            if (formulaText.trim()) {
              ensureSpace(12)
              const fLines = wrapText(pdf, formulaText, contentW - 16)
              const boxH = Math.max(fLines.length * 4.5 + 6, 10)
              pdf.setFillColor(245, 247, 255)
              pdf.roundedRect(margin + 2, y - 3, contentW - 4, boxH, 2, 2, 'F')
              pdf.setTextColor(67, 56, 202)
              pdf.setFontSize(9.5)
              pdf.setFont('helvetica', 'bold')
              let fy = y + 1
              for (const fl of fLines) {
                pdf.text(fl, margin + 6, fy)
                fy += 4.5
              }
              y += boxH + 2
              pdf.setTextColor(30, 30, 30)
            }
          }
          y += 3
        })
      }

      // ─── ALTERNATE SOLUTION ───
      if (solution.altSteps && solution.altSteps.length > 0) {
        ensureSpace(12)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setDrawColor(139, 92, 246)
        pdf.line(margin, y - 1, margin + 40, y - 1)
        pdf.text('Alternate Solution', margin, y + 3)
        y += 8

        solution.altSteps.forEach((step, i) => {
          ensureSpace(10)
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(139, 92, 246)
          pdf.text(`Alt Step ${i + 1}`, margin, y)
          y += 4.5
          pdf.setTextColor(30, 30, 30)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9.5)
          addWrapped(texToPlain(cleanBareLatex(step.desc)), margin + 2, 9.5, contentW - 4)
          if (step.formula) {
            const ft = texToPlain(cleanBareLatex(step.formula))
            if (ft.trim()) {
              ensureSpace(10)
              const fl = wrapText(pdf, ft, contentW - 16)
              const bh = Math.max(fl.length * 4.5 + 6, 10)
              pdf.setFillColor(248, 245, 255)
              pdf.roundedRect(margin + 2, y - 3, contentW - 4, bh, 2, 2, 'F')
              pdf.setTextColor(67, 56, 202)
              pdf.setFontSize(9.5)
              pdf.setFont('helvetica', 'bold')
              let fy = y + 1
              for (const l of fl) { pdf.text(l, margin + 6, fy); fy += 4.5 }
              y += bh + 2
              pdf.setTextColor(30, 30, 30)
            }
          }
          y += 3
        })
      }

      // ─── COMMON MISTAKES ───
      if (solution.mistakes && solution.mistakes.length > 0) {
        ensureSpace(14)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setDrawColor(245, 158, 11)
        pdf.line(margin, y - 1, margin + 42, y - 1)
        pdf.text('Common Mistakes to Avoid', margin, y + 3)
        y += 8
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        for (const m of solution.mistakes) {
          addBullet(texToPlain(cleanBareLatex(m)), 9)
          y += 1.5
        }
        y += 3
      }

      // ─── EXAM TIPS ───
      if (solution.examTips && solution.examTips.length > 0) {
        ensureSpace(14)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setDrawColor(16, 185, 129)
        pdf.line(margin, y - 1, margin + 30, y - 1)
        pdf.text(`Exam Tips (${boardLabel})`, margin, y + 3)
        y += 8
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        for (const tip of solution.examTips) {
          addBullet(tip, 9)
          y += 1.5
        }
        y += 3
      }

      // ─── SIMILAR QUESTIONS ───
      if (solution.similar && solution.similar.length > 0) {
        ensureSpace(14)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setDrawColor(6, 182, 212)
        pdf.line(margin, y - 1, margin + 30, y - 1)
        pdf.text('Practice - Similar Questions', margin, y + 3)
        y += 8
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        for (const q of solution.similar) {
          addBullet(texToPlain(cleanBareLatex(q)), 9)
          y += 1.5
        }
      }

      // ─── FOOTER ───
      const totalPages = pdf.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p)
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(150, 150, 150)
        pdf.text('Generated by SpeedSolve AI  |  speedsolve.vercel.app', margin, pageH - 8)
        pdf.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 8)
      }

      pdf.save('speedsolve-solution.pdf')
    } catch (err) {
      console.error('PDF export failed:', err)
    }
  }

  const handleSampleClick = (text: string) => {
    setProblem(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      solve()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      solve()
    }
  }

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1]
      if (last.isFinal) {
        setProblem(prev => prev + (prev ? ' ' : '') + last[0].transcript)
      }
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening])

  const currentSamples = samples[subject] || []

  return (
    <div data-active-subject={subject}>
      {/* Feature 18: Cursor aura glow */}
      <div className="cursor-aura" ref={auraRef} />
      <Background />

      {/* Navbar */}
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <a className="nav-brand" href="/" onClick={(e) => { e.preventDefault(); window.location.reload() }} style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none" className="brand-logo-svg">
              <rect width="32" height="32" rx="8" fill="#4f46e5"/>
              <path d="M19 4L10 18h6l-3 10 9-14h-6l3-10z" fill="white"/>
            </svg>
            <span className="brand-text">SpeedSolve<span className="brand-ai">AI</span></span>
          </a>
          <div className="nav-center">
            <a href="https://github.com/Project-Requiem" target="_blank" rel="noopener noreferrer" className="nav-requiem-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Built by <strong>Project Requiem</strong></span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <a href="https://www.instagram.com/prjrequiem/" target="_blank" rel="noopener noreferrer" className="nav-ig-badge" title="Follow us on Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="5.2"/><circle cx="17.8" cy="6.3" r="1.1" fill="currentColor" stroke="none"/></svg>
            </a>
          </div>
          <div className="nav-actions">
            {/* Feature 5: Feedback button */}
            <button className="nav-feedback-btn" onClick={() => setShowFeedback(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Feedback</span>
            </button>
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
              <span className="icon-sun"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span>
              <span className="icon-moon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Feature 10: Formula Ticker (marquee) */}
      <div className="formula-ticker">
        <div className="ticker-track">
          {TICKER_FORMULAS.map((f, i) => (
            <span key={`a-${i}`} dangerouslySetInnerHTML={{
              __html: (() => { try { return katex.renderToString(f, { throwOnError: false }) } catch { return f } })()
            }} />
          ))}
          {TICKER_FORMULAS.map((f, i) => (
            <span key={`b-${i}`} dangerouslySetInnerHTML={{
              __html: (() => { try { return katex.renderToString(f, { throwOnError: false }) } catch { return f } })()
            }} />
          ))}
          {TICKER_FORMULAS.map((f, i) => (
            <span key={`c-${i}`} dangerouslySetInnerHTML={{
              __html: (() => { try { return katex.renderToString(f, { throwOnError: false }) } catch { return f } })()
            }} />
          ))}
        </div>
      </div>



      {/* Board Selector */}
      <div className="board-row fade-up visible">
        <div className="selector-group">
          <label className="sel-label">Board</label>
          <div className="sel-btns">
            {(['icse', 'cbse', 'state'] as Board[]).map(b => (
              <button key={b} className={`sel-btn${board === b ? ' active' : ''}`} onClick={() => setBoard(b)}>
                {b === 'icse' ? 'ICSE' : b === 'cbse' ? 'CBSE' : 'State Board'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Selector — with shift animation class */}
      <div className="subject-selector fade-up visible">
        <div className="selector-inner">
          <p className="selector-label">Choose subject</p>
          <div className="subject-cards">
            {([
              { key: 'mathematics' as Subject, icon: <>&sum;</>, desc: 'Algebra · Calculus · Geometry · Trig · Stats · Probability' },
              { key: 'physics' as Subject, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, desc: 'Kinematics · Forces · Energy · Waves · Electricity · Optics' },
              { key: 'chemistry' as Subject, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v4l-2 4v10h8V10l-2-4V2M6 12h12"/></svg>, desc: 'Stoichiometry · Moles · Gas Laws · pH · Equilibrium · Organic' },
            ]).map(s => (
              <button key={s.key} className={`subject-card${subject === s.key ? ' active' : ''}${subjectGlow === s.key ? ' glow-pulse' : ''}`} data-subject={s.key} onClick={() => handleSubjectChange(s.key)}>
                <div className="subj-icon">{s.icon}</div>
                <div className="subj-info">
                  <span className="subj-name">{SUBJECT_META[s.key].name}</span>
                  <span className="subj-desc">{s.desc}</span>
                </div>
                <div className="subj-check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              </button>
            ))}
          </div>
          {autoSwitched && (
            <div className="auto-switch-toast">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              <span>Auto-switched to <strong>{autoSwitched}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Main App */}
      <main className="app-container">
        <div className="app-layout">
          {/* Input Panel */}
          <section className={`panel panel-input fade-up${dragOver ? ' drag-over' : ''}`} onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }} onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }} onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const file = e.dataTransfer?.files?.[0]; if (file) handleFileUpload(file) }}>
            <div className="panel-header">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>{SUBJECT_META[subject].name}</span>
              </h2>
              <span className="panel-badge" style={{ background: SUBJECT_META[subject].gradient }}>
                {SUBJECT_META[subject].badge}
              </span>
            </div>
            <div className="panel-body">

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flex: 1, gap: '8px' }}>
                  <textarea
                    className="input-textarea"
                    rows={4}
                    placeholder='Type your problem here (e.g. "Solve 3x+5=14" or "Find pH of 0.01M HCl")...'
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {/* Action buttons column */}
                  <div className="input-actions-col">
                    {/* Upload button with popover */}
                    <div className="upload-btn-wrapper">
                      <button
                        className={`action-btn upload-trigger-btn${showUploadMenu ? ' active' : ''}`}
                        onClick={() => { setShowUploadMenu(!showUploadMenu) }}
                        disabled={loading || extracting}
                        title="Upload PDF or Image"
                        aria-label="Upload file"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </button>
                      {showUploadMenu && (
                        <div className="upload-popover" onClick={e => e.stopPropagation()}>
                          <button
                            className="upload-popover-item"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            Upload PDF
                          </button>
                          <button
                            className="upload-popover-item"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            Upload Image
                          </button>
                          <button
                            className="upload-popover-item"
                            onClick={() => cameraInputRef.current?.click()}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Take Photo
                          </button>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.heic,.heif"
                        onChange={onFileChange}
                        style={{ display: 'none' }}
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={onCameraChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                    {voiceSupported && (
                      <button
                        className={`action-btn voice-btn${isListening ? ' active' : ''}`}
                        onClick={toggleVoice}
                        title={isListening ? 'Stop listening' : 'Voice input'}
                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {extracting && extractPhase === 'extracting' && (
                <div className="file-preview-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-start)" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span className="file-preview-name" style={{ color: 'var(--accent-start)' }}>Extracting text from {uploadedFile?.name || 'file'}...</span>
                  </div>
                </div>
              )}
              {extracting && extractPhase === 'solving' && (
                <div className="file-preview-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-start)" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span className="file-preview-name" style={{ color: 'var(--accent-start)' }}>Solving extracted question...</span>
                  </div>
                </div>
              )}
              {/* Preview: extracted text + solve */}
              {extractPhase === 'preview' && !extracting && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="file-preview-bar" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="file-preview-name" style={{ color: '#22c55e' }}>Text extracted from {uploadedFile?.name || 'file'} — edit if needed, then solve</span>
                    </div>
                  </div>
                  {/* Multi-question picker */}
                  {extractedQuestions && extractedQuestions.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{extractedQuestions.length} questions found — click to select:</div>
                      {extractedQuestions.map((q, i) => (
                        <button key={i} onClick={() => pickQuestion(q)} style={{ textAlign: 'left', padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.4, transition: 'border-color 0.2s' }} onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent-start)')} onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                          <span style={{ color: 'var(--accent-start)', fontWeight: 700, marginRight: '8px' }}>Q{i + 1}.</span>{q.length > 120 ? q.slice(0, 120) + '...' : q}
                        </button>
                      ))}
                    </div>
                  )}
                  <button className="btn-solve" onClick={solveExtracted} disabled={!problem.trim()} style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    <span className="btn-text">Solve Extracted Question</span>
                    <span className="btn-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                  </button>
                </div>
              )}
              {uploadedFile && !extracting && extractPhase !== 'preview' && (
                <div className="file-preview-bar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="file-preview-name">{uploadedFile.name} ({formatFileSize(uploadedFile.size)})</span>
                </div>
              )}

              {/* Feature 4: Keyboard hints */}
              <div className="input-hint">
                <kbd>Enter</kbd> to solve &middot; <kbd>Upload</kbd> PDF/Image &middot; <kbd>Camera</kbd> to snap
              </div>

              {/* Feature 11: Sample problems */}
              {currentSamples.length > 0 && (
                <div className="input-group">
                  <label className="input-label">Try an example</label>
                  <div className="sample-pills">
                    {currentSamples.slice(0, 6).map((s, i) => (
                      <button key={i} className="pill" onClick={() => handleSampleClick(s.text)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="btn-row">
                <button
                  className="btn-solve pulse-glow"
                  onClick={solve}
                  disabled={loading || !problem.trim()}
                  style={loading ? { background: SUBJECT_META[subject].gradient, opacity: 0.6 } : { background: SUBJECT_META[subject].gradient }}
                >
                  <span className="btn-text">{loading ? 'Solving...' : 'Solve'}</span>
                  {!loading && <span className="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>}
                </button>
                <button className="btn-clear" onClick={clearAll} title="Clear input">Clear &times;</button>
              </div>
            </div>
          </section>

          {/* Output Panel */}
          <section className="panel panel-output fade-up stagger-2">
            <div className="panel-header">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Solution
              </h2>
              <div className="output-actions">
                {/* Feature 8: solveSource badge */}
                {solution && (
                  <span className={`solve-source-badge ${solveSource}`}>
                    {solveSource === 'local' ? '⚡ Instant' : '🤖 AI Powered'}
                  </span>
                )}
                {/* Feature 7: Try with AI — only after a local solve */}
                {solution && solveSource === 'local' && (
                  <button
                    className="try-ai-btn"
                    onClick={retryWithAI}
                    disabled={retryingAI}
                    title="Get AI-powered solution with detailed steps"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="12" cy="15" r="1.5"/></svg>
                    {retryingAI ? 'Solving with AI...' : 'Try with AI'}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )}
                {/* Feature 2: Copy answer button */}
                {solution && (
                  <button
                    className={`copy-btn${copied ? ' copied' : ''}`}
                    onClick={copyAnswer}
                    title="Copy answer"
                  >
                    {copied ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
                {solution && (
                  <button className="btn-icon-only" onClick={exportPDF} title="Download as PDF">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="panel-body output-body" ref={outputBodyRef}>
              {/* Empty State */}
              {!loading && !solution && !error && (
                <div className="output-empty">
                  <div className="empty-graphic">
                    <div className="orbit-container">
                      <svg className="orbit-svg" viewBox="0 0 120 120" fill="none">
                        <path d="M 65.2 30.5 A 30 30 0 0 1 89.9 57.4" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" className="arc-grad"><animateTransform attributeName="transform" type="rotate" from="10 60 60" to="370 60 60" dur="4s" repeatCount="indefinite"/></path>
                        <path d="M 89.1 84.4 A 38 38 0 0 1 30.9 84.4" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" className="arc-grad"><animateTransform attributeName="transform" type="rotate" from="490 60 60" to="130 60 60" dur="5.5s" repeatCount="indefinite"/></path>
                        <path d="M 20.2 83.0 A 46 46 0 0 1 60.0 14.0" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" className="arc-grad"><animateTransform attributeName="transform" type="rotate" from="240 60 60" to="600 60 60" dur="3.5s" repeatCount="indefinite"/></path>
                        <path d="M 25.3 18.6 A 54 54 0 0 1 94.7 18.6" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" className="arc-grad"><animateTransform attributeName="transform" type="rotate" from="680 60 60" to="320 60 60" dur="6s" repeatCount="indefinite"/></path>
                      </svg>
                      <div className="orbit-center">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                  </div>
                  <h3>Ready to Solve!</h3>
                  <p>Type a problem or choose an example to get started</p>
                </div>
              )}

              {/* Loading State — Feature 13: Different text for AI retry */}
              {loading && (
                <div className="output-loading">
                  <p className="loading-text">
                    {solveSource === 'ai' ? 'Getting AI solution...' : 'Solving your problem...'}
                  </p>
                  <div className="loading-progress">
                    <div className="loading-progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="solution-content" style={{ animation: 'fadeUp 0.4s ease' }}>
                  <div className="solution-section" style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--error)', fontWeight: 600, fontSize: '0.95rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      {error}
                    </div>
                  </div>
                </div>
              )}

              {/* Solution Content */}
              {solution && !loading && (
                <div className="solution-content" ref={solutionRef}>
                  {/* Final Answer — show ONLY the final computed result */}
                  <div className="solution-section final-answer-section fade-up visible">
                    <div className="section-label">Final Answer</div>
                    <div className={`final-answer-box${flashAnswer ? ' flash' : ''}`}>
                      <span dangerouslySetInnerHTML={{ __html: renderLatex(solution.finalAnswer || solution.finalFormula) }} />
                    </div>
                  </div>

                  {/* Graph / Diagram */}
                  {solution.graph && solution.graph.type && (
                    <div className="solution-section fade-up visible" style={{ animationDelay: '0.08s' }}>
                      <div className="section-label">Graph</div>
                      <SolutionGraph spec={solution.graph} theme={theme} />
                    </div>
                  )}
                  {solution.diagram && solution.diagram.svg && (
                    <div className="solution-section fade-up visible" style={{ animationDelay: '0.08s' }}>
                      <div className="section-label">Diagram</div>
                      <SolutionDiagram spec={solution.diagram} theme={theme} />
                    </div>
                  )}

                  {/* Steps */}
                  {solution.steps.length > 0 && (
                    <div className="solution-section fade-up visible" style={{ animationDelay: '0.1s' }}>
                      <div className="section-label">Step-by-Step Explanation</div>
                      <div className="steps-container reveal">
                        {solution.steps.map((step, i) => (
                          <div key={i} className="step-item" data-num={String(i + 1)}>
                            <div className="step-desc" dangerouslySetInnerHTML={{ __html: renderLatex(step.desc) }} />
                            {step.formula && (
                              <div className="step-formula">
                                {renderFormulaToHtml(step.formula)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternate Solution */}
                  {solution.altSteps && solution.altSteps.length > 0 && (
                    <div className="solution-section alternate-section fade-up visible" style={{ animationDelay: '0.2s' }}>
                      <div className="section-header-row">
                        <div className="section-label">Alternate Solution</div>
                        <button className={`btn-alt-toggle${showAlt ? ' open' : ''}`} onClick={() => setShowAlt(!showAlt)}>
                          <span>{showAlt ? 'Hide' : 'Show'}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                      {showAlt && (
                        <div className="alt-content">
                          <div className="steps-container reveal">
                            {solution.altSteps.map((step, i) => (
                              <div key={i} className="step-item" data-num={String(i + 1)}>
                                <div className="step-desc" dangerouslySetInnerHTML={{ __html: renderLatex(step.desc) }} />
                                {step.formula && (
                                  <div className="step-formula">{renderFormulaToHtml(step.formula)}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Similar Questions */}
                  {solution.similar && solution.similar.length > 0 && (
                    <div className="solution-section fade-up visible" style={{ animationDelay: '0.3s' }}>
                      <div className="section-label">Practice &mdash; Similar Questions</div>
                      <div className="similar-questions">
                        {solution.similar.map((q, i) => (
                          <div key={i} className="similar-item" onClick={() => { setProblem(q); }}>
                            <span className="similar-num">{i + 1}</span>
                            <span dangerouslySetInnerHTML={{ __html: renderLatex(q) }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Common Mistakes */}
                  {solution.mistakes && solution.mistakes.length > 0 && (
                    <div className="solution-section mistakes-section fade-up visible" style={{ animationDelay: '0.4s' }}>
                      <div className="section-label">Common Mistakes to Avoid</div>
                      <ul className="mistakes-list">
                        {solution.mistakes.map((m, i) => (
                          <li key={i}><span className="tip-icon" style={{ color: '#f59e0b' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> <span dangerouslySetInnerHTML={{ __html: renderLatex(m) }} /></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Exam Tips */}
                  {solution.examTips && solution.examTips.length > 0 && (
                    <div className="solution-section exam-tips-section fade-up visible" style={{ animationDelay: '0.5s' }}>
                      <div className="section-label">Exam Tips for {board === 'icse' ? 'ICSE' : board === 'cbse' ? 'CBSE' : 'State Board'}</div>
                      <div className="exam-tips-content">
                        {solution.examTips.map((tip, i) => (
                          <div key={i} className="exam-tip-item">
                            <span className="tip-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span> <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Not satisfied + Regenerate */}
                  <div className="solution-section not-satisfied-section fade-up visible" style={{ animationDelay: '0.55s' }}>
                    <div className="not-satisfied-row">
                      {solution && (
                        <button className="btn-not-satisfied" onClick={openNotSatisfied}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                          <span>Not satisfied?</span>
                        </button>
                      )}
                      <button className="btn-regenerate" onClick={smartRegenerate} disabled={retryingAI || loading}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={retryingAI ? { animation: 'spin 1s linear infinite' } : {}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        <span>{retryingAI ? 'Solving...' : 'Regenerate'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Feature 5: Feedback Modal */}
      {showFeedback && (
        <div
          className="feedback-overlay"
          ref={feedbackOverlayRef}
          onClick={(e) => { if (e.target === feedbackOverlayRef.current) setShowFeedback(false) }}
        >
          <div className="feedback-modal">
            <button className="fb-close" onClick={() => setShowFeedback(false)} aria-label="Close feedback">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {fbSubmitted ? (
              <div className="fb-success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <p>Thank you for your feedback!</p>
              </div>
            ) : (
              <>
                <h3>Send Feedback</h3>
                <div className="fb-auto-tag">{SUBJECT_META[subject].name} &middot; {board === 'icse' ? 'ICSE' : board === 'cbse' ? 'CBSE' : 'State Board'}</div>
                <div className="fb-row">
                  <div className="fb-field fb-field-half">
                    <label htmlFor="fb-name">Name *</label>
                    <input
                      id="fb-name"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCorrect="off"
                      placeholder="Your name"
                      value={fbName}
                      onChange={e => { setFbName(e.target.value); setFbError('') }}
                    />
                  </div>
                  <div className="fb-field fb-field-half">
                    <label htmlFor="fb-grade">Grade</label>
                    <select id="fb-grade" value={fbGrade} onChange={e => setFbGrade(e.target.value)}>
                      <option value="">Select grade</option>
                      {[6,7,8,9,10,11,12].map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
                    </select>
                  </div>
                </div>
                {fbError && <div className="fb-error">{fbError}</div>}
                <div className="fb-field">
                  <label htmlFor="fb-msg">Message</label>
                  <textarea
                    id="fb-msg"
                    placeholder="Tell us what you think about SpeedSolve AI..."
                    value={fbMsg}
                    onChange={e => setFbMsg(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="fb-field">
                  <label htmlFor="fb-contact">Phone / Email (optional)</label>
                  <input
                    id="fb-contact"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    placeholder="If you want us to get back to you"
                    value={fbContact}
                    onChange={e => { setFbContact(e.target.value); setFbError('') }}
                  />
                </div>
                <div className="fb-actions">
                  <button className="fb-btn-cancel" onClick={() => { setShowFeedback(false); setFbError('') }} disabled={fbSubmitting}>Cancel</button>
                  <button className="fb-btn-submit" onClick={submitFeedback} disabled={fbSubmitting}>{fbSubmitting ? 'Sending...' : 'Submit'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile: floating "View Answer" pill */}
      {solution && !solutionInView && !loading && (
        <button
          className="view-answer-fab"
          onClick={() => {
            const el = outputBodyRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const navH = window.innerWidth <= 768 ? 60 : 68
            window.scrollTo({ top: window.scrollY + rect.top - navH - 8, behavior: 'smooth' })
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>View Answer</span>
        </button>
      )}

      {/* Scroll to top */}
      <button className={`scroll-top-btn${showScrollTop ? ' visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
      </button>

      {/* Footer */}
      <footer className="footer fade-up visible">
        <p className="footer-tagline">By the Students, For the Students</p>
        <div className="footer-socials">
          <a
            className="footer-social-link"
            href="https://www.instagram.com/prjrequiem/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ig-gradient-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="5.2"/><circle cx="17.8" cy="6.3" r="1.1" fill="white" stroke="none"/></svg>
            </span>
            <span>@prjrequiem</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
          </a>
        </div>
        <p className="footer-copy">SpeedSolve AI &copy; 2026 &mdash; Built for students in Grades 6&ndash;12</p>
      </footer>
    </div>
  )
}