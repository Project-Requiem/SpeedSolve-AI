// ═══════════════════════════════════════════════════════════════════════════════
// SpeedSolve AI - JEE Advanced / Mains / KCET Local Solver
// Covers: Advanced Calculus, Algebra, Coordinate Geometry, Trigonometry,
//          Probability, JEE-level Physics & Chemistry
// ═══════════════════════════════════════════════════════════════════════════════

export interface LocalSolution {
  finalAnswer: string;
  finalFormula: string;
  steps: { desc: string; formula: string }[];
  altSteps: { desc: string; formula: string }[];
  similar: string[];
  mistakes: string[];
  examTips?: string[];
}

interface PatternRule {
  regex: RegExp;
  solver: (m: RegExpMatchArray, fullText?: string) => LocalSolution | null;
  useFullText?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, d = 4): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(d)).toString();
}
function fact(n: number): number {
  if (n < 0 || n > 170) return NaN; if (n <= 1) return 1;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}
function N(t: string): number[] { return (t.match(/-?\d+\.?\d*/g) || []).map(Number); }
function pN(t: string): number[] { return (t.match(/\d+\.?\d*/g) || []).map(Number); }
function gcf(a: number, b: number): number { a=Math.abs(a); b=Math.abs(b); while(b){[a,b]=[b,a%b];} return a; }
function lcm(a:number,b:number):number{return Math.abs(a*b)/gcf(a,b);}
function comb(n:number,r:number):number{
  if(r<0||r>n)return 0;if(r===0||r===n)return 1;
  let r2=Math.min(r,n-r),res=1;
  for(let i=0;i<r2;i++)res=res*(n-i)/(i+1);return Math.round(res);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CALCULUS — LIMITS (JEE Level)
// ═══════════════════════════════════════════════════════════════════════════════

// 1a. lim x→a (x^n - a^n)/(x - a) = n·a^(n-1)
function solveLimitPowerDiff(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = N(t);
  // Match pattern: x^n - a^n over x - a
  const pMatch = t.match(/\(([xX])\s*\^\s*(\d+)\s*([-+])\s*([\d.]+)\s*\^\s*(\d+)\)\s*\/\s*\(\1\s*([-+])\s*\4\)/);
  if (pMatch) {
    const n = parseInt(pMatch[2]), base = parseFloat(pMatch[4]);
    const result = n * Math.pow(base, n - 1);
    return {
      finalAnswer: fmt(result),
      finalFormula: `\\lim_{x \\to ${fmt(base)}} \\frac{x^{${n}} - ${fmt(base)}^{${n}}}{x - ${fmt(base)}} = ${fmt(result)}`,
      steps: [
        { desc: `Standard limit: \\lim_{x \\to a} \\frac{x^n - a^n}{x-a} = na^{n-1}`, formula: `\\frac{x^{${n}} - ${fmt(base)}^{${n}}}{x - ${fmt(base)}} \\xrightarrow{x \\to ${fmt(base)}} ${n} \\times ${fmt(base)}^{${n-1}}` },
        { desc: `Substituting n=${n}, a=${fmt(base)}`, formula: `= ${n} \\times ${fmt(Math.pow(base, n-1))} = ${fmt(result)}` },
      ],
      altSteps: [{ desc: "Apply L'Hôpital's Rule: \\lim f/g = \\lim f'/g'", formula: `= \\lim_{x \\to ${fmt(base)}} \\frac{${n}x^{${n-1}}}{1} = ${fmt(result)}` }],
      similar: [`Find \\lim_{x \\to 1} \\frac{x^5-1}{x-1}`, `Evaluate \\lim_{x \\to 2} \\frac{x^3-8}{x-2}`],
      mistakes: ['Confusing \\frac{x^n-a^n}{x-a} with \\frac{x^n-a^n}{x+a}'],
      examTips: ['JEE: Memorize \\frac{x^n-a^n}{x-a} = na^{n-1} and \\frac{x^n+a^n}{x+a} for odd n.'],
    };
  }
  return null;
}

// 1b. Standard trig limits: sin(x)/x, tan(x)/x, (1-cos x)/x²
function solveLimitTrigStd(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const hasLimit0 = t.includes('0') && (t.includes('limit') || t.includes('lim') || t.includes('→') || t.includes('->'));
  if (!hasLimit0) return null;

  // sin(x)/x
  if (t.includes('sin') && /\bsin\b.*?\/\s*[xX]\b|sin.*?x.*?\/.*?x/.test(t)) {
    const nums = pN(t);
    let coeff = 1;
    const sinCoeffMatch = t.match(/sin\s*\(?\s*(\d+)\s*[xX]/);
    if (sinCoeffMatch) coeff = parseInt(sinCoeffMatch[1]);
    const denCoeffMatch = t.match(/\/\s*(\d+)\s*[xX]/);
    const denCoeff = denCoeffMatch ? parseInt(denCoeffMatch[1]) : 1;
    const result = coeff / denCoeff;
    return {
      finalAnswer: fmt(result),
      finalFormula: `\\lim_{x \\to 0} \\frac{\\sin(${coeff===1?'':coeff}x)}{${denCoeff===1?'':denCoeff}x} = ${fmt(result)}`,
      steps: [
        { desc: 'Use standard limit: \\lim(x→0) sin(x)/x = 1', formula: `\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1` },
        { desc: coeff!==1||denCoeff!==1 ? `Adjust for coefficients` : 'Direct application', formula: coeff!==denCoeff ? `= \\frac{${coeff}}{${denCoeff}} = ${fmt(result)}` : `= 1` },
      ],
      altSteps: [{ desc: 'Series: sin x = x - x³/3! + ... ⟹ sin(x)/x = 1 - x²/6 + ... → 1', formula: '' }],
      similar: ['Find \\lim_{x \\to 0} \\frac{\\tan x}{x}', 'Find \\lim_{x \\to 0} \\frac{\\sin 3x}{2x}', 'Find \\lim_{x \\to 0} \\frac{1-\\cos x}{x^2}'],
      mistakes: ['This limit works ONLY as x→0, not for any other limit point'],
      examTips: ['JEE Advanced: Know all three standard trig limits — sin(x)/x, tan(x)/x, (1-cos x)/x² = 1/2.'],
    };
  }

  // tan(x)/x
  if (t.includes('tan') && /\btan\b.*?\/\s*[xX]\b|tan.*?x.*?\/.*?x/.test(t)) {
    const coeffMatch = t.match(/tan\s*\(?\s*(\d+)\s*[xX]/);
    const coeff = coeffMatch ? parseInt(coeffMatch[1]) : 1;
    const denMatch = t.match(/\/\s*(\d+)\s*[xX]/);
    const denCoeff = denMatch ? parseInt(denMatch[1]) : 1;
    const result = coeff / denCoeff;
    return {
      finalAnswer: fmt(result),
      finalFormula: `\\lim_{x \\to 0} \\frac{\\tan x}{x} = ${fmt(result)}`,
      steps: [
        { desc: 'Rewrite: tan(x)/x = sin(x)/(x·cos x) = (sin x/x)·(1/cos x)', formula: `= 1 \\times \\frac{1}{1} = 1` },
        { desc: coeff!==1||denCoeff!==1 ? `With coefficients: ${coeff}/${denCoeff}` : '', formula: coeff!==denCoeff ? `= ${fmt(result)}` : '= 1' },
      ],
      altSteps: [],
      similar: ['Find \\lim_{x \\to 0} \\frac{\\sin 2x}{\\tan 3x}'],
      mistakes: ['Some students write tan(x)/x = cos(x)/sin(x) — this is wrong (it is the reciprocal)'],
      examTips: [],
    };
  }

  // (1 - cos x)/x² = 1/2
  if (t.includes('cos') && /x\s*\^?\s*2|x²/.test(t) && (t.includes('1') || t.includes('−'))) {
    const coeffMatch = t.match(/cos\s*\(?\s*(\d+)\s*[xX]/);
    const coeff = coeffMatch ? parseInt(coeffMatch[1]) : 1;
    const result = coeff * coeff / 2;
    return {
      finalAnswer: fmt(result),
      finalFormula: `\\lim_{x \\to 0} \\frac{1-\\cos ${coeff===1?'x':coeff+'x'}}{${coeff===1?'x^2':coeff+'^2 x^2'}} = ${fmt(result)}`,
      steps: [
        { desc: 'Multiply by (1+cos x)/(1+cos x)', formula: `= \\lim \\frac{\\sin^2 x}{x^2(1+\\cos x)} = \\lim (\\frac{\\sin x}{x})^2 \\cdot \\frac{1}{1+\\cos x}` },
        { desc: 'Evaluate', formula: `= 1^2 \\times \\frac{1}{2} = \\frac{1}{2}` },
      ],
      altSteps: [{ desc: 'Series: 1-cos x = x²/2! - x⁴/4! + ...', formula: `\\frac{1-\\cos x}{x^2} = \\frac{1}{2} - \\frac{x^2}{24} + ... \\to \\frac{1}{2}` }],
      similar: ['Find \\lim_{x \\to 0} \\frac{1-\\cos 2x}{x^2}'],
      mistakes: ['Writing (1-cos x)/x = sin(x)/x — the correct denominator is x², not x'],
      examTips: [],
    };
  }

  return null;
}

// 1c. L'Hôpital-based limits: e^x-1/x, ln(1+x)/x
function solveLimitLHopital(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]);
  const hasLimit = t.includes('limit') || t.includes('lim') || t.includes('→') || t.includes('->');
  if (!hasLimit) return null;
  const tl = t.toLowerCase();

  // e^x - 1 / x at x→0
  if (tl.match(/e\s*\^?\s*[xX].*?[-+]?\s*1.*?\/\s*[xX]/) || tl.match(/e\s*\^?\s*[xX]\s*[-+]?\s*1.*?\/.*?x/)) {
    return {
      finalAnswer: '1',
      finalFormula: `\\lim_{x \\to 0} \\frac{e^x - 1}{x} = 1`,
      steps: [
        { desc: 'Direct substitution gives 0/0 (indeterminate)', formula: `\\frac{e^0-1}{0} = \\frac{0}{0}` },
        { desc: "Apply L'Hôpital's Rule", formula: `= \\lim_{x \\to 0} \\frac{e^x}{1} = e^0 = 1` },
      ],
      altSteps: [{ desc: 'Series: e^x = 1+x+x²/2!+...', formula: `\\frac{e^x-1}{x} = 1+x/2+... \\to 1` }],
      similar: ['Find \\lim_{x \\to 0} \\frac{e^{2x}-1}{x}', 'Find \\lim_{x \\to 0} \\frac{\\ln(1+x)}{x}'],
      mistakes: ["Applying L'Hôpital's when the form is NOT 0/0 or ∞/∞"],
      examTips: ["JEE: This is a fundamental limit used to derive the derivative of e^x."],
    };
  }

  // ln(1+x)/x at x→0
  if (tl.match(/ln\s*\(?\s*1\s*[+*]\s*[xX]/) || tl.match(/log\s*\(?\s*1\s*[+*]\s*[xX]/)) {
    return {
      finalAnswer: '1',
      finalFormula: `\\lim_{x \\to 0} \\frac{\\ln(1+x)}{x} = 1`,
      steps: [
        { desc: 'Direct substitution gives 0/0', formula: `\\frac{\\ln 1}{0} = \\frac{0}{0}` },
        { desc: "Apply L'Hôpital's Rule", formula: `= \\lim_{x \\to 0} \\frac{1/(1+x)}{1} = \\lim_{x \\to 0} \\frac{1}{1+x} = 1` },
      ],
      altSteps: [{ desc: 'Series: ln(1+x) = x - x²/2 + x³/3 - ...', formula: `\\frac{\\ln(1+x)}{x} = 1 - x/2 + ... \\to 1` }],
      similar: ['Find \\lim_{x \\to 0} \\frac{\\ln(1+3x)}{2x}'],
      mistakes: [],
      examTips: ['JEE: This limit derives d/dx(ln x) = 1/x.'],
    };
  }

  return null;
}

// 1d. Expansion-based limits: (e^x-1-x)/x², (sin x - x)/x³
function solveLimitExpansion(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const hasLimit = t.includes('limit') || t.includes('lim') || t.includes('→') || t.includes('->');
  if (!hasLimit) return null;

  // (e^x - 1 - x)/x² = 1/2
  if (t.includes('e') && t.includes('x') && /x\s*\^?\s*2|x²/.test(t)) {
    return {
      finalAnswer: '0.5',
      finalFormula: `\\lim_{x \\to 0} \\frac{e^x - 1 - x}{x^2} = \\frac{1}{2}`,
      steps: [
        { desc: 'Expand e^x = 1 + x + x²/2! + x³/3! + ...', formula: `\\frac{(1+x+x^2/2+x^3/6+...)-1-x}{x^2} = \\frac{x^2/2+x^3/6+...}{x^2}` },
        { desc: 'Simplify', formula: `= 1/2 + x/6 + ... \\xrightarrow{x \\to 0} \\frac{1}{2}` },
      ],
      altSteps: [{ desc: "L'Hôpital twice: \\frac{e^x-1}{2x} → \\frac{e^x}{2} → 1/2", formula: '' }],
      similar: ['Find \\lim_{x \\to 0} \\frac{\\sin x - x}{x^3}'],
      mistakes: ['Stopping the expansion too early — include enough terms'],
      examTips: ['JEE Advanced loves expansion-based limits.'],
    };
  }

  // (sin x - x)/x³ = -1/6
  if (t.includes('sin') && /x\s*\^?\s*3|x³/.test(t)) {
    return {
      finalAnswer: '-1/6',
      finalFormula: `\\lim_{x \\to 0} \\frac{\\sin x - x}{x^3} = -\\frac{1}{6}`,
      steps: [
        { desc: 'Expand sin x = x - x³/3! + x⁵/5! - ...', formula: `\\frac{(x-x^3/6+x^5/120-...)-x}{x^3} = \\frac{-x^3/6+x^5/120-...}{x^3}` },
        { desc: 'Simplify', formula: `= -1/6 + x²/120 - ... \\to -\\frac{1}{6}` },
      ],
      altSteps: [{ desc: "L'Hôpital 3 times", formula: `\\frac{\\cos x-1}{3x^2} \\to \\frac{-\\sin x}{6x} \\to \\frac{-\\cos x}{6} \\to -\\frac{1}{6}` }],
      similar: ['Find \\lim_{x \\to 0} \\frac{\\tan x - x}{x^3} = 1/3'],
      mistakes: ['Using sin x ≈ x without the x³ term — insufficient for x³ denominator'],
      examTips: ['JEE: For sin(x)-x or tan(x)-x limits, always expand to sufficient order.'],
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: CALCULUS — DERIVATIVES (JEE Level)
// ═══════════════════════════════════════════════════════════════════════════════

function solveDerivativeTrig(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const trigD: Record<string, {deriv: string; latex: string}> = {
    'sin': {deriv: 'cos x', latex: 'cos x'},
    'cos': {deriv: '-sin x', latex: '-\\sin x'},
    'tan': {deriv: 'sec²x', latex: '\\sec^2 x'},
    'cot': {deriv: '-cosec²x', latex: '-\\cosec^2 x'},
    'sec': {deriv: 'sec x tan x', latex: '\\sec x \\tan x'},
    'cosec': {deriv: '-cosec x cot x', latex: '-\\cosec x \\cot x'},
  };
  for (const [fn, info] of Object.entries(trigD)) {
    if ((t.includes('d/dx') || t.includes('derivative') || t.includes('differentiate')) && t.includes(fn) && !t.match(/\\d+\s*[xX]/)) {
      return {
        finalAnswer: info.deriv,
        finalFormula: `\\frac{d}{dx}(\\${fn} x) = ${info.latex}`,
        steps: [
          { desc: `Standard derivative of ${fn}(x)`, formula: `\\frac{d}{dx}(\\${fn} x) = ${info.latex}` },
          { desc: 'This should be memorized as a fundamental trigonometric derivative', formula: '' },
        ],
        altSteps: [{ desc: 'Can be derived from first principles using the limit definition', formula: `\\lim_{h \\to 0} \\frac{\\${fn}(x+h) - \\${fn}(x)}{h} = ${info.latex}` }],
        similar: [`Find \\frac{d}{dx}(\\cos 2x)`, `Differentiate \\tan(3x+1)`],
        mistakes: [`d/dx(cos x) = -sin x — the negative sign is crucial`, 'Forgetting chain rule for composites like sin(2x)'],
        examTips: ['JEE: Know all 6 trig derivatives. For composites, always chain rule.'],
      };
    }
  }
  return null;
}

function solveDerivativeExpLog(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const isDeriv = t.includes('d/dx') || t.includes('derivative') || t.includes('differentiate');
  if (!isDeriv) return null;

  if (t.includes('e^x') || t.includes('e^{x}')) {
    return {
      finalAnswer: 'e^x', finalFormula: `\\frac{d}{dx}(e^x) = e^x`,
      steps: [{ desc: 'The exponential function e^x is its own derivative', formula: `\\frac{d}{dx}(e^x) = e^x` }],
      altSteps: [{ desc: 'From first principles: lim(e^h-1)/h = 1', formula: '' }],
      similar: ['Find \\frac{d}{dx}(e^{3x})'],
      mistakes: ['d/dx(e^{3x}) = 3e^{3x}, NOT e^{3x} — chain rule!'],
      examTips: ["JEE: d/dx(e^x)=e^x but d/dx(a^x)=a^x ln(a). Don't confuse."],
    };
  }
  if (t.includes('ln') || t.includes('log')) {
    return {
      finalAnswer: '1/x', finalFormula: `\\frac{d}{dx}(\\ln x) = \\frac{1}{x}`,
      steps: [
        { desc: 'The derivative of natural logarithm', formula: `\\frac{d}{dx}(\\ln x) = \\frac{1}{x}` },
        { desc: 'For log base a: d/dx(log_a x) = 1/(x ln a)', formula: '' },
      ],
      altSteps: [{ desc: 'Inverse function theorem: if y=ln(x), x=e^y, dy/dx = 1/(dx/dy) = 1/e^y = 1/x', formula: '' }],
      similar: ['Find \\frac{d}{dx}(\\ln(2x))'],
      mistakes: ['Confusing ln(x) with log₁₀(x)'],
      examTips: [],
    };
  }
  return null;
}

// Chain rule: d/dx f(g(x)) with numeric coefficients
function solveDerivativeChainRule(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const isDeriv = t.toLowerCase().includes('d/dx') || t.toLowerCase().includes('derivative') || t.toLowerCase().includes('differentiate');
  if (!isDeriv) return null;

  // Match sin(ax+b), cos(ax+b), e^(ax), ln(ax+b)
  const chainMatch = t.match(/(sin|cos|tan|e\^|ln|log)\s*\(?\s*(\d+)\s*[xX]\s*([+-]\s*\d+)?\s*\)?/i);
  if (!chainMatch) return null;
  const fn = chainMatch[1].toLowerCase();
  const a = parseFloat(chainMatch[2]);
  const b = chainMatch[3] ? parseFloat(chainMatch[3].replace(/\s/g,'')) : 0;
  const arg = `${a}x${b?(b>0?'+':'')+b:''}`;

  if (fn === 'e^') {
    return {
      finalAnswer: `${a}e^{${arg}}`,
      finalFormula: `\\frac{d}{dx}(e^{${arg}}) = ${a}e^{${arg}}`,
      steps: [
        { desc: 'Chain rule: d/dx[e^(u)] = e^(u) · du/dx', formula: `u = ${arg}, \\frac{du}{dx} = ${a}` },
        { desc: 'Apply', formula: `= e^{${arg}} \\times ${a} = ${a}e^{${arg}}` },
      ],
      altSteps: [{ desc: 'Logarithmic differentiation: y=e^(ax+b), ln y = ax+b, y\'/y = a', formula: `y' = ${a}e^{${arg}}` }],
      similar: [`Find \\frac{d}{dx}(e^{5x-3})`],
      mistakes: ['Forgetting to multiply by du/dx (chain rule step)'],
      examTips: ['JEE: Chain rule is the most tested differentiation technique.'],
    };
  }
  if (fn === 'ln') {
    return {
      finalAnswer: `${a}/${arg}`,
      finalFormula: `\\frac{d}{dx}(\\ln(${arg})) = \\frac{${a}}{${arg}}`,
      steps: [
        { desc: 'Chain rule: d/dx[ln(u)] = (1/u)·du/dx', formula: `u = ${arg}, \\frac{du}{dx} = ${a}` },
        { desc: 'Apply', formula: `= \\frac{1}{${arg}} \\times ${a} = \\frac{${a}}{${arg}}` },
      ],
      altSteps: [],
      similar: [`Find \\frac{d}{dx}(\\ln(3x+1))`],
      mistakes: ['d/dx(ln(ax)) = a·ln(x) is WRONG'],
      examTips: [],
    };
  }
  const trigChain: Record<string, string> = { 'sin': `cos(${arg})`, 'cos': `-sin(${arg})`, 'tan': `sec²(${arg})` };
  if (trigChain[fn]) {
    return {
      finalAnswer: `${a}${trigChain[fn]}`,
      finalFormula: `\\frac{d}{dx}(${fn}(${arg})) = ${a}${trigChain[fn]}`,
      steps: [
        { desc: `Chain rule: outer=${fn}(u), inner u=${arg}`, formula: '' },
        { desc: 'Apply: f\'(g(x))·g\'(x)', formula: `= ${trigChain[fn]} \\times ${a} = ${a}${trigChain[fn]}` },
      ],
      altSteps: [],
      similar: [`Find \\frac{d}{dx}(\\cos 5x)`],
      mistakes: ['d/dx(sin 2x) = cos 2x is WRONG — missing factor of 2'],
      examTips: ['JEE Mains: Chain rule appears in 2-3 questions every year.'],
    };
  }
  return null;
}

// Higher order derivatives: d^n/dx^n (sin x), (cos x), (e^x)
function solveHigherOrderDeriv(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const orderMatch = t.match(/d\s*\^\s*(\d+)\s*\/\s*dx\s*\^\s*(\d+)/);
  if (!orderMatch) return null;
  const n = parseInt(orderMatch[1]);
  const rem = n % 4;

  if (t.includes('e^x') || t.includes('e^{x}')) {
    return {
      finalAnswer: 'e^x', finalFormula: `\\frac{d^{${n}}}{dx^{${n}}}(e^x) = e^x`,
      steps: [{ desc: 'e^x is its own derivative of any order', formula: `D^n[e^x] = e^x \\quad \\forall n \\in \\mathbb{N}` }],
      altSteps: [{ desc: 'By mathematical induction', formula: '' }],
      similar: [`Find \\frac{d^{10}}{dx^{10}}(e^{3x}) = 3^{10}e^{3x}`],
      mistakes: ['d^n(e^x)/dx^n = n·e^x is WRONG — no coefficient of n'],
      examTips: ['JEE Advanced: d^n(e^{ax})/dx^n = a^n · e^{ax}.'],
    };
  }
  if (t.includes('sin')) {
    const res = ['sin x','cos x','-sin x','-cos x'][rem];
    return {
      finalAnswer: res, finalFormula: `\\frac{d^{${n}}}{dx^{${n}}}(\\sin x) = ${res}`,
      steps: [
        { desc: '4-cycle: sin→cos→-sin→-cos→sin', formula: `f^{(${n})}(x) = \\sin(x + \\frac{n\\pi}{2})` },
        { desc: `${n} = ${Math.floor(n/4)}×4 + ${rem}, so result is ${res}`, formula: '' },
      ],
      altSteps: [{ desc: `f^(n)(x) = sin(x + nπ/2)`, formula: `= \\sin(x + ${n}π/2) = ${res}` }],
      similar: [`Find \\frac{d^{100}}{dx^{100}}(\\cos x)`],
      mistakes: ['Off-by-one in the cycle: sin→cos→-sin→-cos'],
      examTips: ['JEE Advanced: Use modulo 4 and sin(x+nπ/2).'],
    };
  }
  if (t.includes('cos')) {
    const res = ['cos x','-sin x','-cos x','sin x'][rem];
    return {
      finalAnswer: res, finalFormula: `\\frac{d^{${n}}}{dx^{${n}}}(\\cos x) = ${res}`,
      steps: [
        { desc: '4-cycle: cos→-sin→-cos→sin→cos', formula: `f^{(${n})}(x) = \\cos(x + \\frac{n\\pi}{2})` },
      ],
      altSteps: [],
      similar: [],
      mistakes: [],
      examTips: ['JEE: sin cycle: +sin,+cos,-sin,-cos. cos cycle: +cos,-sin,-cos,+sin.'],
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CALCULUS — INTEGRATION (JEE Level)
// ═══════════════════════════════════════════════════════════════════════════════

function solveIntegralPower(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const isInt = t.includes('∫') || t.includes('integrate') || t.includes('integral');
  if (!isInt) return null;

  // ∫ x^n dx
  const pwMatch = t.match(/[xX]\s*\^\s*(-?[\d.]+)/);
  if (pwMatch && !t.includes('sin') && !t.includes('cos') && !t.includes('e')) {
    const n = parseFloat(pwMatch[1]);
    if (n === -1) return null;
    const np = n + 1;
    return {
      finalAnswer: `x^{${np}}/${np} + C`,
      finalFormula: `\\int x^{${n}} \\, dx = \\frac{x^{${np}}}{${np}} + C`,
      steps: [
        { desc: 'Power rule: ∫x^n dx = x^(n+1)/(n+1) + C, n≠-1', formula: `\\int x^{${n}} \\, dx = \\frac{x^{${np}}}{${np}} + C` },
      ],
      altSteps: [{ desc: 'Verify by differentiating the result', formula: `\\frac{d}{dx}(x^{${np}}/${np}) = x^{${n}} \\checkmark` }],
      similar: [`Find \\int x^5 \\, dx`, `Evaluate \\int x^{-3} \\, dx`],
      mistakes: ['Forgetting +C for indefinite integrals', '∫x⁻¹dx = ln|x|+C, not x⁰/0'],
      examTips: ['JEE: Always add +C.'],
    };
  }

  // ∫ 1/x dx = ln|x| + C
  if (/1\s*\/\s*[xX]|1\/?[xX]/.test(t) && !t.match(/x\s*\^/)) {
    return {
      finalAnswer: 'ln|x| + C',
      finalFormula: `\\int \\frac{1}{x} \\, dx = \\ln|x| + C`,
      steps: [
        { desc: 'Special case n=-1 of power rule', formula: `\\int x^{-1} \\, dx = \\ln|x| + C` },
      ],
      altSteps: [],
      similar: ['Find \\int \\frac{1}{2x} \\, dx'],
      mistakes: ['Writing ln(x) instead of ln|x| — JEE deducts marks'],
      examTips: [],
    };
  }

  // ∫ e^x dx
  if (t.includes('e^x') || t.includes('e^{x}')) {
    const coeffMatch = t.match(/e\s*\^\s*\(?\s*(-?\d+)\s*[xX]/);
    if (coeffMatch) {
      const a = parseInt(coeffMatch[1]);
      return {
        finalAnswer: `e^{${a}x}/${a} + C`,
        finalFormula: `\\int e^{${a}x} \\, dx = \\frac{e^{${a}x}}{${a}} + C`,
        steps: [{ desc: 'Substitution u=ax, du=a·dx', formula: `= \\frac{1}{${a}} \\int e^u \\, du = \\frac{e^{${a}x}}{${a}} + C` }],
        altSteps: [], similar: [], mistakes: ['∫e^(2x)dx = e^(2x)/2, not e^(2x)'], examTips: [],
      };
    }
    return {
      finalAnswer: 'e^x + C', finalFormula: `\\int e^x \\, dx = e^x + C`,
      steps: [{ desc: 'e^x is its own integral', formula: '' }],
      altSteps: [], similar: [], mistakes: [], examTips: [],
    };
  }

  // ∫ sin x dx, ∫ cos x dx
  if (t.includes('sin') && !t.includes('cos') && !t.includes('tan')) {
    const cm = t.match(/sin\s*\(?\s*(\d+)\s*[xX]/);
    const a = cm ? parseInt(cm[1]) : 1;
    return {
      finalAnswer: `-cos(${a}x)/${a} + C`,
      finalFormula: `\\int \\sin(${a}x) \\, dx = -\\frac{\\cos(${a}x)}{${a}} + C`,
      steps: [{ desc: '∫sin(ax)dx = -cos(ax)/a + C', formula: '' }],
      altSteps: [], similar: [],
      mistakes: ['∫sin x dx = -cos x + C (negative sign!)'],
      examTips: ['JEE: ∫sin=-cos, ∫cos=sin, ∫sec²=tan, ∫cosec²=-cot.'],
    };
  }
  if (t.includes('cos') && !t.includes('sin')) {
    const cm = t.match(/cos\s*\(?\s*(\d+)\s*[xX]/);
    const a = cm ? parseInt(cm[1]) : 1;
    return {
      finalAnswer: `sin(${a}x)/${a} + C`,
      finalFormula: `\\int \\cos(${a}x) \\, dx = \\frac{\\sin(${a}x)}{${a}} + C`,
      steps: [{ desc: '∫cos(ax)dx = sin(ax)/a + C', formula: '' }],
      altSteps: [], similar: [],
      mistakes: ['∫cos x dx = sin x + C (no negative sign!)'],
      examTips: [],
    };
  }

  return null;
}

// Integration by parts: ∫ x·e^x dx, ∫ x·sin x dx
function solveIntegralByParts(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const isInt = t.includes('∫') || t.includes('integrate') || t.includes('integral');
  if (!isInt) return null;

  // ∫ x·e^x dx = e^x(x-1) + C
  if (t.includes('x') && t.includes('e^x') && !t.match(/\d+\s*[xX]/)) {
    return {
      finalAnswer: 'e^x(x - 1) + C',
      finalFormula: `\\int x e^x \\, dx = e^x(x-1) + C`,
      steps: [
        { desc: 'Use integration by parts: ∫u·dv = uv - ∫v·du', formula: `u = x, \\, dv = e^x dx \\Rightarrow du = dx, \\, v = e^x` },
        { desc: 'Apply the formula', formula: `= xe^x - \\int e^x \\, dx = xe^x - e^x + C = e^x(x-1) + C` },
      ],
      altSteps: [{ desc: 'LIATE rule: Log-Inverse trig-Algebraic-Trig-Exponential. Here x is Algebraic (comes first), e^x is Exponential', formula: '' }],
      similar: ['Find \\int x \\cos x \\, dx', 'Find \\int x^2 e^x \\, dx'],
      mistakes: ['Choosing u=e^x, dv=x dx — this gives ∫v·du = ∫x²/2 · e^x dx which is harder, not easier', 'Forgetting to apply by parts again for ∫x²e^x dx'],
      examTips: ['JEE: Use LIATE rule to choose u. Algebraic functions always come before exponential.'],
    };
  }

  // ∫ x·sin x dx = sin x - x·cos x + C
  if (t.includes('x') && t.includes('sin x') && !t.match(/\d+\s*[xX]/)) {
    return {
      finalAnswer: 'sin x - x·cos x + C',
      finalFormula: `\\int x \\sin x \\, dx = \\sin x - x\\cos x + C`,
      steps: [
        { desc: 'Integration by parts: u=x, dv=sin x dx', formula: `u=x, du=dx; v=-\\cos x, dv=\\sin x \\, dx` },
        { desc: 'Apply formula', formula: `= -x\\cos x - \\int (-\\cos x) \\, dx = -x\\cos x + \\sin x + C` },
      ],
      altSteps: [], similar: ['Find \\int x \\cos x \\, dx'], mistakes: [], examTips: [],
    };
  }

  return null;
}

// Definite integrals
function solveDefiniteIntegral(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const isInt = t.includes('∫') || t.includes('integral');
  if (!isInt) return null;
  const nums = pN(t);

  // ∫_a^b x^n dx
  const boundsMatch = t.match(/(\d+)\s*(?:to|and|,)\s*(\d+)/);
  const powerMatch = t.match(/[xX]\s*\^\s*(\d+)/);
  if (boundsMatch && powerMatch && nums.length >= 3) {
    const a = parseInt(boundsMatch[1]), b = parseInt(boundsMatch[2]), n = parseInt(powerMatch[1]);
    const np = n + 1;
    const result = (Math.pow(b, np) - Math.pow(a, np)) / np;
    return {
      finalAnswer: fmt(result),
      finalFormula: `\\int_{${a}}^{${b}} x^{${n}} \\, dx = ${fmt(result)}`,
      steps: [
        { desc: 'Antiderivative: x^(n+1)/(n+1)', formula: `= \\left[\\frac{x^{${np}}}{${np}}\\right]_{${a}}^{${b}}` },
        { desc: 'Evaluate', formula: `= \\frac{${b}^{${np}} - ${a}^{${np}}}{${np}} = ${fmt(result)}` },
      ],
      altSteps: [],
      similar: [`Find \\int_0^1 x^3 \\, dx`],
      mistakes: ['F(b)-F(a), not F(a)-F(b)'],
      examTips: ['JEE: ∫_a^b = -∫_b^a and ∫_a^a = 0.'],
    };
  }

  // ∫_0^{π/2} sin x dx = 1
  if (t.match(/0.*?[πpi]+.*?2/) && t.includes('sin')) {
    return {
      finalAnswer: '1', finalFormula: `\\int_0^{\\pi/2} \\sin x \\, dx = 1`,
      steps: [{ desc: '=[-cos x]₀^{π/2} = -cos(π/2)+cos(0) = 0+1 = 1', formula: '' }],
      altSteps: [], similar: [], mistakes: [], examTips: [],
    };
  }
  if (t.match(/0.*?[πpi]+.*?2/) && t.includes('cos')) {
    return {
      finalAnswer: '1', finalFormula: `\\int_0^{\\pi/2} \\cos x \\, dx = 1`,
      steps: [{ desc: '=[sin x]₀^{π/2} = sin(π/2)-sin(0) = 1-0 = 1', formula: '' }],
      altSteps: [], similar: [], mistakes: [], examTips: [],
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: DIFFERENTIAL EQUATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// dy/dx + Py = Q (first order linear)
function solveLinearDE(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const deMatch = t.match(/dy\s*\/\s*dx.*?([+-]?\d*\.?\d*)\s*y\s*([+-]\s*\d+\.?\d*)/i);
  if (!deMatch) return null;
  const P = parseFloat(deMatch[1] || '1');
  const Q = parseFloat(deMatch[2].replace(/\s/g,''));
  if (P === 0) {
    return {
      finalAnswer: `${fmt(Q)}x + C`, finalFormula: `\frac{dy}{dx} = ${fmt(Q)} \Rightarrow y = ${fmt(Q)}x + C`,
      steps: [{ desc: 'Integrate directly', formula: `y = \int ${fmt(Q)} \, dx = ${fmt(Q)}x + C` }],
      altSteps: [], similar: [], mistakes: [], examTips: [],
    };
  }
  const QP = Q/P;
  return {
    finalAnswer: `y = ${fmt(QP)} + Ce^{-${fmt(Math.abs(P))}x}`,
    finalFormula: `\frac{dy}{dx} + ${fmt(P)}y = ${fmt(Q)}`,
    steps: [
      { desc: 'Identify P and Q', formula: `P = ${fmt(P)}, Q = ${fmt(Q)}` },
      { desc: 'Integrating Factor', formula: `IF = e^{\int P \, dx} = e^{${fmt(P)}x}` },
      { desc: 'Multiply and integrate', formula: `\frac{d}{dx}(y \cdot e^{${fmt(P)}x}) = ${fmt(Q)}e^{${fmt(P)}x}` },
      { desc: 'Solve for y', formula: `y = ${fmt(QP)} + Ce^{-${fmt(Math.abs(P))}x` },
    ],
    altSteps: [{ desc: 'Homogeneous + Particular: y_h = Ce^(-Px), y_p = Q/P', formula: '' }],
    similar: ['Solve dy/dx + 2y = 6', 'Solve dy/dx - 3y = 9'],
    mistakes: ['Forgetting to multiply Q by IF before integrating', 'Sign errors when P is negative'],
    examTips: ['JEE: IF method is standard for first-order linear DEs.'],
  };
}

// dy/dx = ky (exponential growth/decay)
function solveSeparableDE(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const m1 = t.match(/dy\s*\/\s*dx\s*=\s*(\d+\.?\d*)\s*y/);
  if (!m1 && !t.match(/dy\s*\/\s*dx\s*=\s*k\s*y/i)) return null;
  const k = m1 ? parseFloat(m1[1]) : 1;
  return {
    finalAnswer: `y = Ce^{${fmt(k)}x}`,
    finalFormula: `\frac{dy}{dx} = ${fmt(k)}y \Rightarrow y = Ce^{${fmt(k)}x}`,
    steps: [
      { desc: 'Separate variables: dy/y = k dx', formula: `\frac{dy}{y} = ${fmt(k)} \, dx` },
      { desc: 'Integrate both sides', formula: `\ln|y| = ${fmt(k)}x + C_1` },
      { desc: 'Exponentiate', formula: `y = Ce^{${fmt(k)}x}` },
    ],
    altSteps: [{ desc: 'With initial condition y(x₀)=y₀: y = y₀·e^{k(x-x₀)}', formula: '' }],
    similar: ['Solve dy/dx = 5y given y(0)=2', 'Solve dy/dx = -2y'],
    mistakes: ['Forgetting |y| → ln|y|', 'Losing the constant C'],
    examTips: ["JEE: dy/dx=ky models population growth, radioactive decay, Newton's cooling."],
  };
}

// Second order DE: d²y/dx² + a·dy/dx + b·y = 0
function solveSecondOrderDE(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  if (!t.match(/d\s*\^?2\s*y|second\s*order|2nd\s*order/i)) return null;
  const nums = N(t);
  if (nums.length < 2) return null;
  const a = nums[0], b = nums[1];
  const disc = a*a - 4*b;

  if (disc > 0) {
    const r1 = (-a + Math.sqrt(disc)) / 2;
    const r2 = (-a - Math.sqrt(disc)) / 2;
    return {
      finalAnswer: `y = C₁e^{${fmt(r1)}x} + C₂e^{${fmt(r2)}x}`,
      finalFormula: `y'' + ${fmt(a)}y' + ${fmt(b)}y = 0 \Rightarrow y = C_1e^{${fmt(r1)}x} + C_2e^{${fmt(r2)}x}`,
      steps: [
        { desc: 'Form auxiliary equation: m² + am + b = 0', formula: `m^2 + ${fmt(a)}m + ${fmt(b)} = 0` },
        { desc: `Discriminant D = ${fmt(disc)} > 0, so two distinct real roots`, formula: `m = ${fmt(r1)}, ${fmt(r2)}` },
        { desc: 'General solution', formula: `y = C_1e^{${fmt(r1)}x} + C_2e^{${fmt(r2)}x}` },
      ],
      altSteps: [], similar: [],
      mistakes: ['Forgetting to write the auxiliary equation correctly'],
      examTips: ['JEE: For D>0: real distinct, D=0: real equal (multiply by x), D<0: complex (use sin/cos).'],
    };
  }
  if (disc === 0) {
    const r = -a / 2;
    return {
      finalAnswer: `y = (C₁ + C₂x)e^{${fmt(r)}x}`,
      finalFormula: `y'' + ${fmt(a)}y' + ${fmt(b)}y = 0 \Rightarrow y = (C_1 + C_2x)e^{${fmt(r)}x}`,
      steps: [
        { desc: 'Auxiliary equation has repeated root', formula: `m = ${fmt(r)} (repeated)` },
        { desc: 'General solution for repeated root', formula: `y = (C_1 + C_2x)e^{${fmt(r)}x}` },
      ], altSteps: [], similar: [], mistakes: [], examTips: [],
    };
  }
  // disc < 0
  const realPart = -a / 2;
  const imagPart = Math.sqrt(-disc) / 2;
  return {
    finalAnswer: `y = e^{${fmt(realPart)}x}(C₁cos(${fmt(imagPart)}x) + C₂sin(${fmt(imagPart)}x))`,
    finalFormula: `y'' + ${fmt(a)}y' + ${fmt(b)}y = 0 \Rightarrow y = e^{${fmt(realPart)}x}(C_1\cos ${fmt(imagPart)}x + C_2\sin ${fmt(imagPart)}x)`,
    steps: [
      { desc: `Discriminant D = ${fmt(disc)} < 0, complex conjugate roots`, formula: `m = ${fmt(realPart)} \pm ${fmt(imagPart)}i` },
      { desc: 'General solution', formula: `y = e^{\alpha x}(C_1\cos\beta x + C_2\sin\beta x)` },
    ], altSteps: [], similar: [],
    mistakes: ['Forgetting to include the exponential part e^(αx) when α ≠ 0'],
    examTips: ['JEE Advanced: 2nd order DEs with complex roots test Euler form and trigonometric form.'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ADVANCED ALGEBRA
// ═══════════════════════════════════════════════════════════════════════════════

// Discriminant and nature of roots
function solveDiscriminant(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  if (!t.match(/discriminant|nature.*root|d\s*=|b\s*\^\s*2.*4ac/i)) return null;
  const nums = N(t);
  if (nums.length < 3) return null;
  const a = nums[0], b = nums[1], c = nums[2];
  const D = b*b - 4*a*c;
  const nature = D > 0 ? 'real and distinct' : D === 0 ? 'real and equal (repeated)' : 'not real (complex conjugate pair)';
  return {
    finalAnswer: `D = ${fmt(D)}, roots are ${nature}`,
    finalFormula: `D = b^2 - 4ac = ${fmt(D)}`,
    steps: [
      { desc: 'Discriminant determines nature of roots', formula: `D = b^2 - 4ac = (${fmt(b)})^2 - 4(${fmt(a)})(${fmt(c)}) = ${fmt(D)}` },
      { desc: `Since D ${D>0?'>':D===0?'=':'<'} 0, roots are ${nature}`, formula: '' },
      { desc: 'Vieta: sum = -b/a, product = c/a', formula: `\alpha+\beta = ${fmt(-b/a)}, \quad \alpha\beta = ${fmt(c/a)}` },
    ],
    altSteps: D > 0 ? [{ desc: 'Roots by quadratic formula', formula: `x = \frac{${fmt(-b)} \pm \sqrt{${fmt(D)}}}{${fmt(2*a)}}` }] : [],
    similar: ['Find nature of roots: 2x² - 5x + 3 = 0', 'If roots of x² - 6x + k = 0 are equal, find k'],
    mistakes: ['D = 4ac - b² is WRONG; it is b² - 4ac', 'Sum of roots = -b/a (note the negative!)'],
    examTips: ['JEE Advanced: Discriminant + Vieta is a classic combo.'],
  };
}

// Complex numbers - De Moivre
function solveDeMoivre(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  if (!t.match(/de moivre|demoivre|\(cos.*?\+\s*i\s*sin/i)) return null;
  const nMatch = t.match(/\)\s*\^\s*(\d+)/);
  const thetaMatch = t.match(/cos\s*\(?\s*([\d.]+)/);
  if (!nMatch || !thetaMatch) return null;
  const n = parseInt(nMatch[1]), theta = parseFloat(thetaMatch[1]);
  const nt = theta * n;
  return {
    finalAnswer: `cos(${fmt(nt)}) + i sin(${fmt(nt)})`,
    finalFormula: `(\cos ${fmt(theta)} + i\sin ${fmt(theta)})^{${n}} = \cos ${fmt(nt)} + i\sin ${fmt(nt)}`,
    steps: [
      { desc: "De Moivre's Theorem", formula: `(\cos\theta + i\sin\theta)^n = \cos(n\theta) + i\sin(n\theta)` },
      { desc: `Substitute θ=${fmt(theta)}, n=${n}`, formula: `= \cos(${fmt(nt)}) + i\sin(${fmt(nt)})` },
    ],
    altSteps: [{ desc: "Euler: e^(iθ) form", formula: `e^{i·${fmt(nt)}} = \cos(${fmt(nt)}) + i\sin(${fmt(nt)})` }],
    similar: ['Find (cos 30° + i sin 30°)^6'],
    mistakes: ["De Moivre applies to (cos θ + i sin θ), not (a + bi) directly — convert to polar first"],
    examTips: ["JEE Advanced: De Moivre + nth roots of unity is a frequent combo."],
  };
}

// Binomial theorem - specific term
function solveBinomialTerm(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  if (!t.match(/binomial|\^\s*\d+.*term|(\d+)(?:st|nd|rd|th)\s*term/i)) return null;
  const nMatch = t.match(/\^\s*(\d+)/);
  const rMatch = t.match(/(\d+)(?:st|nd|rd|th)\s*term|r\s*=\s*(\d+)|term\s*(\d+)/);
  if (!nMatch || !rMatch) return null;
  const n = parseInt(nMatch[1]);
  const r = parseInt(rMatch[1] || rMatch[2] || rMatch[3]) - 1;
  if (r < 0 || r > n) return null;
  const coeff = comb(n, r);
  return {
    finalAnswer: `C(${n},${r}) = ${coeff} (coefficient of the ${(r+1)}${['st','nd','rd'][r]||'th'} term)`,
    finalFormula: `T_{${r+1}} = \binom{${n}}{${r}} a^{${n-r}} b^{${r}}`,
    steps: [
      { desc: 'General term: T_{r+1} = C(n,r)·a^(n-r)·b^r', formula: `\binom{${n}}{${r}} = \frac{${n}!}{${r}!·${n-r}!} = ${coeff}` },
    ],
    altSteps: [],
    similar: ['Find the 5th term of (2x+3)^7'],
    mistakes: ['T_(r+1) uses r, so 3rd term means r=2, NOT r=3'],
    examTips: ['JEE Mains: Binomial usually asks for specific term or coefficient.'],
  };
}

// 3×3 Determinant
function solveDet3x3(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  if (!t.match(/det|determinant|\|.*\|/i)) return null;
  const nums = N(t);
  if (nums.length < 9) return null;
  const [a,b,c,d,e,f,g,h,i] = nums;
  const det = a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g);
  return {
    finalAnswer: fmt(det),
    finalFormula: `\det = ${fmt(det)}`,
    steps: [
      { desc: 'Cofactor expansion along first row', formula: `= a(ei-fh) - b(di-fg) + c(dh-eg)` },
      { desc: 'Substitute and calculate', formula: `= ${fmt(a)}(${fmt(e*i-f*h)}) - ${fmt(b)}(${fmt(d*i-f*g)}) + ${fmt(c)}(${fmt(d*h-e*g)}) = ${fmt(det)}` },
    ],
    altSteps: [{ desc: 'Sarrus rule (3×3 only)', formula: `= aei+bfg+cdh-ceg-bdi-afh = ${fmt(det)}` }],
    similar: [],
    mistakes: ['Alternating signs: +,-,+ for first row cofactors', 'Sarrus rule only works for 3×3'],
    examTips: ['JEE: 3×3 det used in area of triangle, volume, solving systems.'],
  };
}

// Advanced P&C
function solvePCAdvanced(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const nums = pN(t);
  if (nums.length < 2) return null;

  if (t.match(/\bn\s*c\s*r\b|combination|choose|\bc\s*\(\s*\d/i)) {
    const n=nums[0], r=nums[1], result=comb(n,r);
    return {
      finalAnswer: fmt(result), finalFormula: `\\binom{${n}}{${r}} = ${fmt(result)}`,
      steps: [{ desc: 'Combination formula', formula: `C(${n},${r}) = ${n}!/(${r}!·${n-r}!) = ${fmt(result)}` }],
      altSteps: [{ desc: `C(${n},${r}) = C(${n},${n-r}) = ${fmt(comb(n,n-r))}`, formula: '' }],
      similar: [],
      mistakes: ['C(n,r) = n!/(r!(n-r)!) — both factorials in denominator'],
      examTips: ["JEE: C(n,r)=C(n,n-r), C(n,r)+C(n,r-1)=C(n+1,r), row sum = 2^n."],
    };
  }
  if (t.match(/\bn\s*p\s*r\b|permutation|arrange/i)) {
    const n=nums[0], r=nums[1], result=comb(n,r)*fact(r);
    return {
      finalAnswer: fmt(result), finalFormula: `^{${n}}P_{${r}} = ${fmt(result)}`,
      steps: [{ desc: 'P(n,r) = n!/(n-r)!', formula: `= ${fmt(result)}` }],
      altSteps: [],
      similar: [],
      mistakes: ['P(n,r) = n!/(n-r)!, NOT n!/r!'],
      examTips: ['JEE: Circular permutation = (n-1)!'],
    };
  }
  return null;
}

// Sum formulas: Σk², Σk³, infinite GP
function solveSumFormulas(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const nums = pN(t);
  if (nums.length < 1) return null;
  const n = nums[nums.length - 1];

  if (t.match(/sum.*?square|1.*?2.*?2/i)) {
    const s = n*(n+1)*(2*n+1)/6;
    return {
      finalAnswer: fmt(s), finalFormula: `\\sum_{k=1}^{${n}} k^2 = ${fmt(s)}`,
      steps: [{ desc: 'Formula: n(n+1)(2n+1)/6', formula: `= ${n}×${n+1}×${2*n+1}/6 = ${fmt(s)}` }],
      altSteps: [], similar: [], mistakes: ['Not Σk³ = [n(n+1)/2]²'], examTips: ['JEE: Know Σk, Σk², Σk³.'],
    };
  }
  if (t.match(/sum.*?cube|1.*?3.*?3/i)) {
    const s = Math.pow(n*(n+1)/2, 2);
    return {
      finalAnswer: fmt(s), finalFormula: `\\sum_{k=1}^{${n}} k^3 = ${fmt(s)}`,
      steps: [{ desc: 'Formula: [n(n+1)/2]² = (Σk)²', formula: `= [${n}×${n+1}/2]² = ${fmt(s)}` }],
      altSteps: [], similar: [], mistakes: [], examTips: ['JEE: Σk³ = (Σk)² is a beautiful identity frequently tested.'],
    };
  }
  if (t.includes('infinite') && (t.includes('gp') || t.includes('geometric'))) {
    if (nums.length >= 2) {
      const a=nums[0], r=nums[1];
      if (Math.abs(r) >= 1) return null;
      return {
        finalAnswer: fmt(a/(1-r)), finalFormula: `S_\infty = a/(1-r) = ${fmt(a/(1-r))}`,
        steps: [{ desc: `a=${fmt(a)}, r=${fmt(r)}, |r|<1 ✓`, formula: `= ${fmt(a)}/(1-${fmt(r)}) = ${fmt(a/(1-r))}` }],
        altSteps: [],
        similar: [],
        mistakes: ['S∞ valid ONLY when |r|<1'],
        examTips: ['JEE: Always check |r|<1 first.'],
      };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: COORDINATE GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════════

// Distance between two points
function solveDist2D(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  if (!t.match(/distance|dist.*between|\bd\s*=/i)) return null;
  const nums = N(t);
  if (nums.length < 4) return null;
  const [x1,y1,x2,y2] = nums;
  const d = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
  return {
    finalAnswer: fmt(d),
    finalFormula: `d = \sqrt{(${fmt(x2)}-${fmt(x1)})^2+(${fmt(y2)}-${fmt(y1)})^2} = ${fmt(d)}`,
    steps: [
      { desc: 'Distance formula', formula: `d = \sqrt{(x_2-x_1)^2+(y_2-y_1)^2}` },
      { desc: 'Substitute', formula: `= \sqrt{${fmt((x2-x1)**2)}+${fmt((y2-y1)**2)}} = ${fmt(d)}` },
    ],
    altSteps: [],
    similar: ['Find distance between (1,-2) and (4,3)'],
    mistakes: ['d = √(Δx²+Δy²), NOT √(Δx+Δy)'],
    examTips: ['JEE: Distance formula is foundational for all coordinate geometry.'],
  };
}

// Area of triangle with coordinates
function solveAreaTriCoords(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  if (!t.match(/area.*triangle|triangle.*area/i)) return null;
  const nums = N(t);
  if (nums.length < 6) return null;
  const [x1,y1,x2,y2,x3,y3] = nums;
  const area = Math.abs(x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2)) / 2;
  return {
    finalAnswer: fmt(area) + ' sq units',
    finalFormula: `\text{Area} = \frac{1}{2}|x_1(y_2-y_3)+x_2(y_3-y_1)+x_3(y_1-y_2)| = ${fmt(area)}`,
    steps: [
      { desc: 'Shoelace/coordinate formula', formula: `= \frac{1}{2}|${fmt(x1)}(${fmt(y2-y3)})+${fmt(x2)}(${fmt(y3-y1)})+${fmt(x3)}(${fmt(y1-y2)})|` },
      { desc: 'Result', formula: `= ${fmt(area)}` },
    ],
    altSteps: [{ desc: 'Area=0 means collinear points — JEE favorite', formula: '' }],
    similar: [],
    mistakes: ['Forget absolute value — area is always positive'],
    examTips: ['JEE: Area=0 ⟺ collinear.'],
  };
}

// Equation of circle
function solveCircleEq(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  if (!t.includes('circle')) return null;
  const nums = N(t);
  if (nums.length < 3) return null;
  const h=nums[0], k=nums[1], r=nums[2];
  return {
    finalAnswer: `(x-${fmt(h)})² + (y-${fmt(k)})² = ${fmt(r*r)}`,
    finalFormula: `(x-h)^2+(y-k)^2=r^2`,
    steps: [
      { desc: 'Standard form with center (h,k), radius r', formula: `(x-${fmt(h)})^2+(y-${fmt(k)})^2 = ${fmt(r)}^2 = ${fmt(r*r)}` },
    ],
    altSteps: [{ desc: 'General form: x²+y²+2gx+2fy+c=0, center=(-g,-f), r=√(g²+f²-c)', formula: `x^2+y^2-${fmt(2*h)}x-${fmt(2*k)}y+${fmt(h*h+k*k-r*r)}=0` }],
    similar: [],
    mistakes: ['(x-h)² not (x+h)²', 'r is radius, not diameter'],
    examTips: ['JEE: Know both standard and general forms.'],
  };
}

// Equation of parabola, ellipse, hyperbola
function solveConicSection(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const nums = pN(t);

  // Parabola: y² = 4ax
  if (t.includes('parabola') && t.includes('focus')) {
    if (nums.length >= 1) {
      const a = nums[0];
      return {
        finalAnswer: `y² = ${fmt(4*a)}x`,
        finalFormula: `y^2 = 4ax \Rightarrow y^2 = ${fmt(4*a)}x`,
        steps: [
          { desc: 'Standard parabola with focus (a,0)', formula: `Focus = (${fmt(a)}, 0), Directrix: x = ${fmt(-a)}` },
          { desc: 'Equation', formula: `y^2 = ${fmt(4*a)}x` },
        ],
        altSteps: [], similar: [],
        mistakes: ['Focus (a,0) means y²=4ax, NOT x²=4ay'],
        examTips: ['JEE: 4 standard parabolas: y²=4ax, y²=-4ax, x²=4ay, x²=-4ay.'],
      };
    }
  }

  // Ellipse: x²/a² + y²/b² = 1
  if (t.includes('ellipse') && nums.length >= 2) {
    const a = Math.max(nums[0], nums[1]), b = Math.min(nums[0], nums[1]);
    const c = Math.sqrt(a*a - b*b);
    const e = c / a;
    return {
      finalAnswer: `e = ${fmt(e)}, foci at (±${fmt(c)}, 0)`,
      finalFormula: `\frac{x^2}{${fmt(a)}^2} + \frac{y^2}{${fmt(b)}^2} = 1`,
      steps: [
        { desc: 'For ellipse x²/a²+y²/b²=1 with a>b', formula: `c = \sqrt{a^2-b^2} = \sqrt{${fmt(a*a)}-${fmt(b*b)}} = ${fmt(c)}` },
        { desc: 'Eccentricity', formula: `e = c/a = ${fmt(c)}/${fmt(a)} = ${fmt(e)}` },
      ],
      altSteps: [], similar: [],
      mistakes: ['Eccentricity of ellipse: e = c/a < 1 (always!)'],
      examTips: ['JEE: e<1 for ellipse, e=1 for parabola, e>1 for hyperbola.'],
    };
  }

  // Hyperbola: x²/a² - y²/b² = 1
  if (t.includes('hyperbola') && nums.length >= 2) {
    const a = nums[0], b = nums[1];
    const c = Math.sqrt(a*a + b*b);
    const e = c / a;
    return {
      finalAnswer: `e = ${fmt(e)}, foci at (±${fmt(c)}, 0)`,
      finalFormula: `\frac{x^2}{${fmt(a)}^2} - \frac{y^2}{${fmt(b)}^2} = 1`,
      steps: [
        { desc: 'For hyperbola x²/a²-y²/b²=1', formula: `c = \sqrt{a^2+b^2} = ${fmt(c)}, e = c/a = ${fmt(e)}` },
      ],
      altSteps: [], similar: [],
      mistakes: ['Hyperbola: c² = a²+b² (PLUS, not minus!)'],
      examTips: ['JEE: For hyperbola, c²=a²+b² and e>1. Asymptotes: y=±(b/a)x.'],
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: TRIGONOMETRY (JEE Level)
// ═══════════════════════════════════════════════════════════════════════════════

function solveTrigEquation(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();

  const sinEq = t.match(/sin\s*[xX]\s*=\s*([+-]?[\d.]+)/);
  if (sinEq) {
    const val = parseFloat(sinEq[1]);
    if (Math.abs(val) > 1) return null;
    const deg = Math.asin(val) * 180 / Math.PI;
    return {
      finalAnswer: `x = nπ + (-1)^n·${fmt(deg)}°, n ∈ Z`,
      finalFormula: `\\sin x = ${fmt(val)} \\Rightarrow x = n\\pi + (-1)^n \\sin^{-1}(${fmt(val)})`,
      steps: [
        { desc: 'Principal value', formula: `x_0 = \\sin^{-1}(${fmt(val)}) = ${fmt(deg)}°` },
        { desc: 'General solution for sin x = a', formula: `x = n\\pi + (-1)^n \\sin^{-1}(a)` },
      ],
      altSteps: [],
      similar: ['Solve sin x = 1/2', 'Solve sin x = -√3/2'],
      mistakes: ['sin x = a has TWO solutions per period in [0, 2π)'],
      examTips: ['JEE: sin→nπ+(-1)ⁿsin⁻¹a, cos→2nπ±cos⁻¹a, tan→nπ+tan⁻¹a.'],
    };
  }

  const cosEq = t.match(/cos\s*[xX]\s*=\s*([+-]?[\d.]+)/);
  if (cosEq) {
    const val = parseFloat(cosEq[1]);
    if (Math.abs(val) > 1) return null;
    const deg = Math.acos(val) * 180 / Math.PI;
    return {
      finalAnswer: `x = 2nπ ± ${fmt(deg)}°, n ∈ Z`,
      finalFormula: `\\cos x = ${fmt(val)} \\Rightarrow x = 2n\\pi \\pm ${fmt(deg)}°`,
      steps: [
        { desc: 'Principal value', formula: `x_0 = \\cos^{-1}(${fmt(val)}) = ${fmt(deg)}°` },
        { desc: 'General solution', formula: `x = 2n\\pi \\pm \\cos^{-1}(${fmt(val)})` },
      ], altSteps: [], similar: [], mistakes: ['cos x = a → two solutions per period'], examTips: [],
    };
  }

  const tanEq = t.match(/tan\s*[xX]\s*=\s*([+-]?[\d.]+)/);
  if (tanEq) {
    const val = parseFloat(tanEq[1]);
    const deg = Math.atan(val) * 180 / Math.PI;
    return {
      finalAnswer: `x = ${fmt(deg)}° + 180°n, n ∈ Z`,
      finalFormula: `\\tan x = ${fmt(val)} \\Rightarrow x = ${fmt(deg)}° + 180°n`,
      steps: [{ desc: `Period of tan is π (180°)`, formula: `x = n\\pi + \\tan^{-1}(${fmt(val)})` }],
      altSteps: [], similar: [], mistakes: ['tan has period π, not 2π!'], examTips: [],
    };
  }
  return null;
}

// Trig identities: prove/simplify
function solveTrigIdentity(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();

  // sin²x + cos²x = 1
  if (t.match(/sin.*?2.*?cos.*?2|sin\^2.*?cos\^2/) && t.match(/prove|value|find|evaluate|simplify/)) {
    return {
      finalAnswer: '1',
      finalFormula: `\\sin^2 x + \\cos^2 x = 1`,
      steps: [
        { desc: 'This is the Pythagorean trigonometric identity', formula: `\\sin^2 x + \\cos^2 x = 1` },
        { desc: 'Derived from the unit circle: x²+y²=1 where x=cosθ, y=sinθ', formula: '' },
      ], altSteps: [], similar: [], mistakes: [], examTips: ['JEE: All trig identities derive from sin²+cos²=1.'],
    };
  }

  // sin 2x = 2 sin x cos x
  if (t.includes('sin 2') && t.match(/2\s*sin.*cos|double.*angle/)) {
    return {
      finalAnswer: '2 sin x cos x',
      finalFormula: `\\sin 2x = 2\\sin x \\cos x`,
      steps: [{ desc: 'Double angle formula for sine', formula: `\\sin 2x = 2\\sin x \\cos x` }],
      altSteps: [], similar: [], mistakes: [],
      examTips: ['JEE: Know all double angle formulas and half-angle formulas.'],
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: PROBABILITY & STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

function solveConditionalProb(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  if (!t.match(/p\s*\(|probability|bayes|conditional/i)) return null;
  const nums = pN(t);
  if (nums.length < 2) return null;

  // P(A∩B) = P(A)·P(B|A)
  if (t.includes('given') || t.includes('conditional') || t.includes('b|a') || t.includes('a|b')) {
    const pA = nums[0]/100 > 1 ? nums[0]/100 : nums[0];
    const pBA = nums.length > 1 ? (nums[1]/100 > 1 ? nums[1]/100 : nums[1]) : 0.5;
    const result = pA * pBA;
    return {
      finalAnswer: fmt(result),
      finalFormula: `P(A \cap B) = P(A) \cdot P(B|A) = ${fmt(result)}`,
      steps: [
        { desc: 'Conditional probability formula', formula: `P(A \cap B) = P(A) \cdot P(B|A)` },
        { desc: 'Substitute', formula: `= ${fmt(pA)} \times ${fmt(pBA)} = ${fmt(result)}` },
      ], altSteps: [], similar: [],
      mistakes: ['P(A|B) ≠ P(B|A) — they are generally different!'],
      examTips: ['JEE: Bayes theorem: P(A|B) = P(B|A)·P(A)/P(B).'],
    };
  }

  // P(A or B) = P(A) + P(B) - P(A∩B)
  if (t.match(/or|union|\+/) && t.match(/and|intersect|\-/)) {
    const pA = nums[0]/100 > 1 ? nums[0]/100 : nums[0];
    const pB = nums[1]/100 > 1 ? nums[1]/100 : nums[1];
    const pAB = nums.length > 2 ? (nums[2]/100 > 1 ? nums[2]/100 : nums[2]) : 0;
    const result = pA + pB - pAB;
    return {
      finalAnswer: fmt(result),
      finalFormula: `P(A \cup B) = P(A)+P(B)-P(A \cap B) = ${fmt(result)}`,
      steps: [
        { desc: 'Addition rule', formula: `= ${fmt(pA)}+${fmt(pB)}-${fmt(pAB)} = ${fmt(result)}` },
      ], altSteps: [], similar: [],
      mistakes: ['Forgetting to subtract P(A∩B) — this corrects for double counting'],
      examTips: [],
    };
  }
  return null;
}

// Mean, variance, standard deviation
function solveStatsAdvanced(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  const nums = N(t);

  if (t.match(/variance|standard\s*deviation|std/i) && nums.length >= 2) {
    const mean = nums.reduce((a,b)=>a+b,0)/nums.length;
    const variance = nums.reduce((s,x)=>s+(x-mean)**2,0)/nums.length;
    const sd = Math.sqrt(variance);
    return {
      finalAnswer: t.includes('variance') ? fmt(variance) : fmt(sd),
      finalFormula: t.includes('variance') ? `\sigma^2 = ${fmt(variance)}` : `\sigma = ${fmt(sd)}`,
      steps: [
        { desc: 'Calculate mean', formula: `\bar{x} = ${fmt(mean)}` },
        { desc: 'Variance = E[(X-μ)²]', formula: `\sigma^2 = ${fmt(variance)}` },
        { desc: 'Standard deviation', formula: `\sigma = \sqrt{${fmt(variance)}} = ${fmt(sd)}` },
      ], altSteps: [], similar: [],
      mistakes: ['Population variance uses N, sample variance uses N-1 (Bessel correction)'],
      examTips: ['JEE: Know the difference between population and sample parameters.'],
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: JEE-LEVEL PHYSICS
// ═══════════════════════════════════════════════════════════════════════════════

// Rotational mechanics: torque, moment of inertia
function solveRotational(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = N(t);

  // Torque τ = r × F = rF sinθ
  if (t.match(/torque|\bτ\b|moment.*force/) && nums.length >= 3) {
    const r=nums[0], F=nums[1], theta=nums[2];
    const torque = r * F * Math.sin(theta * Math.PI/180);
    return {
      finalAnswer: fmt(torque) + ' N·m',
      finalFormula: `\tau = rF\sin\theta = ${fmt(r)} \times ${fmt(F)} \times \sin ${fmt(theta)}° = ${fmt(torque)} \, \text{N·m}`,
      steps: [
        { desc: 'Torque formula', formula: `\tau = rF\sin\theta` },
        { desc: `r=${fmt(r)}m, F=${fmt(F)}N, θ=${fmt(theta)}°`, formula: `= ${fmt(torque)} N·m` },
      ], altSteps: [], similar: [],
      mistakes: ['τ = rF sinθ, NOT rF cosθ'],
      examTips: ['JEE: Torque is maximum when θ=90° and zero when θ=0°.'],
    };
  }

  // Moment of inertia: solid sphere I = 2/5 mr²
  if (t.match(/moment.*inertia|\bI\s*=|rotational.*inertia/i) && t.includes('sphere')) {
    if (nums.length >= 2) {
      const m=nums[0], r=nums[1];
      const I = 0.4 * m * r * r;
      return {
        finalAnswer: fmt(I) + ' kg·m²',
        finalFormula: `I = \frac{2}{5}mr^2 = ${fmt(I)} \, \text{kg·m}^2`,
        steps: [{ desc: 'Solid sphere about diameter', formula: `I = 2/5 × ${fmt(m)} × ${fmt(r)}² = ${fmt(I)}` }],
        altSteps: [], similar: [],
        mistakes: ['Hollow sphere: I=2/3 mr², NOT 2/5 mr²'],
        examTips: ['JEE: Memorize MOI for rod, ring, disc, solid/hollow sphere, cylinder.'],
      };
    }
  }
  return null;
}

// SHM
function solveSHM(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = N(t);
  if (!t.match(/shm|simple.*harmonic|oscillat|frequency|period|angular.*freq/i)) return null;

  // T = 2π√(m/k)
  if (t.match(/period|time.*period/i) && nums.length >= 2) {
    const m=nums[0], k=nums[1];
    const T = 2 * Math.PI * Math.sqrt(m/k);
    return {
      finalAnswer: fmt(T) + ' s',
      finalFormula: `T = 2\pi\sqrt{m/k} = ${fmt(T)} \, s`,
      steps: [{ desc: 'Period of spring-mass system', formula: `T = 2\pi\sqrt{${fmt(m)}/${fmt(k)}} = ${fmt(T)}` }],
      altSteps: [{ desc: 'Frequency f = 1/T = ' + fmt(1/T) + ' Hz', formula: '' }],
      similar: [],
      mistakes: ['T = 2π√(k/m) is WRONG — it is √(m/k)'],
      examTips: ['JEE: Also know T for simple pendulum = 2π√(L/g).'],
    };
  }

  // Angular frequency ω = 2πf = √(k/m)
  if (t.match(/angular.*freq|\bω\b|omega/) && nums.length >= 2) {
    const m=nums[0], k=nums[1];
    const omega = Math.sqrt(k/m);
    return {
      finalAnswer: fmt(omega) + ' rad/s',
      finalFormula: `\omega = \sqrt{k/m} = ${fmt(omega)} \, rad/s`,
      steps: [{ desc: 'Angular frequency of SHM', formula: `\omega = \sqrt{${fmt(k)}/${fmt(m)}} = ${fmt(omega)}` }],
      altSteps: [], similar: [], mistakes: [], examTips: [],
    };
  }
  return null;
}

// Electrostatics: Gauss law, capacitance
function solveElectrostatics(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = N(t);

  // Gauss law: Φ = Q/ε₀
  if (t.match(/gauss|electric.*flux|\bΦ\b/) && t.match(/charge|\bQ\b/)) {
    if (nums.length >= 1) {
      const Q = nums[0] * 1e-6; // assume μC
      const eps0 = 8.854e-12;
      const flux = Q / eps0;
      return {
        finalAnswer: fmt(flux/1e3) + ' × 10³ N·m²/C',
        finalFormula: `\Phi = Q/\varepsilon_0 = ${fmt(flux)} \, \text{N·m}^2/\text{C}`,
        steps: [
          { desc: 'Gauss Law', formula: `\Phi = \oint \vec{E} \cdot d\vec{A} = Q_{enc}/\varepsilon_0` },
          { desc: `Q = ${fmt(Q)} C, ε₀ = 8.854 × 10⁻¹² C²/N·m²`, formula: `\Phi = ${fmt(flux)}` },
        ], altSteps: [], similar: [],
        mistakes: ['Gauss law: Φ = Q/ε₀, NOT Qε₀'],
        examTips: ['JEE: ε₀ = 8.854 × 10⁻¹² C²/(N·m²). Gauss law is fundamental for symmetric charge distributions.'],
      };
    }
  }

  // Capacitance: C = ε₀A/d, energy = ½CV²
  if (t.match(/capacit|\bC\b.*=.*ε|energy.*capacit/) && nums.length >= 2) {
    const A = nums[0], d = nums[1];
    const eps0 = 8.854e-12;
    const C = eps0 * A / d;
    return {
      finalAnswer: fmt(C*1e12) + ' pF',
      finalFormula: `C = \varepsilon_0 A/d = ${fmt(C*1e12)} \, pF`,
      steps: [{ desc: 'Parallel plate capacitor', formula: `C = \varepsilon_0 A/d` }],
      altSteps: [], similar: [],
      mistakes: ['With dielectric: C = Kε₀A/d where K is dielectric constant'],
      examTips: ['JEE: Energy = ½CV² = Q²/2C = ½QV.'],
    };
  }
  return null;
}

// Modern physics: photoelectric effect, de Broglie
function solveModernPhysics(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = N(t);

  // Photoelectric: KE_max = hf - φ
  if (t.match(/photoelectric|photon|work.*function|threshold/i) && nums.length >= 2) {
    const f = nums[0] * 1e14; // Hz
    const phi = nums[1] * 1.6e-19; // eV to J
    const h = 6.626e-34;
    const KE = h * f - phi;
    return {
      finalAnswer: fmt(KE/1.6e-19) + ' eV',
      finalFormula: `KE_{max} = hf - \phi = ${fmt(KE/1.6e-19)} \, eV`,
      steps: [
        { desc: 'Einstein photoelectric equation', formula: `KE_{max} = hf - \phi` },
        { desc: `h=${fmt(h)} J·s, f=${fmt(f)} Hz, φ=${fmt(phi)} J`, formula: `KE = ${fmt(KE)} J = ${fmt(KE/1.6e-19)} eV` },
      ], altSteps: [], similar: [],
      mistakes: ['φ (work function) must be in Joules for calculation, convert from eV using 1eV=1.6×10⁻¹⁹J'],
      examTips: ['JEE: If KE<0, no photoelectrons are emitted (f < f₀).'],
    };
  }

  // de Broglie wavelength: λ = h/mv
  if (t.match(/de broglie|wavelength.*particle|\bλ\b.*particle/i) && nums.length >= 2) {
    const m = nums[0] * 1e-31; // kg
    const v = nums[1]; // m/s
    const h = 6.626e-34;
    const lambda = h / (m * v);
    return {
      finalAnswer: fmt(lambda*1e10) + ' Å',
      finalFormula: `\lambda = h/mv = ${fmt(lambda*1e10)} \, Å`,
      steps: [
        { desc: 'de Broglie relation', formula: `\lambda = h/(mv) = ${fmt(h)}/(${fmt(m*v)})` },
      ], altSteps: [], similar: [],
      mistakes: ['de Broglie: λ = h/p = h/(mv), NOT h/(mc)'],
      examTips: ['JEE: For electrons accelerated through V volts: λ = 12.27/√V Å.'],
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: JEE-LEVEL CHEMISTRY
// ═══════════════════════════════════════════════════════════════════════════════

// Thermodynamics: ΔG = ΔH - TΔS
function solveThermoGibbs(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = N(t);
  if (!t.match(/gibbs|δg|delta.*g|free.*energy|spontaneous/i)) return null;
  if (nums.length < 3) return null;
  const dH = nums[0], T = nums[1], dS = nums[2];
  const dG = dH - T * dS;
  return {
    finalAnswer: `ΔG = ${fmt(dG)} kJ/mol (${dG < 0 ? 'spontaneous' : 'non-spontaneous'})`,
    finalFormula: `\Delta G = \Delta H - T\Delta S = ${fmt(dG)} \, kJ/mol`,
    steps: [
      { desc: 'Gibbs free energy equation', formula: `\Delta G = ${fmt(dH)} - ${fmt(T)} \times ${fmt(dS)} = ${fmt(dG)}` },
      { desc: dG < 0 ? 'ΔG < 0, so the process is spontaneous' : 'ΔG ≥ 0, so the process is non-spontaneous', formula: '' },
    ], altSteps: [], similar: [],
    mistakes: ['ΔG < 0 means spontaneous, ΔG = 0 means equilibrium, ΔG > 0 means non-spontaneous'],
    examTips: ['JEE: At equilibrium ΔG=0, so T = ΔH/ΔS (when ΔS>0).'],
  };
}

// Nernst equation: E = E° - (RT/nF)ln(Q)
function solveNernst(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  if (!t.match(/nernst|cell.*potential|emf.*cell/i)) return null;
  const nums = N(t);
  if (nums.length < 3) return null;
  const E0 = nums[0], n = nums[1], Q = nums[2];
  const R = 8.314, F = 96500, T = 298;
  const E = E0 - (R*T)/(n*F) * Math.log(Q);
  return {
    finalAnswer: fmt(E) + ' V',
    finalFormula: `E = E° - \frac{0.0591}{n}\log Q = ${fmt(E)} \, V`,
    steps: [
      { desc: 'Nernst equation at 298K', formula: `E = ${fmt(E0)} - \frac{0.0591}{${n}}\log(${fmt(Q)})` },
      { desc: 'Calculate', formula: `= ${fmt(E)} V` },
    ], altSteps: [], similar: [],
    mistakes: ['Nernst uses ln(Q) in SI form but log₁₀(Q) with 0.0591 constant at 298K'],
    examTips: ['JEE: 0.0591 = (2.303RT)/F at 298K. Know this number.'],
  };
}

// Chemical kinetics: Arrhenius equation, rate constant
function solveKinetics(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = N(t);

  // Rate constant from Arrhenius: k = A·e^(-Ea/RT)
  if (t.match(/arrhenius|rate.*constant|activation.*energy/i) && nums.length >= 3) {
    const A = nums[0], Ea = nums[1] * 1000, T = nums[2]; // Ea in kJ→J
    const R = 8.314;
    const k = A * Math.exp(-Ea / (R * T));
    return {
      finalAnswer: fmt(k) + ' s⁻¹',
      finalFormula: `k = Ae^{-E_a/RT} = ${fmt(k)} \, s^{-1}`,
      steps: [
        { desc: 'Arrhenius equation', formula: `k = ${fmt(A)} \cdot e^{-${fmt(Ea)}/(${fmt(R)} \times ${fmt(T)})}` },
        { desc: 'Calculate', formula: `= ${fmt(k)}` },
      ], altSteps: [], similar: [],
      mistakes: ['Ea must be in Joules when using R = 8.314 J/(mol·K)'],
      examTips: ['JEE: Log form: ln(k₂/k₁) = (Ea/R)(1/T₁ - 1/T₂) for comparing two temperatures.'],
    };
  }

  // First order: t½ = 0.693/k
  if (t.match(/half.?life|t.*½|t.*1\/2/i) && t.match(/first.*order|1st.*order/i) && nums.length >= 1) {
    const k = nums[0];
    const t_half = 0.693 / k;
    return {
      finalAnswer: fmt(t_half),
      finalFormula: `t_{1/2} = 0.693/k = ${fmt(t_half)}`,
      steps: [{ desc: 'First order half-life', formula: `t_{1/2} = \frac{\ln 2}{k} = \frac{0.693}{${fmt(k)}} = ${fmt(t_half)}` }],
      altSteps: [], similar: [],
      mistakes: ['First order t½ = 0.693/k (independent of initial concentration!)'],
      examTips: ['JEE: t½ for zero order = [A]₀/2k, first = 0.693/k, second = 1/(k[A]₀).'],
    };
  }
  return null;
}

// Coordination chemistry: CFSE, magnetic moment
function solveCoordination(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = text || m[0];
  const nums = pN(t);

  // Magnetic moment: μ = √(n(n+2)) BM
  if (t.match(/magnetic.*moment|spin.*only|μ/) && nums.length >= 1) {
    const n = nums[0]; // unpaired electrons
    const mu = Math.sqrt(n * (n + 2));
    return {
      finalAnswer: fmt(mu) + ' BM',
      finalFormula: `\mu = \sqrt{n(n+2)} = \sqrt{${n} \times ${n+2}} = ${fmt(mu)} \, BM`,
      steps: [{ desc: 'Spin-only magnetic moment formula', formula: `\mu = \sqrt{${n}(${n+2})} = ${fmt(mu)} BM` }],
      altSteps: [], similar: [],
      mistakes: ['This is spin-only formula; orbital contribution adds for heavier elements'],
      examTips: ['JEE: For d-block: find unpaired e⁻ from crystal field splitting, then use μ = √(n(n+2)).'],
    };
  }
  return null;
}

// Organic: degree of unsaturation
function solveDegreeOfUnsat(m: RegExpMatchArray, text?: string): LocalSolution | null {
  const t = (text || m[0]).toLowerCase();
  if (!t.match(/degree.*unsaturation|double.*bond.*equiv|d.*b.*e|index.*hydrogen/i)) return null;
  const nums = pN(t);
  if (nums.length < 2) return null;
  const C = nums[0], H = nums[1];
  const N_count = t.match(/nitrogen|\bN\b/) ? (nums[2] || 0) : 0;
  const Hal = t.match(/halogen|cl|br|f\b|i\b/) ? (nums[2 + (N_count > 0 ? 1 : 0)] || 0) : 0;
  const DOU = C + 1 - (H - Hal + N_count) / 2;
  return {
    finalAnswer: fmt(DOU),
    finalFormula: `DOU = C + 1 - \frac{H - X + N}{2} = ${fmt(DOU)}`,
    steps: [
      { desc: 'Degree of Unsaturation formula', formula: `DOU = ${C} + 1 - \frac{${H}}{2} = ${fmt(DOU)}` },
      { desc: `Each DOU = 1 double bond or 1 ring. DOU=2 could be 2 double bonds, 1 triple bond, or 2 rings, etc.`, formula: '' },
    ], altSteps: [], similar: [],
    mistakes: ['Oxygen and sulfur do NOT affect the DOU count', 'For each halogen, add 1 to H; for each N, subtract 1 from H'],
    examTips: ['JEE: DOU = 1 → benzene has DOU = 4 (3 double bonds + 1 ring).'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN MATCHING & EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

const JEE_PATTERNS: PatternRule[] = [
  // Calculus - Limits
  {regex: /x\^\d.*[-+].*\d.*\//, solver: solveLimitPowerDiff, useFullText: true},
  {regex: /limit|lim|→|->/i, solver: solveLimitTrigStd, useFullText: true},
  {regex: /limit|lim|→|->/i, solver: solveLimitLHopital, useFullText: true},
  {regex: /limit|lim|→|->/i, solver: solveLimitExpansion, useFullText: true},

  // Calculus - Derivatives
  {regex: /d\/dx|derivative|differentiate/i, solver: solveDerivativeTrig, useFullText: true},
  {regex: /d\/dx|derivative|differentiate/i, solver: solveDerivativeExpLog, useFullText: true},
  {regex: /d\/dx|derivative|differentiate/i, solver: solveDerivativeChainRule, useFullText: true},
  {regex: /d\s*\^\s*\d+.*dx/i, solver: solveHigherOrderDeriv, useFullText: true},

  // Calculus - Integration
  {regex: /∫|integrate|integral/i, solver: solveIntegralPower, useFullText: true},
  {regex: /∫|integrate|integral/i, solver: solveIntegralByParts, useFullText: true},
  {regex: /∫|integrate|integral/i, solver: solveDefiniteIntegral, useFullText: true},

  // Differential Equations
  {regex: /dy\/dx.*y|differential.*equation|solve.*dy/i, solver: solveLinearDE, useFullText: true},
  {regex: /dy\/dx.*=.*ky|dy\/dx.*=.*\d+y/i, solver: solveSeparableDE, useFullText: true},
  {regex: /second.*order|2nd.*order|d\^?2/i, solver: solveSecondOrderDE, useFullText: true},

  // Advanced Algebra
  {regex: /discriminant|nature.*root/i, solver: solveDiscriminant, useFullText: true},
  {regex: /de moivre|demoivre|cos.*i.*sin/i, solver: solveDeMoivre, useFullText: true},
  {regex: /binomial|^\s*\d+.*term|(?:st|nd|rd|th)\s*term/i, solver: solveBinomialTerm, useFullText: true},
  {regex: /det|determinant/i, solver: solveDet3x3, useFullText: true},
  {regex: /combination|choose|permutation|arrange/i, solver: solvePCAdvanced, useFullText: true},
  {regex: /sum.*(?:square|cube)|infinite.*(?:gp|geometric)/i, solver: solveSumFormulas, useFullText: true},

  // Coordinate Geometry
  {regex: /distance|dist.*between/i, solver: solveDist2D, useFullText: true},
  {regex: /area.*triangle/i, solver: solveAreaTriCoords, useFullText: true},
  {regex: /circle.*center|center.*radius/i, solver: solveCircleEq, useFullText: true},
  {regex: /parabola|ellipse|hyperbola/i, solver: solveConicSection, useFullText: true},

  // Trigonometry
  {regex: /sin\s*[xX]\s*=|cos\s*[xX]\s*=|tan\s*[xX]\s*=/i, solver: solveTrigEquation, useFullText: true},
  {regex: /sin\^2.*cos\^2|prove.*trig|trig.*identity/i, solver: solveTrigIdentity, useFullText: true},

  // Probability & Statistics
  {regex: /probability|p\s*\(|bayes|conditional/i, solver: solveConditionalProb, useFullText: true},
  {regex: /variance|standard.*dev/i, solver: solveStatsAdvanced, useFullText: true},

  // JEE Physics
  {regex: /torque|moment.*force/i, solver: solveRotational, useFullText: true},
  {regex: /shm|simple.*harmonic|angular.*freq|omega/i, solver: solveSHM, useFullText: true},
  {regex: /gauss|electric.*flux|capacit/i, solver: solveElectrostatics, useFullText: true},
  {regex: /photoelectric|de broglie|photon.*energy/i, solver: solveModernPhysics, useFullText: true},

  // JEE Chemistry
  {regex: /gibbs|delta.*g|free.*energy|spontaneous/i, solver: solveThermoGibbs, useFullText: true},
  {regex: /nernst|cell.*potential|emf/i, solver: solveNernst, useFullText: true},
  {regex: /arrhenius|rate.*constant|activation.*energy|half.?life/i, solver: solveKinetics, useFullText: true},
  {regex: /magnetic.*moment|cfse|coordination/i, solver: solveCoordination, useFullText: true},
  {regex: /degree.*unsaturation|double.*bond.*equiv/i, solver: solveDegreeOfUnsat, useFullText: true},
];

export function tryJEESolve(problem: string, _subject?: string): LocalSolution | null {
  const norm = problem.toLowerCase().trim();
  for (const rule of JEE_PATTERNS) {
    const match = norm.match(rule.regex);
    if (match) {
      try {
        const sol = rule.solver(match, rule.useFullText ? norm : undefined);
        if (sol) {
          console.log(`[JEE-Local] Matched: "${norm.slice(0, 80)}..."`);
          return sol;
        }
      } catch (e) { console.error(`[JEE-Local] Error:`, e); }
    }
  }
  return null;
}
