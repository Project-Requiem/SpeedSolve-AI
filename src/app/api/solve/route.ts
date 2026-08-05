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
  const models = ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"];
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
        console.error(`[SpeedSolve] Gemini ${model} attempt ${attempt+1}: ${err?.message?.slice(0, 100)}`);
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return "";
}

// ── AI Provider 2: Groq (free, fast, OpenAI-compatible) ──
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "";
  const models = ["llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b", "llama-3.1-8b-instant", "gemma2-9b-it"];
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
        signal: AbortSignal.timeout(35000),
      });
      if (!res.ok) {
        console.error(`[SpeedSolve] Groq ${model}: ${res.status}`);
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

// ── AI Provider 3: OpenRouter fallback (keys: OPENROUTER_API_KEY) ──
async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  console.log(`[SpeedSolve] OpenRouter key present: ${!!key}, length: ${key?.length || 0}`);
  if (!key) return "";
  const models = ["google/gemini-2.0-flash-exp:free", "meta-llama/llama-3.1-70b-instruct:free", "deepseek/deepseek-chat-v3-0324:free"];
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error(`[SpeedSolve] OpenRouter ${model}: ${res.status} - ${errBody.slice(0, 200)}`);
        continue;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (text.trim().length > 20) {
        console.log(`[SpeedSolve] OpenRouter ${model} OK (${text.length} chars)`);
        return text;
      }
    } catch (err: any) {
      console.error(`[SpeedSolve] OpenRouter ${model}: ${err?.message?.slice(0, 100)}`);
    }
  }
  return "";
}

// ── Try ALL AI providers in sequence with full fallback chain ──
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  // 1. Gemini (best quality)
  const geminiResult = await callGemini(systemPrompt, userPrompt);
  if (geminiResult) return geminiResult;

  // 2. Groq (fast, free)
  console.log("[SpeedSolve] Gemini failed, trying Groq...");
  const groqResult = await callGroq(systemPrompt, userPrompt);
  if (groqResult) return groqResult;

  // 3. OpenRouter (free tier fallback)
  console.log("[SpeedSolve] Groq failed, trying OpenRouter...");
  const orResult = await callOpenRouter(systemPrompt, userPrompt);
  if (orResult) return orResult;

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
    { text: "Find the LCM and GCD of 48, 72, 108", label: "LCM & GCD" },
    { text: "A train travels 360 km in 4 hours. Find its speed in m/s.", label: "Speed" },
    { text: "Find the area of a circle with radius 14 cm.", label: "Area" },
    { text: "If sin theta = 3/5, find cos theta and tan theta.", label: "Trigonometry" },
    { text: "Find the mean, median, mode of: 5, 3, 7, 3, 5, 9, 3, 1", label: "Statistics" },
    { text: "A ladder 10 m long leans against a wall. If the foot of the ladder is 6 m from the wall, find the height.", label: "Pythagoras" },
    { text: "Differentiate f(x) = 3x^4 - 2x^2 + 5x - 7", label: "Derivative" },
    { text: "Find the 10th term of AP: 2, 7, 12, 17, ...", label: "Sequence" },
    { text: "Simple Interest on Rs 5000 at 8% per annum for 3 years", label: "Interest" },
    { text: "How many moles are in 80g of NaOH? (Na=23, O=16, H=1)", label: "Moles" },
    { text: "Find the distance between points A(3,4) and B(7,1)", label: "Coordinate" },
    { text: "Simplify: (a+b)^2 - (a-b)^2", label: "Identity" },
    { text: "A bag contains 5 red, 3 blue, and 2 green balls. Find probability of drawing a red ball.", label: "Probability" },
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
  ],
  chemistry: [
    { text: "Find the pH of 0.01 M HCl solution.", label: "pH" },
    { text: "How many moles of NaOH are in 80 g? (Na=23, O=16, H=1)", label: "Moles" },
    { text: "Balance: Fe + O2 = Fe2O3", label: "Balance" },
    { text: "A gas at 2 atm and 300 K occupies 5 L. What volume at 1 atm and 300 K?", label: "Gas Law" },
    { text: "Find the molarity of 4g NaOH in 500 mL solution. (Na=23, O=16, H=1)", label: "Molarity" },
    { text: "What is the empirical formula of a compound with 40% C, 6.7% H, 53.3% O? (C=12, H=1, O=16)", label: "Empirical" },
    { text: "50 mL of 0.1 M HCl reacts with 25 mL of NaOH. Find molarity of NaOH.", label: "Reaction" },
  ],
};

// ── Rich worked examples with formula names, subscripts, superscripts, and tables ──
const EXAMPLES: Record<string, string> = {
  mathematics: JSON.stringify({
    finalAnswer: "x = 3",
    finalFormula: "$x = (14 - 5) / 3 = 3$",
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
- Begin each step by naming the formula or concept used, e.g., "Using the Quadratic Formula:", "Applying Ohm's Law:", "By Conservation of Energy:".
- Use formal connectors: "Given:", "To find:", "Formula:", "Substituting:", "On solving:", "Hence," or "Therefore,".
- Include units at every step where a quantity appears.
- End with a verification step: "Verification: substitute back to confirm.".
- For trigonometry identities, show LHS and RHS transformations separately.
- Use "Hence proved" for proofs. Use "Hence" before stating the final answer.`;
  } else if (board === 'cbse') {
    boardRules = `- CBSE BOARD STYLE (NCERT-based):
- Follow NCERT format: "Given:", "To find:", "Formula:", "Calculation:", "Result:".
- List all given quantities with their values and SI units explicitly as the first step.
- Show unit conversions as a separate numbered step.
- Mark each step clearly with the formula name used.
- For physics: always write the formula in general form first, then substitute.
- Conclude with "Therefore, [quantity] = [value] [unit].".`;
  } else {
    boardRules = `- STATE BOARD STYLE:
- Follow "Given:", "Formula:", "Solution:", "Answer:" format.
- Name the formula used at each step.
- Show working with full substitution. Be direct but thorough.
- End with a clear "Answer: [value] [unit]" line.`;
  }

  return `You are SpeedSolve AI, an expert numerical solver for Indian students (${boardName}, Grades 6-12). You handle problems of ANY difficulty — from simple arithmetic to advanced calculus, complex circuits, and multi-step stoichiometry.

═════════════════════════════════════════════
STEP QUALITY — THIS IS YOUR #1 PRIORITY
═════════════════════════════════════════════
1. MORE STEPS: Break complex problems into MANY small, easy-to-follow steps. A 3-step problem is better as 6 steps. Each step should do ONE thing.
2. NAME THE FORMULA: Every step that uses a formula MUST begin by naming it. Examples:
   - "Using the Quadratic Formula: $x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}$"
   - "Applying Ohm's Law: $V = IR$"
   - "By the Pythagorean Theorem: $a^{2} + b^{2} = c^{2}$"
   - "Using the Molarity Formula: $M = n/V$"
   - "By Newton's Second Law: $F = ma$"
3. EXPLAIN WHY: Don't just show math — briefly explain the reasoning. "Divide both sides by 3 to isolate x." is better than just "$x = 9/3$".
4. SHOW FULL SUBSTITUTION: Every step.formula must show actual numbers being substituted, not just the generic formula.
5. USE TABLES: When a problem involves comparing values, listing data, or showing a pattern, use an HTML table in the step.desc field. Format:
   <table><tr><th>Quantity</th><th>Value</th><th>Unit</th></tr><tr><td>Mass</td><td>$5$</td><td>kg</td></tr><tr><td>Acceleration</td><td>$9.8$</td><td>$m/s^{2}$</td></tr></table>
   Use tables for: given data summary, element/mole/mass calculations, data comparison, frequency distributions, coordinate tables.
6. USE PROPER SUBSCRIPTS AND SUPERSCRIPTS in $...$ LaTeX:
   - Chemical formulas: $H_{2}SO_{4}$, $CaCO_{3}$, $CH_{3}COOH$, $Fe_{2}O_{3}$
   - Units: $m/s^{2}$, $cm^{3}$, $kg \\cdot m/s^{2}$
   - Powers: $x^{2}$, $v^{2}$, $10^{-7}$, $3 \\times 10^{8}$
   - Indices: $a_{n}$, $T_{1}$, $P_{total}$
   - DO NOT write H2SO4, m/s2, x2 as plain text inside math delimiters — always use _{} and ^{}

═════════════════════════════════════════════
LATEX RULES — STRICT COMPLIANCE
═════════════════════════════════════════════
7. WRAP ALL MATH in $...$ (inline) or $$...$$ (display). Every number that is part of a calculation goes in $...$.
8. USE \\frac{}{} for fractions: $\\frac{1}{2}$, $\\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}$
9. USE \\sqrt{} for square roots: $\\sqrt{144} = 12$
10. USE _{} for subscripts and ^{} for superscripts: $v_{0}$, $a^{2}$, $10^{-3}$
11. USE \\times for multiplication: $3 \\times 4 = 12$
12. USE \\pm, \\neq, \\leq, \\geq, \\approx, \\angle, \\circ, \\pi for symbols.
13. USE \\sum, \\prod, \\int, \\lim for summation/products/integrals/limits.
14. NEVER use \\text{}, \\mathrm{}, \\mathbf{} — write words as plain text OUTSIDE the $ delimiters.
15. For units in formulas, write them as plain text AFTER the $...$: "$v = 19.6$ m/s" NOT "$v = 19.6 \\text{ m/s}$".
16. Chemical formulas must ALWAYS use subscripts in LaTeX: $H_{2}O$, $CO_{2}$, $NaCl$, $H_{2}SO_{4}$
16b. CRITICAL: In JSON strings, backslashes MUST be double-escaped: write \\frac not \frac. Every \\ in a JSON string value needs \\. This prevents JSON.parse from destroying LaTeX commands.
16c. ABSOLUTE RULE: step.desc and step.formula fields MUST be single-line plain text with $...$ delimited LaTeX. NEVER output multi-line formulas, NEVER insert newlines between characters, NEVER use zero-width spaces or invisible Unicode characters. Every formula must fit on ONE line.
16d. OUTPUT QUALITY - ZERO TOLERANCE:
    - NEVER put characters on separate lines (e.g. "f\no\nr\nm\nu\nl\na" is FORBIDDEN)
    - NEVER use zero-width spaces or invisible Unicode characters
    - NEVER put \f, \b, \v inside English words (they get destroyed by JSON.parse)
      Write "formula" not "\formula", "number" not "\number", "divide" not "\div ide"
    - If a word contains a backslash sequence, write the COMPLETE word normally:
      "Empirical Formula" NOT "Em\pirical For\mula"
    - All step.desc and step.formula values MUST be single-line strings


═════════════════════════════════════════════
FINAL ANSWER — ABSOLUTE PRIORITY
═════════════════════════════════════════════
17. finalAnswer MUST be ONLY the computed result — a short value like "x = 3" or "v = 19.6 m/s" or "CH2O". No sentences.
18. For chemical formulas: finalAnswer = the formula string (e.g. "CH2O"). NEVER output ratios like "1:2:1".
19. For "find x": finalAnswer = "x = 5". For area: "Area = 24 cm²". For pH: "pH = 2".
20. NEVER output intermediate work or work-in-progress as finalAnswer.

═════════════════════════════════════════════
ALTERNATE SOLUTION (altSteps) — MANDATORY
═════════════════════════════════════════════
20b. You MUST include an "altSteps" array with 3-5 steps showing an ALTERNATIVE method to solve the same problem.
- Each altStep must follow ALL the same rules as main steps: name the formula, explain why, show full substitution.
- Use a genuinely different approach (e.g., if main uses kinematic equations, alt uses energy conservation; if main uses factorization, alt uses quadratic formula).
- The altSteps must arrive at the SAME final answer.
- Include a brief verification at the end of altSteps too.
- NEVER leave altSteps empty. NEVER put just 1 step.

═════════════════════════════════════════════
SELF-VERIFICATION
═════════════════════════════════════════════
21. ALWAYS verify your answer. The LAST step must be a verification:
    - Equations: plug answer back, confirm LHS = RHS
    - Physics/Chemistry: dimensional check or reverse calculation
    - Geometry: angle sum = 180°, Pythagoras holds
    - If verification fails, CORRECT your answer before outputting.

═════════════════════════════════════════════
BOARD-SPECIFIC STYLE (${boardName})
═════════════════════════════════════════════
${boardRules}

═════════════════════════════════════════════
DIFFICULTY HANDLING
═════════════════════════════════════════════
22. For EASY problems: Still break into 3-4 steps with explanation.
23. For MEDIUM problems: Break into 5-8 steps. Name formulas at each step.
24. For HARD problems (calculus, advanced trig, complex stoichiometry, multi-body physics):
    - Break into 8-15+ steps. Each step does ONE operation.
    - Always state the formula/concept name before applying.
    - Show the general formula first, THEN substitute values.
    - Use tables to organize given data or intermediate results.
25. For PROOFS (trig identities, geometry theorems):
    - Show LHS and RHS transformations in parallel steps.
    - Name each identity/theorem used.
    - End with "Hence proved."
26. For WORD PROBLEMS: First extract and tabulate the given data, then solve step by step.

═════════════════════════════════════════════
GRAPH GENERATION
═════════════════════════════════════════════
27. Include a "graph" field when the problem involves ANY function, equation, data, kinematics, coordinate geometry, trigonometry, or visual relationship.
    - Quadratic/cubic: plot function, mark roots, vertex, axis of symmetry
    - Simultaneous equations: plot BOTH lines, mark intersection
    - Trigonometry: plot the wave, mark key points
    - Kinematics: s-t, v-t, or a-t graph
    - Statistics: bar chart or pie chart
    - Coordinate geometry: plot points, lines, distances
    - AP/GP: plot terms vs n

    GRAPH FORMAT:
    - Function: {"type":"function","title":"y = x^2 - 5x + 6","fn":"x*x - 5*x + 6","xMin":-1,"xMax":6,"yMin":-3,"yMax":10,"points":[{"x":2,"y":0,"label":"Root (2,0)"}]}
    - Data: {"type":"line","xData":[0,1,2,3],"series":[{"name":"Distance","data":[0,5,20,45]}]}
    - Bar: {"type":"bar","xData":["A","B"],"series":[{"name":"Value","data":[10,20]}]}
    - Pie: {"type":"pie","xData":["A","B"],"series":[{"name":"Value","data":[40,60]}]}
    - For function plots: ALWAYS provide xMin, xMax, yMin, yMax with 20%+ padding.
    - Labels MUST include units. Mark ALL important points.

═════════════════════════════════════════════
DIAGRAM — USE PRESET TEMPLATES
═════════════════════════════════════════════
28. For physics/chemistry/geometry diagrams, use the PRESET SYSTEM. Instead of raw SVG, specify:
    {"diagramPreset":"<type>","values":{...},"caption":"..."}

    AVAILABLE PRESETS:
    a) "free-body" — Free Body Diagram
       values: {"object":"Block","mass":"2 kg","forces":[{"label":"N","magnitude":"19.6 N","angle":90,"color":"%2310b981"},{"label":"mg","magnitude":"19.6 N","angle":270,"color":"%23ef4444"}]}
    b) "inclined-plane" — Object on Inclined Plane with angle
       values: {"object":"Block","mass":"5 kg","angle":30,"forces":[...]}
    c) "circuit-series" — Series Circuit
       values: {"components":[{"type":"battery","label":"E=12V","value":"12V"},{"type":"resistor","label":"R1=4Ω","value":"4"}]}
    d) "circuit-parallel" — Parallel Circuit
       values: {"components":[{"type":"battery","label":"E=12V"},{"type":"resistor","label":"R1=4Ω"}]}
    e) "ray-mirror" — Concave/Convex Mirror Ray Diagram
       values: {"mirrorType":"concave","f":10,"objectDist":20,"objectHeight":3}
    f) "ray-lens" — Convex/Concave Lens Ray Diagram
       values: {"lensType":"convex","f":15,"objectDist":30,"objectHeight":2}
    g) "projectile" — Projectile Motion Diagram
       values: {"u":20,"angle":45,"g":9.8}
    h) "triangle" — Labeled Triangle (Geometry)
       values: {"type":"right","vertices":[{"label":"A","x":50,"y":20},{"label":"B","x":50,"y":220},{"label":"C","x":250,"y":220}],"sides":{"AB":"?","BC":"4 cm","AC":"3 cm"},"markRightAngle":"B"}
    i) "circle-geometry" — Circle with Points
       values: {"radius":80,"center":{"x":150,"y":130},"points":[{"label":"A","angle":30},{"label":"B","angle":150}]}
    j) "pulley" — Pulley System with Two Masses
       values: {"m1":"5 kg","m2":"3 kg"}

    If none of these presets fit, you may provide raw SVG with viewBox="0 0 300 250".

OUTPUT: Return ONLY this JSON, no markdown fences, no text before/after:
${example}

Now solve the student's problem. Use many detailed steps, name every formula, use proper subscripts/superscripts, include tables where appropriate, and include a graph or diagram preset when relevant.`;
}


// ── Solution Quality Validator (lightweight) ──
function isSolutionClean(p: any): boolean {
  if (!p) return false;
  if (!p.finalAnswer || !Array.isArray(p.steps) || p.steps.length === 0) return false;
  return true;
}

// ── JSON extraction ──
// STRATEGY: Don't try to double-escape LaTeX before JSON.parse.
// Instead, let JSON.parse do its thing (which destroys \f→0x0C etc.),
// then AGGRESSIVELY repair all broken LaTeX in every string afterward.
// This avoids the cascade of bugs from partial escaping.

// Find the first { that starts a valid JSON object
function findJSONStart(text: string): number {
  // Skip past any markdown fences and leading text
  let searchFrom = 0;
  const fenceMatch = text.match(/```(?:json)?\s*\n?/);
  if (fenceMatch) searchFrom = fenceMatch.index! + fenceMatch[0].length;
  // Find first { that looks like it starts our JSON (followed by a known key)
  const keyPattern = /\{\s*"(finalAnswer|steps|finalFormula)"/;
  const m = text.slice(searchFrom).match(keyPattern);
  return m ? searchFrom + m.index! : text.indexOf('{', searchFrom);
}

// Brute-force extract a JSON object by matching braces, ignoring string content
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse first (best case: AI output clean JSON)
  try { return deepCleanLaTeX(JSON.parse(cleaned)); } catch {}

  // Strategy: Find JSON by brace matching, try to parse each candidate
  const start = findJSONStart(cleaned);
  if (start === -1) return null;

  // Extract the full JSON object by brace depth counting
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;

  let candidate = cleaned.slice(start, end + 1);

  // Attempt 1: Direct parse
  try { return deepCleanLaTeX(JSON.parse(candidate)); } catch {}

  // Attempt 2: Strip control characters that broke JSON structure
  let stripped = candidate.replace(/[\x00-\x1f\x7f]/g, ' ');
  stripped = stripped.replace(/,\s*([\]}])/g, "$1"); // trailing commas
  stripped = stripped.replace(/\n/g, ' ').replace(/  +/g, ' ').trim();
  try { return deepCleanLaTeX(JSON.parse(stripped)); } catch {}

  return null;
}

// ── NUCLEAR LaTeX repair: fix EVERYTHING JSON.parse breaks ──
// This runs on every string in the parsed solution object.
function deepCleanLaTeX(obj: any): any {
  if (typeof obj === 'string') {
    return nuclearLatexRepair(obj);
  }
  if (Array.isArray(obj)) return obj.map(deepCleanLaTeX);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) result[key] = deepCleanLaTeX(obj[key]);
    return result;
  }
  return obj;
}

function nuclearLatexRepair(s: string): string {
  if (!s) return s;
  let t = s;

  // 1. Strip ALL invisible/zero-width Unicode characters
  t = t.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060-\u2064\u034F\u061C\u180E]/g, '');

  // 2. Replace control chars with backslash (they came from \f, \b, \v etc.)
  t = t.replace(/\x0C/g, '\\');  // form-feed → \\ (was \f in \frac, \forall)
  t = t.replace(/\x08/g, '\\');  // backspace → \\ (was \b in \beta, \binom)
  t = t.replace(/\x0B/g, '\\');  // vertical-tab → \\ (was \v in \vec)

  // 3. Collapse EXPLODED multi-line formulas (chars on separate lines)
  const lines = t.split('\n');
  if (lines.length > 1) {
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    const avgLen = nonEmpty.reduce((a, l) => a + l.trim().length, 0) / (nonEmpty.length || 1);
    const hasHTML = /<[a-z][\s\S]*?>/i.test(t);
    // Exploded = many lines (5+) with very short avg length (< 4 chars)
    if (!hasHTML && nonEmpty.length > 4 && avgLen < 4) {
      t = nonEmpty.map(l => l.trim()).join(' ');
    }
  }

  // 4. Fix "rac{" without leading backslash → "\\frac{"
  t = t.replace(/(?<!\\)rac\{/g, '\\frac{');

  // 5. Fix orphaned LaTeX commands (missing leading backslash)
  t = t.replace(/(?<!\\)(?=frac\{|sqrt\{|sum\{|prod\{|int\{|lim\{|log\{|ln\{|sin\{|cos\{|tan\{|cot\{|sec\{|csc\{|exp\{|det\{|binom\{|vec\{|hat\{|bar\{|tilde\{|dot\{|nabla\{|forall\{|exists\{|left|right|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|rightarrow|leftarrow|Rightarrow|quad|qquad)/g, '\\');

  // 6. Fix broken words where \ was inside a word (JSON ate it)
  // e.g., "E\\pirical" → "Empirical", "\\mula" → "mula", "\\for" → "for"
  // Pattern: \ + lowercase letters that are NOT real LaTeX commands
  const fakeLatexReplacements: [RegExp, string][] = [
    [/\\pirical/g, 'pirical'],
    [/\\mula(?![a-z])/g, 'mula'],
    [/\\mpirical/g, 'mpirical'],
    [/\\riod/g, 'riod'],
    [/\\osition/g, 'osition'],
    [/\\eorem/g, 'eorem'],
    [/\\nswer/g, 'nswer'],
    [/\\lement/g, 'lement'],
    [/\\olume/g, 'olume'],
    [/\\ass(?![a-z])/g, 'ass'],
    [/\\peed/g, 'peed'],
    [/\\orce(?![a-z])/g, 'orce'],
    [/\\nergy/g, 'nergy'],
    [/\\ressure/g, 'ressure'],
    [/\\ensity/g, 'ensity'],
    [/\\urrent/g, 'urrent'],
    [/\\oltage/g, 'oltage'],
    [/\\istance/g, 'istance'],
    [/\\ange(?![a-z])/g, 'ange'],
    [/\\quation/g, 'quation'],
    [/\\alue/g, 'alue'],
    [/\\umber/g, 'umber'],
    [/\\eight/g, 'eight'],
    [/\\ength/g, 'ength'],
    [/\\ime(?![a-z])/g, 'ime'],
    [/\\emperature/g, 'emperature'],
    [/\\elocity/g, 'elocity'],
    [/\\cceleration/g, 'cceleration'],
    [/\\omentum/g, 'omentum'],
    [/\\riction/g, 'riction'],
    [/\\ravity(?![a-z])/g, 'ravity'],
    [/\\apacity/g, 'apacity'],
    [/\\ntensity/g, 'ntensity'],
    [/\\requency/g, 'requency'],
    [/\\avelength/g, 'avelength'],
    [/\\fficiency/g, 'fficiency'],
    [/\\olecule/g, 'olecule'],
    [/\\oichiometry/g, 'oichiometry'],
    [/\\ompound/g, 'ompound'],
    [/\\ample/g, 'ample'],
    [/\\able(?![a-z])/g, 'able'],
    [/\\implest/g, 'implest'],
    [/\\mallest/g, 'mallest'],
    [/\\ighest/g, 'ighest'],
    [/\\owest/g, 'owest'],
    [/\\umber/g, 'umber'],
    [/\\orizontal/g, 'orizontal'],
    [/\\ertical/g, 'ertical'],
    [/\\erify/g, 'erify'],
    [/\\onfirm/g, 'onfirm'],
    [/\\ubstitute/g, 'ubstitute'],
    [/\\alculate/g, 'alculate'],
    [/\\implify/g, 'implify'],
    [/\\pply/g, 'pplied'],
    [/\\sing/g, 'sing'],
    [/\\herefore/g, 'herefore'],
    [/\\ow(?![a-z])/g, 'ow'],
    [/\\ind(?![a-z])/g, 'ind'],
    [/\\ake(?![a-z])/g, 'ake'],
    [/\\aving/g, 'aving'],
    [/\\olving/g, 'olving'],
    [/\\ethod/g, 'ethod'],
    [/\\how(?![a-z])/g, 'how'],
    [/\\hich(?![a-z])/g, 'hich'],
    [/\\ith(?![a-z])/g, 'ith'],
    [/\\ill(?![a-z])/g, 'ill'],
    [/\\e get (?=[a-z])/g, 'e get '],
    [/\\e need (?=[a-z])/g, 'e need '],
    [/\\e use (?=[a-z])/g, 'e use '],
    [/\\e can (?=[a-z])/g, 'e can '],
    [/\\roved/g, 'roved'],
    [/\\orrect/g, 'orrect'],
    [/\\roper/g, 'roper'],
    [/\\refix/g, 'refix'],
  ];
  for (const [re, replacement] of fakeLatexReplacements) {
    t = t.replace(re, replacement);
  }

  // 7. Fix single \ + common letter NOT part of a real LaTeX command
  // \f not followed by 'rac' or 'orall' → just 'f'
  t = t.replace(/\\f(?!rac|orall|oreach)/g, (match: string, offset: number, str: string) => {
    const nextChar = str[offset + match.length];
    if (!nextChar || /[\s,.;:!?)\]}]/.test(nextChar)) return 'f';
    if (/[a-qs-z]/.test(nextChar)) return 'f';
    return match;
  });
  // \m not part of a real LaTeX command
  t = t.replace(/\\m(?!u|athrm|athbf|athcal|athsf|atrix|in|od|box|id|erge|apsto|ulti)/g, 'm');
  // \n not part of a real LaTeX command
  t = t.replace(/\\n(?!abla|ewcommand|oindent|ot|u|eq|umber|atural)/g, 'n');
  // \e not part of real LaTeX
  t = t.replace(/\\e(?!psilon|ta|quiv|xists|tq|lements|nergy|lement)/g, 'e');
  // \s not part of real LaTeX
  t = t.replace(/\\s(?!ec|qrt|um|in|igma|pace)/g, 's');
  // \d not part of real LaTeX
  t = t.replace(/\\d(?!elta|et|iv|ot|frac|isplay|frac)/g, 'd');
  // \o not part of real LaTeX
  t = t.replace(/\\o(?!mega|verline|verrightarrow|ver)/g, 'o');
  // \c not part of real LaTeX
  t = t.replace(/\\c(?!os|ot|sc|ap|irc|dot|enter|dot)/g, 'c');
  // \p not part of real LaTeX
  t = t.replace(/\\p(?!i|artial|hi|si|rime|rod|lus)/g, 'p');
  // \t not part of real LaTeX
  t = t.replace(/\\t(?!an|heta|imes|au|ilde|ext|otal|o)/g, 't');
  // \a not part of real LaTeX
  t = t.replace(/\\a(?!lpha|ngle|pprox|nd|rrow|bove|lign)/g, 'a');
  // \r not part of real LaTeX
  t = t.replace(/\\r(?!ho|ight|angle|oot|eal)/g, 'r');
  // \i not part of real LaTeX
  t = t.replace(/\\i(?!nt|nfty|n|)/g, 'i');
  // \l not part of real LaTeX
  t = t.replace(/\\l(?!ambda|im|n|eft|eq|ine)/g, 'l');
  // \h not part of real LaTeX
  t = t.replace(/\\h(?!at|bar|line)/g, 'h');
  // \v not part of real LaTeX
  t = t.replace(/\\v(?!ec|artheta|dots)/g, 'v');
  // \g not part of real LaTeX
  t = t.replace(/\\g(?!amma|eq|eqslant)/g, 'g');
  // \w not part of real LaTeX
  t = t.replace(/\\w(?!edge|ith|here|hen)/g, 'w');
  // \u not part of real LaTeX
  t = t.replace(/\\u(?!nderline|nion|p|psilon)/g, 'u');
  // \b not part of real LaTeX
  t = t.replace(/\\b(?!eta|inom|old|egin|ig)/g, 'b');

  // 8. Auto-wrap bare \frac{}{} in $...$ if not already wrapped
  t = t.replace(/(?<!\$)(\\frac\{[^}]*\}\s*\{[^}]*\})(?!\$)/g, '$$$1$$');

  // 9. Fix \left/\right without backslash
  t = t.replace(/(?<!\\)(?=left[\(\[\{\|]|right[\)\]\}\|])/g, '\\');

  // 10. Clean up excessive whitespace
  t = t.replace(/  +/g, ' ').trim();

  return t;
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
  let t = text;
  t = t.replace(/\\text\\{[^}]*\\}/g, "$1")
    .replace(/\\mathrm\\{[^}]*\\}/g, "$1")
    .replace(/\\mathbf\\{[^}]*\\}/g, "$1");
  // Fix broken words from JSON.parse eating backslashes
  t = t.replace(/\bEm\s+for\b/g, "Empirical Formula");
  t = t.replace(/\bof\s+moles\b/g, "number of moles");
  return t;
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

// ── Utility functions ──

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

    // Try to parse JSON from AI response (deepCleanLaTeX runs inside extractJSON)
    const parsed = extractJSON(raw);

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
      // Verification skipped — nuclearLatexRepair + isSolutionClean handle quality.
      // Previously verifyAnswer made an extra AI call per solve, causing timeouts.

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
    // Run nuclearLatexRepair on the fallback solution too!
    const repairedTextSolution = deepCleanLaTeX(textSolution);
    // Sanitize and apply formula fix
    repairedTextSolution.finalAnswer = sanitizeFinalAnswer(repairedTextSolution.finalAnswer);
    repairedTextSolution.finalAnswer = fixFormulaAnswer(repairedTextSolution.finalAnswer, repairedTextSolution.steps || [], problem);

    return NextResponse.json({ success: true, data: repairedTextSolution, source: "ai" });

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
