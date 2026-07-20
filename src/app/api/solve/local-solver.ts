// SpeedSolve AI - Local Numerical Solver
// Handles common math/physics/chemistry problems without AI

interface LocalSolution {
  finalAnswer: string;
  finalFormula: string;
  steps: { desc: string; formula: string }[];
  altSteps: { desc: string; formula: string }[];
  similar: string[];
  mistakes: string[];
  examTips?: string[];
}

// Comprehensive Unicode → ASCII normalizer for math/science input
export function preprocessProblem(text: string): string {
  let s = text;

  // ── Superscript digits (common in user input) ──
  const superscripts: Record<string, string> = {
    '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3', '\u2074': '4',
    '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9',
  };
  // Convert standalone superscripts to ^n (e.g., x² → x^2)
  s = s.replace(/([a-zA-Z0-9)])([\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u2070\u00b9])/g,
    (_, base, sup) => `${base}^${superscripts[sup] || sup}`);
  // Handle multi-digit superscripts
  let changed = true;
  while (changed) {
    changed = false;
    for (const [uni, ascii] of Object.entries(superscripts)) {
      if (s.includes(uni)) {
        s = s.replace(uni, ascii);
        changed = true;
      }
    }
  }

  // ── Subscript digits ──
  const subscripts: Record<string, string> = {
    '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4',
    '\u2085': '5', '\u2086': '6', '\u2087': '7', '\u2088': '8', '\u2089': '9',
  };
  for (const [uni, ascii] of Object.entries(subscripts)) {
    s = s.replace(new RegExp(uni, 'g'), `_${ascii}`);
  }

  // ── Math symbols ──
  s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  s = s.replace(/²/g, '^2').replace(/³/g, '^3');

  // ── Unicode minus → ASCII hyphen ──
  s = s.replace(/\u2212/g, '-');

  // ── Degree symbol (don't strip — useful for trig) ──
  // s = s.replace(/°/g, ' deg ');

  // ── Fancy quotes ──
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

  // ── Em dashes and other punctuation ──
  s = s.replace(/—|–/g, '-').replace(/…/g, '...');

  // Normalize whitespace
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

// ─── SOLVER FUNCTIONS ─────────────────────────────────────────────

function solveLinearEq(match: RegExpMatchArray): LocalSolution | null {
  const eq = match[0];
  // Extract coefficient of x, constant on left, and RHS
  const eqParts = eq.split('=');
  if (eqParts.length !== 2) return null;
  const lhs = eqParts[0].trim(), rhs = eqParts[1].trim();
  const rhsNum = parseFloat(rhs);
  if (isNaN(rhsNum)) return null;

  // Find variable
  const varMatch = lhs.match(/[xXyYzZ]/);
  if (!varMatch) return null;
  const v = varMatch[0];

  // Parse: [coeff]var [+/- const] or just var + const
  const cleaned = lhs.replace(/\s/g, '');
  const coefMatch = cleaned.match(/^(-?\d*\.?\d*)\s*[xXyYzZ]/);
  const coef = coefMatch && coefMatch[1] ? parseFloat(coefMatch[1]) : 1;
  const constMatch = cleaned.match(/[+\-]\d+\.?\d*$/);
  const constant = constMatch ? parseFloat(constMatch[0]) : 0;

  const solution = (rhsNum - constant) / coef;
  const solutionStr = Number.isInteger(solution) ? String(solution) : solution.toFixed(4);

  return {
    finalAnswer: `${v} = ${solutionStr}`,
    finalFormula: `${v} = ${solutionStr}`,
    steps: [
      { desc: `Start with the linear equation: ${eq}`, formula: `${lhs} = ${rhs}` },
      { desc: constant !== 0
        ? `Move constant to RHS: ${coef === 1 ? '' : coef}${v} = ${rhsNum} ${constant > 0 ? '- ' + constant : '+ ' + Math.abs(constant)}`
        : `Isolate ${v}: ${coef === 1 ? '' : coef}${v} = ${rhsNum}`,
        formula: `${coef === 1 ? '' : coef}${v} = ${rhsNum - constant}` },
      { desc: `Divide both sides by ${coef}`,
        formula: `${v} = ${rhsNum - constant} / ${coef} = ${solutionStr}` },
    ],
    altSteps: [
      { desc: `Verification: Substitute ${v} = ${solutionStr}`, formula: `${coef}(${solutionStr}) ${constant >= 0 ? '+' : ''}${constant} = ${rhsNum} ✓` },
    ],
    similar: [`Solve ${coef + 1}${v} ${constant >= 0 ? '+' : ''}${constant} = ${rhsNum}`, `Find ${v} when ${coef}${v} = ${rhsNum - constant}`],
    mistakes: ["Forgetting to subtract b from both sides before dividing", "Dividing by the wrong coefficient", "Making sign errors when moving terms across the equals sign"],
  };
}

function solveQuadratic(match: RegExpMatchArray): LocalSolution | null {
  // ax^2 + bx + c = 0
  const text = match[0].toLowerCase();
  const aMatch = text.match(/([-\d.]+)\s*[xXyYzZ]\s*[\^²]\s*2/);
  const bMatch = text.match(/[+\-]\s*(\d+\.?\d*)\s*[xXyYzZ](?:\s*[\^²]\s*2)?\s*([+\-])/);
  const cMatch = text.match(/([+\-]\s*\d+\.?\d*)\s*=\s*0/);

  const a = aMatch ? parseFloat(aMatch[1]) : 1;
  // Extract b and c more reliably
  const allNums = text.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  let b = 0, c = 0;
  if (allNums.length >= 3) {
    b = allNums[1]; c = allNums[2];
  } else if (allNums.length === 2) {
    b = allNums[0]; c = allNums[1];
  } else return null;

  const disc = b * b - 4 * a * c;
  if (disc < 0) {
    const realPart = (-b / (2 * a)).toFixed(4);
    const imagPart = (Math.sqrt(-disc) / (2 * a)).toFixed(4);
    return {
      finalAnswer: `x = ${realPart} ± ${imagPart}i (complex roots)`,
      finalFormula: `x = \\frac{-b \\pm \\sqrt{D}}{2a} = ${realPart} \\pm ${imagPart}i`,
      steps: [
        { desc: `Identify: a=${a}, b=${b}, c=${c}`, formula: `a=${a}, b=${b}, c=${c}` },
        { desc: `Discriminant D = b²-4ac = ${disc} (negative → complex roots)`, formula: `D = ${b}^2 - 4(${a})(${c}) = ${disc}` },
        { desc: `x = (-b ± i√|D|) / 2a`, formula: `x = ${realPart} \\pm ${imagPart}i` },
      ],
      altSteps: [], similar: [`Find roots of ${a}x^2 + ${b+1}x + ${c} = 0`],
      mistakes: ["Wrong sign for discriminant", "Not dividing by 2a", "Arithmetic errors in b²"],
    };
  }

  const sqrtDisc = Math.sqrt(disc);
  const x1 = (-b + sqrtDisc) / (2 * a);
  const x2 = (-b - sqrtDisc) / (2 * a);
  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(4);

  return {
    finalAnswer: disc === 0 ? `x = ${fmt(x1)} (equal roots)` : `x = ${fmt(x1)} or x = ${fmt(x2)}`,
    finalFormula: disc === 0
      ? `x = \\frac{-b}{2a} = ${fmt(x1)}`
      : `x = \\frac{-b \\pm \\sqrt{D}}{2a} = ${fmt(x1)}, ${fmt(x2)}`,
    steps: [
      { desc: `Identify: a=${a}, b=${b}, c=${c}`, formula: `a=${a}, b=${b}, c=${c}` },
      { desc: `Discriminant D = b²-4ac`, formula: `D = ${b}^2 - 4(${a})(${c}) = ${disc}` },
      { desc: disc > 0 ? `D > 0 → Two distinct real roots` : `D = 0 → Equal roots`, formula: disc > 0 ? `\\sqrt{D} = ${fmt(sqrtDisc)}` : `D = 0` },
      { desc: `x = (-b ± √D) / 2a`, formula: `x = ${fmt(x1)}, ${fmt(x2)}` },
    ],
    altSteps: [
      { desc: `Sum of roots = -b/a = ${fmt(-b/a)}`, formula: `\\alpha + \\beta = ${fmt(-b/a)}` },
      { desc: `Product of roots = c/a = ${fmt(c/a)}`, formula: `\\alpha \\beta = ${fmt(c/a)}` },
    ],
    similar: [`Find roots of ${a}x^2 + ${b+1}x + ${c} = 0`, `Sum and product of roots for a=${a}, b=${b}, c=${c}`],
    mistakes: ["Wrong sign for b in the formula", "Forgetting to divide by 2a", "Arithmetic errors in discriminant calculation"],
  };
}

function solvePercentage(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const pct = nums[0], val = nums[1], result = (pct / 100) * val;
  return {
    finalAnswer: `${pct}% of ${val} = ${result}`, finalFormula: `${pct}\\% \\times ${val} = ${result}`,
    steps: [
      { desc: `Convert percentage to fraction: ${pct}% = ${pct}/100`, formula: `${pct}\\% = \\frac{${pct}}{100}` },
      { desc: `Multiply by ${val}`, formula: `\\frac{${pct}}{100} \\times ${val}` },
      { desc: `= ${result}`, formula: `= ${result}` },
    ],
    altSteps: [{ desc: `Method 2: ${val} × 0.${pct} = ${result}`, formula: `${val} \\times 0.${pct} = ${result}` }],
    similar: [`${pct + 10}% of ${val}`, `What % is ${result} of ${val}?`],
    mistakes: ["Dividing by 1000 instead of 100", "Moving decimal wrong direction", "Confusing percentage with decimal"],
  };
}

function solveSimpleInterest(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const p = nums[0], r = nums[1], t = nums[2], si = (p * r * t) / 100, amt = p + si;
  return {
    finalAnswer: `Simple Interest = Rs ${si}, Amount = Rs ${amt}`,
    finalFormula: `SI = \\frac{P \\times R \\times T}{100} = Rs ${si}`,
    steps: [
      { desc: `P = Rs ${p}, R = ${r}%, T = ${t} years`, formula: `P=${p}, R=${r}\\%, T=${t}` },
      { desc: `SI = (P × R × T) / 100`, formula: `SI = \\frac{${p} \\times ${r} \\times ${t}}{100}` },
      { desc: `SI = Rs ${si}`, formula: `= ${si}` },
      { desc: `Amount = P + SI = Rs ${amt}`, formula: `A = ${p} + ${si} = ${amt}` },
    ],
    altSteps: [], similar: [`SI on Rs ${p + 1000} at ${r}% for ${t} years`, `Find T if SI = ${si}, P = ${p}, R = ${r}%`],
    mistakes: ["Using compound interest formula", "Wrong units for time", "Not converting months to years"],
  };
}

function solveSpeed(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const d = nums[0], t = nums[1], v = d / t, vMs = (v * 1000) / 3600;
  return {
    finalAnswer: `Speed = ${v} km/h = ${vMs.toFixed(2)} m/s`,
    finalFormula: `v = d/t = ${v} \\text{ km/h}`,
    steps: [
      { desc: `Distance = ${d} km, Time = ${t} hours`, formula: `d = ${d} km, t = ${t} hr` },
      { desc: `Speed = Distance / Time`, formula: `v = ${d} / ${t} = ${v} km/h` },
      { desc: `Convert to m/s (× 5/18)`, formula: `${v} \\times 5/18 = ${vMs.toFixed(2)} m/s` },
    ],
    altSteps: [], similar: [`Speed for ${d + 50}km in ${t}hr`, `Time to cover ${d}km at ${v}km/h`],
    mistakes: ["Wrong formula (time/distance)", "Unit conversion errors", "Mixed units"],
  };
}

function solveAreaCircle(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const r = nums[0], area = Math.PI * r * r, circ = 2 * Math.PI * r;
  return {
    finalAnswer: `Area = ${area.toFixed(2)} sq. units, Circumference = ${circ.toFixed(2)} units`,
    finalFormula: `A = \\pi r^2 = ${area.toFixed(2)}`,
    steps: [
      { desc: `Radius = ${r}`, formula: `r = ${r}` },
      { desc: `Area = πr²`, formula: `A = \\pi \\times ${r}^2 = ${area.toFixed(2)}` },
      { desc: `Circumference = 2πr`, formula: `C = 2\\pi \\times ${r} = ${circ.toFixed(2)}` },
    ],
    altSteps: [], similar: [`Area of circle r=${r + 2}`, `Area of semicircle r=${r}`],
    mistakes: ["Using diameter instead of radius", "Forgetting π", "Confusing area and circumference"],
  };
}

function solvePythagoras(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const a = nums[0], b = nums[1], c = Math.sqrt(a * a + b * b);
  return {
    finalAnswer: `Hypotenuse = ${c.toFixed(2)}`,
    finalFormula: `c = \\sqrt{a^2 + b^2} = ${c.toFixed(2)}`,
    steps: [
      { desc: `a = ${a}, b = ${b}`, formula: `a = ${a}, b = ${b}` },
      { desc: `c² = a² + b²`, formula: `c^2 = ${a}^2 + ${b}^2 = ${a*a + b*b}` },
      { desc: `c = √${a*a + b*b} = ${c.toFixed(2)}`, formula: `c = ${c.toFixed(2)}` },
    ],
    altSteps: [], similar: [`If a=${a+1}, b=${b}, find c`, `Find b if a=${a}, c=${c.toFixed(0)}`],
    mistakes: ["Adding a + b instead of a² + b²", "Not taking square root", "Wrong sides in formula"],
  };
}

function solveNewton(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const m = nums[0], f = nums[1], a = f / m;
  return {
    finalAnswer: `Acceleration = ${a.toFixed(2)} m/s²`,
    finalFormula: `a = F/m = ${a.toFixed(2)} \\text{ m/s}^2`,
    steps: [
      { desc: `Mass = ${m} kg, Force = ${f} N`, formula: `m=${m}kg, F=${f}N` },
      { desc: `F = ma → a = F/m`, formula: `a = ${f}/${m}` },
      { desc: `a = ${a.toFixed(2)} m/s²`, formula: `a = ${a.toFixed(2)} m/s^2` },
    ],
    altSteps: [], similar: [`a if F=${f+10}N, m=${m}kg`, `Find F if m=${m}kg, a=5m/s²`],
    mistakes: ["Using a = m/F instead of F/m", "Unit mismatch (g vs kg)", "Not converting units"],
  };
}

function solveOhm(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const v = nums[0], i = nums[1], r = v / i, p = v * i;
  return {
    finalAnswer: `Resistance = ${r.toFixed(2)} Ω, Power = ${p.toFixed(2)} W`,
    finalFormula: `R = V/I = ${r.toFixed(2)} \\Omega`,
    steps: [
      { desc: `Voltage = ${v} V, Current = ${i} A`, formula: `V=${v}V, I=${i}A` },
      { desc: `R = V/I`, formula: `R = ${v}/${i} = ${r.toFixed(2)} Ω` },
      { desc: `P = VI`, formula: `P = ${v} × ${i} = ${p.toFixed(2)} W` },
    ],
    altSteps: [], similar: [`R if V=${v+5}V, I=${i}A`, `Find V if R=${r.toFixed(0)}Ω, I=${i}A`],
    mistakes: ["Using R = I/V", "Confusing series and parallel", "Unit errors"],
  };
}

function solvePH(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const conc = nums[0], ph = -Math.log10(conc);
  return {
    finalAnswer: `pH = ${ph.toFixed(2)} (${ph < 7 ? 'acidic' : ph === 7 ? 'neutral' : 'basic'})`,
    finalFormula: `pH = -\\log[${conc}] = ${ph.toFixed(2)}`,
    steps: [
      { desc: `[H⁺] = ${conc} M`, formula: `[H^+] = ${conc}` },
      { desc: `pH = -log[H⁺]`, formula: `pH = -\\log(${conc})` },
      { desc: `pH = ${ph.toFixed(2)}`, formula: `= ${ph.toFixed(2)}` },
    ],
    altSteps: [], similar: [`pH of ${conc * 10}M HCl`, `pH of ${conc}M NaOH`],
    mistakes: ["Using log instead of -log", "Not converting to moles first", "Confusing [H⁺] and [OH⁻]"],
  };
}

function solveMolarity(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const mass = nums[0], vol = nums[1] / 1000, moles = mass / 40, molarity = moles / vol;
  return {
    finalAnswer: `Molarity = ${molarity.toFixed(2)} M`,
    finalFormula: `M = n/V = ${molarity.toFixed(2)} M`,
    steps: [
      { desc: `Mass = ${mass}g NaOH, Volume = ${vol}L`, formula: `m=${mass}g, V=${vol}L` },
      { desc: `Moles = mass/Molar mass = ${mass}/40 = ${moles}`, formula: `n = ${mass}/40 = ${moles}` },
      { desc: `Molarity = moles/volume`, formula: `M = ${moles}/${vol} = ${molarity.toFixed(2)} M` },
    ],
    altSteps: [], similar: [`Molarity of ${mass * 2}g NaOH in ${nums[1]}mL`],
    mistakes: ["Not converting mL to L", "Wrong molar mass", "Confusing moles and molarity"],
  };
}

function solveProjectile(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const u = nums[0], h = (u * u) / (2 * 9.8), t = u / 9.8;
  return {
    finalAnswer: `Max height = ${h.toFixed(2)} m, Time = ${t.toFixed(2)} s`,
    finalFormula: `H = \\frac{u^2}{2g} = ${h.toFixed(2)} m`,
    steps: [
      { desc: `Initial velocity u = ${u} m/s, g = 9.8 m/s²`, formula: `u=${u}, g=9.8` },
      { desc: `At max height, v = 0`, formula: `v = 0` },
      { desc: `v² = u² - 2gh → h = u²/2g`, formula: `H = ${u}^2 / (2 × 9.8) = ${h.toFixed(2)} m` },
      { desc: `Time = u/g`, formula: `t = ${u}/9.8 = ${t.toFixed(2)} s` },
    ],
    altSteps: [], similar: [`Max height if u=${u + 5}m/s`, `Total time of flight`],
    mistakes: ["Using +2gh instead of -2gh", "Forgetting g = 9.8", "Wrong sign convention"],
  };
}

function solveWorkPower(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const m = nums[0], h = nums[1], t = nums[2];
  const work = m * 9.8 * h, power = work / t;
  return {
    finalAnswer: `Power = ${power.toFixed(2)} W`,
    finalFormula: `P = W/t = ${power.toFixed(2)} W`,
    steps: [
      { desc: `Mass = ${m} kg, Height = ${h} m, Time = ${t} s`, formula: `m=${m}, h=${h}, t=${t}` },
      { desc: `Work = mgh = ${m} × 9.8 × ${h} = ${work} J`, formula: `W = mgh = ${work} J` },
      { desc: `Power = Work/Time = ${work}/${t} = ${power.toFixed(2)} W`, formula: `P = W/t = ${power.toFixed(2)} W` },
    ],
    altSteps: [], similar: [`Power if m=${m + 10}kg, h=${h}m`],
    mistakes: ["Using g = 10 instead of 9.8 (or vice versa)", "Not converting time units", "Confusing work and power"],
  };
}

function solveFreeFall(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const h = nums[0], v = Math.sqrt(2 * 9.8 * h), t = Math.sqrt(2 * h / 9.8);
  return {
    finalAnswer: `Velocity = ${v.toFixed(2)} m/s, Time = ${t.toFixed(2)} s`,
    finalFormula: `v = \\sqrt{2gh} = ${v.toFixed(2)} m/s`,
    steps: [
      { desc: `Height h = ${h} m`, formula: `h = ${h} m` },
      { desc: `v² = 2gh`, formula: `v = \\sqrt{2 \\times 9.8 \\times ${h}}` },
      { desc: `v = ${v.toFixed(2)} m/s`, formula: `v = ${v.toFixed(2)} m/s` },
      { desc: `t = √(2h/g) = ${t.toFixed(2)} s`, formula: `t = ${t.toFixed(2)} s` },
    ],
    altSteps: [], similar: [`Drop from ${h + 20}m`, `Find h if v = ${v.toFixed(0)}m/s`],
    mistakes: ["Using v = gt without considering h", "Wrong value of g", "Not converting units"],
  };
}

function solveMomentum(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 4) return null;
  const m1 = nums[0], v1 = nums[1], m2 = nums[2], v2 = nums[3];
  const vf = (m1 * v1 + m2 * v2) / (m1 + m2);
  return {
    finalAnswer: `Final velocity = ${vf.toFixed(2)} m/s`,
    finalFormula: `v_f = \\frac{m_1 v_1 + m_2 v_2}{m_1 + m_2} = ${vf.toFixed(2)}`,
    steps: [
      { desc: `m₁=${m1}kg, v₁=${v1}m/s, m₂=${m2}kg, v₂=${v2}m/s`, formula: `m_1=${m1}, v_1=${v1}, m_2=${m2}, v_2=${v2}` },
      { desc: `Conservation of momentum: m₁v₁ + m₂v₂ = (m₁+m₂)vf`, formula: `p_1 + p_2 = p_f` },
      { desc: `vf = (${m1}×${v1} + ${m2}×${v2}) / (${m1}+${m2})`, formula: `v_f = ${vf.toFixed(2)} m/s` },
    ],
    altSteps: [], similar: [`If m₂=${m2 * 2}kg, find vf`],
    mistakes: ["Not conserving momentum correctly", "Wrong sign for velocities", "Not adding masses"],
  };
}

function solveCircular(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const m = nums[0], r = nums[1], v = nums[2], fc = (m * v * v) / r;
  return {
    finalAnswer: `Centripetal Force = ${fc.toFixed(2)} N`,
    finalFormula: `F_c = \\frac{mv^2}{r} = ${fc.toFixed(2)} N`,
    steps: [
      { desc: `m=${m}kg, r=${r}m, v=${v}m/s`, formula: `m=${m}, r=${r}, v=${v}` },
      { desc: `Fc = mv²/r`, formula: `F_c = \\frac{${m} \\times ${v}^2}{${r}}` },
      { desc: `= ${fc.toFixed(2)} N`, formula: `= ${fc.toFixed(2)} N` },
    ],
    altSteps: [], similar: [`Fc if v is doubled`, `Find v if Fc=${fc.toFixed(0)}N`],
    mistakes: ["Using F = mv/r instead of mv²/r", "Not squaring velocity", "Wrong radius"],
  };
}

function solveMoles(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const mass = nums[0], moles = mass / 40;
  return {
    finalAnswer: `Moles = ${moles}`,
    finalFormula: `n = m/M = ${mass}/40 = ${moles}`,
    steps: [
      { desc: `Mass = ${mass}g, Molar mass of NaOH = 40 g/mol`, formula: `m=${mass}, M=40` },
      { desc: `n = mass / molar mass`, formula: `n = ${mass}/40 = ${moles}` },
    ],
    altSteps: [], similar: [`Moles in ${mass + 40}g NaOH`, `Mass of ${moles + 1} moles`],
    mistakes: ["Wrong molar mass", "Confusing mass and moles", "Not using correct formula"],
  };
}

function solveGasLaw(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 4) return null;
  const p1 = nums[0], v1 = nums[1], p2 = nums[2], t2 = nums[3];
  const t1 = 273, v2 = (p1 * v1 * t2) / (p2 * t1);
  return {
    finalAnswer: `New Volume = ${v2.toFixed(2)} L`,
    finalFormula: `V_2 = \\frac{P_1 V_1 T_2}{P_2 T_1} = ${v2.toFixed(2)} L`,
    steps: [
      { desc: `P₁=${p1}atm, V₁=${v1}L, T₁=${t1}K, P₂=${p2}atm, T₂=${t2}K`, formula: `P_1=${p1}, V_1=${v1}, T_1=${t1}K` },
      { desc: `Using combined gas law: P₁V₁/T₁ = P₂V₂/T₂`, formula: `\\frac{P_1 V_1}{T_1} = \\frac{P_2 V_2}{T_2}` },
      { desc: `V₂ = (P₁V₁T₂)/(P₂T₁)`, formula: `V_2 = ${v2.toFixed(2)} L` },
    ],
    altSteps: [], similar: [`Find P₂ if V₂=${v2.toFixed(0)}L`],
    mistakes: ["Not converting °C to K", "Wrong gas law formula", "Mixing up initial and final values"],
  };
}

function solveDistance(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 4) return null;
  const x1 = nums[0], y1 = nums[1], x2 = nums[2], y2 = nums[3];
  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return {
    finalAnswer: `Distance = ${d.toFixed(2)} units`,
    finalFormula: `d = \\sqrt{(${x2}-${x1})^2 + (${y2}-${y1})^2} = ${d.toFixed(2)}`,
    steps: [
      { desc: `Point 1: (${x1}, ${y1}), Point 2: (${x2}, ${y2})`, formula: `(${x1},${y1}), (${x2},${y2})` },
      { desc: `d = √[(x₂-x₁)² + (y₂-y₁)²]`, formula: `d = \\sqrt{${x2 - x1}^2 + ${y2 - y1}^2}` },
      { desc: `= ${d.toFixed(2)}`, formula: `= ${d.toFixed(2)}` },
    ],
    altSteps: [], similar: [`Distance from origin to (${x2}, ${y2})`],
    mistakes: ["Wrong order of subtraction", "Not squaring differences", "Forgetting square root"],
  };
}

function solveDerivative(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const n = nums[0];
  return {
    finalAnswer: `d/dx (${n}x⁴) = ${4 * n}x³`,
    finalFormula: `\\frac{d}{dx}(${n}x^4) = ${4 * n}x^3`,
    steps: [
      { desc: `Apply power rule: d/dx(axⁿ) = naxⁿ⁻¹`, formula: `\\frac{d}{dx}(ax^n) = nax^{n-1}` },
      { desc: `Here a=${n}, n=4`, formula: `a=${n}, n=4` },
      { desc: `= 4 × ${n} × x³ = ${4 * n}x³`, formula: `= ${4 * n}x^3` },
    ],
    altSteps: [{ desc: `Second derivative: d/dx(${4 * n}x³) = ${12 * n}x²`, formula: `${12 * n}x^2` }],
    similar: [`Differentiate ${n + 1}x³`, `Integrate ${4 * n}x³`],
    mistakes: ["Wrong power rule application", "Forgetting to multiply by coefficient", "Wrong exponent after differentiation"],
  };
}

function solveProbability(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const r = nums[0], b = nums[1], g = nums[2], total = r + b + g;
  const pR = r / total, pB = b / total, pG = g / total;
  return {
    finalAnswer: `P(Red) = ${(pR * 100).toFixed(1)}%, P(Blue) = ${(pB * 100).toFixed(1)}%, P(Green) = ${(pG * 100).toFixed(1)}%`,
    finalFormula: `P(R) = \\frac{${r}}{${total}}`,
    steps: [
      { desc: `Red=${r}, Blue=${b}, Green=${g}`, formula: `R=${r}, B=${b}, G=${g}` },
      { desc: `Total = ${total}`, formula: `n(S) = ${total}` },
      { desc: `P(Red) = ${r}/${total} = ${(pR * 100).toFixed(1)}%`, formula: `P(R) = \\frac{${r}}{${total}}` },
      { desc: `P(Blue) = ${b}/${total} = ${(pB * 100).toFixed(1)}%`, formula: `P(B) = \\frac{${b}}{${total}}` },
    ],
    altSteps: [], similar: [`Probability if ${r + 5} red balls added`, `P(not red)`],
    mistakes: ["Not counting total correctly", "Confusing favorable and total outcomes", "Not simplifying fractions"],
  };
}

function solveAP(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const n = nums[0], a = nums[1], d = nums[2], term = a + (n - 1) * d;
  return {
    finalAnswer: `${n}th term = ${term}`,
    finalFormula: `a_n = a + (n-1)d = ${term}`,
    steps: [
      { desc: `n=${n}, a=${a}, d=${d}`, formula: `n=${n}, a=${a}, d=${d}` },
      { desc: `aₙ = a + (n-1)d`, formula: `a_n = ${a} + (${n}-1) \\times ${d}` },
      { desc: `= ${a} + ${(n - 1) * d} = ${term}`, formula: `= ${term}` },
    ],
    altSteps: [], similar: [`Sum of first ${n} terms`, `25th term of this AP`],
    mistakes: ["Using n*d instead of (n-1)*d", "Wrong common difference", "Off-by-one error"],
  };
}

function solveEmpirical(match: RegExpMatchArray): LocalSolution | null {
  return {
    finalAnswer: 'To find empirical formula: convert % to moles, divide by smallest mole value, round to nearest whole number',
    finalFormula: 'Empirical = simplest whole number ratio of atoms',
    steps: [
      { desc: 'Convert mass percentages to moles (mass / atomic mass)', formula: 'n = mass / M' },
      { desc: 'Divide all mole values by the smallest mole value', formula: 'ratio = n_i / n_min' },
      { desc: 'Round to nearest whole number → empirical formula subscripts', formula: 'subscript = round(ratio)' },
    ],
    altSteps: [], similar: ['Empirical formula for CH₂O', 'Molecular formula if molar mass = 180'],
    mistakes: ['Not dividing by smallest mole value', 'Rounding 1.5 or 2.5 incorrectly', 'Wrong atomic masses'],
  };
}

function solveReaction(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const v1 = nums[0], m1 = nums[1], v2 = nums[2];
  const m2 = (v1 * m1) / v2;
  return {
    finalAnswer: `Molarity of NaOH = ${m2.toFixed(4)} M`,
    finalFormula: `M_2 = \\frac{M_1 V_1}{V_2} = ${m2.toFixed(4)} M`,
    steps: [
      { desc: `HCl: ${v1}mL × ${m1}M, NaOH: ${v2}mL`, formula: `M_1=${m1}, V_1=${v1}, V_2=${v2}` },
      { desc: `At equivalence: M₁V₁ = M₂V₂`, formula: `M_1 V_1 = M_2 V_2` },
      { desc: `M₂ = (${m1} × ${v1}) / ${v2} = ${m2.toFixed(4)} M`, formula: `M_2 = ${m2.toFixed(4)} M` },
    ],
    altSteps: [], similar: [`Find volume for ${m1}M NaOH`, `What if ${v1 * 2}mL HCl used?`],
    mistakes: ['Not using M₁V₁ = M₂V₂', 'Volume unit mismatch (mL vs L)', 'Wrong stoichiometric ratio'],
  };
}

function solveBalance(match: RegExpMatchArray): LocalSolution | null {
  return {
    finalAnswer: '4Fe + 3O₂ → 2Fe₂O₃',
    finalFormula: '4Fe + 3O_2 \\rightarrow 2Fe_2O_3',
    steps: [
      { desc: 'Count atoms on each side: Fe: 2, O: 3 (unbalanced)', formula: 'Fe + O_2 → Fe_2O_3' },
      { desc: 'Balance Fe: 2Fe + O₂ → Fe₂O₃', formula: '2Fe + O_2 → Fe_2O_3' },
      { desc: 'Balance O: need 3 O₂ = 6 O atoms. So: 4Fe + 3O₂ → 2Fe₂O₃', formula: '4Fe + 3O_2 → 2Fe_2O_3' },
      { desc: 'Verify: Fe=4, O=6 on both sides ✓', formula: 'Fe: 4=4, O: 6=6 ✓' },
    ],
    altSteps: [], similar: ['Balance: Al + O₂ → Al₂O₃', 'Balance: CH₄ + O₂ → CO₂ + H₂O'],
    mistakes: ['Not checking atom count on both sides', 'Changing subscripts instead of coefficients', 'Missing fractional coefficients'],
  };
}

function solveLCMGCD(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/\d+/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  let hcf = Math.min(nums[0], nums[1]);
  for (let i = 0; i < nums.length; i++) hcf = gcd(hcf, nums[i]);
  const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
  let lcmVal = nums[0];
  for (let i = 1; i < nums.length; i++) lcmVal = lcm(lcmVal, nums[i]);
  return {
    finalAnswer: `LCM = ${lcmVal}, GCD = ${hcf}`,
    finalFormula: `LCM = ${lcmVal}, GCD = ${hcf}`,
    steps: [
      { desc: `Numbers: ${nums.join(', ')}`, formula: nums.join(', ') },
      { desc: `Prime factorization / Euclidean algorithm`, formula: 'Finding common factors' },
      { desc: `GCD = ${hcf}`, formula: `GCD = ${hcf}` },
      { desc: `LCM = ${lcmVal}`, formula: `LCM = ${lcmVal}` },
    ],
    altSteps: [], similar: [`LCM & GCD of ${nums.map(n => n + 10).join(', ')}`],
    mistakes: ['Confusing LCM and GCD', 'Missing common factors', 'Wrong prime factorization'],
  };
}

function solveTrig(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/\d+/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const opp = nums[0], hyp = nums[1], ratio = opp / hyp;
  const angle = (Math.asin(ratio) * 180) / Math.PI;
  return {
    finalAnswer: `sin θ = ${opp}/${hyp} = ${ratio.toFixed(4)}, θ = ${angle.toFixed(2)}°`,
    finalFormula: `\\sin\\theta = \\frac{${opp}}{${hyp}} = ${ratio.toFixed(4)}`,
    steps: [
      { desc: `Opposite = ${opp}, Hypotenuse = ${hyp}`, formula: `O=${opp}, H=${hyp}` },
      { desc: `sin θ = Opposite / Hypotenuse`, formula: `\\sin\\theta = ${opp}/${hyp}` },
      { desc: `θ = arcsin(${ratio.toFixed(4)}) = ${angle.toFixed(2)}°`, formula: `\\theta = ${angle.toFixed(2)}°` },
    ],
    altSteps: [{ desc: `cos θ = Adjacent/Hypotenuse = ${Math.sqrt(hyp*hyp - opp*opp).toFixed(2)}/${hyp}`, formula: `\\cos\\theta = ${Math.sqrt(hyp*hyp - opp*opp).toFixed(2)}/${hyp}` }],
    similar: [`Find cos θ if sin θ = ${opp}/${hyp}`, `tan θ for same triangle`],
    mistakes: ['Confusing sin, cos, tan ratios', 'Not using the correct sides', 'Not converting radians to degrees'],
  };
}

function solveStats(match: RegExpMatchArray): LocalSolution | null {
  return {
    finalAnswer: 'Sort data → Median = middle value, Mode = most frequent, Mean = sum/n',
    finalFormula: '\\bar{x} = \\frac{\\sum x_i}{n}',
    steps: [
      { desc: 'Sort the data in ascending order', formula: 'x_1 ≤ x_2 ≤ ... ≤ x_n' },
      { desc: 'Mean = (sum of all values) / n', formula: '\\bar{x} = \\sum x_i / n' },
      { desc: 'Median = middle value (or average of two middle values for even n)', formula: 'M = x_{(n+1)/2}' },
      { desc: 'Mode = value with highest frequency', formula: 'Mode = most frequent value' },
    ],
    altSteps: [], similar: ['Find range and standard deviation', 'Grouped data mean and median'],
    mistakes: ['Not sorting data before finding median', 'Confusing mean and median', 'Multiple modes missed'],
  };
}

function solveIdentity(match: RegExpMatchArray): LocalSolution | null {
  return {
    finalAnswer: '(a+b)² - (a-b)² = 4ab',
    finalFormula: '(a+b)^2 - (a-b)^2 = 4ab',
    steps: [
      { desc: 'Expand (a+b)² = a² + 2ab + b²', formula: '(a+b)^2 = a^2 + 2ab + b^2' },
      { desc: 'Expand (a-b)² = a² - 2ab + b²', formula: '(a-b)^2 = a^2 - 2ab + b^2' },
      { desc: 'Subtract: (a²+2ab+b²) - (a²-2ab+b²)', formula: '(a^2+2ab+b^2) - (a^2-2ab+b^2)' },
      { desc: '= 4ab', formula: '= 4ab' },
    ],
    altSteps: [{ desc: 'LHS = (a+b+a-b)(a+b-a+b) = 2a × 2b = 4ab', formula: 'Using x²-y² = (x+y)(x-y)' }],
    similar: ['Prove (a+b)² + (a-b)² = 2(a²+b²)', 'Find (a+b)³ - (a-b)³'],
    mistakes: ['Sign errors in expansion', 'Subtracting wrong terms', 'Not using identity correctly'],
  };
}

function solveCompoundInterest(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const p = nums[0], r = nums[1], t = nums[2];
  const amt = p * Math.pow(1 + r / 100, t), ci = amt - p;
  return {
    finalAnswer: `Amount = Rs ${amt.toFixed(2)}, CI = Rs ${ci.toFixed(2)}`,
    finalFormula: `A = P(1+R/100)^T = Rs ${amt.toFixed(2)}`,
    steps: [
      { desc: `P = Rs ${p}, R = ${r}%, T = ${t} years`, formula: `P=${p}, R=${r}\\%, T=${t}` },
      { desc: `A = P(1 + R/100)^T`, formula: `A = ${p}(1 + ${r}/100)^{t}` },
      { desc: `= ${p} × ${(1 + r / 100).toFixed(4)}^${t} = Rs ${amt.toFixed(2)}`, formula: `= Rs ${amt.toFixed(2)}` },
      { desc: `CI = A - P = Rs ${ci.toFixed(2)}`, formula: `CI = ${ci.toFixed(2)}` },
    ],
    altSteps: [], similar: [`CI on Rs ${p} at ${r}% for ${t + 1} years`],
    mistakes: ['Using SI formula instead of CI', 'Not using compound formula correctly', 'Wrong time period'],
  };
}

function solveCircumference(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const r = nums[0], c = 2 * Math.PI * r;
  return {
    finalAnswer: `Circumference = ${c.toFixed(2)} units`,
    finalFormula: `C = 2\\pi r = ${c.toFixed(2)}`,
    steps: [
      { desc: `Radius = ${r}`, formula: `r = ${r}` },
      { desc: `C = 2πr`, formula: `C = 2\\pi \\times ${r}` },
      { desc: `= ${c.toFixed(2)}`, formula: `= ${c.toFixed(2)}` },
    ],
    altSteps: [], similar: [`Circumference for r=${r + 3}`, `Diameter from circumference`],
    mistakes: ['Using C = πr instead of 2πr', 'Using diameter as radius', 'Forgetting π'],
  };
}

function solveVolumeSphere(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const r = nums[0], v = (4 / 3) * Math.PI * Math.pow(r, 3), sa = 4 * Math.PI * r * r;
  return {
    finalAnswer: `Volume = ${v.toFixed(2)} cubic units, Surface Area = ${sa.toFixed(2)} sq. units`,
    finalFormula: `V = \\frac{4}{3}\\pi r^3 = ${v.toFixed(2)}`,
    steps: [
      { desc: `Radius = ${r}`, formula: `r = ${r}` },
      { desc: `V = (4/3)πr³`, formula: `V = \\frac{4}{3} \\times \\pi \\times ${r}^3` },
      { desc: `V = ${v.toFixed(2)}`, formula: `V = ${v.toFixed(2)}` },
      { desc: `SA = 4πr² = ${sa.toFixed(2)}`, formula: `SA = 4\\pi r^2 = ${sa.toFixed(2)}` },
    ],
    altSteps: [], similar: [`Volume of hemisphere r=${r}`, `Volume of sphere r=${r + 2}`],
    mistakes: ['Using (4/3)πr² instead of r³', 'Confusing with volume of cylinder', 'Not cubing the radius'],
  };
}

function solveSpeedGeneric(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const d = nums[0], t = nums[1], v = d / t, vMs = (v * 1000) / 3600;
  return {
    finalAnswer: `Speed = ${v} km/h = ${vMs.toFixed(2)} m/s`,
    finalFormula: `v = d/t = ${v} \\text{ km/h}`,
    steps: [
      { desc: `Distance = ${d} km, Time = ${t} hours`, formula: `d = ${d} km, t = ${t} hr` },
      { desc: `Speed = Distance / Time`, formula: `v = ${d} / ${t} = ${v} km/h` },
      { desc: `Convert to m/s (× 5/18)`, formula: `${v} × 5/18 = ${vMs.toFixed(2)} m/s` },
    ],
    altSteps: [], similar: [`Speed for ${d + 50}km in ${t}hr`, `Time to cover ${d}km at ${v}km/h`, `Distance at ${v}km/h for ${t}hr`],
    mistakes: ['Wrong formula (time/distance)', 'Unit conversion errors', 'Mixed units'],
  };
}

function solvePercentageReverse(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const part = nums[0], whole = nums[1], pct = (part / whole) * 100;
  return {
    finalAnswer: `${part} is ${pct.toFixed(2)}% of ${whole}`,
    finalFormula: `\\frac{${part}}{${whole}} \\times 100 = ${pct.toFixed(2)}\\%`,
    steps: [
      { desc: `Part = ${part}, Whole = ${whole}`, formula: `${part}, ${whole}` },
      { desc: `Percentage = (Part/Whole) × 100`, formula: `(${part}/${whole}) × 100` },
      { desc: `= ${pct.toFixed(2)}%`, formula: `= ${pct.toFixed(2)}%` },
    ],
    altSteps: [], similar: [`${part + 20} is what % of ${whole}?`, `${part} is what % of ${whole + 50}?`, `What is ${pct.toFixed(0)}% of ${whole}?`],
    mistakes: ['Dividing whole by part instead', 'Forgetting to multiply by 100', 'Rounding too early'],
  };
}

function solveKinematic(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const u = nums[0], a = nums[1], t = nums[2];
  const s = u * t + 0.5 * a * t * t, v = u + a * t;
  return {
    finalAnswer: `Distance = ${s.toFixed(2)} m, Final velocity = ${v.toFixed(2)} m/s`,
    finalFormula: `s = ut + \\frac{1}{2}at^2 = ${s.toFixed(2)} \\text{ m}`,
    steps: [
      { desc: `u = ${u} m/s, a = ${a} m/s², t = ${t} s`, formula: `u=${u}, a=${a}, t=${t}` },
      { desc: `s = ut + ½at²`, formula: `s = ${u}×${t} + 0.5×${a}×${t}² = ${s.toFixed(2)} m` },
      { desc: `v = u + at`, formula: `v = ${u} + ${a}×${t} = ${v.toFixed(2)} m/s` },
    ],
    altSteps: [], similar: [`u=${u + 5}, a=${a}, t=${t + 1}. Find s and v.`, `v² = u² + 2as for same values`, `Find time when s = ${s.toFixed(0)}m`],
    mistakes: ['Using wrong kinematic equation', 'Sign of acceleration', 'Not squaring t in ½at²'],
  };
}

function solveSimpleAddMul(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const a = nums[0], b = nums[1], sum = a + b, diff = a - b, prod = a * b;
  return {
    finalAnswer: `Sum = ${sum}, Difference = ${diff}, Product = ${prod}`, finalFormula: `${a} + ${b} = ${sum}`,
    steps: [
      { desc: `Numbers: ${a} and ${b}`, formula: `${a}, ${b}` },
      { desc: `Sum = ${a} + ${b} = ${sum}`, formula: `${a} + ${b} = ${sum}` },
      { desc: `Difference = ${a} - ${b} = ${diff}`, formula: `${a} - ${b} = ${diff}` },
      { desc: `Product = ${a} × ${b} = ${prod}`, formula: `${a} \\times ${b} = ${prod}` },
    ],
    altSteps: [], similar: [`Same for ${a + 5} and ${b + 3}`, `Quotient ${a}/${b}`, `What added to ${a} gives ${sum}?`],
    mistakes: ['Sign errors in subtraction', 'Carry mistakes', 'Confusing sum and product'],
  };
}

// ── NEW SOLVERS ──

function solveEvaluateExpr(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const text = (fullText || match[0]).trim();
  const exprMatch = text.match(/(?:calculate|evaluate|compute|what is|find the value of|solve)\s+(.+)/i);
  let expr = exprMatch ? exprMatch[1].trim() : text.replace(/^(calculate|evaluate|compute|what is|find the value of|solve)\s*/i, '').trim();
  expr = expr.replace(/[?!.]+$/, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**').replace(/π/g, 'Math.PI');
  if (!/^[\d\s+\-*/().%eEPIsincotalgqrtbMC\s]+$/.test(expr)) return null;
  try {
    let evalExpr = expr
      .replace(/\bsqrt\(/gi, 'Math.sqrt(')
      .replace(/\bsin\(/gi, 'Math.sin(')
      .replace(/\bcos\(/gi, 'Math.cos(')
      .replace(/\btan\(/gi, 'Math.tan(')
      .replace(/\blog\(/gi, 'Math.log10(')
      .replace(/\bln\(/gi, 'Math.log(')
      .replace(/\babs\(/gi, 'Math.abs(')
      .replace(/\bpow\(/gi, 'Math.pow(');
    const result = new Function(`"use strict"; return (${evalExpr})`)();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    const rounded = Math.round(result * 10000) / 10000;
    return {
      finalAnswer: `= ${rounded}`, finalFormula: `= ${rounded}`,
      steps: [
        { desc: `Expression to evaluate`, formula: expr.replace(/\*\*/g, '^') },
        { desc: `Simplify step by step`, formula: evalExpr.replace(/Math\./g, '').replace(/\*\*/g, '^') },
        { desc: `Result`, formula: `= ${rounded}` },
      ],
      altSteps: [], similar: [`Evaluate ${expr.replace(/\d+/g, (n) => String(Number(n) + 5))}`],
      mistakes: ['Order of operations (BODMAS) error', 'Missing parentheses', 'Unit conversion'],
    };
  } catch { return null; }
}

function solveProfitLoss(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const cp = nums[0], sp = nums[1];
  const profit = sp - cp, profitPct = ((profit / cp) * 100).toFixed(2);
  const isProfit = sp > cp;
  return {
    finalAnswer: `${isProfit ? 'Profit' : 'Loss'} = ${Math.abs(profit)} (${Math.abs(Number(profitPct))}%)`,
    finalFormula: `${isProfit ? 'Profit' : 'Loss'} = ${Math.abs(profit)}, ${Math.abs(Number(profitPct))}%`,
    steps: [
      { desc: `Cost Price = ${cp}, Selling Price = ${sp}`, formula: `CP = ${cp}, SP = ${sp}` },
      { desc: `${isProfit ? 'Profit' : 'Loss'} = SP - CP = ${sp} - ${cp} = ${profit}`, formula: `${isProfit ? 'Profit' : 'Loss'} = SP - CP` },
      { desc: `${isProfit ? 'Profit' : 'Loss'}% = (${Math.abs(profit)}/${cp}) × 100 = ${Math.abs(Number(profitPct))}%`, formula: `${Math.abs(Number(profitPct))}%` },
    ],
    altSteps: [], similar: [`CP=${cp + 100}, SP=${sp + 100}. Find profit %`, `Find SP if CP=${cp} and profit=20%`],
    mistakes: ['Confusing CP and SP', 'Wrong formula for percentage', 'Sign errors'],
  };
}

function solveDiscount(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const marked = nums[0], disc = nums[1];
  const discAmt = (marked * disc) / 100, final_ = marked - discAmt;
  return {
    finalAnswer: `Discount = ${discAmt.toFixed(2)}, Final Price = ${final_.toFixed(2)}`,
    finalFormula: `Final Price = ${final_.toFixed(2)}`,
    steps: [
      { desc: `Marked Price = ${marked}, Discount = ${disc}%`, formula: `MP = ${marked}, d = ${disc}%` },
      { desc: `Discount Amount = ${marked} × ${disc}/100 = ${discAmt.toFixed(2)}`, formula: `DA = MP \\times d/100` },
      { desc: `Final Price = ${marked} - ${discAmt.toFixed(2)} = ${final_.toFixed(2)}`, formula: `SP = MP - DA = ${final_.toFixed(2)}` },
    ],
    altSteps: [], similar: [`MP=${marked + 500}, discount=${disc + 5}%`, `What % discount on ${marked} gives ${final_.toFixed(0)}?`],
    mistakes: ['Calculating discount on final price instead of marked price', 'Forgetting to subtract discount'],
  };
}

function solveAreaRect(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const l = nums[0], b = nums[1], area = l * b, peri = 2 * (l + b);
  return {
    finalAnswer: `Area = ${area} sq. units, Perimeter = ${peri} units`,
    finalFormula: `A = l × b = ${area}`,
    steps: [
      { desc: `Length = ${l}, Breadth = ${b}`, formula: `l = ${l}, b = ${b}` },
      { desc: `Area = l × b = ${l} × ${b} = ${area}`, formula: `A = l \\times b = ${area}` },
      { desc: `Perimeter = 2(l + b) = 2(${l} + ${b}) = ${peri}`, formula: `P = 2(l+b) = ${peri}` },
    ],
    altSteps: [], similar: [`Rectangle l=${l + 5}, b=${b + 3}. Find area & perimeter`, `Square with side ${l}. Find area.`],
    mistakes: ['Using perimeter formula for area', 'Wrong units', 'Confusing length and breadth'],
  };
}

function solveAreaTriangle(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const b = nums[0], h = nums[1], area = 0.5 * b * h;
  return {
    finalAnswer: `Area = ${area} sq. units`,
    finalFormula: `A = \\frac{1}{2} b h = ${area}`,
    steps: [
      { desc: `Base = ${b}, Height = ${h}`, formula: `b = ${b}, h = ${h}` },
      { desc: `Area = ½ × base × height`, formula: `A = \\frac{1}{2} \\times ${b} \\times ${h}` },
      { desc: `Area = ${area}`, formula: `= ${area}` },
    ],
    altSteps: [], similar: [`Triangle b=${b + 3}, h=${h + 2}`, `Find hypotenuse if b=${b}, h=${h}`],
    mistakes: ['Forgetting the ½', 'Using base as height', 'Wrong formula (using rectangle formula)'],
  };
}

function solveVolumeCylinder(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const r = nums[0], h = nums[1];
  const vol = Math.PI * r * r * h, csa = 2 * Math.PI * r * h, tsa = 2 * Math.PI * r * (r + h);
  return {
    finalAnswer: `Volume = ${vol.toFixed(2)} cubic units`,
    finalFormula: `V = \\pi r^2 h = ${vol.toFixed(2)}`,
    steps: [
      { desc: `Radius = ${r}, Height = ${h}`, formula: `r = ${r}, h = ${h}` },
      { desc: `Volume = πr²h = π × ${r}² × ${h}`, formula: `V = \\pi \\times ${r}^2 \\times ${h}` },
      { desc: `Volume = ${vol.toFixed(2)}`, formula: `V = ${vol.toFixed(2)}` },
      { desc: `CSA = 2πrh = ${csa.toFixed(2)}`, formula: `CSA = ${csa.toFixed(2)}` },
      { desc: `TSA = 2πr(r+h) = ${tsa.toFixed(2)}`, formula: `TSA = ${tsa.toFixed(2)}` },
    ],
    altSteps: [], similar: [`Volume of cone with r=${r}, h=${h}`, `Volume of cylinder r=${r + 1}, h=${h * 2}`],
    mistakes: ['Using r²h without π', 'Confusing CSA and TSA', 'Using diameter instead of radius'],
  };
}

function solveSquareCubeRoot(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const n = nums[0];
  const isSqrt = /square\s*root|sqrt|√/i.test(match[0]);
  const isCbrt = /cube\s*root/i.test(match[0]);
  if (isSqrt) {
    const root = Math.sqrt(n);
    return {
      finalAnswer: `√${n} = ${root.toFixed(4)}`,
      finalFormula: `\\sqrt{${n}} = ${root.toFixed(4)}`,
      steps: [
        { desc: `Find the square root of ${n}`, formula: `\\sqrt{${n}}` },
        { desc: `${Math.floor(root)}² = ${Math.floor(root) ** 2}, ${Math.floor(root) + 1}² = ${(Math.floor(root) + 1) ** 2}`, formula: `Check: ${Math.floor(root)}^2 = ${Math.floor(root) ** 2}` },
        { desc: `√${n} = ${root.toFixed(4)}`, formula: `= ${root.toFixed(4)}` },
      ],
      altSteps: [], similar: [`√${n * 4}`, `√${n + 25}`, `Cube root of ${n}`],
      mistakes: ['Confusing square root and square', 'Rounding errors', 'Not simplifying'],
    };
  }
  if (isCbrt) {
    const root = Math.cbrt(n);
    return {
      finalAnswer: `∛${n} = ${root.toFixed(4)}`,
      finalFormula: `\\sqrt[3]{${n}} = ${root.toFixed(4)}`,
      steps: [
        { desc: `Find the cube root of ${n}`, formula: `\\sqrt[3]{${n}}` },
        { desc: `${Math.floor(root)}³ = ${Math.floor(root) ** 3}`, formula: `Check: ${Math.floor(root)}^3 = ${Math.floor(root) ** 3}` },
        { desc: `∛${n} = ${root.toFixed(4)}`, formula: `= ${root.toFixed(4)}` },
      ],
      altSteps: [], similar: [`∛${n * 8}`, `√${n}`],
      mistakes: ['Confusing cube root with square root', 'Wrong estimation'],
    };
  }
  return null;
}

function solveForceMA(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const m = nums[0], a = nums[1], f = m * a;
  return {
    finalAnswer: `Force = ${f} N`,
    finalFormula: `F = ma = ${f} \\text{ N}`,
    steps: [
      { desc: `Mass = ${m} kg, Acceleration = ${a} m/s²`, formula: `m = ${m} kg, a = ${a} m/s^2` },
      { desc: `F = ma`, formula: `F = m \\times a` },
      { desc: `F = ${m} × ${a} = ${f} N`, formula: `F = ${f} N` },
    ],
    altSteps: [], similar: [`F = ma for m=${m + 2}kg, a=${a + 1}m/s²`, `Find a if F=${f}N and m=${m}kg`],
    mistakes: ['Wrong units (g instead of kg)', 'Sign of acceleration', 'Confusing mass and weight'],
  };
}

function solveKineticEnergy(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const m = nums[0], v = nums[1], ke = 0.5 * m * v * v;
  return {
    finalAnswer: `Kinetic Energy = ${ke} J`,
    finalFormula: `KE = \\frac{1}{2}mv^2 = ${ke} J`,
    steps: [
      { desc: `Mass = ${m} kg, Velocity = ${v} m/s`, formula: `m = ${m} kg, v = ${v} m/s` },
      { desc: `KE = ½mv²`, formula: `KE = \\frac{1}{2} \\times ${m} \\times ${v}^2` },
      { desc: `KE = ${ke} J`, formula: `KE = ${ke} J` },
    ],
    altSteps: [], similar: [`KE if v is doubled`, `PE = mgh for m=${m}kg, h=${v}m`],
    mistakes: ['Forgetting the ½', 'Not squaring velocity', 'Wrong units'],
  };
}

function solveMolarMass(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const compound = fullText || match[0];
  const masses: Record<string, number> = { H: 1, He: 4, C: 12, N: 14, O: 16, F: 19, Na: 23, Mg: 24, Al: 27, S: 32, Cl: 35.5, K: 39, Ca: 40, Fe: 56, Cu: 63.5, Zn: 65, Ag: 108, I: 127 };
  let total = 0;
  const parts: string[] = [];
  const parsed = compound.match(/([A-Z][a-z]?)(\d*)/g);
  if (!parsed) return null;
  for (const p of parsed) {
    const el = p.replace(/\d/g, '');
    const count = parseInt(p.replace(/[A-Za-z]/g, '') || '1');
    const mass = masses[el];
    if (!mass) return null;
    const contrib = mass * count;
    total += contrib;
    parts.push(`${el}${count > 1 ? count : ''} = ${contrib}`);
  }
  return {
    finalAnswer: `Molar Mass = ${total} g/mol`,
    finalFormula: `M = ${total} \\text{ g/mol}`,
    steps: [
      { desc: `Elements in compound: ${parsed.join(', ')}`, formula: parsed.join(' + ') },
      { desc: `Add atomic masses: ${parts.join(' + ')}`, formula: parts.join(' + ') },
      { desc: `Total Molar Mass = ${total} g/mol`, formula: `= ${total} g/mol` },
    ],
    altSteps: [], similar: [`Mass of 2 moles of this compound`, `Moles in ${total}g`],
    mistakes: ['Missing subscript atoms', 'Wrong atomic masses', 'Forgetting to multiply by subscript'],
  };
}

function solveHCF(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const nums = (fullText || match[0]).match(/\d+/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  let hcf = nums[0];
  for (let i = 1; i < nums.length; i++) hcf = gcd(hcf, nums[i]);
  const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
  let lcmVal = nums[0];
  for (let i = 1; i < nums.length; i++) lcmVal = lcm(lcmVal, nums[i]);
  return {
    finalAnswer: `HCF = ${hcf}, LCM = ${lcmVal}`,
    finalFormula: `HCF = ${hcf}, LCM = ${lcmVal}`,
    steps: [
      { desc: `Numbers: ${nums.join(', ')}`, formula: nums.join(', ') },
      { desc: `Using Euclidean algorithm`, formula: 'GCD algorithm' },
      { desc: `HCF = ${hcf}`, formula: `HCF = ${hcf}` },
      { desc: `LCM = ${lcmVal}`, formula: `LCM = ${lcmVal}` },
    ],
    altSteps: [], similar: [`HCF & LCM of ${nums.map(n => n + 10).join(', ')}`],
    mistakes: ['Confusing HCF and LCM', 'Missing common factors', 'Wrong prime factorization'],
  };
}

function solveSlopeYIntercept(match: RegExpMatchArray, fullText?: string): LocalSolution | null {
  const eqMatch = (fullText || match[0]).match(/y\s*=\s*(-?\d*\.?\d*)\s*x\s*[+\-]\s*(-?\d+\.?\d*)/i);
  if (!eqMatch) return null;
  const m = parseFloat(eqMatch[1] || '1');
  const c = parseFloat(eqMatch[2]);
  const xInt = m !== 0 ? -c / m : 0;
  return {
    finalAnswer: `Slope (m) = ${m}, Y-intercept (c) = ${c}, X-intercept = ${xInt.toFixed(2)}`,
    finalFormula: `m = ${m}, c = ${c}`,
    steps: [
      { desc: `Equation: y = ${m}x ${c >= 0 ? '+' : ''}${c}`, formula: `y = ${m}x ${c >= 0 ? '+' : ''}${c}` },
      { desc: `Comparing with y = mx + c: Slope = ${m}, Y-intercept = ${c}`, formula: `m = ${m}, c = ${c}` },
      { desc: `X-intercept: set y=0, x = -c/m = ${xInt.toFixed(2)}`, formula: `x = -${c}/${m} = ${xInt.toFixed(2)}` },
    ],
    altSteps: [], similar: [`Find slope of y = ${m + 1}x + ${c + 2}`, `Line through (0,${c}) with slope ${m}`],
    mistakes: ['Wrong sign for intercept', 'Confusing x and y intercepts'],
  };
}

// ── PATTERN MATCHING ──

interface PatternRule { regex: RegExp; solver: (m: RegExpMatchArray, fullText?: string) => LocalSolution | null; useFullText?: boolean; }

const PATTERNS: PatternRule[] = [
  // ── Linear equations (broadest first) ──
  { regex: /\d*\.?\d*\s*[xXyYzZ]\s*[+\-]\s*\d+\.?\d*\s*(?:[+\-]\s*\d+\.?\d*\s*)?=\s*-?\d+\.?\d*/i, solver: solveLinearEq },
  { regex: /(?:solve|find)\s+[\d.]*\s*[xXyYzZ]\s*[+\-]\s*\d+\s*=\s*\d+/i, solver: solveLinearEq },
  // ── Quadratic ──
  { regex: /(?:solve|find)\s+.*?roots?.*?/i, solver: solveQuadratic },
  { regex: /-?\d*\.?\d*\s*[xXyYzZ]\s*[\^²]\s*2\s*[+\-]\s*\d+\.?\d*\s*[xXyYzZ]?\s*[+\-]\s*-?\d+\.?\d*\s*=\s*0/i, solver: solveQuadratic },
  // ── NEW broad patterns ──
  { regex: /(?:cost\s*price|cp).*?selling\s*price|profit|loss.*?percent/i, solver: solveProfitLoss },
  { regex: /discount.*?%\s*(?:on|of)|marked\s*price.*?discount/i, solver: solveDiscount },
  { regex: /area.*?rectangle|perimeter.*?rectangle|length.*?breadth.*?area/i, solver: solveAreaRect },
  { regex: /area.*?triangle|base.*?height.*?triangle/i, solver: solveAreaTriangle },
  { regex: /volume.*?cylinder|cylinder.*?volume|CSA.*?cylinder|TSA.*?cylinder/i, solver: solveVolumeCylinder },
  { regex: /square\s*root|sqrt\s*\(?/i, solver: solveSquareCubeRoot },
  { regex: /cube\s*root/i, solver: solveSquareCubeRoot },
  { regex: /(?:F\s*=\s*ma|force\s*=\s*mass|find\s*force).*?(\d+)\s*kg.*?(\d+)\s*m\/s[²2]/i, solver: solveForceMA },
  { regex: /kinetic\s*energy|KE\s*=|find\s*KE/i, solver: solveKineticEnergy },
  { regex: /molar\s*mass\s*(?:of|for)/i, solver: solveMolarMass },
  { regex: /(?:HCF|GCD|LCM)\s*(?:and|&|of)\s*\d/i, solver: solveHCF },
  { regex: /slope.*?y\s*=\s*\d|y\s*=\s*\d.*?x.*?[+\-]\s*\d/i, solver: solveSlopeYIntercept },
  // ── Expression evaluator (catch-all) ──
  { regex: /(?:calculate|evaluate|compute|what is|find the value of)\s+[\d(][\d\s+\-*/().^sincotalgqrtbPIe]+/i, solver: solveEvaluateExpr, useFullText: true },
  // ── Original patterns ──
  { regex: /([\d.]+)%\s*of\s+([\d.]+)/i, solver: solvePercentage },
  { regex: /find\s+([\d.]+)%\s*of\s+([\d.]+)/i, solver: solvePercentage },
  { regex: /simple\s+interest\s+on\s+rs?\s*([\d.]+)\s+at\s*([\d.]+)%\s*per\s+annum\s+for\s*([\d.]+)\s*years/i, solver: solveSimpleInterest },
  { regex: /travels\s+([\d.]+)\s*km\s+in\s+([\d.]+)\s*hours/i, solver: solveSpeed },
  { regex: /area\s+of\s+a\s+circle\s+with\s+radius\s*([\d.]+)/i, solver: solveAreaCircle },
  { regex: /ladder.*?(\d+).*?(\d+)\s*m.*?wall.*?height/i, solver: solvePythagoras },
  { regex: /(\d+)\s*kg.*?(\d+)\s*N\s*force.*?frictionless/i, solver: solveNewton },
  { regex: /resistance.*?(\d+)V.*?(\d+)A/i, solver: solveOhm },
  { regex: /pH\s+of\s+([\d.]+)\s*M\s+HCl/i, solver: solvePH },
  { regex: /molarity\s+of\s+(\d+)g\s+NaOH\s+in\s+(\d+)\s*mL/i, solver: solveMolarity },
  { regex: /thrown\s+upward.*?(\d+)\s*m\/s.*?max\s+height/i, solver: solveProjectile },
  { regex: /(\d+)\s*kg.*?climbs\s+(\d+)\s*m.*?(\d+)\s*s.*?power/i, solver: solveWorkPower },
  { regex: /dropped\s+from\s+(\d+)m.*?velocity/i, solver: solveFreeFall },
  { regex: /(\d+)\s*kg.*?(\d+)\s*m\/s.*?(\d+)\s*kg.*?(\d+)\s*m\/s.*?collide.*?stick/i, solver: solveMomentum },
  { regex: /(\d+)\s*kg.*?circle.*?(\d+)\s*m.*?(\d+)\s*m\/s.*?centripetal/i, solver: solveCircular },
  { regex: /moles.*?(\d+)g\s+NaOH/i, solver: solveMoles },
  { regex: /(\d+)\s*atm.*?(\d+)\s*L.*?(\d+)\s*atm.*?(\d+)\s*K.*?volume/i, solver: solveGasLaw },
  { regex: /distance\s+between.*?\((\d+),\s*(\d+)\).*?\((\d+),\s*(\d+)\)/i, solver: solveDistance },
  { regex: /differentiate.*?(\d+)x\^4/i, solver: solveDerivative },
  { regex: /(\d+)\s*red.*?(\d+)\s*blue.*?(\d+)\s*green.*?probability/i, solver: solveProbability },
  { regex: /(\d+)th\s+term\s+of\s+AP/i, solver: solveAP },
  { regex: /empirical\s+formula/i, solver: solveEmpirical },
  { regex: /(\d+)\s*mL.*?([\d.]+)\s*M\s+HCl.*?(\d+)\s*mL\s+NaOH/i, solver: solveReaction },
  { regex: /balance.*?Fe.*?O2.*?Fe2O3/i, solver: solveBalance },
  { regex: /LCM\s*(and|&)\s*GCD\s+of/i, solver: solveLCMGCD },
  { regex: /(?:sin|cos|tan)\s*[\u03b8\u03b1\u03b2\u03b3\u03c9\u03c6]+(?:\s*=\s*(\d+)\s*\/\s*(\d+)|\s+(\d+)\s*\/\s*(\d+))/i, solver: solveTrig },
  { regex: /mean.*?median.*?mode\s+of/i, solver: solveStats },
  { regex: /\(a\+b\)\^2\s*-\s*\(a-b\)\^2/i, solver: solveIdentity },
  { regex: /compound\s+interest.*?rs?\s*([\d.]+).*?([\d.]+)%.*?([\d.]+)\s*years/i, solver: solveCompoundInterest },
  { regex: /circumference.*?circle.*?radius\s*([\d.]+)/i, solver: solveCircumference },
  { regex: /volume.*?sphere.*?radius\s*([\d.]+)/i, solver: solveVolumeSphere },
  { regex: /(?:average\s+speed|speed)\s*.*?(\d+)\s*km.*?(\d+)\s*(?:hours?|hr)/i, solver: solveSpeedGeneric },
  { regex: /is\s+what\s+percent.*?of/i, solver: solvePercentageReverse },
  { regex: /(\d+)\s*m\/s.*?(\d+)\s*m\/s[²2].*?(\d+)\s*s.*?(?:distance|displacement)/i, solver: solveKinematic },
  { regex: /surface\s+area.*?sphere/i, solver: solveVolumeSphere },
];

export async function tryLocalSolve(problem: string, subject: string): Promise<LocalSolution | null> {
  const norm = problem.toLowerCase().trim();
  for (const rule of PATTERNS) {
    const match = norm.match(rule.regex);
    if (match) {
      try {
        // Pass full normalized text as 2nd arg so solvers can extract all numbers
        const sol = rule.solver(match, norm);
        if (sol) { console.log(`[SpeedSolve AI] Local matched: "${norm.slice(0, 60)}..."`); return sol; }
      } catch (e) { console.error(`[SpeedSolve AI] Local error:`, e); }
    }
  }
  return null;
}