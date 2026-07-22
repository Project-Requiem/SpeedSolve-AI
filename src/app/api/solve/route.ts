import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { tryLocalSolve, preprocessProblem } from "./local-solver";
import { isPromptInjection, INJECTION_MESSAGE } from "@/lib/injection-guard";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("[SpeedSolve] GEMINI_API_KEY not set");
    return "";
  }
  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        });
        const text = response.text || "";
        if (text.trim().length > 20) {
          console.log(`[SpeedSolve] ${model} OK (${text.length} chars)`);
          return text;
        }
        console.warn(`[SpeedSolve] ${model} empty on attempt ${attempt + 1}`);
      } catch (err: any) {
        console.error(`[SpeedSolve] ${model} attempt ${attempt + 1}: ${err?.message}`);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
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

// ── ONE concise worked example per subject ──
const EXAMPLES: Record<string, string> = {
  mathematics: JSON.stringify({
    finalAnswer: "x = 3",
    finalFormula: "$x = 9 / 3 = 3$",
    steps: [
      { desc: "Given: $3x + 5 = 14$. Find x.", formula: "$3x + 5 = 14$" },
      { desc: "Subtract 5 from both sides.", formula: "$3x = 14 - 5 = 9$" },
      { desc: "Divide by 3.", formula: "$x = 9 / 3 = 3$" },
      { desc: "Verify: $3(3) + 5 = 9 + 5 = 14$ matches. Answer: x = 3", formula: "$x = 3$" },
    ],
    altSteps: [
      { desc: "Check: LHS = $3(3)+5 = 14$, RHS = 14. Confirmed.", formula: "$14 = 14$" },
    ],
    similar: ["Solve 5x - 7 = 18", "Solve 2x + 3 = x + 8"],
    mistakes: ["Sign errors when moving terms", "Forgetting to divide both sides"],
  }),
  physics: JSON.stringify({
    finalAnswer: "v = 19.6 m/s",
    finalFormula: "$v = u + at = 0 + 9.8 \times 2 = 19.6$",
    steps: [
      { desc: "Given: u = 0 m/s (dropped from rest), a = g = 9.8 m/s^2, t = 2 s. Find v.", formula: "" },
      { desc: "Use first equation of motion.", formula: "$v = u + at$" },
      { desc: "Substitute: $v = 0 + (9.8)(2)$", formula: "$v = 0 + 9.8 \times 2$" },
      { desc: "Compute: v = 19.6 m/s", formula: "$v = 19.6$ m/s" },
      { desc: "Verify with $v^2 = u^2 + 2as$: s = 0.5(9.8)(4) = 19.6 m, $v = \sqrt{2(9.8)(19.6)} = 19.6$ m/s. Confirmed.", formula: "$v^2 = u^2 + 2as$" },
    ],
    altSteps: [
      { desc: "Using energy: mgh = 0.5mv^2, so $v = \sqrt{2gh} = \sqrt{2(9.8)(19.6)} = 19.6$ m/s", formula: "$v = \sqrt{2gh} = 19.6$ m/s" },
    ],
    similar: ["A stone dropped from 30m. Find time to reach ground (g=9.8)", "Ball thrown up at 15 m/s. Find max height (g=10)"],
    mistakes: ["Using wrong g value", "Forgetting unit conversions", "Wrong kinematic equation"],
  }),
  chemistry: JSON.stringify({
    finalAnswer: "Molarity = 0.2 M",
    finalFormula: "$M = n/V = 0.1/0.5 = 0.2$ M",
    steps: [
      { desc: "Given: Mass of NaOH = 4 g, Volume = 500 mL = 0.5 L. Atomic masses: Na=23, O=16, H=1. Find: Molarity.", formula: "" },
      { desc: "Molar mass of NaOH = 23 + 16 + 1 = 40 g/mol", formula: "$M_{NaOH} = 23 + 16 + 1 = 40$ g/mol" },
      { desc: "Moles = 4/40 = 0.1 mol", formula: "$n = 4/40 = 0.1$ mol" },
      { desc: "Molarity = 0.1/0.5 = 0.2 M", formula: "$M = 0.1 / 0.5 = 0.2$ M" },
      { desc: "Check: 0.2 mol/L in 0.5 L = 0.1 mol = 4/40. Correct.", formula: "" },
    ],
    altSteps: [
      { desc: "Direct: M = mass/(molar mass x volume) = 4/(40 x 0.5) = 0.2 M", formula: "$M = 4/20 = 0.2$ M" },
    ],
    similar: ["Find molarity of 9.8g H2SO4 in 250 mL (H=1,S=32,O=16)", "How many grams of KOH for 200 mL of 0.5 M? (K=39,O=16,H=1)"],
    mistakes: ["Forgetting mL to L conversion", "Wrong atomic masses", "Confusing molarity with molality"],
  }),
};

function buildSystemPrompt(board: string, subject: string): string {
  const boardName = board === "icse" ? "ICSE" : board === "cbse" ? "CBSE" : "State Board";
  const example = EXAMPLES[subject] || EXAMPLES.mathematics;

  return `You are SpeedSolve AI, a numerical solver for Indian students (${boardName}, Grades 6-12).

RULES:
1. You MUST substitute the given numbers into formulas and COMPUTE the exact answer.
2. Show every step with actual numbers, not just generic formulas.
3. finalAnswer MUST be the computed numerical result (e.g. "x = 3", "v = 19.6 m/s", "CH2O").
4. Every step.formula should show the arithmetic: "$a = F/m = 10/2 = 5$", not just "$F=ma$".
5. Use $...$ for all math. No \\text{} or \\mathrm{}.
6. Round to 2 decimal places unless exact is cleaner.

OUTPUT: Return ONLY this JSON, no markdown fences, no text before/after:
${example}

Now solve the student's problem the same way — substitute values, compute, show the answer.`;
}

// ── JSON extraction ──
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}

  // Brace-matching extraction
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
      try { return JSON.parse(candidate); } catch {}
      candidate = candidate.replace(/[\x00-\x1f\x7f]/g, "");
      try { return JSON.parse(candidate); } catch {}
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
  return {
    finalAnswer: steps.length > 0 ? steps[steps.length - 1].desc : rawText.slice(0, 200),
    finalFormula: "",
    steps: steps.length > 0 ? steps : [{ desc: rawText.slice(0, 300), formula: "" }],
    altSteps: [],
    similar: [],
    mistakes: [],
    examTips: BOARD_TIPS[board]?.[subject] || [],
  };
}

function cleanLatex(text: string): string {
  if (!text) return text;
  return text.replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\mathbf\{([^}]*)\}/g, "$1");
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

    // Step 1: Try local solver (instant) — skip if forceAI
    if (!forceAI) {
      const local = await tryLocalSolve(processed, sub);
      if (local) {
        if (local.similar.length === 0) local.similar = generateSimilarQuestions(sub);
        if (local.mistakes.length === 0) local.mistakes = generateCommonMistakes(sub);
        local.examTips = BOARD_TIPS[brd]?.[sub] || [];
        return NextResponse.json({ success: true, data: local, source: "local" });
      }
    }

    // Step 2: AI Solver
    const systemPrompt = buildSystemPrompt(brd, sub);
    const boardLabel = brd === "icse" ? "ICSE" : brd === "cbse" ? "CBSE" : "State Board";
    const userPrompt = `Subject: ${sub.toUpperCase()}
Board: ${boardLabel}
Problem: ${problem}

Substitute the given values into the formula and compute. Return JSON only.`;

    console.log(`[SpeedSolve] AI solving: "${processed.slice(0, 80)}..."`);
    const raw = await callGemini(systemPrompt, userPrompt);

    if (!raw) {
      // AI failed — try local as last resort
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
      // Valid JSON — clean and return
      const solution = {
        finalAnswer: cleanLatex(parsed.finalAnswer) || "",
        finalFormula: cleanLatex(parsed.finalFormula || "") || "",
        steps: (parsed.steps || []).map((s: any) => ({
          desc: cleanLatex(s.desc || ""),
          formula: cleanLatex(s.formula || ""),
        })),
        altSteps: (parsed.altSteps || []).map((s: any) => ({
          desc: cleanLatex(s.desc || ""),
          formula: cleanLatex(s.formula || ""),
        })),
        similar: Array.isArray(parsed.similar) ? parsed.similar.slice(0, 4) : generateSimilarQuestions(sub),
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.slice(0, 5) : generateCommonMistakes(sub),
        examTips: BOARD_TIPS[brd]?.[sub] || [],
      };
      return NextResponse.json({ success: true, data: solution, source: "ai" });
    }

    // JSON parse failed but we have text — build solution from raw text
    console.warn(`[SpeedSolve] JSON parse failed, building from raw text (${raw.length} chars)`);
    const textSolution = buildSolutionFromText(raw, sub, brd);
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
