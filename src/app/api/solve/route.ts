import { NextRequest, NextResponse } from "next/server";
import { tryLocalSolve, preprocessProblem } from "./local-solver";
import { isPromptInjection, INJECTION_MESSAGE } from "@/lib/injection-guard";

// ── AI Provider: Google Gemini (free, works on Vercel) ──
// Supports multiple API keys with automatic rotation & rate-limit recovery
const GEMINI_MODEL = "gemini-2.0-flash";

// Parse all GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ... from env
function loadGeminiKeys(): string[] {
  const keys: string[] = [];
  // Primary key
  const primary = process.env.GEMINI_API_KEY || "";
  if (primary.trim()) keys.push(primary.trim());

  // Numbered keys: GEMINI_API_KEY_2, GEMINI_API_KEY_3, ... up to _20
  for (let i = 2; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`] || "";
    if (k.trim() && !keys.includes(k.trim())) keys.push(k.trim());
  }
  return keys;
}

const ALL_GEMINI_KEYS = loadGeminiKeys();

// Per-key state tracking
const keyState: Map<string, { cooldownUntil: number; failCount: number }> = new Map();

// Initialize state for all keys
for (const k of ALL_GEMINI_KEYS) {
  keyState.set(k, { cooldownUntil: 0, failCount: 0 });
}

function getAvailableKey(): string | null {
  const now = Date.now();
  for (const k of ALL_GEMINI_KEYS) {
    const state = keyState.get(k)!;
    if (now >= state.cooldownUntil) return k;
  }
  return null; // all keys in cooldown
}

function markKeyFailure(key: string) {
  const state = keyState.get(key);
  if (!state) return;
  state.failCount++;
  // Exponential backoff: 60s, 120s, 240s, 480s... max 30 min
  const cooldown = Math.min(60 * Math.pow(2, state.failCount - 1), 1800);
  state.cooldownUntil = Date.now() + cooldown * 1000;
  console.warn(`[Gemini] Key #${ALL_GEMINI_KEYS.indexOf(key) + 1} rate-limited, cooldown ${cooldown}s`);
}

function markKeySuccess(key: string) {
  const state = keyState.get(key);
  if (state) {
    state.failCount = 0;
    state.cooldownUntil = 0;
  }
}

async function solveWithGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (ALL_GEMINI_KEYS.length === 0) return "";

  // Try each available key
  const maxAttempts = Math.min(ALL_GEMINI_KEYS.length, 3);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = getAvailableKey();
    if (!key) {
      console.warn("[Gemini] All keys in cooldown");
      break;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
      const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      };

      // Support both old (AIzaSy) and new (AQ.) API key formats
      // New AQ. keys MUST go in x-goog-api-key header, not as URL param
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (key.startsWith("AQ.")) {
        headers["x-goog-api-key"] = key;
      } else {
        // Legacy AIzaSy keys — append as query param
        headers["Content-Type"] = "application/json";
      }
      const fetchUrl = key.startsWith("AQ.") ? url : `${url}?key=${key}`;

      const res = await fetch(fetchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.status === 429 || res.status === 503) {
        const errBody = await res.text().catch(() => "");
        const isGeoBlock = errBody.includes("location is not supported") || errBody.includes("limit: 0");
        if (isGeoBlock) {
          console.error("[Gemini] Geo-blocked: server region not supported. Will work on Vercel (US)." );
        } else {
          console.warn(`[Gemini] Key #${ALL_GEMINI_KEYS.indexOf(key) + 1} rate-limited, rotating...`);
        }
        markKeyFailure(key);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[Gemini] API error", res.status, errText.slice(0, 300));
        markKeyFailure(key);
        continue;
      }

      const data = await res.json();

      // Check for safety blocks or empty responses
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!content) {
        // Empty response, might be blocked — try next key
        continue;
      }

      markKeySuccess(key);
      return content;
    } catch (err) {
      console.error(`[Gemini] Key #${ALL_GEMINI_KEYS.indexOf(key) + 1} error:`, err);
      markKeyFailure(key);
      continue;
    }
  }
  return "";
}

// ── Unified AI call: Gemini API only ──
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (ALL_GEMINI_KEYS.length === 0) {
    console.error("[SpeedSolve AI] No GEMINI_API_KEY set in environment");
    return "";
  }

  const result = await solveWithGemini(systemPrompt, userPrompt);
  if (result) return result;
  console.error("[SpeedSolve AI] All Gemini keys failed or in cooldown");
  return "";
}

// Hybrid solver: tries local fast solver first, falls back to LLM

const SUBJECT_META: Record<string, { label: string; icon: string; color: string }> = {
  mathematics: { label: "Mathematics", icon: "\u03A3", color: "#6366f1" },
  physics: { label: "Physics", icon: "\u269B\uFE0F", color: "#ea580c" },
  chemistry: { label: "Chemistry", icon: "\u2697\uFE0F", color: "#059669" },
};

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
    { text: "If sin \u03B8 = 3/5, find cos \u03B8 and tan \u03B8.", label: "Trigonometry" },
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
    { text: "Balance: Fe + O2 \u2192 Fe2O3", label: "Balance" },
    { text: "A gas at 2 atm and 300 K occupies 5 L. What volume at 1 atm and 300 K?", label: "Gas Law" },
    { text: "Find the molarity of 4g NaOH in 500 mL solution. (Na=23, O=16, H=1)", label: "Molarity" },
    { text: "What is the empirical formula of a compound with 40% C, 6.7% H, 53.3% O? (C=12, H=1, O=16)", label: "Empirical" },
    { text: "50 mL of 0.1 M HCl reacts with 25 mL of NaOH. Find molarity of NaOH.", label: "Reaction" },
  ],
};

const SOLVER_SYSTEM_PROMPT = `You are SpeedSolve AI, an expert numerical solver for Indian school students in Grades 6–12 (CBSE, ICSE, and State Boards).

Your job is to solve the given problem with 100% accuracy and return a structured JSON response.

CRITICAL RULES:
1. Every numerical answer MUST be mathematically correct. Double-check all calculations.
2. Use standard formulas and methods taught in Indian school curricula.
3. For trigonometric values, use exact values (e.g., sin 30° = 1/2, cos 60° = 1/2).
4. Use g = 9.8 m/s² unless the problem specifies g = 10.
5. Always include units in final answers for Physics and Chemistry.
6. Show complete step-by-step working that a student can follow.
7. LaTeX formulas must use standard KaTeX-compatible syntax. ALWAYS wrap every formula in $...$ or $$...$$.
8. For math formulas in steps, wrap each formula in $...$ (inline) or $$...$$ (display).
9. NEVER use \\text{} or \\mathrm{} in formulas - just write units directly (e.g., "14 m/s" not "14 \\text{ m/s}").
10. Handle quadratic equations (ax²+bx+c=0) using the quadratic formula: x = (-b ± √(b²-4ac)) / 2a
11. Greek letters in problems (θ, α, β, ω, λ, μ, Δ, π, Σ) are standard math/science notation — use them directly in formulas.
12. If the user writes x^2 or x², treat it as x squared.

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code blocks, no commentary):
{
  "finalAnswer": "The final answer with units, e.g. x = 3 or v = 14 m/s",
  "finalFormula": "LaTeX formula for the final answer, e.g. x = 3 or v = 14\\text{ m/s}",
  "steps": [
    {
      "desc": "Clear explanation of this step in plain English suitable for a student",
      "formula": "LaTeX formula for this step (or empty string if no formula)"
    }
  ],
  "altSteps": [
    {
      "desc": "Alternative approach or verification step",
      "formula": "LaTeX formula (or empty string)"
    }
  ],
  "similar": ["Similar problem 1", "Similar problem 2", "Similar problem 3"],
  "mistakes": ["Common mistake 1 students make", "Common mistake 2", "Common mistake 3"]

IMPORTANT: The "similar" array MUST contain 3 specific, solvable practice problems (not generic advice). The "mistakes" array MUST contain 3 specific mistakes related to THIS problem type.
}

STEP-BY-STEP REQUIREMENTS:
- Step 1: Identify what is given and what needs to be found
- Middle steps: Apply formulas, substitute values, compute intermediate results
- Final step: State the answer clearly with units
- Each step.desc should be 2-3 sentences explaining the reasoning
- Each step.formula should be a LaTeX expression (can be empty if no math in that step)

ACCURACY CHECKLIST (mentally verify before responding):
- Did I use the correct formula?
- Did I substitute the right values in the right places?
- Are all arithmetic operations correct?
- Is the final answer reasonable (check order of magnitude)?
- Are units consistent throughout?`;

async function solveWithLLM(
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

  const userPrompt = `Subject: ${subject.toUpperCase()}
Board: ${boardContext}
Grade Level: 6-12

Problem: ${problem}

Solve this problem step-by-step. Return ONLY the JSON response as specified.`;

  return callAI(SOLVER_SYSTEM_PROMPT, userPrompt);
}

function extractJSON(text: string): object | null {
  if (!text || typeof text !== 'string') return null;

  // Strip markdown code fences if present
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch {}

  // Find JSON by brace matching
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) {
        let candidate = cleaned.slice(start, i + 1);
        // Aggressive cleanup
        candidate = candidate
          .replace(/,\s*([\]}])/g, "$1")       // trailing commas
          .replace(/\\n/g, " ")                   // literal newlines in strings
          .replace(/\n/g, " ")                    // actual newlines
          .replace(/\t/g, " ")                    // tabs
          .replace(/  +/g, " ")                   // collapse spaces
          .trim();
        try { return JSON.parse(candidate); } catch {}
        // More aggressive: remove control chars
        candidate = candidate.replace(/[\x00-\x1f\x7f]/g, '');
        try { return JSON.parse(candidate); } catch {}
        return null;
      }
    }
  }
  return null;
}

function validateSolution(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  if (
    !data.finalAnswer ||
    typeof data.finalAnswer !== "string"
  )
    return false;
  if (!Array.isArray(data.steps) || data.steps.length === 0) return false;
  return true;
}

function cleanLatexField(text: string): string {
  if (!text || typeof text !== 'string') return text
  // Remove \text{...} wrappers - keep content
  text = text.replace(/\\text\{([^}]*)\}/g, '$1')
  text = text.replace(/\\mathrm\{([^}]*)\}/g, '$1')
  text = text.replace(/\\mathbf\{([^}]*)\}/g, '$1')
  return text
}

function sanitizeSolution(data: any, subject: string) {
  // Ensure all fields exist
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
    similar: Array.isArray(data.similar)
      ? data.similar.slice(0, 4)
      : [],
    mistakes: Array.isArray(data.mistakes)
      ? data.mistakes.slice(0, 5)
      : [],
    examTips:
      BOARD_TIPS["icse"]?.[subject] ||
      BOARD_TIPS["cbse"]?.[subject] ||
      [],
  };
}

// ── AI-as-Parser: lightweight AI call to rephrase/extract, then solve locally ──
async function tryAIRephrase(
  problem: string,
  subject: string
): Promise<string | null> {
  const REPHRASE_PROMPT = `You are a question rephraser. Your ONLY job is to rewrite the given problem into a clean, standard format that a pattern-matching solver can recognize.

Rules:
- Output ONLY the rephrased problem text. No explanation, no JSON, no commentary.
- Use standard mathematical notation (x^2 for x², sqrt for √, etc.)
- For word problems, extract the core mathematical question and write it in a standard format.
- For physics/chemistry, include all numerical values with proper units.
- Keep it in one sentence if possible.
- If the problem is not a numerical/mathematical question (e.g. "explain photosynthesis", "what is democracy"), output EXACTLY: "__NOT_NUMERICAL__"

Subject: ${subject.toUpperCase()}
Problem: ${problem}

Rephrased problem:`;

  const content = (await callAI(
    "You rephrase math/science problems into standard formats. Output ONLY the rephrased text, nothing else.",
    REPHRASE_PROMPT
  )).trim();
  if (!content || content.includes("__NOT_NUMERICAL__")) return null;
  console.log(`[SpeedSolve AI] AI rephrased: "${problem.slice(0, 50)}..." → "${content.slice(0, 80)}..."`);
  return content;
}

function generateSimilarQuestions(problem: string, subject: string): string[] {
  const templates: Record<string, string[]> = {
    mathematics: [
      `Try solving: If the values in this problem were doubled, what would the answer be?`,
      `Practice: Solve a similar problem with different numbers.`,
      `Challenge: Can you verify this answer using an alternative method?`,
    ],
    physics: [
      `Try: What happens if you double the mass/force in this problem?`,
      `Practice: Solve using a different physics formula.`,
      `Challenge: How does the answer change if g = 10 m/s² instead of 9.8?`,
    ],
    chemistry: [
      `Try: What if the concentration was halved?`,
      `Practice: Solve a similar stoichiometry problem.`,
      `Challenge: Balance the equation and verify with conservation of mass.`,
    ],
  };
  return templates[subject] || templates.mathematics;
}

function generateCommonMistakes(subject: string): string[] {
  const mistakes: Record<string, string[]> = {
    mathematics: [
      'Not following BODMAS/PEMDAS order of operations correctly',
      'Making sign errors when moving terms across the equals sign',
      'Forgetting to apply the correct formula for the given problem type',
    ],
    physics: [
      'Forgetting to convert units (e.g., km/h to m/s) before substituting',
      'Using the wrong kinematic equation for the given conditions',
      'Not including proper units in the final answer',
    ],
    chemistry: [
      'Forgetting to balance the chemical equation before calculations',
      'Using incorrect molar masses or atomic weights',
      'Not converting volume to liters when calculating molarity',
    ],
  };
  return mistakes[subject] || mistakes.mathematics;
}

// ── Strict retry: tells the LLM its previous output was broken ──
async function solveWithLLMStrict(
  problem: string,
  subject: string,
  board: string,
  failedRaw: string
): Promise<string> {
  const boardContext =
    board === "icse" ? "ICSE Board"
    : board === "cbse" ? "CBSE Board"
    : "State Board";

  const strictPrompt = `Your previous response was NOT valid JSON and could not be parsed. You MUST fix this.

Subject: ${subject.toUpperCase()}
Board: ${boardContext}

Problem: ${problem}

RULES:
- Return ONLY raw JSON. No markdown, no code blocks (no \`\`\`), no explanation before or after.
- The JSON must have exactly these keys: "finalAnswer" (string), "steps" (array of {desc, formula}), "altSteps" (array), "similar" (array of 3 strings), "mistakes" (array of 3 strings).
- "finalFormula" is optional.
- Every value must be a string or array of strings. No nested objects inside steps.
- Do NOT use \\text{} or \\mathrm{} in any formula.
- Test your JSON mentally before outputting — it must parse with JSON.parse().`;

  return callAI(SOLVER_SYSTEM_PROMPT, strictPrompt);
}

// ── Fallback: extract whatever we can from raw LLM text ──
function buildFallbackSolution(raw: string, problem: string, subject: string): any {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let finalAnswer = "Solution computed. See steps below.";
  let steps: { desc: string; formula: string }[] = [];

  // Look for common answer patterns
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith("final answer") ||
      lower.startsWith("answer:") ||
      lower.startsWith("answer =") ||
      lower.startsWith("therefore") ||
      lower.startsWith("hence") ||
      lower.startsWith("result") ||
      lower.startsWith("solution:")
    ) {
      finalAnswer = line.replace(/^(final answer|answer|answer =|therefore|hence|result|solution)[:\s]*/i, "").trim();
      break;
    }
  }

  if (finalAnswer === "Solution computed. See steps below." && lines.length > 0) {
    const lastMeaningful = lines.filter(l => l.length > 5);
    if (lastMeaningful.length > 0) {
      finalAnswer = lastMeaningful[lastMeaningful.length - 1].replace(/^[-\u2022*]\s*/, "");
    }
  }

  const meaningfulLines = lines.filter(l => l.length > 10 && !l.startsWith("{") && !l.startsWith("}"));
  if (meaningfulLines.length > 0) {
    steps = meaningfulLines.slice(0, 6).map(line => ({
      desc: line.replace(/^[-\u2022*#*]\s*/, "").replace(/^Step \d+[:.\s]*/i, ""),
      formula: "",
    }));
  }

  if (steps.length === 0) {
    const hints: Record<string, string[]> = {
      mathematics: [
        "Identify the type of problem (equation, geometry, trigonometry, etc.)",
        "Write down the given information and what needs to be found",
        "Apply the relevant formula step by step",
      ],
      physics: [
        "List all given quantities with their units",
        "Identify the relevant physics principle or formula",
        "Substitute values and solve for the unknown",
      ],
      chemistry: [
        "Write the balanced chemical equation if applicable",
        "Calculate molar masses and convert units",
        "Apply stoichiometry or the relevant formula",
      ],
    };
    steps = (hints[subject] || hints["mathematics"]).map(desc => ({ desc, formula: "" }));
  }

  return {
    finalAnswer: finalAnswer === "Solution computed. See steps below." 
      ? "Use the 'Try with AI' button for a detailed solution" 
      : finalAnswer,
    finalFormula: "",
    steps,
    altSteps: [],
    similar: generateSimilarQuestions(problem, subject),
    mistakes: generateCommonMistakes(subject),
  };
}

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
      subject &&
      ["mathematics", "physics", "chemistry"].includes(
        subject
      )
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
        if (localResult.similar.length === 0) localResult.similar = generateSimilarQuestions(problem, resolvedSubject);
        if (localResult.mistakes.length === 0) localResult.mistakes = generateCommonMistakes(resolvedSubject);
        localResult.examTips = BOARD_TIPS[resolvedBoard]?.[resolvedSubject] || BOARD_TIPS["icse"]?.[resolvedSubject] || [];
        return NextResponse.json({ success: true, data: localResult, source: "local" });
      }
    }

    // ── Step 2: AI Solver (auto-fallback) ──
    console.log(`[SpeedSolve AI] Local miss, using Gemini AI for: "${processedProblem.slice(0, 80)}..."`);
    // Pass ORIGINAL problem to AI (preserves Greek letters), processedProblem as fallback
    const aiProblem = problem.includes('θ') || problem.includes('α') || problem.includes('β') ||
                       problem.includes('ω') || problem.includes('λ') || problem.includes('μ') ||
                       problem.includes('Δ') || problem.includes('π') ? problem : processedProblem;
    const raw = await solveWithLLM(
      aiProblem,
      resolvedSubject,
      resolvedBoard
    );

    if (!raw) {
      console.warn("[SpeedSolve AI] Gemini returned empty — returning graceful fallback.");
      // Build a minimal solution indicating the problem couldn't be fully solved automatically
      const graceful = buildFallbackSolution(
        `Let me break this down for you: ${processedProblem}`,
        processedProblem,
        resolvedSubject
      );
      const solution = sanitizeSolution(graceful, resolvedSubject);
      solution.examTips = BOARD_TIPS[resolvedBoard]?.[resolvedSubject] || BOARD_TIPS["icse"]?.[resolvedSubject] || [];
      return NextResponse.json({ success: true, data: solution, source: "fallback" });
    }

    let parsed = extractJSON(raw);

    // Retry once with stricter prompt if parsing failed
    if (!parsed || !validateSolution(parsed)) {
      console.log(`[SpeedSolve AI] First LLM attempt unparseable, retrying with strict prompt...`);
      const retryRaw = await solveWithLLMStrict(processedProblem, resolvedSubject, resolvedBoard, raw);
      if (retryRaw) {
        parsed = extractJSON(retryRaw);
      }
    }

    // Last resort: build a minimal solution from raw text
    if (!parsed || !validateSolution(parsed)) {
      console.error("LLM response unparseable after retry:", raw.slice(0, 300));
      const fallback = buildFallbackSolution(raw, processedProblem, resolvedSubject);
      const solution = sanitizeSolution(fallback, resolvedSubject);
      solution.examTips = BOARD_TIPS[resolvedBoard]?.[resolvedSubject] || BOARD_TIPS["icse"]?.[resolvedSubject] || [];
      return NextResponse.json({ success: true, data: solution, source: "ai" });
    }

    const solution = sanitizeSolution(
      parsed,
      resolvedSubject
    );

    // Add board-specific exam tips
    solution.examTips =
      BOARD_TIPS[resolvedBoard]?.[resolvedSubject] ||
      BOARD_TIPS["icse"]?.[resolvedSubject] ||
      [];

    return NextResponse.json({ success: true, data: solution, source: "ai" });
  } catch (err) {
    console.error("Solve API error:", err);
    // Never show raw errors to user — always return a graceful 200 response
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
