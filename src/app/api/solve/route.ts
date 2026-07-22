import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { tryLocalSolve, preprocessProblem } from "./local-solver";
import { isPromptInjection, INJECTION_MESSAGE } from "@/lib/injection-guard";

// ── AI Provider: Google Gemini via official SDK ──
// Flow: Student → SpeedSolve AI → Vercel /api/solve → Gemini API

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2500, 5000];

async function callGemini(systemPrompt: string, userPrompt: string, useThinking = true): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("[SpeedSolve AI] GEMINI_API_KEY is not set in Vercel environment variables!");
    return "";
  }

  for (const model of MODELS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const isLastAttempt = model === MODELS[MODELS.length - 1] && attempt === MAX_RETRIES - 1;
        const useJsonMode = !isLastAttempt;
        // gemini-2.0-flash doesn't support thinking config
        const canThink = useThinking && model === MODELS[0];

        console.log(`[SpeedSolve AI] Calling ${model} (attempt ${attempt + 1}/${MAX_RETRIES}, jsonMode=${useJsonMode}, thinking=${canThink})`);

        const config: any = {
          systemInstruction: systemPrompt,
          temperature: canThink ? 1.0 : 0.1,
          maxOutputTokens: 8192,
        };
        if (useJsonMode) config.responseMimeType = "application/json";
        if (canThink) config.thinkingConfig = { thinkingBudget: 10000 };

        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config,
        });

        const text = response.text || "";
        if (text.trim().length > 10) {
          console.log(`[SpeedSolve AI] ${model} succeeded on attempt ${attempt + 1} (${text.length} chars)`);
          return text;
        }
        console.warn(`[SpeedSolve AI] ${model} returned empty/short on attempt ${attempt + 1}`);
      } catch (err: any) {
        const msg = err?.message || String(err);
        console.error(`[SpeedSolve AI] ${model} attempt ${attempt + 1} failed: ${msg}`);
      }

      if (!(model === MODELS[MODELS.length - 1] && attempt === MAX_RETRIES - 1)) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 1000));
      }
    }
  }

  console.error("[SpeedSolve AI] ALL Gemini calls failed after every retry and fallback model");
  return "";
}

// ── Board-specific exam tips ──
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

const SAMPLE_PROBLEMS: Record<
  string,
  { text: string; label: string }[]
> = {
  mathematics: [
    { text: "Solve 3x + 5 = 14", label: "Linear Equation" },
    { text: "Solve x^2 - 5x + 6 = 0", label: "Quadratic" },
    { text: "Find 15% of 200", label: "Percentage" },
    { text: "Find the LCM and GCD of 48, 72, 108", label: "LCM & GCD" },
    { text: "A train travels 360 km in 4 hours. Find its speed in m/s.", label: "Speed" },
    { text: "Find the area of a circle with radius 14 cm.", label: "Area" },
    { text: "If sin θ = 3/5, find cos θ and tan θ.", label: "Trigonometry" },
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
    { text: "Balance: Fe + O2 → Fe2O3", label: "Balance" },
    { text: "A gas at 2 atm and 300 K occupies 5 L. What volume at 1 atm and 300 K?", label: "Gas Law" },
    { text: "Find the molarity of 4g NaOH in 500 mL solution. (Na=23, O=16, H=1)", label: "Molarity" },
    { text: "What is the empirical formula of a compound with 40% C, 6.7% H, 53.3% O? (C=12, H=1, O=16)", label: "Empirical" },
    { text: "50 mL of 0.1 M HCl reacts with 25 mL of NaOH. Find molarity of NaOH.", label: "Reaction" },
  ],
};

// ── System Prompt: Computation-First Numerical Solver ──
// Key insight: LLMs produce correct math when shown worked examples
// and told to SUBSTITUTE VALUES and COMPUTE, not just explain.

const MATH_EXAMPLE = `{
  "finalAnswer": "x = 3",
  "finalFormula": "$3x + 5 = 14$",
  "steps": [
    {"desc": "Given: The equation $3x + 5 = 14$. We need to find the value of x.", "formula": "$3x + 5 = 14$"},
    {"desc": "Subtract 5 from both sides to isolate the term with x.", "formula": "$3x = 14 - 5 = 9$"},
    {"desc": "Divide both sides by 3 to solve for x.", "formula": "$x = 9 / 3 = 3$"},
    {"desc": "Therefore, the solution is x = 3. Verification: $3(3) + 5 = 9 + 5 = 14$ which matches the original equation.", "formula": "$x = 3$"}
  ],
  "altSteps": [
    {"desc": "Alternate verification: Substitute x = 3 back into the left-hand side.", "formula": "$3(3) + 5 = 9 + 5 = 14$"},
    {"desc": "Since LHS = RHS = 14, our answer x = 3 is confirmed correct.", "formula": "$14 = 14$"}
  ],
  "similar": ["Solve 5x - 7 = 18", "Solve 2x + 3 = x + 8", "If 4(x - 1) = 20, find x"],
  "mistakes": ["Forgetting to perform the same operation on both sides of the equation", "Making sign errors when moving terms (e.g., +5 becomes -5 when moved)", "Dividing incorrectly — always double-check arithmetic"]
}`;

const PHYSICS_EXAMPLE = `{
  "finalAnswer": "v = 19.6 m/s",
  "finalFormula": "$v = u + at = 0 + 9.8 \times 2$",
  "steps": [
    {"desc": "Given: Initial velocity u = 0 m/s (object dropped from rest), acceleration a = g = 9.8 m/s^2, time t = 2 s. Find: final velocity v.", "formula": ""},
    {"desc": "Identify the correct kinematic equation. Since we have u, a, t and need v, we use the first equation of motion.", "formula": "$v = u + at$"},
    {"desc": "Substitute the given values: u = 0, a = 9.8, t = 2.", "formula": "$v = 0 + (9.8)(2)$"},
    {"desc": "Compute: v = 0 + 19.6 = 19.6 m/s. The object is moving downward, so the velocity is 19.6 m/s.", "formula": "$v = 19.6$ m/s}",
    {"desc": "Verification using third equation: $v^2 = u^2 + 2as$. With s = 0.5(9.8)(4) = 19.6 m, we get $v = \\sqrt{0 + 2(9.8)(19.6)} = \\sqrt{384.16} = 19.6$ m/s. Confirmed.", "formula": "$v^2 = u^2 + 2as$"}
  ],
  "altSteps": [
    {"desc": "Using v^2 = u^2 + 2as. First find distance: s = ut + 0.5at^2 = 0 + 0.5(9.8)(4) = 19.6 m.", "formula": "$s = 0.5 \times 9.8 \times 4 = 19.6$ m"},
    {"desc": "Now find v: v^2 = 0 + 2(9.8)(19.6) = 384.16, so v = 19.6 m/s. Same answer confirmed.", "formula": "$v = \\sqrt{384.16} = 19.6$ m/s}",
    {"desc": "This method is useful when time is not directly given but distance is available.", "formula": ""}
  ],
  "similar": ["A stone is dropped from 30 m height. Find the time to reach the ground (g=9.8)", "A ball is thrown upward at 15 m/s. Find max height (g=10)", "An object starts from rest and accelerates at 5 m/s^2 for 6 s. Find final velocity"],
  "mistakes": ["Using g = 10 when the problem does not specify — default is g = 9.8 m/s^2", "Forgetting to convert units (e.g., km/h to m/s) before substituting into the formula", "Using the wrong kinematic equation — always check which quantities are given and which is unknown"]
}`;

const CHEM_EXAMPLE = `{
  "finalAnswer": "Molarity = 0.2 M",
  "finalFormula": "$M = n/V = 0.1 / 0.5$",
  "steps": [
    {"desc": "Given: Mass of NaOH = 4 g, Volume of solution = 500 mL = 0.5 L. Atomic masses: Na = 23, O = 16, H = 1. Find: Molarity (M).", "formula": ""},
    {"desc": "Convert volume to litres: 500 mL = 500/1000 = 0.5 L. (Molarity formula requires volume in litres.)", "formula": "$V = 500 / 1000 = 0.5$ L"},
    {"desc": "Calculate molar mass of NaOH = 23 + 16 + 1 = 40 g/mol.", "formula": "$M_{NaOH} = 23 + 16 + 1 = 40$ g/mol"},
    {"desc": "Calculate number of moles: n = mass / molar mass = 4 / 40 = 0.1 mol.", "formula": "$n = 4 / 40 = 0.1$ mol"},
    {"desc": "Apply molarity formula: M = n / V = 0.1 / 0.5 = 0.2 M. The molarity of the NaOH solution is 0.2 M.", "formula": "$M = 0.1 / 0.5 = 0.2$ M}",
    {"desc": "Check: 0.2 mol/L means 0.1 mol in 0.5 L, which matches our given 4 g of NaOH (4/40 = 0.1 mol). Correct.", "formula": ""}
  ],
  "altSteps": [
    {"desc": "Using the direct formula: M = (mass in g) / (molar mass x volume in L).", "formula": "$M = W / (M_w \times V)$"},
    {"desc": "Substitute: M = 4 / (40 x 0.5) = 4 / 20 = 0.2 M. Same answer, fewer steps.", "formula": "$M = 4 / 20 = 0.2$ M}",
    {"desc": "This shortcut formula is useful for quick calculations in exams.", "formula": ""}
  ],
  "similar": ["Find the molarity of 9.8 g H2SO4 in 250 mL solution (H=1, S=32, O=16)", "How many grams of KOH are needed to prepare 200 mL of 0.5 M solution? (K=39, O=16, H=1)", "What volume of 0.1 M HCl contains 0.73 g of HCl gas? (H=1, Cl=35.5)"],
  "mistakes": ["Forgetting to convert mL to L before using M = n/V — this is the most common error", "Using incorrect atomic masses (e.g., O=16 not O=8)", "Confusing molarity (mol/L) with molality (mol/kg) — they are different"]
}`;

function buildSystemPrompt(board: string, subject: string): string {
  const boardName = board === "icse" ? "ICSE" : board === "cbse" ? "CBSE" : "State Board";
  const boardTips = BOARD_TIPS[board]?.[subject] || [];
  const tipsStr = boardTips.length > 0
    ? "\nBoard tips for this problem type:\n" + boardTips.map(t => `  - ${t}`).join("\n")
    : "";

  // Pick the example matching the subject
  const example = subject === "physics" ? PHYSICS_EXAMPLE
    : subject === "chemistry" ? CHEM_EXAMPLE
    : MATH_EXAMPLE;

  return `You are SpeedSolve AI — a NUMERICAL SOLVER for Indian students (Grades 6-12, ${boardName}).

YOUR #1 JOB: Substitute the given numbers into the correct formula and COMPUTE the exact numerical answer.
You are NOT an explainer. You are a CALCULATOR that shows its work.

MANDATORY WORKFLOW FOR EVERY PROBLEM:
1. LIST GIVEN VALUES with units (e.g., "m = 2 kg, F = 10 N")
2. STATE THE FORMULA in LaTeX (e.g., $F = ma$)
3. IDENTIFY each variable (e.g., "where F = force, m = mass, a = acceleration")
4. SUBSTITUTE each given value into the formula (e.g., $a = F/m = 10/2$)
5. COMPUTE the result step by step — show the arithmetic
6. STATE the final answer with units
7. VERIFY by plugging the answer back or using an alternate method
${tipsStr}

RULES:
- Every step.formula MUST contain actual numbers being substituted and computed, not just the generic formula
- WRONG: formula="$F=ma$" in every step  |  RIGHT: step 3 has "$F=ma$", step 4 has "$a=10/2=5$"
- NEVER use \\text{} or \\mathrm{} — write units as plain text after the math
- Greek letters (theta, alpha, pi, etc.) are standard — use them directly in LaTeX
- Use g = 9.8 m/s^2 unless the problem says g = 10
- Trig exact values: sin30=1/2, cos60=1/2, sin45=1/sqrt(2), tan60=sqrt(3)
- Show unit conversions explicitly (e.g., "Convert 360 km to m: 360 x 1000 = 360000 m")
- For Chemistry: always show molar mass calculation, balanced equations, mole conversions
- For Physics: always show SI unit conversions, dimension checking
- Round final answers to 2 decimal places unless exact form is cleaner

OUTPUT FORMAT — Return ONLY this JSON structure:
{
  "finalAnswer": "The computed answer with units e.g. x = 3 or v = 19.6 m/s",
  "finalFormula": "The key formula with numbers substituted, e.g. $v = 0 + 9.8 \\times 2$",
  "steps": [
    {"desc": "What is given and what to find. List values with units.", "formula": ""},
    {"desc": "State the formula and explain which variables map to given values.", "formula": "$Formula = ...$"},
    {"desc": "Substitute the actual numerical values into the formula.", "formula": "$... = value1 ... value2$"},
    {"desc": "Compute the result. Show the arithmetic.", "formula": "$result = ...$"},
    {"desc": "State final answer and verify.", "formula": "$answer$"}
  ],
  "altSteps": [
    {"desc": "Alternate method or verification approach.", "formula": "$...$"},
    {"desc": "Compute using alternate method to confirm same answer.", "formula": "$...$"}
  ],
  "similar": ["Specific solvable practice problem 1", "Specific problem 2", "Specific problem 3"],
  "mistakes": ["Specific common mistake 1", "Specific mistake 2", "Specific mistake 3"]
}

WORKED EXAMPLE (follow this EXACT style for ${subject.toUpperCase()}):
${example}

CRITICAL: Look at the example above. Notice how each step SUBSTITUTES ACTUAL NUMBERS and SHOWS THE COMPUTATION. Do the same. The finalAnswer must be a specific number, never vague text.`;
}

const SUBJECT_META: Record<string, { label: string; icon: string; color: string }> = {
  mathematics: { label: "Mathematics", icon: "Σ", color: "#6366f1" },
  physics: { label: "Physics", icon: "⚗️", color: "#ea580c" },
  chemistry: { label: "Chemistry", icon: "⚗️", color: "#059669" },
};

// ── AI solver: sends problem to Gemini for structured JSON solution ──
async function solveWithAI(
  problem: string,
  subject: string,
  board: string
): Promise<string> {
  const boardContext =
    board === "icse"
      ? "ICSE Board"
      : board === "cbse"
        ? "CBSE Board"
        : "State Board";

  const systemPrompt = buildSystemPrompt(board, subject);

  const userPrompt = `Subject: ${subject.toUpperCase()}
Board: ${boardContext}
Grade Level: 6-12

Problem: ${problem}

Solve this problem step-by-step with clear explanations. Show every formula used. Provide an alternate solution method. Return ONLY the JSON response as specified.`;

  return callGemini(systemPrompt, userPrompt);
}

// ── Strict retry: tells the LLM its previous output was broken ──
async function solveWithAIStrict(
  problem: string,
  subject: string,
  board: string
): Promise<string> {
  const boardContext =
    board === "icse" ? "ICSE Board"
    : board === "cbse" ? "CBSE Board"
    : "State Board";

  const systemPrompt = buildSystemPrompt(board, subject);

  const strictPrompt = `Your previous response was NOT valid JSON and could not be parsed. You MUST fix this.

Subject: ${subject.toUpperCase()}
Board: ${boardContext}

Problem: ${problem}

RULES:
- Return ONLY raw JSON. No markdown code fences, no explanation before or after the JSON.
- Start your response with { and end with }
- The JSON must have exactly these keys: "finalAnswer" (string), "finalFormula" (string), "steps" (array of {desc, formula}), "altSteps" (array of {desc, formula}), "similar" (array of 3 strings), "mistakes" (array of 3 strings).
- Every value must be a string or array of strings. No nested objects inside steps.
- Do NOT use \\text{} or \\mathrm{} in any formula.
- Every formula must be wrapped in $...$
- Test your JSON mentally before outputting — it must parse with JSON.parse().
- The finalAnswer must be the COMPUTED ANSWER, not a restatement of the question.`;

  return callGemini(systemPrompt, strictPrompt);
}

// ── Robust JSON extraction ──
function extractJSON(text: string): object | null {
  if (!text || typeof text !== "string") return null;

  // Strip markdown code fences if present
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch {}

  // Find JSON by brace matching — find the FIRST { that starts a valid JSON object
  let searchFrom = 0;
  while (searchFrom < cleaned.length) {
    const start = cleaned.indexOf("{", searchFrom);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end !== -1) {
      let candidate = cleaned.slice(start, end + 1);
      // Clean up common issues
      candidate = candidate
        .replace(/,\s*([\]}])/g, "$1")  // trailing commas
        .replace(/\\n/g, " ")
        .replace(/\n/g, " ")
        .replace(/\t/g, " ")
        .replace(/  +/g, " ")
        .trim();
      try { return JSON.parse(candidate); } catch {}
      // More aggressive: remove control chars
      candidate = candidate.replace(/[\x00-\x1f\x7f]/g, "");
      try { return JSON.parse(candidate); } catch {}
    }

    // Try next { in case the first one isn't the JSON we want
    searchFrom = start + 1;
  }

  return null;
}

function validateSolution(data: any, originalProblem?: string): boolean {
  if (!data || typeof data !== "object") return false;
  if (!data.finalAnswer || typeof data.finalAnswer !== "string") return false;
  if (!Array.isArray(data.steps) || data.steps.length === 0) return false;

  // SAFETY: If finalAnswer contains the original problem text, it's a parse failure
  // (AI echoed the question instead of solving it)
  if (originalProblem) {
    const problemWords = originalProblem
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3);
    const answerLower = data.finalAnswer.toLowerCase();
    // If more than 60% of the significant problem words appear in the answer, it's likely the question
    const matchCount = problemWords.filter(w => answerLower.includes(w)).length;
    if (problemWords.length >= 3 && matchCount / problemWords.length > 0.6) {
      console.warn("[SpeedSolve AI] finalAnswer contains too much of the original problem text — treating as parse failure");
      return false;
    }
  }

  return true;
}

function cleanLatexField(text: string): string {
  if (!text || typeof text !== "string") return text;
  text = text.replace(/\\text\{([^}]*)\}/g, "$1");
  text = text.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  text = text.replace(/\\mathbf\{([^}]*)\}/g, "$1");
  return text;
}

function sanitizeSolution(data: any, subject: string, board: string) {
  return {
    finalAnswer: cleanLatexField(data.finalAnswer) || "",
    finalFormula: cleanLatexField(data.finalFormula || data.finalAnswer || ""),
    steps: (data.steps || []).map(
      (s: any) => ({
        desc: cleanLatexField(s.desc || ""),
        formula: cleanLatexField(s.formula || ""),
      })
    ),
    altSteps: (data.altSteps || []).map(
      (s: any) => ({
        desc: cleanLatexField(s.desc || ""),
        formula: cleanLatexField(s.formula || ""),
      })
    ),
    similar: Array.isArray(data.similar) ? data.similar.slice(0, 4) : [],
    mistakes: Array.isArray(data.mistakes) ? data.mistakes.slice(0, 5) : [],
    examTips:
      BOARD_TIPS[board]?.[subject] ||
      BOARD_TIPS["icse"]?.[subject] ||
      [],
  };
}

function generateSimilarQuestions(problem: string, subject: string): string[] {
  const templates: Record<string, string[]> = {
    mathematics: [
      "Try solving: If the values in this problem were doubled, what would the answer be?",
      "Practice: Solve a similar problem with different numbers.",
      "Challenge: Can you verify this answer using an alternative method?",
    ],
    physics: [
      "Try: What happens if you double the mass/force in this problem?",
      "Practice: Solve using a different physics formula.",
      "Challenge: How does the answer change if g = 10 m/s² instead of 9.8?",
    ],
    chemistry: [
      "Try: What if the concentration was halved?",
      "Practice: Solve a similar stoichiometry problem.",
      "Challenge: Balance the equation and verify with conservation of mass.",
    ],
  };
  return templates[subject] || templates.mathematics;
}

function generateCommonMistakes(subject: string): string[] {
  const mistakes: Record<string, string[]> = {
    mathematics: [
      "Not following BODMAS/PEMDAS order of operations correctly",
      "Making sign errors when moving terms across the equals sign",
      "Forgetting to apply the correct formula for the given problem type",
    ],
    physics: [
      "Forgetting to convert units (e.g., km/h to m/s) before substituting",
      "Using the wrong kinematic equation for the given conditions",
      "Not including proper units in the final answer",
    ],
    chemistry: [
      "Forgetting to balance the chemical equation before calculations",
      "Using incorrect molar masses or atomic weights",
      "Not converting volume to liters when calculating molarity",
    ],
  };
  return mistakes[subject] || mistakes.mathematics;
}

// ── MAIN POST HANDLER ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, subject, board, forceAI } = body;

    if (!problem || typeof problem !== "string") {
      return NextResponse.json(
        { error: "Problem text is required" },
        { status: 400 }
      );
    }

    // Prompt injection check
    if (isPromptInjection(problem)) {
      return NextResponse.json({ error: INJECTION_MESSAGE }, { status: 403 });
    }

    const resolvedSubject =
      subject && ["mathematics", "physics", "chemistry"].includes(subject)
        ? subject
        : "mathematics";
    const resolvedBoard =
      board && ["icse", "cbse", "state"].includes(board)
        ? board
        : "icse";

    // Preprocess: normalize Unicode symbols, Greek letters, etc.
    const processedProblem = preprocessProblem(problem);

    // ── Step 1: Try local solver (instant) — skip if forceAI ──
    if (!forceAI) {
      const localResult = await tryLocalSolve(processedProblem, resolvedSubject);
      if (localResult) {
        // Local solver found a quick answer — return it with source "local"
        // so the UI shows "Try with AI" button
        if (localResult.similar.length === 0) localResult.similar = generateSimilarQuestions(problem, resolvedSubject);
        if (localResult.mistakes.length === 0) localResult.mistakes = generateCommonMistakes(resolvedSubject);
        localResult.examTips = BOARD_TIPS[resolvedBoard]?.[resolvedSubject] || BOARD_TIPS["icse"]?.[resolvedSubject] || [];
        return NextResponse.json({ success: true, data: localResult, source: "local" });
      }

      // Local solver could NOT solve this — it's a hard question.
      // AUTO-SHIFT TO AI: Don't return fallback, go straight to AI.
      // The user wants correct answer in 1 try.
      console.log(`[SpeedSolve AI] Local solver couldn't handle — auto-shifting to AI for: "${processedProblem.slice(0, 80)}..."`);
    }

    // ── Step 2: AI Solver (Gemini via SDK) ──
    // This runs when: (a) local solver returned null (auto-shift) or (b) forceAI=true (user clicked retry)
    console.log(`[SpeedSolve AI] Using Gemini AI for: "${processedProblem.slice(0, 80)}..."`);

    // Preserve Greek letters from original input
    const aiProblem = problem.includes("θ") || problem.includes("α") || problem.includes("β") ||
                       problem.includes("ω") || problem.includes("λ") || problem.includes("μ") ||
                       problem.includes("Δ") || problem.includes("π") ? problem : processedProblem;

    const raw = await solveWithAI(aiProblem, resolvedSubject, resolvedBoard);

    if (!raw) {
      // AI completely failed after all retries — try local solver as absolute last resort
      console.warn("[SpeedSolve AI] AI failed, trying local solver as last resort...");
      const lastResortLocal = await tryLocalSolve(processedProblem, resolvedSubject);
      if (lastResortLocal) {
        if (lastResortLocal.similar.length === 0) lastResortLocal.similar = generateSimilarQuestions(problem, resolvedSubject);
        if (lastResortLocal.mistakes.length === 0) lastResortLocal.mistakes = generateCommonMistakes(resolvedSubject);
        lastResortLocal.examTips = BOARD_TIPS[resolvedBoard]?.[resolvedSubject] || [];
        return NextResponse.json({ success: true, data: lastResortLocal, source: "local" });
      }
      // Truly nothing worked — return a non-scary 200 with retry hint
      const fallback = {
        finalAnswer: "Could not solve this problem right now. Please try again.",
        finalFormula: "",
        steps: [{ desc: "We hit a snag processing your question. This is rare — please try submitting it again and it should work.", formula: "" }],
        altSteps: [],
        similar: [],
        mistakes: [],
        examTips: [],
      };
      return NextResponse.json({ success: true, data: fallback, source: "error" });
    }

    let parsed = extractJSON(raw);

    // Validate: check that finalAnswer isn't just the question echoed back
    if (parsed && !validateSolution(parsed, problem)) {
      parsed = null; // Force retry
    }

    // Retry once with stricter prompt if parsing failed or answer is suspect
    if (!parsed || !validateSolution(parsed, problem)) {
      console.log("[SpeedSolve AI] First attempt unparseable or answer suspicious, retrying with strict prompt...");
      const retryRaw = await solveWithAIStrict(aiProblem, resolvedSubject, resolvedBoard);
      if (retryRaw) {
        parsed = extractJSON(retryRaw);
        // Double-check the retry too
        if (parsed && !validateSolution(parsed, problem)) {
          console.warn("[SpeedSolve AI] Retry also returned suspicious finalAnswer");
          parsed = null;
        }
      }
    }

    // Last resort: AI gave text but we couldn't parse it — try local solver
    if (!parsed || !validateSolution(parsed, problem)) {
      console.error("[SpeedSolve AI] AI response unparseable after retry, trying local solver...");
      const lastResortLocal = await tryLocalSolve(processedProblem, resolvedSubject);
      if (lastResortLocal) {
        if (lastResortLocal.similar.length === 0) lastResortLocal.similar = generateSimilarQuestions(problem, resolvedSubject);
        if (lastResortLocal.mistakes.length === 0) lastResortLocal.mistakes = generateCommonMistakes(resolvedSubject);
        lastResortLocal.examTips = BOARD_TIPS[resolvedBoard]?.[resolvedSubject] || [];
        return NextResponse.json({ success: true, data: lastResortLocal, source: "local" });
      }
      // Truly unparseable — return a non-scary message
      const fallback = {
        finalAnswer: "Could not solve this problem right now. Please try again.",
        finalFormula: "",
        steps: [{ desc: "We had trouble understanding the AI response for this question. Please try rephrasing and submitting again.", formula: "" }],
        altSteps: [],
        similar: [],
        mistakes: [],
        examTips: [],
      };
      return NextResponse.json({ success: true, data: fallback, source: "error" });
    }

    const solution = sanitizeSolution(parsed, resolvedSubject, resolvedBoard);
    solution.examTips =
      BOARD_TIPS[resolvedBoard]?.[resolvedSubject] ||
      BOARD_TIPS["icse"]?.[resolvedSubject] ||
      [];

    // When auto-shifted (local failed), source is "ai" so UI knows NOT to show "Try with AI"
    // When user manually retried (forceAI), source is also "ai"
    return NextResponse.json({ success: true, data: solution, source: "ai" });
  } catch (err) {
    console.error("Solve API error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      success: false,
      error: "Something went wrong while solving. Please try rephrasing your problem.",
      debug: process.env.NODE_ENV === "development" ? errorMsg : undefined,
    }, { status: 200 });
  }
}

// GET endpoint for sample problems and metadata
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
