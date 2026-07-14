'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import katex from 'katex'

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
}

type Subject = 'mathematics' | 'physics' | 'chemistry'
type Board = 'icse' | 'cbse' | 'state'

const SUBJECTS: Subject[] = ['mathematics', 'physics', 'chemistry']

const SUBJECT_META: Record<Subject, { name: string; badge: string; gradient: string; color: string }> = {
  mathematics: { name: 'Mathematics', badge: 'Math', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#8b5cf6' },
  physics:     { name: 'Physics',     badge: 'Physics', gradient: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#f97316' },
  chemistry:   { name: 'Chemistry',   badge: 'Chemistry', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#10b981' },
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
function renderLatex(text: string): string {
  if (!text) return ''
  // Fix double-escaped backslashes from LLM JSON output
  text = text.replace(/\\\\/g, '\\')
  // Split by math delimiters, clean non-math parts separately, then render math
  // This prevents cleanBareLatex from corrupting KaTeX HTML output
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
      try {
        parts.push(katex.renderToString(displayTex.trim(), { displayMode: true, throwOnError: false }))
      } catch { parts.push(match[0]) }
    } else if (inlineTex) {
      try {
        parts.push(katex.renderToString(inlineTex.trim(), { displayMode: false, throwOnError: false }))
      } catch { parts.push(match[0]) }
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
  if (!out.includes('$') && !/\\(frac|text|left|right|times|div|sqrt|sum|int|pi|alpha|beta|theta|gamma|delta|lambda|mu|sigma|omega|infty|partial|cdot|quad|mathrm|mathbf|angle|sin|cos|tan|log|ln|neq|leq|geq|approx|Rightarrow|hat|vec|dot|bar|tilde)/.test(out)) return ''
  return out
}

function renderFormulaToHtml(formula: string): React.ReactNode {
  if (!formula) return null
  // Pre-clean \text{} and \mathrm{} so KaTeX doesn't choke
  let cleaned = formula
    .replace(/\\text\{([^}]*)\}/g, ' $1 ')
    .replace(/\\mathrm\{([^}]*)\}/g, ' $1 ')
  const normalized = normalizeLatex(cleaned)
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
function Background() {
  return (
    <div className="bg-wrap">
      <div className="bg-shape shape-hex" style={{ '--x':'18%','--y':'20%','--s':'120px','--c':'var(--accent-start)','--r':'0deg','--d':'0s' } as React.CSSProperties} />
      <div className="bg-shape shape-diamond" style={{ '--x':'78%','--y':'28%','--s':'90px','--c':'var(--accent-end)','--r':'15deg','--d':'-6s' } as React.CSSProperties} />
      <div className="bg-shape shape-ring" style={{ '--x':'55%','--y':'70%','--s':'130px','--c':'var(--text-muted)','--r':'45deg','--d':'-14s' } as React.CSSProperties} />
      <div className="bg-shape shape-tri" style={{ '--x':'85%','--y':'78%','--s':'80px','--c':'var(--accent-start)','--r':'30deg','--d':'-9s' } as React.CSSProperties} />
      <div className="bg-shape shape-diamond" style={{ '--x':'10%','--y':'65%','--s':'60px','--c':'var(--accent-end)','--r':'-20deg','--d':'-18s' } as React.CSSProperties} />
      <div className="bg-shape shape-hex" style={{ '--x':'40%','--y':'88%','--s':'70px','--c':'var(--text-muted)','--r':'10deg','--d':'-3s' } as React.CSSProperties} />
      <div className="bg-grid"></div>
      {[
        {px:'8%',py:'12%',sz:'3px',sp:'22s',d:'-0s'},
        {px:'92%',py:'20%',sz:'4px',sp:'19s',d:'-3s'},
        {px:'15%',py:'85%',sz:'2px',sp:'25s',d:'-7s'},
        {px:'75%',py:'80%',sz:'5px',sp:'20s',d:'-11s'},
        {px:'45%',py:'5%',sz:'3px',sp:'28s',d:'-2s'},
        {px:'60%',py:'45%',sz:'4px',sp:'18s',d:'-5s'},
        {px:'30%',py:'55%',sz:'2px',sp:'24s',d:'-9s'},
        {px:'88%',py:'92%',sz:'3px',sp:'21s',d:'-13s'},
        {px:'5%',py:'40%',sz:'4px',sp:'26s',d:'-1s'},
        {px:'50%',py:'50%',sz:'2px',sp:'30s',d:'-15s'},
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
  const [showAlt, setShowAlt] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [flashAnswer, setFlashAnswer] = useState(false)
  const [solveSource, setSolveSource] = useState<'local' | 'ai'>('local')
  const [autoSwitched, setAutoSwitched] = useState<string | null>(null)

  // ── Feature 1: Voice Typing ──
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // ── File Upload: Image / PDF / Camera ──
  const [extracting, setExtracting] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment')
  const [showEditor, setShowEditor] = useState(false)
  const [editorImage, setEditorImage] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'crop' | 'ink'>('crop')
  const [inkColor, setInkColor] = useState('#ef4444')
  const [isDrawing, setIsDrawing] = useState(false)
  const [cropArea, setCropArea] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null)
  const uploadMenuRef = useRef<HTMLDivElement>(null)
  const editorCanvasRef = useRef<HTMLCanvasElement>(null)
  const inkCanvasRef = useRef<HTMLCanvasElement>(null)

  // ── Feature 2: Copy Answer ──
  const [copied, setCopied] = useState(false)

  // ── Feature 5: Feedback Modal ──
  const [showFeedback, setShowFeedback] = useState(false)
  const [fbName, setFbName] = useState('')
  const [fbMsg, setFbMsg] = useState('')
  const [fbGrade, setFbGrade] = useState('')
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

  // ── Feature 7: Retry with AI ──
  const [retryingAI, setRetryingAI] = useState(false)

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const solutionRef = useRef<HTMLDivElement>(null)
  const outputBodyRef = useRef<HTMLDivElement>(null)
  const feedbackOverlayRef = useRef<HTMLDivElement>(null)
  const auraRef = useRef<HTMLDivElement>(null)

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

    // Animate progress bar (only meaningful for AI solves)
    let p = 0
    progressRef.current = setInterval(() => {
      p += Math.random() * 15
      if (p > 90) p = 90
      setProgress(p)
    }, 300)

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: trimmed, subject: activeSubject, board }),
      })
      const data = await res.json()
      clearInterval(progressRef.current!)
      if (data.error) {
        setError(data.error)
        setLoading(false)
      } else if (data.data) {
        setSolution(data.data)
        setSolveSource(data.source === 'ai' ? 'ai' : 'local')
        setProgress(100)
        // Small delay so loading → solution transition is smooth
        setTimeout(() => {
          setLoading(false)
          // Flash animation
          setTimeout(() => setFlashAnswer(true), 50)
          setTimeout(() => setFlashAnswer(false), 800)
          // Reveal steps animation
          setTimeout(() => {
            document.querySelectorAll('.steps-container.reveal').forEach(el => {
              el.classList.remove('reveal')
              void el.offsetWidth
              el.classList.add('reveal')
            })
          }, 100)
          // Scroll to solution on mobile
          if (window.innerWidth <= 1024) {
            setTimeout(() => {
              outputBodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 300)
          }
        }, 150)
      }
    } catch {
      clearInterval(progressRef.current!)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }, [problem, subject, board])

  // ── Feature 7: Retry with AI ──
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
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: trimmed, subject, board, forceAI: true }),
      })
      const data = await res.json()
      clearInterval(progressRef.current!)
      if (data.error) {
        setError(data.error)
        setLoading(false)
        setRetryingAI(false)
      } else if (data.data) {
        setSolution(data.data)
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
              outputBodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 300)
          }
        }, 150)
      }
    } catch {
      clearInterval(progressRef.current!)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
      setRetryingAI(false)
    }
  }, [problem, subject, board])

  // ── Feature 2: Copy answer ──
  const copyAnswer = useCallback(() => {
    if (!solution) return
    const lines: string[] = []

    // Problem
    lines.push(`Problem: ${cleanBareLatex(problem)}`)
    lines.push('')

    // Final Answer
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
  const submitFeedback = useCallback(async () => {
    if (!fbName.trim()) {
      setFbError('Please enter your name.')
      return
    }
    setFbError('')
    try {
      // Fetch user's real IPv4 from a public service
      let clientIp = ''
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
        if (ipRes.ok) { const d = await ipRes.json(); clientIp = d.ip || '' }
      } catch { /* fallback to server-side detection */ }

      const res = await fetch('/api/v1/srv/x8kq2m9p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fbName.trim(), message: fbMsg.trim(), subject, board, grade: fbGrade, clientIp }),
      })
      if (res.ok) {
        setFbSubmitted(true)
        setTimeout(() => {
          setShowFeedback(false)
          setFbSubmitted(false)
          setFbName('')
          setFbMsg('')
        }, 1500)
      }
    } catch {
      setFbError('Failed to submit. Please try again.')
    }
  }, [fbName, fbMsg, subject, board, fbGrade])

  const clearAll = () => {
    setProblem('')
    setSolution(null)
    setError('')
    setShowAlt(false)
    setCopied(false)
  }

  const exportPDF = async () => {
    if (!solutionRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      const canvas = await html2canvas(solutionRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      let heightLeft = pdfHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pdf.internal.pageSize.getHeight()
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
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

  // ── Close upload menu on outside click (pointerup so item clicks fire first) ──
  useEffect(() => {
    if (!showUploadMenu) return
    const handler = (e: PointerEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false)
      }
    }
    document.addEventListener('pointerup', handler)
    return () => document.removeEventListener('pointerup', handler)
  }, [showUploadMenu])

  // ── File Upload Handlers ──
  const extractFromFile = useCallback(async (file: File, type: 'image' | 'pdf' | 'camera') => {
    setExtracting(true)
    setFileName(file.name || (type === 'camera' ? 'camera-capture.jpg' : 'file'))
    if (type !== 'pdf') {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
    } else {
      setFilePreview(null)
    }
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.text) {
        setProblem(prev => prev ? prev + '\n' + data.text : data.text)
        // Clear preview after successful extraction
        setTimeout(() => { setFilePreview(null); setFileName(null) }, 2000)
      }
    } catch {
      setError('Failed to process file. Please try again.')
    } finally {
      setExtracting(false)
    }
  }, [])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    extractFromFile(file, 'image')
    e.target.value = ''
  }, [extractFromFile])

  const handlePDFUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.')
      return
    }
    extractFromFile(file, 'pdf')
    e.target.value = ''
  }, [extractFromFile])

  const openCamera = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // Fallback to file picker on unsupported browsers
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment'
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0]
        if (file) {
          const url = URL.createObjectURL(file)
          setEditorImage(url)
          setShowEditor(true)
        }
      }
      input.click()
      return
    }
    // Check HTTPS (required for camera on mobile)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setError('Camera requires HTTPS. Please use a secure connection.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      setCameraStream(stream)
      setShowCamera(true)
      setTimeout(() => { cameraVideoRef.current?.play() }, 200)
    } catch (err: any) {
      // On mobile, if environment fails try user (front) camera
      if (cameraFacing === 'environment') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }
          })
          setCameraFacing('user')
          setCameraStream(stream)
          setShowCamera(true)
          setTimeout(() => { cameraVideoRef.current?.play() }, 200)
        } catch {
          setError('Camera access denied. Please allow camera permission and try again.')
        }
      } else {
        setError('Camera access denied. Please allow camera permission in your browser settings.')
      }
    }
  }, [cameraFacing])

  const flipCamera = useCallback(async () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment'
    cameraStream?.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      setCameraFacing(newFacing)
      setCameraStream(stream)
      setTimeout(() => { cameraVideoRef.current?.play() }, 200)
    } catch {
      // Stay on current camera
    }
  }, [cameraFacing, cameraStream])

  const captureCamera = useCallback(() => {
    const video = cameraVideoRef.current
    const canvas = cameraCanvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    closeCamera()
    setEditorImage(dataUrl)
    setShowEditor(true)
  }, [cameraStream])

  const closeCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setShowCamera(false)
  }, [cameraStream])

  // ── Image Editor (Crop + Ink) ──
  const [editorImgSize, setEditorImgSize] = useState({ w: 0, h: 0 })
  const editorScaleRef = useRef(1)

  const initEditorCanvas = useCallback((imgSrc: string) => {
    const img = new Image()
    img.onload = () => {
      const canvas = editorCanvasRef.current
      if (!canvas) return
      const container = canvas.parentElement
      if (!container) return
      const maxW = container.clientWidth - 16
      const maxH = window.innerHeight * 0.55
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)
      editorScaleRef.current = scale
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      setEditorImgSize({ w: img.width, h: img.height })
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Also init ink canvas on top
      const ink = inkCanvasRef.current
      if (ink) {
        ink.width = canvas.width
        ink.height = canvas.height
      }
    }
    img.src = imgSrc
  }, [])

  useEffect(() => {
    if (showEditor && editorImage) initEditorCanvas(editorImage)
  }, [showEditor, editorImage, initEditorCanvas])

  // Crop drag handling
  const getEditorPos = useCallback((e: React.PointerEvent) => {
    const canvas = editorCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleEditorPointerDown = useCallback((e: React.PointerEvent) => {
    if (editorMode === 'crop') {
      const pos = getEditorPos(e)
      setCropStart(pos)
      setCropArea({ x: pos.x, y: pos.y, w: 0, h: 0 })
      setIsDrawing(true)
    } else {
      setIsDrawing(true)
      const ink = inkCanvasRef.current
      if (!ink) return
      const ctx = ink.getContext('2d')
      if (!ctx) return
      const pos = getEditorPos(e)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.strokeStyle = inkColor
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [editorMode, getEditorPos, inkColor])

  const handleEditorPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return
    if (editorMode === 'crop' && cropStart) {
      const pos = getEditorPos(e)
      setCropArea({
        x: Math.min(cropStart.x, pos.x),
        y: Math.min(cropStart.y, pos.y),
        w: Math.abs(pos.x - cropStart.x),
        h: Math.abs(pos.y - cropStart.y)
      })
    } else if (editorMode === 'ink') {
      const ink = inkCanvasRef.current
      if (!ink) return
      const ctx = ink.getContext('2d')
      if (!ctx) return
      const pos = getEditorPos(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }, [isDrawing, editorMode, cropStart, getEditorPos])

  const handleEditorPointerUp = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const applyCrop = useCallback(() => {
    const canvas = editorCanvasRef.current
    if (!canvas || !cropArea || !editorImage) return
    const scale = editorScaleRef.current
    const sx = cropArea.x / scale
    const sy = cropArea.y / scale
    const sw = cropArea.w / scale
    const sh = cropArea.h / scale
    if (sw < 20 || sh < 20) return // too small
    const img = new Image()
    img.onload = () => {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = sw
      tempCanvas.height = sh
      const ctx = tempCanvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.92)
      setEditorImage(dataUrl)
      setCropArea(null)
      setCropStart(null)
      // Redraw
      canvas.width = sw * scale
      canvas.height = sh * scale
      const displayCtx = canvas.getContext('2d')
      if (displayCtx) displayCtx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      const ink = inkCanvasRef.current
      if (ink) { ink.width = canvas.width; ink.height = canvas.height }
    }
    img.src = editorImage
  }, [cropArea, editorImage])

  const clearInk = useCallback(() => {
    const ink = inkCanvasRef.current
    if (!ink) return
    const ctx = ink.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, ink.width, ink.height)
  }, [])

  const editorDone = useCallback(() => {
    // Composite editor + ink into final image
    const canvas = editorCanvasRef.current
    const ink = inkCanvasRef.current
    if (!canvas) return
    const finalCanvas = document.createElement('canvas')
    const scale = editorScaleRef.current
    const w = canvas.width / scale
    const h = canvas.height / scale
    finalCanvas.width = w
    finalCanvas.height = h
    const ctx = finalCanvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(canvas, 0, 0, w, h)
    if (ink) ctx.drawImage(ink, 0, 0, w, h)
    finalCanvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'edited-capture.jpg', { type: 'image/jpeg' })
      setShowEditor(false)
      setEditorImage(null)
      setCropArea(null)
      setCropStart(null)
      extractFromFile(file, 'camera')
    }, 'image/jpeg', 0.92)
  }, [extractFromFile])

  const closeEditor = useCallback(() => {
    setShowEditor(false)
    setEditorImage(null)
    setCropArea(null)
    setCropStart(null)
    setIsDrawing(false)
  }, [])

  const clearFilePreview = useCallback(() => {
    setFilePreview(null)
    setFileName(null)
  }, [])

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
            <span key={i} dangerouslySetInnerHTML={{
              __html: (() => { try { return katex.renderToString(f, { throwOnError: false }) } catch { return f } })()
            }} />
          ))}
          {TICKER_FORMULAS.map((f, i) => (
            <span key={`dup-${i}`} dangerouslySetInnerHTML={{
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
              { key: 'chemistry' as Subject, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v4l-2 4v10h8V10l-2-4V2M6 12h12"/></svg>, desc: 'Stoichiometry · Moles · Gas Laws · pH · Equilibrium · Reactions' },
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
          <section className="panel panel-input fade-up">
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
              {/* Hidden file inputs */}
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden-input" />
              <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handlePDFUpload} className="hidden-input" />
              <canvas ref={cameraCanvasRef} className="hidden-input" />

              {/* Camera modal */}
              {showCamera && (
                <div className="camera-modal" onClick={closeCamera}>
                  <div className="camera-modal-inner" onClick={e => e.stopPropagation()}>
                    <div className="camera-header">
                      <span>Point camera at the problem</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="camera-flip-btn" onClick={flipCamera} title="Flip camera">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        </button>
                        <button className="camera-close" onClick={closeCamera}>&times;</button>
                      </div>
                    </div>
                    <video ref={cameraVideoRef} autoPlay playsInline muted className="camera-video" />
                    <div className="camera-actions">
                      <button className="camera-capture-btn" onClick={captureCamera}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Editor Modal (Crop + Ink) */}
              {showEditor && editorImage && (
                <div className="editor-modal" onClick={closeEditor}>
                  <div className="editor-modal-inner" onClick={e => e.stopPropagation()}>
                    <div className="editor-header">
                      <span>Edit image</span>
                      <button className="camera-close" onClick={closeEditor}>&times;</button>
                    </div>
                    <div className="editor-canvas-wrap">
                      <canvas ref={editorCanvasRef} className="editor-canvas" />
                      <canvas
                        ref={inkCanvasRef}
                        className="editor-ink-canvas"
                        style={{ display: editorMode === 'ink' ? 'block' : 'none' }}
                        onPointerDown={handleEditorPointerDown}
                        onPointerMove={handleEditorPointerMove}
                        onPointerUp={handleEditorPointerUp}
                        onPointerLeave={handleEditorPointerUp}
                      />
                      {editorMode === 'crop' && cropArea && cropArea.w > 5 && cropArea.h > 5 && (
                        <div
                          className="editor-crop-overlay"
                          style={{
                            left: cropArea.x, top: cropArea.y,
                            width: cropArea.w, height: cropArea.h
                          }}
                        />
                      )}
                      {editorMode === 'crop' && isDrawing && cropStart && (
                        <div
                          className="editor-crop-overlay"
                          style={{
                            left: cropArea.x, top: cropArea.y,
                            width: cropArea.w, height: cropArea.h
                          }}
                        />
                      )}
                    </div>
                    <div className="editor-toolbar">
                      <div className="editor-mode-btns">
                        <button
                          className={`editor-mode-btn${editorMode === 'crop' ? ' active' : ''}`}
                          onClick={() => { setEditorMode('crop'); setCropArea(null); setCropStart(null) }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H4"/></svg>
                          Crop
                        </button>
                        <button
                          className={`editor-mode-btn${editorMode === 'ink' ? ' active' : ''}`}
                          onClick={() => setEditorMode('ink')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          Mark
                        </button>
                      </div>
                      {editorMode === 'ink' && (
                        <div className="editor-ink-colors">
                          {['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#ffffff'].map(c => (
                            <button
                              key={c}
                              className={`editor-color-dot${inkColor === c ? ' active' : ''}`}
                              style={{ background: c, border: c === '#ffffff' ? '1px solid #555' : 'none' }}
                              onClick={() => setInkColor(c)}
                            />
                          ))}
                          <button className="editor-mode-btn" onClick={clearInk} style={{ marginLeft: '4px', padding: '4px 8px', fontSize: '0.7rem' }}>Clear</button>
                        </div>
                      )}
                      <div className="editor-action-btns">
                        {editorMode === 'crop' && cropArea && cropArea.w > 20 && cropArea.h > 20 && (
                          <button className="editor-apply-btn" onClick={applyCrop}>Apply Crop</button>
                        )}
                        <button className="editor-done-btn" onClick={editorDone}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Use this
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="input-group" style={{ display: 'flex', alignItems: 'stretch', gap: '10px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    className="input-textarea"
                    rows={4}
                    placeholder='Type your problem here (e.g. "Solve 3x+5=14" or "Find pH of 0.01M HCl")...'
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {/* File preview bar */}
                  {(filePreview || (extracting && fileName)) && (
                    <div className="file-preview-bar">
                      {filePreview && <img src={filePreview} alt="preview" className="file-preview-img" />}
                      <div className="file-preview-info">
                        <span className="file-preview-name">{extracting ? 'Extracting text...' : fileName}</span>
                        {extracting && <div className="extract-progress"><div className="extract-progress-bar" /></div>}
                      </div>
                      {!extracting && (
                        <button className="file-preview-remove" onClick={clearFilePreview} title="Remove">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Action buttons column */}
                <div className="input-actions-col">
                  <div className="upload-btn-wrapper" ref={uploadMenuRef}>
                    <button
                      className="action-btn upload-trigger-btn"
                      onClick={() => setShowUploadMenu(v => !v)}
                      title="Upload file"
                      disabled={extracting}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                      </svg>
                    </button>
                    {showUploadMenu && (
                      <div className="upload-popover">
                        <button
                          className="upload-popover-item"
                          onClick={() => { setShowUploadMenu(false); imageInputRef.current?.click() }}
                          disabled={extracting}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                          <span>Image</span>
                        </button>
                        <button
                          className="upload-popover-item"
                          onClick={() => { setShowUploadMenu(false); pdfInputRef.current?.click() }}
                          disabled={extracting}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                          <span>PDF</span>
                        </button>
                        <button
                          className="upload-popover-item"
                          onClick={() => { setShowUploadMenu(false); openCamera() }}
                          disabled={extracting}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          <span>Camera</span>
                        </button>
                      </div>
                    )}
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

              {/* Feature 4: Keyboard hints */}
              <div className="input-hint">
                <kbd>Enter</kbd> to solve · Upload an <strong>image</strong>, <strong>PDF</strong>, or take a <strong>photo</strong> to scan problems
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
                    {solveSource === 'local' ? 'Instant' : 'AI Powered'}
                  </span>
                )}
                {/* Feature 7: Try with AI — only after a local solve */}
                {solution && solveSource === 'local' && (
                  <button
                    className="try-ai-btn"
                    onClick={retryWithAI}
                    disabled={loading}
                  >
                    <span className="try-ai-label">Try with AI</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
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
                    {retryingAI ? 'Getting AI-powered solution...' : 'Solving your problem...'}
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
                  {/* Final Answer */}
                  <div className="solution-section final-answer-section fade-up visible">
                    <div className="section-label">Final Answer</div>
                    <div className={`final-answer-box${flashAnswer ? ' flash' : ''}`}>
                      {solution.finalFormula ? renderFormulaToHtml(solution.finalFormula) : solution.finalAnswer}
                    </div>
                  </div>

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
                      placeholder="Your name"
                      value={fbName}
                      onChange={e => { setFbName(e.target.value); setFbError('') }}
                    />
                    {fbError && <div className="fb-error">{fbError}</div>}
                  </div>
                  <div className="fb-field fb-field-half">
                    <label htmlFor="fb-grade">Grade</label>
                    <select id="fb-grade" value={fbGrade} onChange={e => setFbGrade(e.target.value)}>
                      <option value="">Select grade</option>
                      {[6,7,8,9,10,11,12].map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
                    </select>
                  </div>
                </div>
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
                <div className="fb-actions">
                  <button className="fb-btn-cancel" onClick={() => { setShowFeedback(false); setFbError('') }}>Cancel</button>
                  <button className="fb-btn-submit" onClick={submitFeedback}>Submit</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Scroll to top */}
      <button className={`scroll-top-btn${showScrollTop ? ' visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
      </button>

      {/* Footer */}
      <footer className="footer fade-up visible">
        <p>SpeedSolve AI &copy; 2026 &mdash; Built for students in Grades 6&ndash;12</p>
      </footer>
    </div>
  )
}