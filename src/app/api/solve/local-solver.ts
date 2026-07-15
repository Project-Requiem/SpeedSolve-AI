// SpeedSolve AI - Local Numerical Solver
// Handles common math/physics/chemistry problems without AI

interface LocalSolution {
  finalAnswer: string;
  finalFormula: string;
  steps: { desc: string; formula: string }[];
  altSteps: { desc: string; formula: string }[];
  similar: string[];
  mistakes: string[];
}

export function preprocessProblem(text: string): string {
  return text
    .replace(/\u00d7/g, "*")
    .replace(/\u00f7/g, "/")
    .replace(/\u2212/g, "-")
    .replace(/\u221a/g, "sqrt")
    .replace(/\u03c0/g, "pi")
    .replace(/\u03b8/g, "theta")
    .replace(/\u00b2/g, "^2")
    .replace(/\u00b3/g, "^3")
    .replace(/\u00b0/g, " degrees ")
    .replace(/\u2192/g, "->")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .trim();
}

function solveLinearEq(match: RegExpMatchArray): LocalSolution | null {
  const raw = match[0];
  const numPattern = /-?\d+\.?\d*/g;
  const nums = raw.match(numPattern)?.map(Number) || [];
  if (nums.length < 2) return null;
  const a = nums[0] || 1, b = nums[1] || 0, c = nums[2] || 0;
  if (a === 0) return null;
  const x = (c - b) / a;
  return {
    finalAnswer: `x = ${x}`,
    finalFormula: `x = ${x}`,
    steps: [
      { desc: `Start with the linear equation: ${a}x + ${b} = ${c}`, formula: `${a}x + ${b} = ${c}` },
      { desc: `Subtract ${b} from both sides to isolate the term with x`, formula: `${a}x = ${c} - ${b} = ${c - b}` },
      { desc: `Divide both sides by ${a} to solve for x`, formula: `x = ${c - b} / ${a} = ${x}` },
    ],
    altSteps: [{ desc: `Verification: Substitute x = ${x} back into the original equation`, formula: `${a}(${x}) + ${b} = ${a * x + b} = ${c} ✓` }],
    similar: [`Solve ${a + 2}x + ${b + 3} = ${c + 5}`, `Solve ${a}x - ${b} = ${c + 10}`, `If ${a}x + ${b} = ${c}, find 3x + 1`],
    mistakes: ["Forgetting to subtract b from both sides before dividing", "Dividing by the wrong coefficient", "Making sign errors when moving terms across the equals sign"],
  };
}

function solveQuadratic(match: RegExpMatchArray): LocalSolution | null {
  const raw = match[0];
  const nums = raw.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const a = nums[0] || 1, b = nums[1] || 0, c = nums[2] || 0;
  const D = b * b - 4 * a * c;
  if (D < 0) return {
    finalAnswer: `No real roots (discriminant = ${D} < 0)`, finalFormula: `D = ${D} < 0`,
    steps: [
      { desc: `Identify coefficients: a = ${a}, b = ${b}, c = ${c}`, formula: `a = ${a}, b = ${b}, c = ${c}` },
      { desc: `Calculate discriminant D = b² - 4ac`, formula: `D = ${b}² - 4(${a})(${c}) = ${b*b} - ${4*a*c} = ${D}` },
      { desc: `Since D < 0, there are no real roots.`, formula: `D = ${D} < 0` },
    ],
    altSteps: [], similar: [`Solve x² - 3x + 2 = 0`, `Solve 2x² + 5x - 3 = 0`, `Find roots of x² + 4x + 4 = 0`],
    mistakes: ["Forgetting to check the discriminant", "Arithmetic errors in b² - 4ac", "Confusing signs of b in quadratic formula"],
  };
  const sqrtD = Math.sqrt(D), x1 = (-b + sqrtD) / (2 * a), x2 = (-b - sqrtD) / (2 * a);
  return {
    finalAnswer: D === 0 ? `x = ${x1} (repeated root)` : `x = ${x1} or x = ${x2}`,
    finalFormula: D === 0 ? `x = ${x1}` : `x = ${x1}, ${x2}`,
    steps: [
      { desc: `Identify coefficients: a = ${a}, b = ${b}, c = ${c}`, formula: `${a}x² + ${b}x + ${c} = 0` },
      { desc: `Calculate discriminant D = b² - 4ac`, formula: `D = ${b*b} - ${4*a*c} = ${D}` },
      { desc: D === 0 ? `D = 0, one repeated root.` : `D > 0, two distinct real roots.`, formula: `x = (${-b} ± √${D}) / ${2*a}` },
      { desc: `Calculate root(s)`, formula: D === 0 ? `x = ${x1}` : `x₁ = ${x1}, x₂ = ${x2}` },
    ],
    altSteps: [{ desc: `Verification: substitute x₁ = ${x1}`, formula: `${a}(${x1})² + ${b}(${x1}) + ${c} = ${a*x1*x1+b*x1+c} ≈ 0 ✓` }],
    similar: [`Solve x² - 7x + 12 = 0`, `Solve 3x² - 2x - 1 = 0`, `Find roots where sum = 5, product = 6`],
    mistakes: ["Forgetting to divide by 2a", "Sign errors: using +b instead of -b", "Not checking if D is negative"],
  };
}

function solvePercentage(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const pct = nums[0], total = nums[1], result = (pct / 100) * total;
  return {
    finalAnswer: `${pct}% of ${total} = ${result}`, finalFormula: `${pct}\\% \\times ${total} = ${result}`,
    steps: [
      { desc: `Convert percentage to decimal: ${pct}% = ${pct}/100 = ${pct/100}`, formula: `${pct}% = ${pct/100}` },
      { desc: `Multiply by total value`, formula: `${pct/100} \\times ${total} = ${result}` },
    ],
    altSteps: [{ desc: `Using fraction method`, formula: `(${pct}/100) \\times ${total} = ${result}` }],
    similar: [`Find ${pct+10}% of ${total+50}`, `Find ${pct}% of ${total*2}`, `${result} is what percent of ${total}?`],
    mistakes: ["Forgetting to divide percentage by 100", "Confusing 'of' with other operations", "Misreading the question"],
  };
}

function solveSimpleInterest(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const P = nums[0], R = nums[1], T = nums[2], si = (P * R * T) / 100, A = P + si;
  return {
    finalAnswer: `Simple Interest = Rs ${si}, Total Amount = Rs ${A}`, finalFormula: `SI = \\frac{${P} \\times ${R} \\times ${T}}{100} = ${si}`,
    steps: [
      { desc: `Given: P = Rs ${P}, R = ${R}% per annum, T = ${T} years`, formula: `P = ${P}, R = ${R}%, T = ${T}` },
      { desc: `Apply SI formula: SI = PRT/100`, formula: `SI = (${P} \\times ${R} \\times ${T}) / 100 = ${si}` },
      { desc: `Total amount = P + SI`, formula: `A = ${P} + ${si} = ${A}` },
    ],
    altSteps: [{ desc: `Interest per year = ${P*R/100}, for ${T} years = ${si} ✓`, formula: `${P*R/100} \\times ${T} = ${si}` }],
    similar: [`SI on Rs ${P*2} at ${R+2}% for ${T+1} years`, `Find CI on Rs ${P} at ${R}% for ${T} years`, `In how many years will Rs ${P} double at ${R}%?`],
    mistakes: ["Forgetting to divide by 100", "Confusing SI with CI", "Not converting time to years if given in months"],
  };
}

function solveSpeed(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const d = nums[0], t = nums[1], v = d / t, vMs = (v * 1000) / 3600;
  return {
    finalAnswer: `Speed = ${v} km/h = ${vMs.toFixed(2)} m/s`, finalFormula: `v = ${v} \\text{ km/h} = ${vMs.toFixed(2)} \\text{ m/s}`,
    steps: [
      { desc: `Given: Distance = ${d} km, Time = ${t} hours`, formula: `d = ${d} km, t = ${t} hr` },
      { desc: `Speed = Distance / Time`, formula: `v = ${d} / ${t} = ${v} km/h` },
      { desc: `Convert to m/s: multiply by 5/18`, formula: `${v} \\times 5/18 = ${vMs.toFixed(2)} m/s` },
    ],
    altSteps: [{ desc: `Convert distance to meters first: ${d*1000}m / ${t*3600}s`, formula: `${d*1000} / ${t*3600} = ${vMs.toFixed(2)} m/s ✓` }],
    similar: [`A car travels ${d+100} km in ${t+1} hours. Find speed.`, `A cyclist covers ${d} km at ${v} km/h. Find time.`, `A train at ${vMs.toFixed(0)} m/s for ${t} hours. Find distance.`],
    mistakes: ["Forgetting km/h to m/s conversion", "Using time/distance instead of distance/time", "Mixing units inconsistently"],
  };
}

function solveAreaCircle(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const r = nums[0], area = Math.PI * r * r, circ = 2 * Math.PI * r;
  return {
    finalAnswer: `Area = ${area.toFixed(2)} sq cm`, finalFormula: `A = \\pi r^2 = ${area.toFixed(2)} \\text{ cm}^2`,
    steps: [
      { desc: `Radius = ${r} cm`, formula: `r = ${r} cm` },
      { desc: `Apply A = πr²`, formula: `A = \\pi \\times ${r}^2 = ${area.toFixed(2)} cm²` },
    ],
    altSteps: [{ desc: `Circumference C = 2πr`, formula: `C = 2\\pi \\times ${r} = ${circ.toFixed(2)} cm` }],
    similar: [`Area of circle with radius ${r+7} cm`, `Area of circle with diameter ${r*2} cm`, `Circumference when area = ${area.toFixed(0)} sq cm`],
    mistakes: ["Using diameter instead of radius", "Forgetting to square the radius", "Wrong value of π"],
  };
}

function solvePythagoras(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const a = nums[0], b = nums[1], c = Math.sqrt(a*a + b*b);
  return {
    finalAnswer: `Height = ${c.toFixed(2)} m`, finalFormula: `h = \\sqrt{${a}^2 + ${b}^2} = ${c.toFixed(2)} \\text{ m}`,
    steps: [
      { desc: `Right triangle: hypotenuse = ${a} m, base = ${b} m`, formula: `${a} m, ${b} m` },
      { desc: `h² = hyp² - base²`, formula: `h^2 = ${a}^2 - ${b}^2 = ${a*a - b*b}` },
      { desc: `h = √${a*a - b*b} = ${c.toFixed(2)} m`, formula: `h = ${c.toFixed(2)} m` },
    ],
    altSteps: [], similar: [`Ladder ${a+2}m, foot ${b+1}m away. Find height.`, `Right triangle legs 5cm, 12cm. Find hypotenuse.`, `Hypotenuse 13cm, leg 5cm. Find other leg.`],
    mistakes: ["Mixing up hypotenuse", "Forgetting square root", "Using addition instead of subtraction for a leg"],
  };
}

function solveNewton(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const F = nums[0], m = nums[1], a = F / m;
  return {
    finalAnswer: `Acceleration = ${a} m/s²`, finalFormula: `a = F/m = ${F}/${m} = ${a} \\text{ m/s}^2`,
    steps: [
      { desc: `F = ${F} N, m = ${m} kg`, formula: `F = ${F} N, m = ${m} kg` },
      { desc: `F = ma, so a = F/m`, formula: `a = ${F} / ${m} = ${a}` },
    ],
    altSteps: [{ desc: `Check: F = ma → ${m}×${a} = ${m*a} N ✓`, formula: `${m} \\times ${a} = ${m*a} N` }],
    similar: [`${m+3}kg pushed with ${F+5}N. Find a.`, `What force for ${m}kg at ${a+2}m/s²?`, `${m*2}kg at ${a}m/s². Find F.`],
    mistakes: ["Confusing mass and weight", "Wrong units", "Forgetting friction reduces net force"],
  };
}

function solveOhm(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const V = nums[0], I = nums[1], R = V / I;
  return {
    finalAnswer: `Resistance = ${R} Ω`, finalFormula: `R = V/I = ${V}/${I} = ${R} \\Omega`,
    steps: [
      { desc: `V = ${V} V, I = ${I} A`, formula: `V = ${V} V, I = ${I} A` },
      { desc: `Ohm's Law: V = IR, R = V/I`, formula: `R = ${V} / ${I} = ${R} Ω` },
    ],
    altSteps: [], similar: [`${R+2}Ω with ${V}V. Find current.`, `${R}Ω with ${I+1}A. Find voltage.`, `Two ${R}Ω in series with ${V}V.`],
    mistakes: ["Confusing V and I", "Not converting units (kΩ, mA)", "Using P=VI when asked for R"],
  };
}

function solvePH(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const c = nums[0], pH = -Math.log10(c);
  return {
    finalAnswer: `pH = ${pH.toFixed(2)}`, finalFormula: `\\text{pH} = -\\log[${c}] = ${pH.toFixed(2)}`,
    steps: [
      { desc: `[H⁺] = ${c} M (strong acid, fully dissociates)`, formula: `[H^+] = ${c} M` },
      { desc: `pH = -log[H⁺]`, formula: `pH = -\\log(${c}) = ${pH.toFixed(2)}` },
    ],
    altSteps: [{ desc: `pOH = 14 - pH = ${(14-pH).toFixed(2)}`, formula: `pOH = ${(14-pH).toFixed(2)}` }],
    similar: [`pH of ${c*10}M HCl?`, `pH of 0.001M NaOH?`, `[H⁺] if pH = ${pH.toFixed(0)}?`],
    mistakes: ["Forgetting negative sign", "Not recognizing strong acid dissociation", "Confusing pH with pOH"],
  };
}

function solveMolarity(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const g = nums[0], vmL = nums[1], Mw = 40, n = g / Mw, vL = vmL / 1000, M = n / vL;
  return {
    finalAnswer: `Molarity = ${M} M`, finalFormula: `M = n/V = ${n}/${vL} = ${M} \\text{ M}`,
    steps: [
      { desc: `Mass = ${g}g, Volume = ${vmL}mL, Mw(NaOH) = 40 g/mol`, formula: `m = ${g}g, V = ${vmL}mL` },
      { desc: `Moles = mass / molar mass`, formula: `n = ${g}/40 = ${n} mol` },
      { desc: `Volume in L = ${vL}`, formula: `V = ${vL} L` },
      { desc: `M = n/V`, formula: `M = ${n}/${vL} = ${M} M` },
    ],
    altSteps: [], similar: [`${g+8}g NaOH in ${vmL}mL`, `${g}g HCl (M=36.5) in ${vmL*2}mL`, `Grams of NaOH for 1M in 500mL?`],
    mistakes: ["Forgetting mL to L conversion", "Wrong molar mass", "Confusing molarity with molality"],
  };
}

function solveProjectile(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const u = nums[0], g = nums.length > 1 && nums[1] === 10 ? 10 : 9.8;
  const h = (u*u)/(2*g), tUp = u/g, tTotal = 2*tUp;
  return {
    finalAnswer: `Max Height = ${h.toFixed(2)} m, Time = ${tTotal.toFixed(2)} s`,
    finalFormula: `h = u^2/2g = ${h.toFixed(2)} \\text{ m}`,
    steps: [
      { desc: `u = ${u} m/s, g = ${g} m/s², v = 0 at max height`, formula: `u = ${u}, g = ${g}` },
      { desc: `h = u²/2g`, formula: `h = ${u}²/(2×${g}) = ${h.toFixed(2)} m` },
      { desc: `Time up = u/g, total = 2t`, formula: `t = ${tTotal.toFixed(2)} s` },
    ],
    altSteps: [], similar: [`Ball at ${u+10}m/s. Max height?`, `Time to return from ${u}m/s?`, `Height ${h.toFixed(0)}m. Find u.`],
    mistakes: ["Using g = +9.8 for upward", "Confusing time up with total time", "v≠0 at max height assumption"],
  };
}

function solveWorkPower(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const m = nums[0], h = nums[1], t = nums[2], g = 9.8, W = m*g*h, P = W/t;
  return {
    finalAnswer: `Work = ${W} J, Power = ${P.toFixed(2)} W`, finalFormula: `P = mgh/t = ${P.toFixed(2)} W`,
    steps: [
      { desc: `m = ${m}kg, h = ${h}m, t = ${t}s`, formula: `m=${m}, h=${h}, t=${t}` },
      { desc: `W = mgh`, formula: `W = ${m}×${g}×${h} = ${W} J` },
      { desc: `P = W/t`, formula: `P = ${W}/${t} = ${P.toFixed(2)} W` },
    ],
    altSteps: [], similar: [`${m+20}kg climbs ${h+2}m in ${t-2}s`, `Work lifting ${m}kg to ${h}m?`, `Power for ${m}kg to ${h}m in ${t}s?`],
    mistakes: ["Forgetting g in mgh", "Confusing J with W", "Wrong g value"],
  };
}

function solveFreeFall(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const h = nums[0], g = nums.length > 1 && nums[1] === 10 ? 10 : 9.8, v = Math.sqrt(2*g*h);
  return {
    finalAnswer: `Velocity = ${v.toFixed(2)} m/s`, finalFormula: `v = \\sqrt{2gh} = ${v.toFixed(2)} \\text{ m/s}`,
    steps: [
      { desc: `h = ${h}m, u = 0, g = ${g}`, formula: `h=${h}, u=0, g=${g}` },
      { desc: `v² = u² + 2gh = 2gh`, formula: `v^2 = 2×${g}×${h} = ${2*g*h}` },
      { desc: `v = √${2*g*h} = ${v.toFixed(2)} m/s`, formula: `v = ${v.toFixed(2)} m/s` },
    ],
    altSteps: [], similar: [`Fall from ${h+10}m. Velocity?`, `Time to fall ${h}m?`, `Height for ${v.toFixed(0)}m/s?`],
    mistakes: ["Using u≠0", "g adds to velocity not subtracts", "Confusing with horizontal distance"],
  };
}

function solveMomentum(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 4) return null;
  const m1=nums[0],v1=nums[1],m2=nums[2],v2=nums[3];
  const p = m1*v1+m2*v2, M = m1+m2, vf = p/M;
  return {
    finalAnswer: `Final velocity = ${vf.toFixed(2)} m/s`, finalFormula: `v_f = \\frac{${p}}{${M}} = ${vf.toFixed(2)} \\text{ m/s}`,
    steps: [
      { desc: `m₁=${m1}kg u₁=${v1}m/s, m₂=${m2}kg u₂=${v2}m/s`, formula: `m_1=${m1}, u_1=${v1}, m_2=${m2}, u_2=${v2}` },
      { desc: `Conservation: m₁u₁ + m₂u₂ = (m₁+m₂)v`, formula: `${m1}(${v1}) + ${m2}(${v2}) = ${M}v` },
      { desc: `v = ${p}/${M} = ${vf.toFixed(2)} m/s`, formula: `v = ${vf.toFixed(2)} m/s` },
    ],
    altSteps: [], similar: [`${m1}kg at ${v1}m/s hits stationary ${m2}kg`, `Two ${m1}kg at ${v1} and -${v1} m/s collide`, `${m1+2}kg at ${v1+5}m/s hits ${m2}kg at rest`],
    mistakes: ["Direction matters for velocity signs", "Using KE conservation (elastic only)", "Not accounting both momenta"],
  };
}

function solveCircular(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const m=nums[0],r=nums[1],v=nums[2], F = (m*v*v)/r;
  return {
    finalAnswer: `Centripetal Force = ${F.toFixed(2)} N`, finalFormula: `F_c = mv^2/r = ${F.toFixed(2)} N`,
    steps: [
      { desc: `m=${m}kg, r=${r}m, v=${v}m/s`, formula: `m=${m}, r=${r}, v=${v}` },
      { desc: `F = mv²/r`, formula: `F = ${m}×${v}²/${r} = ${F.toFixed(2)} N` },
    ],
    altSteps: [], similar: [`${m+1}kg at ${v+1}m/s radius ${r+1}m`, `Velocity for ${F.toFixed(0)}N with ${m}kg in ${r}m?`, `${m}kg radius ${r*2}m at ${v}m/s`],
    mistakes: ["Confusing centripetal with centrifugal", "Using diameter instead of radius", "Direction of force"],
  };
}

function solveMoles(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 1) return null;
  const g = nums[0], Mw = 40, n = g/Mw;
  return {
    finalAnswer: `Moles = ${n} mol`, finalFormula: `n = m/M = ${g}/${Mw} = ${n} \\text{ mol}`,
    steps: [
      { desc: `Mass = ${g}g, Mw(NaOH) = 23+16+1 = 40 g/mol`, formula: `Mw = 40 g/mol` },
      { desc: `n = mass/molar mass`, formula: `n = ${g}/40 = ${n} mol` },
    ],
    altSteps: [], similar: [`${g+40}g NaOH moles?`, `${g}g H₂O (M=18) moles?`, `Mass for 3 moles NaOH?`],
    mistakes: ["Wrong molar mass", "Confusing moles with molarity", "Wrong atomic weight sum"],
  };
}

function solveGasLaw(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 4) return null;
  const p1=nums[0],v1=nums[1],p2=nums[2],v2 = (p1*v1)/p2;
  return {
    finalAnswer: `New Volume = ${v2} L`, finalFormula: `V_2 = P_1V_1/P_2 = ${v2} L`,
    steps: [
      { desc: `P₁=${p1}atm, V₁=${v1}L, P₂=${p2}atm (T constant)`, formula: `P_1=${p1}, V_1=${v1}, P_2=${p2}` },
      { desc: `Boyle's Law: P₁V₁ = P₂V₂`, formula: `P_1V_1 = P_2V_2` },
      { desc: `V₂ = (${p1}×${v1})/${p2} = ${v2} L`, formula: `V_2 = ${v2} L` },
    ],
    altSteps: [], similar: [`${p1}atm ${v1}L at ${p2*2}atm?`, `${p2}atm ${v2}L, new pressure at ${v1}L?`],
    mistakes: ["Using Boyle's when T not constant", "Confusing with Charles's Law", "Only works at constant T"],
  };
}

function solveDistance(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 4) return null;
  const x1=nums[0],y1=nums[1],x2=nums[2],y2=nums[3];
  const d = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
  return {
    finalAnswer: `Distance = ${d.toFixed(2)}`, finalFormula: `d = \\sqrt{(${x2}-${x1})^2+(${y2}-${y1})^2} = ${d.toFixed(2)}`,
    steps: [
      { desc: `A(${x1},${y1}), B(${x2},${y2})`, formula: `A(${x1},${y1}), B(${x2},${y2})` },
      { desc: `d = √[(x₂-x₁)² + (y₂-y₁)²]`, formula: `d = \\sqrt{${x2-x1}^2 + ${y2-y1}^2}` },
      { desc: `d = √${(x2-x1)**2 + (y2-y1)**2} = ${d.toFixed(2)}`, formula: `d = ${d.toFixed(2)}` },
    ],
    altSteps: [], similar: [`Distance (0,0) to (${x2},${y2})`, `Distance (${x1},${y1}) to (${x2*2},${y2*2})`, `Midpoint of AB`],
    mistakes: ["Not squaring differences", "Mixing x and y", "Forgetting square root"],
  };
}

function solveDerivative(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length >= 4) {
    const a1=nums[0],a2=nums[1],a3=nums[2],a4=nums[3];
    return {
      finalAnswer: `f'(x) = ${a1*4}x³ ${a2*2>=0?'+':''}${a2*2}x + ${a3}`,
      finalFormula: `f'(x) = ${a1*4}x^3 ${a2*2>=0?'+':''}${a2*2}x + ${a3}`,
      steps: [
        { desc: `f(x) = ${a1}x⁴ - ${Math.abs(a2)}x² + ${a3}x - ${Math.abs(a4)}`, formula: `f(x) = ${a1}x^4 - ${Math.abs(a2)}x^2 + ${a3}x - ${Math.abs(a4)}` },
        { desc: `Power rule: d/dx(axⁿ) = anxⁿ⁻¹`, formula: `f'(x) = d/dx(${a1}x^4) - d/dx(${Math.abs(a2)}x^2) + d/dx(${a3}x) - d/dx(${Math.abs(a4)})` },
        { desc: `f'(x) = ${a1*4}x³ - ${Math.abs(a2)*2}x + ${a3}`, formula: `f'(x) = ${a1*4}x^3 - ${Math.abs(a2)*2}x + ${a3}` },
      ],
      altSteps: [], similar: [`Differentiate 5x³-3x+2`, `f'(x) for x⁵-2x³+x`, `Second derivative?`],
      mistakes: ["Forgetting coefficient multiplication", "Dropping constant derivative (0)", "Decrementing exponent but not multiplying"],
    };
  }
  return null;
}

function solveProbability(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const r=nums[0],b=nums[1],g=nums[2],total=r+b+g,p=r/total;
  return {
    finalAnswer: `P(red) = ${r}/${total} = ${p.toFixed(4)}`, finalFormula: `P(\\text{red}) = ${r}/${total} = ${p.toFixed(4)}`,
    steps: [
      { desc: `Total = ${r}+${b}+${g} = ${total}`, formula: `n(S) = ${total}` },
      { desc: `Favorable (red) = ${r}`, formula: `n(red) = ${r}` },
      { desc: `P = favorable/total`, formula: `P = ${r}/${total} = ${p.toFixed(4)}` },
    ],
    altSteps: [], similar: [`${r+2} red, ${b} blue, ${g} green. P(red)?`, `2 balls without replacement P(both red)?`, `P(red or green)?`],
    mistakes: ["Not counting all ball types", "Confusing with/without replacement", "Not simplifying fraction"],
  };
}

function solveAP(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const a=nums[0],d=nums[1]-nums[0],n=nums[2],an=a+(n-1)*d;
  return {
    finalAnswer: `${n}th term = ${an}`, finalFormula: `a_{${n}} = ${a}+${n-1}×${d} = ${an}`,
    steps: [
      { desc: `a = ${a}, d = ${nums[1]}-${a} = ${d}`, formula: `a=${a}, d=${d}` },
      { desc: `aₙ = a + (n-1)d`, formula: `a_{${n}} = ${a} + (${n}-1)×${d}` },
      { desc: `aₙ = ${an}`, formula: `a_{${n}} = ${an}` },
    ],
    altSteps: [], similar: [`15th term of 5,11,17,...`, `Which term of 3,7,11,... is 79?`, `Sum of first ${n} terms`],
    mistakes: ["Wrong common difference", "Using n instead of (n-1)", "Confusing nth term with sum"],
  };
}

function solveEmpirical(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 6) return null;
  const cP=nums[0],hP=nums[1],oP=nums[2],cM=nums[3],hM=nums[4],oM=nums[5];
  const cm=cP/cM,hm=hP/hM,om=oP/oM,min=Math.min(cm,hm,om);
  const cr=Math.round(cm/min),hr=Math.round(hm/min),orr=Math.round(om/min);
  return {
    finalAnswer: `Empirical Formula = C${cr===1?'':cr}H${hr===1?'':hr}O${orr===1?'':orr}`,
    finalFormula: `C_{${cr}}H_{${hr}}O_{${orr}}`,
    steps: [
      { desc: `C=${cP}%, H=${hP}%, O=${oP}%`, formula: `C:${cP}%, H:${hP}%, O:${oP}%` },
      { desc: `Moles: C=${cm.toFixed(2)}, H=${hm.toFixed(2)}, O=${om.toFixed(2)}`, formula: `C:${cm.toFixed(2)}, H:${hm.toFixed(2)}, O:${om.toFixed(2)}` },
      { desc: `Divide by smallest (${min.toFixed(2)})`, formula: `C≈${cr}, H≈${hr}, O≈${orr}` },
    ],
    altSteps: [], similar: [`40% C, 6.7% H, 53.3% O`, `32% C, 42.7% O, rest H`, `Molecular formula if M=180, EF=CH₂O`],
    mistakes: ["Not dividing by smallest", "Non-integer ratios not handled", "Not using 100g basis"],
  };
}

function solveReaction(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 3) return null;
  const v1=nums[0],m1=nums[1],v2=nums[2],m2=(v1*m1)/v2;
  return {
    finalAnswer: `Molarity of NaOH = ${m2} M`, finalFormula: `M_2 = M_1V_1/V_2 = ${m2} M`,
    steps: [
      { desc: `V₁(HCl)=${v1}mL, M₁=${m1}M, V₂(NaOH)=${v2}mL`, formula: `V_1=${v1}, M_1=${m1}, V_2=${v2}` },
      { desc: `HCl+NaOH→NaCl+H₂O (1:1), M₁V₁=M₂V₂`, formula: `M_1V_1 = M_2V_2` },
      { desc: `M₂ = (${m1}×${v1})/${v2} = ${m2} M`, formula: `M_2 = ${m2} M` },
    ],
    altSteps: [], similar: [`25mL ${m1}M H₂SO₄ + 50mL NaOH?`, `${v1}mL ${m2}M HCl + 30mL NaOH?`, `Volume of ${m1}M NaOH for ${v1}mL ${m1}M HCl?`],
    mistakes: ["Not checking stoichiometric ratio", "Units mismatch", "Confusing acid and base volumes"],
  };
}

function solveBalance(match: RegExpMatchArray): LocalSolution | null {
  if (match[0].includes("Fe") && match[0].includes("O2") && match[0].includes("Fe2O3")) {
    return {
      finalAnswer: `4Fe + 3O₂ → 2Fe₂O₃`, finalFormula: `4Fe + 3O_2 \\rightarrow 2Fe_2O_3`,
      steps: [
        { desc: `Unbalanced: Fe + O₂ → Fe₂O₃`, formula: `Fe + O_2 \\rightarrow Fe_2O_3` },
        { desc: `Balance Fe: 2Fe + O₂ → Fe₂O₃`, formula: `2Fe + O_2 \\rightarrow Fe_2O_3` },
        { desc: `Balance O: LCM=6, so 3O₂ and 2Fe₂O₃`, formula: `?Fe + 3O_2 \\rightarrow 2Fe_2O_3` },
        { desc: `Balance Fe: 4Fe + 3O₂ → 2Fe₂O₃`, formula: `4Fe + 3O_2 \\rightarrow 2Fe_2O_3` },
      ],
      altSteps: [], similar: [`Balance Al + O₂ → Al₂O₃`, `Balance CH₄ + O₂ → CO₂ + H₂O`, `Balance N₂ + H₂ → NH₃`],
      mistakes: ["Changing subscripts instead of coefficients", "Not recounting after each change", "Not finding LCM for oxygen"],
    };
  }
  return null;
}

function solveLCMGCD(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number).filter(n=>n>0) || [];
  if (nums.length < 2) return null;
  function gcd(a:number,b:number){return b===0?a:gcd(b,a%b)}
  function lcm(a:number,b:number){return(a*b)/gcd(a,b)}
  let g=nums[0],l=nums[0];
  for(let i=1;i<nums.length;i++){g=gcd(g,nums[i]);l=lcm(l,nums[i]);}
  return {
    finalAnswer: `LCM = ${l}, GCD = ${g}`, finalFormula: `\\text{LCM} = ${l}, \\text{GCD} = ${g}`,
    steps: [
      { desc: `Numbers: ${nums.join(", ")}`, formula: `${nums.join(", ")}` },
      { desc: `GCD (Euclidean algorithm)`, formula: `GCD = ${g}` },
      { desc: `LCM = (a×b)/GCD`, formula: `LCM = ${l}` },
    ],
    altSteps: [], similar: [`LCM & GCD of ${nums[0]+12}, ${nums[1]+8}`, `LCM & GCD of 15, 25, 35`, `GCD=${g}, LCM=${l}, one number=${nums[0]}, find other`],
    mistakes: ["Confusing LCM and GCD", "LCM×GCD=a×b only for two numbers", "Wrong prime factorization"],
  };
}

function solveTrig(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 2) return null;
  const o=nums[0],h=nums[1],a=Math.sqrt(h*h-o*o);
  return {
    finalAnswer: `cos θ = ${(a/h).toFixed(4)}, tan θ = ${(o/a).toFixed(4)}`,
    finalFormula: `\\cos \\theta = ${a.toFixed(2)}/${h}, \\tan \\theta = ${o}/${a.toFixed(2)}`,
    steps: [
      { desc: `sin θ = ${o}/${h}`, formula: `\\sin \\theta = ${o}/${h}` },
      { desc: `adj = √(${h}²-${o}²) = ${a.toFixed(2)}`, formula: `\\text{adj} = ${a.toFixed(2)}` },
      { desc: `cos θ = adj/hyp, tan θ = opp/adj`, formula: `\\cos \\theta = ${(a/h).toFixed(4)}, \\tan \\theta = ${(o/a).toFixed(4)}` },
    ],
    altSteps: [], similar: [`cos θ = 4/5, find sin and tan`, `tan θ = 3/4, find sin and cos`, `sin θ = 5/13, find cos and tan`],
    mistakes: ["Wrong adjacent side", "Confusing opp/adj", "sin²+cos²=1 for verification"],
  };
}

function solveStats(match: RegExpMatchArray): LocalSolution | null {
  const nums = match[0].match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 5) return null;
  const sorted=[...nums].sort((a,b)=>a-b), n=sorted.length;
  const mean=nums.reduce((a,b)=>a+b,0)/n;
  const median=n%2===0?(sorted[n/2-1]+sorted[n/2])/2:sorted[Math.floor(n/2)];
  const freq:Record<number,number>={};let maxF=0;
  for(const num of nums){freq[num]=(freq[num]||0)+1;maxF=Math.max(maxF,freq[num]);}
  const modes=Object.entries(freq).filter(([,f])=>f===maxF&&maxF>1).map(([v])=>Number(v));
  const modeStr=modes.length?modes.join(", "):"No mode";
  return {
    finalAnswer: `Mean = ${mean.toFixed(2)}, Median = ${median}, Mode = ${modeStr}`,
    finalFormula: `\\bar{x} = ${mean.toFixed(2)}`,
    steps: [
      { desc: `Data: ${nums.join(", ")} → Sorted: ${sorted.join(", ")}`, formula: `Sorted: ${sorted.join(", ")}` },
      { desc: `Mean = sum/n`, formula: `\\bar{x} = ${nums.reduce((a,b)=>a+b,0)}/${n} = ${mean.toFixed(2)}` },
      { desc: n%2===0?`Median = avg of ${(n/2)}th and ${(n/2+1)}th`:`Median = ${Math.floor(n/2)+1}th value`, formula: `Median = ${median}` },
      { desc: `Mode = most frequent value(s)`, formula: `Mode = ${modeStr}` },
    ],
    altSteps: [], similar: [`Stats for ${nums.map(n=>n+2).join(", ")}`, `If values doubled, what happens?`, `Range and std dev?`],
    mistakes: ["Not sorting before median", "Even count: not averaging middle two", "Confusing mean/median/mode"],
  };
}

function solveIdentity(match: RegExpMatchArray): LocalSolution | null {
  return {
    finalAnswer: `(a+b)² - (a-b)² = 4ab`, finalFormula: `(a+b)^2 - (a-b)^2 = 4ab`,
    steps: [
      { desc: `(a+b)² = a² + 2ab + b²`, formula: `(a+b)^2 = a^2 + 2ab + b^2` },
      { desc: `(a-b)² = a² - 2ab + b²`, formula: `(a-b)^2 = a^2 - 2ab + b^2` },
      { desc: `Subtract: a² and b² cancel, 2ab-(-2ab) = 4ab`, formula: `= 4ab` },
    ],
    altSteps: [{ desc: `Difference of squares: (X+Y)(X-Y) = (2a)(2b) = 4ab ✓`, formula: `(2a)(2b) = 4ab` }],
    similar: [`Simplify (a+b)² + (a-b)²`, `Simplify (2x+3)² - (2x-3)²`, `Prove (a+b)³-(a-b)³=2b(3a²+b²)`],
    mistakes: ["Sign errors in (a-b)²", "Forgetting to flip signs when subtracting", "Not using difference of squares shortcut"],
  };
}

interface PatternRule { regex: RegExp; solver: (m: RegExpMatchArray) => LocalSolution | null; }

const PATTERNS: PatternRule[] = [
  { regex: /solve\s+(\d+)\s*x\s*[+\-]\s*\d+\s*=\s*\d+/i, solver: solveLinearEq },
  { regex: /solve\s+x\^2\s*[+\-]\s*\d+\s*x\s*[+\-]\s*\d+\s*=\s*0/i, solver: solveQuadratic },
  { regex: /find\s+([\d.]+)%\s+of\s+([\d.]+)/i, solver: solvePercentage },
  { regex: /simple\s+interest\s+on\s+rs\s*([\d.]+)\s+at\s*([\d.]+)%\s*per\s+annum\s+for\s*([\d.]+)\s*years/i, solver: solveSimpleInterest },
  { regex: /travels\s+([\d.]+)\s*km\s+in\s+([\d.]+)\s*hours/i, solver: solveSpeed },
  { regex: /area\s+of\s+a\s+circle\s+with\s+radius\s+([\d.]+)/i, solver: solveAreaCircle },
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
  { regex: /sin\s*[θ\\theta]\s*=\s*(\d+)\/(\d+)/i, solver: solveTrig },
  { regex: /mean.*?median.*?mode\s+of/i, solver: solveStats },
  { regex: /\(a\+b\)\^2\s*-\s*\(a-b\)\^2/i, solver: solveIdentity },
];

export async function tryLocalSolve(problem: string, subject: string): Promise<LocalSolution | null> {
  const norm = problem.toLowerCase().trim();
  for (const rule of PATTERNS) {
    const match = norm.match(rule.regex);
    if (match) {
      try {
        const sol = rule.solver(match);
        if (sol) { console.log(`[SpeedSolve AI] Local matched: "${norm.slice(0,60)}..."`); return sol; }
      } catch (e) { console.error(`[SpeedSolve AI] Local error:`, e); }
    }
  }
  return null;
}