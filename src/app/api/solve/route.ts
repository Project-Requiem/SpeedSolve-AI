import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { tryLocalSolve, preprocessProblem } from "./local-solver";
import { isPromptInjection, INJECTION_MESSAGE } from "@/lib/injection-guard";

const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// ── AI Provider 1: Google Gemini ──
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return "";
  const models = ["gemini-2.0-flash", "gemini-2.5-pro"];
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await geminiAI.models.generateContent({
          model,
          contents: userPrompt,
          config: { systemInstruction: systemPrompt, temperature: 0.1, maxOutputTokens: 8192 },
        });
        const text = response.text || "";
        if (text.trim().length > 20) {
          console.log(`[SpeedSolve] Gemini ${model} OK (${text.length} chars)`);
          return text;
        }
      } catch (err: any) {
        console.error(`[SpeedSolve] Gemini ${model}: ${err?.message?.slice(0, 100)}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return "";
}

// ── AI Provider 2: Groq (free, fast, OpenAI-compatible) ──
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "";
  const models = ["llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        console.error(`[SpeedSolve] Groq ${model}: ${res.status} ${await res.text().catch(() => "")}`);
        continue;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (text.trim().length > 20) {
        console.log(`[SpeedSolve] Groq ${model} OK (${text.length} chars)`);
        return text;
      }
    } catch (err: any) {
      console.error(`[SpeedSolve] Groq ${model}: ${err?.message?.slice(0, 100)}`);
    }
  }
  return "";
}

// ── Try all AI providers in sequence ──
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  // Try Gemini first
  const geminiResult = await callGemini(systemPrompt, userPrompt);
  if (geminiResult) return geminiResult;

  // Fallback to Groq
  console.log("[SpeedSolve] Gemini failed, trying Groq...");
  const groqResult = await callGroq(systemPrompt, userPrompt);
  if (groqResult) return groqResult;

  console.error("[SpeedSolve] ALL AI providers failed");
  return "";
}

// ── Board tips ──
const BOARD_TIPS: Record<string, Record<string, string[]>> = {
  icse: {
    mathematics: [
      "ICSE values clear step-by-step working with reasons. Always show the formula before substituting.",
      "For trigonometry, ICSE often asks to prove identities — show LHS and RHS transformations separately.",
      "In ICSE Board exams, diagrams must be neat and labelled with pencil. Marks are deducted for untidy work.",
      "ICSE often tests Mensuration with composite figures — break them into simpler shapes.",
    ],
    physics: [
      "ICSE Physics requires numericals with proper units at every step. Don't just write the final unit.",
      "For ray diagrams (optics), use a ruler and label all points clearly. ICSE is strict about this.",
      "ICSE often asks derivations — learn them step by step, not just the final formula.",
    ],
    chemistry: [
      "ICSE Chemistry requires balanced equations with state symbols (g), (l), (s), (aq).",
      "For organic chemistry, ICSE focuses on named reactions and their mechanisms.",
      "Numericals on mole concept and gas laws are frequent — practice with proper units.",
    ],
  },
  cbse: {
    mathematics: [
      "CBSE awards marks for each step — even if the final answer is wrong, correct steps get credit.",
      "For Statistics, CBSE often gives frequency distribution tables — practise finding mean (all 3 methods), median, and mode.",
      "CBSE Board papers usually have a mandatory 4-mark question on Probability or Linear Programming.",
      "In coordinate geometry, CBSE frequently tests section formula and area of triangle.",
    ],
    physics: [
      "CBSE Physics numericals require SI units throughout. Convert km/h to m/s, cm to m, etc.",
      "Diagram-based questions carry 2-3 marks. Always draw and label the diagram.",
      "CBSE often combines concepts — e.g., electromagnetic induction with circuits.",
    ],
    chemistry: [
      "CBSE requires balanced chemical equations in almost every numerical.",
      "NCERT examples and exercises are the primary source for CBSE board questions.",
      "For pH and equilibrium, CBSE often tests with buffer solutions and Le Chatelier's principle.",
    ],
  },
  state: {
    mathematics: [
      "State Board exams typically have more direct numericals compared to CBSE/ICSE.",
      "Focus on textbook examples — many State Board questions are similar to them.",
      "Show all steps clearly — step marking is common in State Board evaluation.",
    ],
    physics: [
      "State Board papers often have straightforward formula-based numericals.",
      "Practice all solved examples from the textbook thoroughly.",
      "Units and dimensional analysis carry separate marks.",
    ],
    chemistry: [
      "State Board focuses more on descriptive answers and chemical equations.",
      "Practise numericals on molarity, molality, and stoichiometry.",
      "Organic chemistry naming reactions (IUPAC nomenclature) is frequently tested.",
    ],
  },
};

const SAMPLE_PROBLEMS: Record<string, { text: string; label: string }[]> = {
  mathematics: [
    { text: "Solve 3x + 5 = 14", label: "Linear Equation" },
    { text: "Solve x^2 - 5x + 6 = 0", label: "Quadratic" },
    { text: "Find 15% of 200", label: "Percentage" },
    { text: "Find the LCM and HCF of 48, 72, 108", label: "LCM & HCF" },
    { text: "A train travels 360 km in 4 hours. Find its speed in m/s.", label: "Speed" },
    { text: "Find the area of a circle with radius 14 cm.", label: "Area" },
    { text: "If sin θ = 3/5, find cos θ and tan θ.", label: "Trigonometry" },
    { text: "Find the mean, median, mode of: 5, 3, 7, 3, 5, 9, 3, 1", label: "Statistics" },
    { text: "A ladder 10 m long leans against a wall. If the foot is 6 m from the wall, find the height.", label: "Pythagoras" },
    { text: "Differentiate f(x) = 3x^4 - 2x^2 + 5x - 7", label: "Derivative" },
    { text: "Find the 10th term of AP: 2, 7, 12, 17, ...", label: "Sequence" },
    { text: "Simple Interest on Rs 5000 at 8% per annum for 3 years", label: "Interest" },
    { text: "Find the distance between points A(3,4) and B(7,1)", label: "Coordinate" },
    { text: "Simplify: (a+b)^2 - (a-b)^2", label: "Identity" },
    { text: "A bag contains 5 red, 3 blue, and 2 green balls. Find probability of drawing a red ball.", label: "Probability" },
    { text: "Integrate ∫(2x + 3)dx", label: "Integration" },
    { text: "Find the value of tan 15° using compound angles", label: "Compound Angles" },
    { text: "Prove that √2 is irrational", label: "Proof" },
    { text: "Find the surface area and volume of a cone with radius 7 cm and height 24 cm", label: "Mensuration" },
    { text: "Solve: 2x + 3y = 12 and 4x - y = 5", label: "Simultaneous Eq" },
    { text: "Find the sum of first 20 terms of AP: 3, 7, 11, 15, ...", label: "AP Sum" },
    { text: "If A = {1,2,3,4} and B = {3,4,5,6}, find A∩B and A∪B", label: "Sets" },
    { text: "Find the zeros of the polynomial p(x) = x^2 - 4x + 3", label: "Polynomials" },
    { text: "Evaluate: lim(x→0) (sin x)/x", label: "Limits" },
  ],
  physics: [
    { text: "A car travels 150 km in 2.5 hours. Find its average speed.", label: "Kinematics" },
    { text: "A 2 kg block is pushed with 10 N force on a frictionless surface. Find acceleration.", label: "Newton's Law" },
    { text: "A ball is thrown upward with velocity 20 m/s. Find max height. (g=10)", label: "Projectile" },
    { text: "A 60 kg person climbs 5 m stairs in 10 s. Find power. (g=9.8)", label: "Work & Power" },
    { text: "Find the resistance of a circuit with 12V battery and 3A current.", label: "Ohm's Law" },
    { text: "A 0.5 kg object moves in a circle of radius 2m at 3 m/s. Find centripetal force.", label: "Circular Motion" },
    { text: "An object is dropped from 20m height. Find velocity at ground. (g=9.8)", label: "Free Fall" },
    { text: "Two objects of masses 2kg and 4kg moving at 6 m/s and 0 m/s collide and stick. Find final velocity.", label: "Momentum" },
    { text: "A convex lens has focal length 20 cm. An object is placed 30 cm from the lens. Find image distance.", label: "Lens Formula" },
    { text: "Calculate the current through a 4Ω and 6Ω resistor in series with a 10V battery.", label: "Series Circuit" },
    { text: "A wave has frequency 500 Hz and wavelength 0.5 m. Find the wave speed.", label: "Wave Speed" },
    { text: "Find the energy stored in a capacitor of 10μF charged to 100V. (E = 1/2 CV^2)", label: "Capacitor" },
    { text: "An object is placed 15 cm from a concave mirror of focal length 10 cm. Find image position.", label: "Mirror Formula" },
    { text: "A wire of resistance 10Ω is stretched to double its length. Find new resistance.", label: "Resistivity" },
    { text: "Find the kinetic energy of a 1000 kg car moving at 20 m/s.", label: "Kinetic Energy" },
  ],
  chemistry: [
    { text: "Find the pH of 0.01 M HCl solution.", label: "pH" },
    { text: "How many moles of NaOH are in 80 g? (Na=23, O=16, H=1)", label: "Moles" },
    { text: "Balance: Fe + O2 = Fe2O3", label: "Balance" },
    { text: "A gas at 2 atm and 300 K occupies 5 L. What volume at 1 atm and 300 K?", label: "Gas Law" },
    { text: "Find the molarity of 4g NaOH in 500 mL solution. (Na=23, O=16, H=1)", label: "Molarity" },
    { text: "What is the empirical formula of a compound with 40% C, 6.7% H, 53.3% O? (C=12, H=1, O=16)", label: "Empirical" },
    { text: "50 mL of 0.1 M HCl reacts with 25 mL of NaOH. Find molarity of NaOH.", label: "Reaction" },
    { text: "Calculate the mass of one atom of carbon. (Avogadro number = 6.022 x 10^23, C=12)", label: "Mole Concept" },
    { text: "Write the electron configuration of Fe (Z=26)", label: "Electron Config" },
    { text: "Find the oxidation number of Mn in KMnO4", label: "Oxidation" },
    { text: "The rate of a reaction doubles when temperature increases from 300K to 310K. Find activation energy.", label: "Rate Law" },
    { text: "Calculate the enthalpy change when 2 mol of H2 reacts with O2 to form water. ΔH = -286 kJ/mol", label: "Thermochem" },
  ],
};

// ── Rich worked examples ──
const EXAMPLES: Record<string, string> = {
  mathematics: JSON.stringify({
    finalAnswer: "x = 3",
    steps: [
      { desc: "Given the linear equation $3x + 5 = 14$. We need to find the value of x.", formula: "$3x + 5 = 14$" },
      { desc: "Applying the transposition method: move the constant term 5 to the RHS. This changes its sign.", formula: "$3x = 14 - 5$" },
      { desc: "Simplify the RHS.", formula: "$3x = 9$" },
      { desc: "Divide both sides by the coefficient of x, which is 3.", formula: "$x = 9 / 3$" },
      { desc: "Therefore, we get the value of x.", formula: "$x = 3$" },
      { desc: "Verification: Substitute $x = 3$ back into the original equation. LHS = $3(3) + 5 = 9 + 5 = 14$ = RHS. Hence verified.", formula: "$3(3) + 5 = 14$" },
    ],
    altSteps: [
      { desc: "Using the Balance Method: whatever we add to one side, we add to the other.", formula: "$3x + 5 - 5 = 14 - 5$" },
      { desc: "Simplify both sides.", formula: "$3x = 9$" },
      { desc: "Divide both sides by 3.", formula: "$x = 9 / 3 = 3$" },
      { desc: "Verification: LHS = $3(3) + 5 = 14$ = RHS. Confirmed.", formula: "$14 = 14$" },
    ],
    similar: ["Solve 5x - 7 = 18", "Solve 2x + 3 = x + 8"],
    mistakes: ["Sign errors when moving terms across the = sign", "Forgetting to divide the entire RHS, not just one term"],
  }),
  physics: JSON.stringify({
    finalAnswer: "v = 19.6 m/s",
    finalFormula: "$v = u + at = 0 + (9.8)(2) = 19.6$ m/s",
    steps: [
      { desc: "Given: Initial velocity $u = 0$ m/s (object dropped from rest), acceleration $a = g = 9.8$ $m/s^{2}$, time $t = 2$ s. Find: final velocity v.", formula: "" },
      { desc: "We use the First Equation of Motion (Kinematic Equation).", formula: "$v = u + at$" },
      { desc: "Substitute the given values: $u = 0$, $a = 9.8$ $m/s^{2}$, $t = 2$ s.", formula: "$v = 0 + (9.8)(2)$" },
      { desc: "Compute the product and add to initial velocity.", formula: "$v = 0 + 19.6 = 19.6$ m/s" },
      { desc: "Verification using Third Equation of Motion: $v^{2} = u^{2} + 2as$. Distance $s = \frac{1}{2}gt^{2} = 0.5 \times 9.8 \times 4 = 19.6$ m. Then $v = \sqrt{0 + 2 \times 9.8 \times 19.6} = 19.6$ m/s. Matches.", formula: "$v^{2} = u^{2} + 2as$" },
    ],
    altSteps: [
      { desc: "Using the Principle of Conservation of Energy: $Potential Energy = Kinetic Energy$ at ground level.", formula: "$mgh = \frac{1}{2}mv^{2}$" },
      { desc: "Cancel mass m from both sides.", formula: "$gh = \frac{1}{2}v^{2}$" },
      { desc: "Rearrange to solve for v. First find height: $s = \frac{1}{2}gt^{2} = 0.5 \times 9.8 \times 4 = 19.6$ m.", formula: "$h = 19.6$ m" },
      { desc: "Substitute: $v = \sqrt{2 \times 9.8 \times 19.6}$.", formula: "$v = \sqrt{384.16} = 19.6$ m/s" },
    ],
    similar: ["A stone dropped from 30m. Find time to reach ground (g=9.8)", "Ball thrown up at 15 m/s. Find max height (g=10)"],
    mistakes: ["Using wrong value of g (9.8 vs 10)", "Forgetting to convert units (km/h to m/s)", "Choosing the wrong kinematic equation for the given quantities"],
  }),
  chemistry: JSON.stringify({
    finalAnswer: "Molarity = 0.2 M",
    finalFormula: "$M = n / V = 0.1 / 0.5 = 0.2$ M",
    steps: [
      { desc: "Given: Mass of $NaOH$ = 4 g, Volume of solution = 500 mL = 0.5 L. Atomic masses: $Na$=23, $O$=16, $H$=1. Find: Molarity of the solution.", formula: "" },
      { desc: "We use the Molarity Formula. First, find the molar mass of $NaOH$ by adding atomic masses.", formula: "$M_{NaOH} = 23 + 16 + 1 = 40$ g/mol" },
      { desc: "Calculate the number of moles using the formula: $n = mass / molar\ mass$.", formula: "$n = 4 / 40 = 0.1$ mol" },
      { desc: "Apply the Molarity Formula: $M = n / V$. Volume must be in litres.", formula: "$M = 0.1 / 0.5$" },
      { desc: "Compute the molarity.", formula: "$M = 0.2$ M" },
      { desc: "Verification: $0.2$ mol/L $\times$ $0.5$ L $= 0.1$ mol $= 4/40$. Correct.", formula: "" },
    ],
    altSteps: [
      { desc: "Using the combined Molarity Formula: $M = mass / (molar\ mass \times volume)$. This combines the mole calculation and molarity into one step.", formula: "$M = \frac{mass}{M_{molar} \times V}$" },
      { desc: "Substitute: mass = 4 g, $M_{molar} = 40$ g/mol, $V = 0.5$ L.", formula: "$M = 4 / (40 \times 0.5)$" },
      { desc: "Compute: denominator = $40 \times 0.5 = 20$.", formula: "$M = 4 / 20 = 0.2$ M" },
    ],
    similar: ["Find molarity of 9.8g $H_{2}SO_{4}$ in 250 mL ($H$=1, $S$=32, $O$=16)", "How many grams of $KOH$ for 200 mL of 0.5 M? ($K$=39, $O$=16, $H$=1)"],
    mistakes: ["Forgetting to convert mL to L for volume", "Using wrong atomic masses", "Confusing molarity (mol/L) with molality (mol/kg)"],
  }),
};

function buildSystemPrompt(board: string, subject: string): string {
  const boardName = board === "icse" ? "ICSE" : board === "cbse" ? "CBSE" : "State Board";
  const example = EXAMPLES[subject] || EXAMPLES.mathematics;

  let boardRules = '';
  if (board === 'icse') {
    boardRules = `- ICSE BOARD STYLE (CISCE):
- Begin each step by naming the formula or concept used, e.g., "Using the Quadratic Formula:", "Applying Ohm\'s Law:".
- Use formal connectors: "Given:", "To find:", "Formula:", "Substituting:", "On solving:", "Hence,".
- Include units at every step where a quantity appears.
- End with a verification step: "Verification: substitute back to confirm.".`;
  } else if (board === 'cbse') {
    boardRules = `- CBSE BOARD STYLE (NCERT-based):
- Follow NCERT format: "Given:", "To find:", "Formula:", "Calculation:", "Result:".
- List all given quantities with their values and SI units explicitly as the first step.
- Show unit conversions as a separate numbered step.
- Mark each step clearly with the formula name used.
- Conclude with "Therefore, [quantity] = [value] [unit].".`;
  } else {
    boardRules = `- STATE BOARD STYLE:
- Follow "Given:", "Formula:", "Solution:", "Answer:" format.
- Name the formula used at each step. Show working with full substitution.`;
  }

  return `You are SpeedSolve AI, an expert solver for Indian students (${boardName}, Grades 6-12). You handle ANY problem in Mathematics, Physics, and Chemistry — from basic arithmetic to advanced calculus, complex circuits, and multi-step stoichiometry.

═══════════════════════════════════════════════════════════════
UNIVERSAL QUESTION UNDERSTANDING
═══════════════════════════════════════════════════════════════
You MUST understand and correctly solve ALL of these question types:

MATHEMATICS (Grade 6-12):
- Basic: fractions, decimals, percentages, ratio & proportion, BODMAS/PEMDAS, profit-loss-discount, simple/compound interest, SI/CI, tax
- Algebra: linear equations (1 & 2 variables), quadratic equations (factorization, formula, completing square), polynomials, inequalities, AP/GP/HP, series & sums, binomial theorem, matrices, determinants
- Geometry: angles, triangles (congruence, similarity, area), circles (tangents, chords, theorems), quadrilaterals, coordinate geometry (distance, section, slope, area of triangle), straight lines, conic sections (parabola, ellipse, hyperbola)
- Trigonometry: ratios (sin, cos, tan, cosec, sec, cot), identities, complementary angles, compound angles (sum/difference), double/triple angle formulas, heights & distances, inverse trigonometry
- Mensuration: perimeter, area, surface area, volume of all 2D/3D shapes (cube, cuboid, cylinder, cone, sphere, hemisphere, frustum)
- Statistics & Probability: mean (all 3 methods), median, mode, grouped data, cumulative frequency, ogive, standard deviation, variance, probability (independent, dependent, conditional, Bayes), permutations, combinations
- Calculus: limits, continuity, differentiation (first principles, product/quotient/chain rule), integration (definite, indefinite, by substitution, by parts, partial fractions), differential equations, applications (maxima/minima, rate of change, area under curve)
- Number Systems: real numbers, irrationality proofs, Euclid\'s division, HCF/LCM, fundamental theorem of arithmetic
- Sets, Relations, Functions: set operations, Venn diagrams, types of relations, domain/range, composite functions, inverse functions
- Proofs: mathematical induction, trigonometric identities, geometry theorems, contradiction method

PHYSICS (Grade 6-12):
- Kinematics: displacement, velocity (average/instantaneous), acceleration, equations of motion, free fall, projectile motion, relative velocity
- Newton\'s Laws: F=ma, weight, normal force, friction (static/kinetic), inclined planes, connected bodies, pulley systems
- Work, Energy, Power: work done, KE, PE, conservation of energy, work-energy theorem, power, collisions (elastic/inelastic)
- Gravitation: universal law, g on surface, variation of g, orbital velocity, escape velocity, satellites, Kepler\'s laws
- Rotational Motion: torque, angular momentum, moment of inertia, conservation of angular momentum
- Properties of Matter: elasticity (Young\'s modulus), surface tension, viscosity, Stokes\' law, Bernoulli\'s principle, Pascal\'s law
- Thermodynamics: heat, temperature, specific heat, calorimetry, latent heat, gas laws (Boyle, Charles, Gay-Lussac, ideal gas), isothermal/adiabatic processes, first/second law, Carnot engine, entropy
- Waves: transverse/longitudinal, speed, frequency, wavelength, resonance, standing waves, harmonics, Doppler effect, sound
- Optics: reflection, refraction (Snell\'s law), total internal reflection, lenses (power, magnification), lens/mirror formula, prism, dispersion, optical instruments (microscope, telescope), wave optics (interference, diffraction, Young\'s double slit)
- Electrostatics: Coulomb\'s law, electric field, potential, potential energy, capacitance, capacitors in series/parallel, dielectrics
- Current Electricity: Ohm\'s law, resistance (series/parallel), Kirchhoff\'s laws, Wheatstone bridge, potentiometer, internal resistance, heating effect (Joule\'s law)
- Magnetism: magnetic field, Biot-Savart, Ampere\'s law, force on moving charge, force on conductor, torque on coil, magnetic moment
- EMI & AC: Faraday\'s law, Lenz\'s law, self/mutual inductance, AC circuits (RLC), impedance, resonance, transformer, generator, motor
- Modern Physics: photoelectric effect, Einstein\'s equation, de Broglie wavelength, Bohr model, energy levels, nuclear physics (fission, fusion, half-life, mass-energy), semiconductors (diodes, logic gates)
- Units & Measurements: SI units, dimensional analysis, significant figures, errors

CHEMISTRY (Grade 6-12):
- Basic: mole concept, Avogadro\'s number, molar mass, percentage composition, empirical & molecular formula
- Atomic Structure: subatomic particles, atomic number, mass number, isotopes, electronic configuration, quantum numbers, orbital shapes
- Periodic Table: periods, groups, trends (atomic radius, ionization energy, electronegativity, metallic character), classification
- Chemical Bonding: ionic, covalent, metallic, hybridization, VSEPR theory, polarity, hydrogen bonding, molecular orbital theory
- Stoichiometry: balancing equations, limiting reagent, yield calculations, gravimetric analysis
- States of Matter: solid, liquid, gas, gas laws, ideal gas equation, real gases, van der Waals, liquid state (vapour pressure)
- Solutions: concentration (molarity, molality, mole fraction, ppm), solubility, Raoult\'s law, colligative properties (relative lowering, elevation in BP, depression in FP, osmotic pressure), Henry\'s law
- Thermodynamics: enthalpy, Hess\'s law, calorimetry, bond energy, entropy, Gibbs free energy, spontaneity
- Equilibrium: dynamic equilibrium, Le Chatelier, Kc, Kp, Ksp, common ion effect, buffer solutions, pH, pOH, hydrolysis, solubility product
- Redox Reactions: oxidation number, balancing redox equations (ion-electron method), galvanic cells, electrolysis, Faraday\'s laws, electrochemical series, conductivity
- Chemical Kinetics: rate of reaction, rate law, order, molecularity, Arrhenius equation, activation energy, catalysts
- Surface Chemistry: adsorption, catalysis, colloids, Tyndall effect, Brownian motion, coagulation
- Organic Chemistry: IUPAC nomenclature, isomerism (structural, stereoisomerism), hydrocarbons (alkanes, alkenes, alkynes, aromatic), functional groups, substitution, addition, elimination, polymerization
- Named Reactions: Wurtz, Friedel-Crafts, Grignard, Cannizzaro, Aldol, Hofmann, Sandmeyer, Kolbe, Williamson
- Environmental Chemistry: pollution, acid rain, greenhouse effect, ozone depletion, BOD/COD
- Analytical Chemistry: qualitative analysis (group reagents), flame tests, precipitation reactions
- Nuclear Chemistry: radioactivity, half-life, nuclear reactions, carbon dating, nuclear fission/fusion

═══════════════════════════════════════════════════════════════
SYMBOL & NOTATION RECOGNITION
═══════════════════════════════════════════════════════════════
You MUST recognize ALL of these input formats:
- Unicode math: × ÷ − ° ² ³ ¹ ₀ √ ∫ Σ Π ∂ ∇ ≈ ≠ ≤ ≥ ± ∞ → ← ⇒ θ α β γ δ λ μ σ ω ρ φ ψ ε η π
- Typed math: x^2, x^3, sqrt(), sin^(-1), log, ln, e^x, 10^x, dy/dx, d2y/dx2, integral
- Shorthands: "find x", "solve for x", "calc", "evaluate", "simplify", "prove that", "show that", "verify", "find the value of"
- Mixed formats: "sin30°", "cos theta = 3/5", "v = u + at", "E=mc2", "H2SO4", "Fe2O3", "x\u00b2" (unicode escapes)
- Word problems: extract numerical data from prose, identify the formula needed, set up the equation, solve
- Units in any form: "km/h", "m per s", "kilometers per hour", "ms^-1", "m.s-1", "centimetres"
- Greek letters: theta, alpha, beta, gamma, delta, lambda, mu, sigma, omega, phi, pi (both spelled out and as symbols)
- Chemical formulas: H2SO4, CH3COOH, Ca(OH)2, Fe2(SO4)3, [Cu(NH3)4]2+
- Electrochemistry: E°cell, cell diagrams (salt bridge notation), half-reactions
- Logical connectors: "hence", "therefore", "given that", "if", "then", "such that", "where"

═══════════════════════════════════════════════════════════════
STEP QUALITY — THIS IS YOUR #1 PRIORITY
═══════════════════════════════════════════════════════════════
1. MORE STEPS: Break complex problems into MANY small, easy-to-follow steps. Each step should do ONE thing.
2. NAME THE FORMULA: Every step that uses a formula MUST begin by naming it.
   - "Using the Quadratic Formula: $x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}$"
   - "Applying Ohm\'s Law: $V = IR$"
   - "By the Pythagorean Theorem: $a^{2} + b^{2} = c^{2}$"
3. EXPLAIN WHY: Briefly explain the reasoning at each step.
4. SHOW FULL SUBSTITUTION: Every step.formula must show actual numbers being substituted.
5. USE TABLES: When a problem involves comparing values, listing data, or showing a pattern, use an HTML table in step.desc.
6. USE PROPER SUBSCRIPTS AND SUPERSCRIPTS in $...$ LaTeX:
   - Chemical: $H_{2}SO_{4}$, $CaCO_{3}$, $Fe_{2}O_{3}$
   - Units: $m/s^{2}$, $cm^{3}$
   - Powers: $x^{2}$, $10^{-7}$, $3 \\times 10^{8}$

═══════════════════════════════════════════════════════════════
LATEX RULES — STRICT COMPLIANCE
═══════════════════════════════════════════════════════════════
7. WRAP ALL MATH in $...$ (inline) or $$...$$ (display).
8. USE \\frac{}{} for fractions, \\sqrt{} for roots, _{} for subscripts, ^{} for superscripts.
9. USE \\times for multiplication, \\pm, \\neq, \\leq, \\geq, \\approx, \\angle, \\circ, \\pi.
10. USE \\sum, \\prod, \\int, \\lim, \\infty for advanced notation.
11. NEVER use \\text{}, \\mathrm{}, \\mathbf{} — write words as plain text OUTSIDE the $ delimiters.
12. For units: "$v = 19.6$ m/s" NOT "$v = 19.6 \\text{ m/s}$".
13. Chemical formulas: $H_{2}O$, $CO_{2}$, $NaCl$ — always subscripts in LaTeX.
14. In JSON strings, backslashes MUST be double-escaped: \\\\frac not \\frac. This prevents JSON.parse from destroying LaTeX.

═══════════════════════════════════════════════════════════════
FINAL ANSWER
═══════════════════════════════════════════════════════════════
15. finalAnswer MUST be ONLY the computed result — short: "x = 3", "v = 19.6 m/s", "CH2O".
16. For chemical formulas: finalAnswer = formula string (e.g. "CH2O"). NEVER ratios like "1:2:1".
17. NEVER output intermediate work as finalAnswer.

═══════════════════════════════════════════════════════════════
ALTERNATE SOLUTION (altSteps) — MANDATORY
═══════════════════════════════════════════════════════════════
18. You MUST include an "altSteps" array with 3-5 steps showing an ALTERNATIVE method.
- Use a genuinely different approach (e.g., kinematic equations vs energy conservation; factorization vs quadratic formula).
- Must arrive at the SAME final answer. NEVER leave altSteps empty.

═════════════════════════════════════════════════════════════════
SELF-VERIFICATION
═══════════════════════════════════════════════════════════════
19. ALWAYS verify your answer. The LAST step must be a verification.
    - Equations: plug answer back, confirm LHS = RHS
    - Physics/Chem: dimensional check or reverse calculation

═══════════════════════════════════════════════════════════════
BOARD-SPECIFIC STYLE (${boardName})
═══════════════════════════════════════════════════════════════
${boardRules}

═══════════════════════════════════════════════════════════════
DIFFICULTY HANDLING
═══════════════════════════════════════════════════════════════
20. EASY: 3-4 steps. MEDIUM: 5-8 steps. HARD (calculus, advanced trig, stoichiometry, multi-body physics): 8-15+ steps.
21. PROOFS: Show LHS and RHS separately. Name each theorem. End with "Hence proved."
22. WORD PROBLEMS: First extract and tabulate given data, then solve step by step.
23. CONCEPTUAL QUESTIONS ("What is...", "Why does...", "Explain..."): Provide clear, detailed explanations with formulas where relevant. Use steps to build the explanation logically.
24. MULTI-PART QUESTIONS ("Find x, y, and z"): Solve each part systematically, showing all work.

═══════════════════════════════════════════════════════════════
GRAPH GENERATION (when relevant)
═══════════════════════════════════════════════════════════════
25. Include a "graph" field for functions, equations, kinematics, trigonometry, statistics, coordinate geometry, AP/GP.
    GRAPH FORMAT: {"type":"function","title":"y = x^2 - 5x + 6","fn":"x*x - 5*x + 6","xMin":-1,"xMax":6,"yMin":-3,"yMax":10,"points":[{"x":2,"y":0,"label":"Root (2,0)"}]}

═══════════════════════════════════════════════════════════════
DIAGRAM PRESETS (when relevant)
═══════════════════════════════════════════════════════════════
26. Available: "free-body", "inclined-plane", "circuit-series", "circuit-parallel", "ray-mirror", "ray-lens", "projectile", "triangle", "circle-geometry", "pulley"
    Format: {"diagramPreset":"<type>","values":{...},"caption":"..."}

OUTPUT: Return ONLY this JSON, no markdown fences, no text before/after:
${example}

Now solve the student\'s problem comprehensively. Use many detailed steps, name every formula, use proper subscripts/superscripts, include tables where appropriate, and include a graph or diagram preset when relevant.`;
}


// ── JSON extraction ──
// Fix LaTeX commands broken by JSON escape interpretation.
// JSON.parse turns \f → form-feed(0x0C), \b → backspace(0x08), \v → vertical-tab(0x0B).
// These are NEVER intentional in math solution text, so we safely double-escape them.
function escapeLatexForJSONParse(text: string): string {
  let r = text;
  // \f, \b, \v — never intentional in solution JSON, always escape
  r = r.replace(/(?<!\\)\\f/g, '\\\\f');
  r = r.replace(/(?<!\\)\\b/g, '\\\\b');
  r = r.replace(/(?<!\\)\\v/g, '\\\\v');
  // \t, \n, \r — only fix when immediately followed by a letter (LaTeX command),
  // NOT when followed by space/quote/bracket (intentional whitespace)
  r = r.replace(/(?<!\\)\\t(?=[a-zA-Z])/g, '\\\\t');
  r = r.replace(/(?<!\\)\\n(?=[a-zA-Z])/g, '\\\\n');
  r = r.replace(/(?<!\\)\\r(?=[a-zA-Z])/g, '\\\\r');
  return r;
}

// Post-parse safety net: replace control chars that leaked through JSON.parse
function fixParsedLatexControlChars(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/\x0c/g, '\\')  // form-feed → \ (from \f in \frac, \forall)
      .replace(/\x08/g, '\\')  // backspace → \ (from \b in \beta, \binom)
      .replace(/\x0b/g, '\\'); // vertical-tab → \ (from \v in \vec)
  }
  if (Array.isArray(obj)) return obj.map(fixParsedLatexControlChars);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = fixParsedLatexControlChars(obj[key]);
    }
    return result;
  }
  return obj;
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  cleaned = escapeLatexForJSONParse(cleaned);
  try { return fixParsedLatexControlChars(JSON.parse(cleaned)); } catch {}

  let searchFrom = 0;
  while (searchFrom < cleaned.length) {
    const start = cleaned.indexOf("{", searchFrom);
    if (start === -1) return null;
    let depth = 0, inString = false, escape = false, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      let candidate = cleaned.slice(start, end + 1)
        .replace(/,\s*([\]}])/g, "$1")
        .replace(/\n/g, " ").replace(/\t/g, " ").replace(/  +/g, " ").trim();
      candidate = escapeLatexForJSONParse(candidate);
      try { return fixParsedLatexControlChars(JSON.parse(candidate)); } catch {}
      candidate = candidate.replace(/[\x00-\x1f\x7f]/g, "");
      try { return fixParsedLatexControlChars(JSON.parse(candidate)); } catch {}
    }
    searchFrom = start + 1;
  }
  return null;
}

// ── If JSON parse totally fails, build solution from raw text ──
function buildSolutionFromText(rawText: string, subject: string, board: string): any {
  const lines = rawText.split("\n").filter(l => l.trim().length > 5);
  const steps = lines.slice(0, 8).map(l => ({
    desc: l.trim().replace(/^[\d.]+[).]\s*/, ""),
    formula: "",
  }));
  let answer = steps.length > 0 ? steps[steps.length - 1].desc : rawText.slice(0, 200);
  // If answer is multi-line junk, take only the last meaningful short line
  const answerLines = answer.split(/[\n=]/).map(l => l.trim()).filter(l => l.length > 0 && l.length < 80);
  if (answerLines.length > 0) answer = answerLines[answerLines.length - 1];
  return {
    finalAnswer: answer,
    finalFormula: "",
    steps: steps.length > 0 ? steps : [{ desc: rawText.slice(0, 300), formula: "" }],
    altSteps: [], similar: [], mistakes: [],
    examTips: BOARD_TIPS[board]?.[subject] || [],
  };
}

function cleanLatex(text: string): string {
  if (!text) return text;
  return text.replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\mathbf\{([^}]*)\}/g, "$1");
}

// Sanitize finalAnswer — strip multi-line junk, keep only the actual answer line
function sanitizeFinalAnswer(answer: string): string {
  if (!answer) return answer;
  let clean = answer.trim();
  // If it contains newlines, take only the last short meaningful line
  if (clean.includes('\n')) {
    const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 120);
    if (lines.length > 0) clean = lines[lines.length - 1];
  }
  // Strip leading label like "EmpiricalFormula =", "Answer:", etc. but preserve the value
  clean = clean.replace(/^[A-Za-z]+\s*(Formula)?\s*[=:]\s*/i, '');
  return clean || answer;
}

// Fix ratio-style finalAnswers for empirical/molecular formula questions
function fixFormulaAnswer(finalAnswer: string, steps: { desc: string; formula: string }[], problem: string): string {
  if (!finalAnswer) return finalAnswer;
  const lower = problem.toLowerCase();
  const isFormulaQ = /empirical\s*formula|molecular\s*formula|chemical\s*formula|formula\s*of/i.test(lower);
  if (!isFormulaQ) return finalAnswer;

  // If it's already a proper formula (has element symbols with possible subscripts), keep it
  if (/^[A-Z][a-z]?\d*([A-Z][a-z]?\d*)*$/.test(finalAnswer.trim())) return finalAnswer;

  // Extract elements from the problem itself: "40% C, 6.7% H, 53.3% O" or "C=40%"
  const elementMap = new Map<string, number>();
  const elementOrder: string[] = [];

  // Pattern 1: "40% C" → extract percentage and element
  const pctRegex = /(\d+\.?\d*)%\s*([A-Z][a-z]?)/g;
  let match;
  while ((match = pctRegex.exec(problem)) !== null) {
    const val = parseFloat(match[1]);
    const el = match[2];
    if (val > 0 && !elementMap.has(el)) {
      elementMap.set(el, val);
      elementOrder.push(el);
    }
  }

  // Pattern 2: "C=40" or "C: 40" with atomic masses given like (C=12, H=1, O=16)
  if (elementOrder.length === 0) {
    const elValRegex = /([A-Z][a-z]?)\s*[=:]\s*(\d+\.?\d*)/g;
    while ((match = elValRegex.exec(problem)) !== null) {
      const el = match[1];
      const val = parseFloat(match[2]);
      if (val > 0 && !elementMap.has(el) && val < 200) {
        elementMap.set(el, val);
        elementOrder.push(el);
      }
    }
  }

  // Pattern 3: Extract from step descriptions/formulas
  if (elementOrder.length === 0) {
    const allText = steps.map(s => s.desc + " " + s.formula).join(" ");
    const stepElRegex = /([A-Z][a-z]?)\s*[=:]\s*(\d+\.?\d*)/g;
    while ((match = stepElRegex.exec(allText)) !== null) {
      const el = match[1];
      const val = parseFloat(match[2]);
      if (val > 0 && !elementMap.has(el) && val < 200) {
        elementMap.set(el, val);
        elementOrder.push(el);
      }
    }
  }

  if (elementOrder.length < 2) return finalAnswer;

  // Convert percentages to moles using standard atomic masses
  const ATOMIC_MASS: Record<string, number> = {
    H: 1, He: 4, Li: 7, Be: 9, B: 11, C: 12, N: 14, O: 16, F: 19, Na: 23,
    Mg: 24, Al: 27, Si: 28, P: 31, S: 32, Cl: 35.5, K: 39, Ca: 40, Fe: 56,
    Cu: 63.5, Zn: 65, Ag: 108, I: 127, Ba: 137, Pb: 207,
  };

  // Check if the values are percentages (>10) or already mole values (<10)
  const maxVal = Math.max(...elementMap.values());
  const moles = elementOrder.map(el => {
    const val = elementMap.get(el)!;
    if (maxVal > 10) {
      // Values are percentages — convert to moles
      return val / (ATOMIC_MASS[el] || val);
    }
    return val;
  });

  // Convert to simplest integer ratio
  const minMole = Math.min(...moles.filter(v => v > 0));
  const ratios = moles.map(m => m / minMole);

  // Round to nearest integer (with tolerance for floating point)
  const intRatios = ratios.map(r => {
    const rounded = Math.round(r);
    return Math.abs(r - rounded) < 0.2 ? rounded : Math.round(r * 2) / 2;
  });

  // If we have half-integers, multiply all by 2
  let multiplier = 1;
  if (intRatios.some(r => r % 1 !== 0)) multiplier = 2;
  const finalRatios = intRatios.map(r => Math.round(r * multiplier));

  // Build formula string
  const formula = elementOrder.map((el, i) => {
    const n = finalRatios[i];
    return n === 1 ? el : `${el}${n}`;
  }).join("");

  if (formula.length >= 2) return formula;
  return finalAnswer;
}

function generateSimilarQuestions(subject: string): string[] {
  const t: Record<string, string[]> = {
    mathematics: ["Try solving with different numbers", "Practice a similar problem type", "Verify using an alternative method"],
    physics: ["What if you double the mass or force?", "Try using a different formula", "How does the answer change with g=10?"],
    chemistry: ["What if the concentration was halved?", "Solve a similar stoichiometry problem", "Balance the equation and verify"],
  };
  return t[subject] || t.mathematics;
}

function generateCommonMistakes(subject: string): string[] {
  const t: Record<string, string[]> = {
    mathematics: ["Not following BODMAS/PEMDAS order", "Sign errors when moving terms", "Wrong formula for the problem type"],
    physics: ["Forgetting unit conversions (km/h to m/s)", "Wrong kinematic equation", "Missing units in final answer"],
    chemistry: ["Forgetting to balance the equation", "Wrong atomic masses", "Not converting mL to L for molarity"],
  };
  return t[subject] || t.mathematics;
}

const SUBJECT_META: Record<string, { label: string; icon: string; color: string }> = {
  mathematics: { label: "Mathematics", icon: "\u03A3", color: "#6366f1" },
  physics: { label: "Physics", icon: "\u269B\uFE0F", color: "#ea580c" },
  chemistry: { label: "Chemistry", icon: "\u2697\uFE0F", color: "#059669" },
};

// ── MAIN POST HANDLER ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, subject, board, forceAI } = body;

    if (!problem || typeof problem !== "string") {
      return NextResponse.json({ error: "Problem text is required" }, { status: 400 });
    }

    if (isPromptInjection(problem)) {
      return NextResponse.json({ error: INJECTION_MESSAGE }, { status: 403 });
    }

    const sub = ["mathematics", "physics", "chemistry"].includes(subject) ? subject : "mathematics";
    const brd = ["icse", "cbse", "state"].includes(board) ? board : "icse";
    const processed = preprocessProblem(problem);

    // Step 1: Try local solver (instant) - skip if forceAI
    if (!forceAI) {
      const local = await tryLocalSolve(processed, sub);
      if (local) {
        if (local.similar.length === 0) local.similar = generateSimilarQuestions(sub);
        if (local.mistakes.length === 0) local.mistakes = generateCommonMistakes(sub);
        local.examTips = BOARD_TIPS[brd]?.[sub] || [];
        return NextResponse.json({ success: true, data: local, source: "local" });
      }
    }

    // Step 2: AI Solver (tries Gemini, then Groq)
    const systemPrompt = buildSystemPrompt(brd, sub);
    const boardLabel = brd === "icse" ? "ICSE" : brd === "cbse" ? "CBSE" : "State Board";
    const userPrompt = `Subject: ${sub.toUpperCase()}
Board: ${boardLabel}
Problem: ${problem}

Substitute the given values into the formula and compute. Return JSON only.`;

    console.log(`[SpeedSolve] AI solving: "${processed.slice(0, 80)}..."`);
    const raw = await callAI(systemPrompt, userPrompt);

    if (!raw) {
      const lastLocal = await tryLocalSolve(processed, sub);
      if (lastLocal) {
        if (lastLocal.similar.length === 0) lastLocal.similar = generateSimilarQuestions(sub);
        if (lastLocal.mistakes.length === 0) lastLocal.mistakes = generateCommonMistakes(sub);
        lastLocal.examTips = BOARD_TIPS[brd]?.[sub] || [];
        return NextResponse.json({ success: true, data: lastLocal, source: "local" });
      }
      return NextResponse.json({
        success: true,
        data: {
          finalAnswer: "Please try again.",
          finalFormula: "",
          steps: [{ desc: "Could not process this question right now. Please try again.", formula: "" }],
          altSteps: [], similar: [], mistakes: [], examTips: [],
        },
        source: "error",
      });
    }

    // Try to parse JSON from AI response
    let parsed = extractJSON(raw);

    if (parsed && parsed.finalAnswer && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
      const cleanedSteps = (parsed.steps || []).map((s: any) => ({
        desc: cleanLatex(s.desc || ""),
        formula: cleanLatex(s.formula || ""),
      }));
      const cleanedAltSteps = (parsed.altSteps || []).map((s: any) => ({
        desc: cleanLatex(s.desc || ""),
        formula: cleanLatex(s.formula || ""),
      }));
      let finalAns = cleanLatex(parsed.finalAnswer) || "";
      // Sanitize: strip multi-line junk, then fix formula ratios
      console.log(`[SpeedSolve] Raw finalAnswer: "${finalAns.slice(0, 100)}"`);
      finalAns = sanitizeFinalAnswer(finalAns);
      console.log(`[SpeedSolve] After sanitize: "${finalAns.slice(0, 100)}"`);
      finalAns = fixFormulaAnswer(finalAns, cleanedSteps, problem);
      console.log(`[SpeedSolve] After fixFormula: "${finalAns}"`);
      // Verification skipped for speed

      const solution = {
        finalAnswer: finalAns,
        finalFormula: cleanLatex(parsed.finalFormula || "") || "",
        steps: cleanedSteps,
        altSteps: cleanedAltSteps,
        similar: Array.isArray(parsed.similar) ? parsed.similar.slice(0, 4) : generateSimilarQuestions(sub),
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.slice(0, 5) : generateCommonMistakes(sub),
        examTips: BOARD_TIPS[brd]?.[sub] || [],
        graph: parsed.graph && parsed.graph.type ? parsed.graph : null,
        diagram: (parsed.diagram && parsed.diagram.svg) || (parsed.diagram && parsed.diagram.diagramPreset) ? parsed.diagram : null,
      };
      return NextResponse.json({ success: true, data: solution, source: "ai" });
    }

    // JSON parse failed but we have text - build solution from raw text
    console.warn(`[SpeedSolve] JSON parse failed, building from raw text (${raw.length} chars)`);
    const textSolution = buildSolutionFromText(raw, sub, brd);
    // Sanitize and apply formula fix to fallback path too
    textSolution.finalAnswer = sanitizeFinalAnswer(textSolution.finalAnswer);
    textSolution.finalAnswer = fixFormulaAnswer(textSolution.finalAnswer, textSolution.steps || [], problem);



    return NextResponse.json({ success: true, data: textSolution, source: "ai" });

  } catch (err) {
    console.error("Solve API error:", err);
    return NextResponse.json({
      success: false,
      error: "Something went wrong. Please try rephrasing your problem.",
    }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    subjects: SUBJECT_META,
    samples: SAMPLE_PROBLEMS,
    boards: [
      { id: "icse", label: "ICSE" },
      { id: "cbse", label: "CBSE" },
      { id: "state", label: "State Board" },
    ],
  });
}
