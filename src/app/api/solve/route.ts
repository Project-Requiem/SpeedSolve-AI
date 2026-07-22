import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { tryLocalSolve, preprocessProblem } from "./local-solver";
import { isPromptInjection, INJECTION_MESSAGE } from "@/lib/injection-guard";

// ── AI Provider: Google Gemini via official SDK ──
// Flow: Student → SpeedSolve AI → Vercel /api/solve → Gemini API

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("[SpeedSolve AI] No GEMINI_API_KEY set in environment");
    return "";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
    // response.text should be pure JSON when responseMimeType is set
    // but defensively handle cases where Gemini adds preamble
    return response.text || "";
  } catch (err) {
    console.error("[SpeedSolve AI] Gemini error:", err);
    return "";
  }
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

// ── Enhanced System Prompt ──
function buildSystemPrompt(board: string, subject: string): string {
  const boardName = board === "icse" ? "ICSE" : board === "cbse" ? "CBSE" : "State Board";
  const boardTips = BOARD_TIPS[board]?.[subject] || [];
  const tipsStr = boardTips.length > 0
    ? "\nBoard-Specific Tips for this problem type:\n" + boardTips.map((t, i) => `  ${i + 1}. ${t}`).join("\n")
    : "";

  return `You are SpeedSolve AI, an expert numerical solver for Indian school students in Grades 6–12 (${boardName}).

Your job is to solve the given problem with 100% accuracy and return a structured JSON response.

CRITICAL RULES:
1. Every numerical answer MUST be mathematically correct. Double-check all calculations.
2. Use standard formulas and methods taught in Indian ${boardName} school curricula.
3. For trigonometric values, use exact values (e.g., sin 30° = 1/2, cos 60° = 1/2).
4. Use g = 9.8 m/s² unless the problem specifies g = 10.
5. Always include units in final answers for Physics and Chemistry.
6. NEVER use \\text{} or \\mathrm{} in formulas — just write units directly (e.g., "14 m/s" not "14 \\text{ m/s}").
7. Greek letters (θ, α, β, ω, λ, μ, Δ, π, Σ) are standard notation — use them directly.
8. If the user writes x^2 or x², treat it as x squared.

STEP-BY-STEP SOLUTION REQUIREMENTS:
- Step 1: "Identify what is given and what needs to be found" — list every given value with its unit
- Next steps: State the formula you are about to use (write it in LaTeX $...$), explain WHY this formula applies, then substitute values
- Show every intermediate calculation — do not skip steps
- Final step: State the final answer clearly with proper units
- Each step.desc must be 2-4 sentences of clear, student-friendly explanation
- Each step.formula must have the LaTeX expression for that step's calculation (can be empty string if purely textual)

ALTERNATE SOLUTION REQUIREMENTS:
- Provide a COMPLETE alternate method to solve the same problem (different formula, approach, or verification)
- The alternate solution must also have clear steps with explanations and formulas
- Explain WHY this alternate method works and when a student might prefer it
- If the problem allows, use the alternate to verify the answer matches

FORMULA HIGHLIGHTING:
- Every important formula used MUST appear in step.formula wrapped in $...$
- The main formula for the problem should also appear in finalFormula
- Label formulas clearly in the step description (e.g., "Using the quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$")

EXPLANATION QUALITY:
- Explain concepts in simple language a Grade 8-10 student can understand
- Use analogies where helpful (e.g., "Think of voltage like water pressure in a pipe")
- After writing each formula, briefly explain what each variable represents
- Point out common pitfalls or things students often forget
${tipsStr}

OUTPUT FORMAT — Return ONLY valid JSON, no markdown fences, no commentary:
{
  "finalAnswer": "The final answer with units, e.g. x = 3 or v = 14 m/s or CH₂O",
  "finalFormula": "LaTeX for the key formula used, e.g. $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$",
  "steps": [
    {
      "desc": "2-4 sentence clear explanation of this step — identify given, state formula, explain why, substitute, compute",
      "formula": "$LaTeX expression for this step's calculation$"
    }
  ],
  "altSteps": [
    {
      "desc": "Clear explanation of the alternate approach — different method to reach same answer",
      "formula": "$LaTeX expression for the alternate method$"
    }
  ],
  "similar": ["Specific practice problem 1", "Specific practice problem 2", "Specific practice problem 3"],
  "mistakes": ["Specific common mistake 1 for this problem type", "Specific common mistake 2", "Specific common mistake 3"]
}

IMPORTANT:
- "similar" MUST contain 3 specific, solvable practice problems (not generic advice)
- "mistakes" MUST contain 3 specific mistakes students make for THIS exact problem type
- "altSteps" MUST have at least 2 steps showing a complete alternate solution method
- Every formula MUST be wrapped in $...$

ACCURACY CHECKLIST (verify before responding):
- Did I use the correct formula for this board's syllabus?
- Did I substitute the right values in the right places?
- Are all arithmetic operations correct?
- Is the final answer reasonable (check order of magnitude)?
- Are units consistent throughout?
- Does my alternate method give the same final answer?`;
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

// ── Error solution: shown when AI is completely unavailable ──
function buildErrorSolution(problem: string, subject: string): any {
  return {
    finalAnswer: "AI solver is currently unavailable. Please try again in a moment.",
    finalFormula: "",
    steps: [{ desc: "SpeedSolve AI could not reach the AI service. This is usually a temporary issue.", formula: "" }],
    altSteps: [],
    similar: [],
    mistakes: [],
  };
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
      console.warn("[SpeedSolve AI] Gemini returned empty — AI service unavailable.");
      const errSolution = buildErrorSolution(processedProblem, resolvedSubject);
      return NextResponse.json({ success: true, data: errSolution, source: "error" });
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

    // Last resort: build graceful error (never 503, never expose raw text)
    if (!parsed || !validateSolution(parsed, problem)) {
      console.error("LLM response unparseable after retry:", raw.slice(0, 300));
      const errSolution = buildErrorSolution(processedProblem, resolvedSubject);
      return NextResponse.json({ success: true, data: errSolution, source: "error" });
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
