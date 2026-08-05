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
    for (let attempt = 0; attempt < 3; attempt++) {
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
    for (let attempt = 0; attempt < 2; attempt++) {
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
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return "";
}

// ── AI Provider 3: OpenRouter fallback (keys: OPENROUTER_API_KEY) ──
async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
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
      if (!res.ok) continue;
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

  // 4. Retry Gemini one more time (transient errors)
  console.log("[SpeedSolve] All providers failed, retrying Gemini...");
  await new Promise(r => setTimeout(r, 2000));
  const retryResult = await callGemini(systemPrompt, userPrompt);
  if (retryResult) return retryResult;

  console.error("[SpeedSolve] ALL AI providers failed after full retry");
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
    let s = obj;
    // Replace control chars with backslash
    s = s.replace(/\x0c/g, '\\')  // form-feed -> \\ (from \f in \frac, \forall)
    s = s.replace(/\x08/g, '\\')  // backspace -> \\ (from \b in \beta, \binom)
    s = s.replace(/\x0b/g, '\\'); // vertical-tab -> \\ (from \v in \vec)
    // Detect and fix exploded fractions: "rac{" without leading backslash
    s = s.replace(/(?<!\\)rac\{/g, '\\frac{');
    // Fix orphaned LaTeX commands missing backslash
    s = s.replace(/(?<!\\)(?=beta\{|gamma\{|delta\{|theta\{|alpha\{|lambda\{|sqrt\{|vec\{|sum\{|prod\{|int\{|sin\{|cos\{|tan\{)/g, '\\');
    // Auto-wrap bare \frac{}{} in $ if not already wrapped
    s = s.replace(/(?<!\$)(\\frac\{[^}]*\}\s*\\{[^}]*\})(?!\$)/g, '\$$1\$$');
    return s;
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

// ── Deep clean all strings in the parsed solution ──
// Fixes: zero-width spaces, multi-line exploded formulas, missing backslashes,
// orphaned LaTeX commands, and garbled fraction patterns.
function cleanSolutionStrings(obj: any): any {
  if (typeof obj === 'string') {
    let s = obj;
    // 1. Strip ALL zero-width/invisible Unicode characters
    s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]/g, '');
    // 2. Strip literal form-feed, backspace, vertical-tab (shouldn't exist after fixParsedLatexControlChars, but safety net)
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
    // 3. Fix newlines within formulas: collapse multi-line into single line
    //    Detect "exploded" patterns where chars are on separate lines
    const lines = s.split('\n');
    if (lines.length > 1) {
      const nonEmpty = lines.filter(l => l.trim().length > 0);
      const avgLen = nonEmpty.reduce((a, l) => a + l.trim().length, 0) / (nonEmpty.length || 1);
      // If most lines are very short (< 4 chars), it's an "exploded" formula - collapse it
      if (nonEmpty.length > 3 && avgLen < 4) {
        s = nonEmpty.map(l => l.trim()).join(' ');
      } else {
        // Normal multi-line: collapse into single line for desc/formula fields
        s = lines.map(l => l.trim()).filter(l => l.length > 0).join(' ');
      }
    }
    // 4. Fix orphaned LaTeX commands (missing leading backslash)
    s = s.replace(/(?<!\\)(?=frac\{|sqrt\{|sum\{|prod\{|int\{|lim\{|log\{|ln\{|sin\{|cos\{|tan\{|cot\{|sec\{|csc\{|exp\{|det\{|binom\{|vec\{|hat\{|bar\{|tilde\{|dot\{|nabla\{|forall\{|exists\{|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|rightarrow|leftarrow|Rightarrow)/g, '\\');
    // 5. Fix broken \frac: "rac{" without leading backslash
    s = s.replace(/(?<!\\)rac\{/g, '\\frac{');
    // 6. Auto-wrap bare \frac{}{} in $...$ 
    s = s.replace(/(?<!\$)(\\frac\{[^}]*\}\s*\{[^}]*\})(?!\$)/g, '\$$1\$');
    // 7. Fix \left/\right without backslash
    s = s.replace(/(?<!\\)(?=left[\(\[\{\|]|right[\)\]\}\|])/g, '\\');
    // 8. Clean up excessive whitespace
    s = s.replace(/  +/g, ' ').trim();
    // 9. Remove stray \n/\r that may remain
    s = s.replace(/[\r\n]/g, ' ');
    return s;
  }
  if (Array.isArray(obj)) return obj.map(cleanSolutionStrings);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = cleanSolutionStrings(obj[key]);
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

// ── Answer Verification — double-check AI answer before showing to user ──
async function verifyAnswer(
  problem: string,
  finalAnswer: string,
  steps: { desc: string; formula: string }[],
  subject: string
): Promise<{ verified: boolean; correctedAnswer?: string; reason?: string }> {
  // Build a concise summary of the steps for the verifier
  const stepsSummary = steps
    .slice(0, 6)
    .map((s, i) => `Step ${i + 1}: ${s.desc}${s.formula ? ' → ' + s.formula : ''}`)
    .join('\n');

  const verifyPrompt = `You are a strict answer verifier. Check if the final answer is correct.

Problem: ${problem}
Subject: ${subject}

Steps taken:
${stepsSummary}

Final Answer: ${finalAnswer}

Verify this answer by:
1. Checking the math/logic step by step
2. Plugging the answer back into the original problem if applicable
3. Checking units and reasonableness

Respond in EXACTLY this format (no other text):
CORRECT: <brief confirmation>
or
WRONG: <corrected answer> | <reason>

Examples:
- CORRECT: Substituting x=3 gives 3(3)+5=14. Verified.
- WRONG: x = 4 | 3(4)+5=17, not 14. Correct answer is x=3.`;

  try {
    const result = await callAI(verifyPrompt, `Verify this answer: ${finalAnswer}\n\nProblem: ${problem}`);
    if (!result) return { verified: true }; // If verifier fails, trust original

    const trimmed = result.trim();
    if (trimmed.startsWith('CORRECT')) {
      console.log(`[Verify] Answer VERIFIED: ${trimmed.slice(0, 120)}`);
      return { verified: true, reason: trimmed };
    }
    if (trimmed.startsWith('WRONG')) {
      // Extract corrected answer and reason
      const afterWrong = trimmed.replace(/^WRONG:\s*/i, '');
      const pipeIdx = afterWrong.indexOf('|');
      let correctedAnswer = finalAnswer;
      let reason = afterWrong;
      if (pipeIdx > 0) {
        correctedAnswer = afterWrong.slice(0, pipeIdx).trim();
        reason = afterWrong.slice(pipeIdx + 1).trim();
      }
      console.log(`[Verify] Answer CORRECTED: "${correctedAnswer}" — ${reason}`);
      return { verified: false, correctedAnswer, reason };
    }
    // Unexpected format — trust original
    console.log(`[Verify] Unexpected format, trusting original: ${trimmed.slice(0, 100)}`);
    return { verified: true };
  } catch (err) {
    console.error(`[Verify] Error during verification:`, err);
    return { verified: true }; // On error, trust original
  }
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
    if (parsed) parsed = cleanSolutionStrings(parsed);

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
      // ── Verify answer before returning ──
      console.log(`[SpeedSolve] Verifying answer: "${finalAns}"`);
      const verification = await verifyAnswer(problem, finalAns, cleanedSteps, sub);
      if (!verification.verified && verification.correctedAnswer) {
        const corrected = sanitizeFinalAnswer(verification.correctedAnswer);
        const fixedCorrected = fixFormulaAnswer(corrected, cleanedSteps, problem);
        console.log(`[SpeedSolve] Using corrected answer: "${finalAns}" → "${fixedCorrected}"`);
        finalAns = fixedCorrected;
      }

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

    // ── Verify text-fallback answer too ──
    const textVerification = await verifyAnswer(problem, textSolution.finalAnswer, textSolution.steps || [], sub);
    if (!textVerification.verified && textVerification.correctedAnswer) {
      textSolution.finalAnswer = sanitizeFinalAnswer(textVerification.correctedAnswer);
      textSolution.finalAnswer = fixFormulaAnswer(textSolution.finalAnswer, textSolution.steps || [], problem);
      console.log(`[SpeedSolve] Text-fallback corrected: "${textSolution.finalAnswer}"`);
    }

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
