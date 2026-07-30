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

// ── ONE concise worked example per subject ──
const EXAMPLES: Record<string, string> = {
  mathematics: JSON.stringify({
    finalAnswer: "x = 3",
    finalFormula: "$x = 9 / 3 = 3$",
    steps: [
      { desc: "Given: $3x + 5 = 14$. Find x.", formula: "$3x + 5 = 14$" },
      { desc: "Subtract 5 from both sides.", formula: "$3x = 14 - 5 = 9$" },
      { desc: "Divide by 3.", formula: "$x = 9 / 3 = 3$" },
      { desc: "Verify: $3(3) + 5 = 9 + 5 = 14$. Answer: x = 3", formula: "$x = 3$" },
    ],
    altSteps: [{ desc: "Check: LHS = $3(3)+5 = 14$, RHS = 14. Confirmed.", formula: "$14 = 14$" }],
    similar: ["Solve 5x - 7 = 18", "Solve 2x + 3 = x + 8"],
    mistakes: ["Sign errors when moving terms", "Forgetting to divide both sides"],
  }),
  physics: JSON.stringify({
    finalAnswer: "v = 19.6 m/s",
    finalFormula: "$v = u + at = 0 + 9.8 * 2 = 19.6$",
    steps: [
      { desc: "Given: u = 0 m/s (dropped from rest), a = g = 9.8 m/s^2, t = 2 s. Find v.", formula: "" },
      { desc: "Use first equation of motion.", formula: "$v = u + at$" },
      { desc: "Substitute: $v = 0 + (9.8)(2)$", formula: "$v = 0 + 9.8 * 2$" },
      { desc: "Compute: v = 19.6 m/s", formula: "$v = 19.6$ m/s" },
      { desc: "Verify: $v^2 = u^2 + 2as$, s = 0.5(9.8)(4) = 19.6 m, $v = sqrt(2*9.8*19.6) = 19.6$ m/s.", formula: "$v^2 = u^2 + 2as$" },
    ],
    altSteps: [{ desc: "Energy method: $v = sqrt(2gh) = sqrt(2*9.8*19.6) = 19.6$ m/s", formula: "$v = sqrt(2gh) = 19.6$ m/s" }],
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
    altSteps: [{ desc: "Direct: M = mass/(molar mass * volume) = 4/(40 * 0.5) = 0.2 M", formula: "$M = 4/20 = 0.2$ M" }],
    similar: ["Find molarity of 9.8g H2SO4 in 250 mL (H=1,S=32,O=16)", "How many grams of KOH for 200 mL of 0.5 M? (K=39,O=16,H=1)"],
    mistakes: ["Forgetting mL to L conversion", "Wrong atomic masses", "Confusing molarity with molality"],
  }),
};

function buildSystemPrompt(board: string, subject: string): string {
  const boardName = board === "icse" ? "ICSE" : board === "cbse" ? "CBSE" : "State Board";
  const example = EXAMPLES[subject] || EXAMPLES.mathematics;

  let boardRules = '';
  if (board === 'icse') {
    boardRules = `- ICSE BOARD STYLE (CISCE):
- Begin each step with a brief reason: "Using the formula for...", "Applying Ohm's law:", "By conservation of energy:".
- Use formal connector words: "Given:", "To find:", "Formula:", "Substituting:", "On solving:", "Hence," or "Therefore, the answer is...".
- Include units at every step where a quantity appears (e.g., "F = ma = 2 kg × 5 m/s² = 10 N").
- End with a verification step when possible: "Verification: substitute back to confirm.".
- For trigonometry identities, show LHS and RHS separately.
- Use "Hence proved" for proofs. Use "Hence" before stating the final answer.`;
  } else if (board === 'cbse') {
    boardRules = `- CBSE BOARD STYLE (NCERT-based):
- Follow NCERT format: "Given:", "To find:", "Formula:", "Calculation:", "Result:".
- List all given quantities with their values and SI units explicitly as the first step.
- Show unit conversions as a separate numbered step (e.g., "Step 1: Convert 72 km/h to m/s: 72 × 5/18 = 20 m/s").
- Mark each step clearly with numbers so the examiner can award step-marking.
- For physics: always write the formula in general form first, then substitute values.
- Conclude with "Therefore, [quantity] = [value] [unit]." or "Hence, the required [quantity] is [value] [unit].".`;
  } else {
    boardRules = `- STATE BOARD STYLE:
- Keep answers direct and practical. Focus on computation over elaborate theory.
- Follow the textbook method exactly as taught.
- Use "Given:", "Formula:", "Solution:", "Answer:" format.
- Show working but be concise — avoid unnecessary elaboration.
- End with a clear "Answer: [value] [unit]" line.`;
  }

  return `You are SpeedSolve AI, a numerical solver for Indian students (${boardName}, Grades 6-12).

RULES:
1. You MUST substitute the given numbers into formulas and COMPUTE the exact answer.
2. Show every step with actual numbers, not just generic formulas.
3. finalAnswer MUST be ONLY the computed result — a short value like "x = 3" or "v = 19.6 m/s" or "CH2O". No sentences, no "Hence", no "Therefore". Just the value with units if applicable.
   CRITICAL FOR CHEMICAL FORMULAS: If the question asks for an empirical formula, molecular formula, or chemical formula, the finalAnswer MUST be the actual formula (e.g. "CH2O", "H2SO4", "NaCl"). NEVER output ratios like "1:2:1" or "=1:2:1" as the final answer. Convert the mole ratio into the proper chemical formula with element symbols and subscripts.
4. finalFormula MUST show the full substitution and computation: "$a = F/m = 10/2 = 5$" or "$v = u + at = 0 + 9.8 \times 2 = 19.6$ m/s".
5. Every step.formula should show the arithmetic with actual numbers, not just generic formulas.
6. Use $...$ for ALL math expressions. NEVER use \\text{}, \\mathrm{}, or \\mathbf{} — write words as plain text outside the $ delimiters.
7. For units in formulas, write them as plain text: "$v = 19.6$ m/s" NOT "$v = 19.6 \text{ m/s}$".
8. Round to 2 decimal places unless exact is cleaner.
9. FINAL ANSWER QUALITY — ABSOLUTE PRIORITY:
   - For empirical/molecular formula questions: finalAnswer = the formula string (e.g. "CH2O", "C6H12O6", "CaCO3").
   - For "find the value of x" questions: finalAnswer = "x = 5" (not the equation, not the steps).
   - For "find the area/volume/speed/force/etc" questions: finalAnswer = "Area = 24 cm²" (value + unit).
   - For "simplify" questions: finalAnswer = the simplified expression.
   - For "balance" questions: finalAnswer = the balanced equation.
   - For "find pH" questions: finalAnswer = "pH = 2".
   - NEVER output intermediate ratios, raw decimals, or work-in-progress as finalAnswer.

11. BOARD-SPECIFIC STYLE (${boardName}):
${boardRules}
12. GRAPH GENERATION — CRITICAL: When the problem involves ANY function, equation, data, kinematics, coordinate geometry, trigonometry, or visual relationship, you MUST include a "graph" field.

   MANDATORY graph triggers (include graph for ALL of these):
   - Quadratic/cubic equations: plot the function, mark roots, vertex, axis of symmetry
   - Simultaneous linear equations: plot BOTH lines, mark intersection point
   - Trigonometry (sin/cos/tan): plot the wave, mark key points (max, min, zeros)
   - Kinematics (any u/v/a/s/t problem): s-t, v-t, or a-t graph as appropriate
   - Statistics data: bar chart or pie chart
   - Coordinate geometry: plot points, lines, distances
   - Functions (domain/range): plot the function
   - Probability: bar chart of outcomes
   - Linear programming: plot feasible region and constraint lines
   - Arithmetic/Geometric progression: plot terms vs n

   GRAPH FORMAT RULES:
   - For function plots: ALWAYS provide xMin, xMax, yMin, yMax that frame the data well with comfortable padding (at least 20% margin around the interesting region).
   - For ALL graphs: title must match the equation or data description exactly.
   - Labels (xLabel, yLabel) MUST include units where applicable (e.g., "Time (s)", "Distance (m)").
   - Mark ALL important points: roots, vertex, intersection, maxima, minima, inflection points.
   - The "fn" field uses JS math: x*x, sin(x), cos(x), tan(x), sqrt(x), abs(x), pi, e, ** for power, Math.sin, Math.cos etc.

   Graph types:
   - Function plot: {"type":"function","title":"y = x^2 - 5x + 6","xLabel":"x","yLabel":"y","fn":"x*x - 5*x + 6","xMin":-1,"xMax":6,"yMin":-3,"yMax":10,"points":[{"x":2,"y":0,"label":"Root (2,0)"},{"x":3,"y":0,"label":"Root (3,0)"},{"x":2.5,"y":-0.25,"label":"Vertex (2.5,-0.25)"}]}
   - Data line: {"type":"line","title":"Distance vs Time","xLabel":"Time (s)","yLabel":"Distance (m)","xData":[0,1,2,3,4,5],"series":[{"name":"Distance","data":[0,5,20,45,80,125]}]}
   - Bar chart: {"type":"bar","title":"...","xLabel":"...","yLabel":"...","xData":["A","B"],"series":[{"name":"Value","data":[10,20]}]}
   - Pie chart: {"type":"pie","title":"...","xData":["A","B"],"series":[{"name":"Value","data":[40,60]}]}

13. DIAGRAM — For geometry, physics diagrams, free-body diagrams, ray diagrams, circuit diagrams: include a "diagram" field.
   MANDATORY diagram triggers:
   - Free-body diagrams (forces on an object)
   - Geometry (triangles, circles, angle markings)
   - Ray diagrams (optics - mirrors, lenses)
   - Electric circuits (simple series/parallel)
   - Projectile motion diagrams
   - Inclined plane problems
   - Pulley systems

   Diagram format: {"svg":"<svg viewBox=\"0 0 300 250\">...</svg>","caption":"Free Body Diagram"}
   SVG RULES:
   - viewBox="0 0 300 250" (always this size)
   - Use stroke-only shapes (fill=none, stroke-width=1.5 or 2)
   - Text: font-size 12-14px, font-family sans-serif
   - Include <defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill=\"%233b82f6\"/></marker></defs>
   - Color important elements with stroke="#3b82f6" (blue), stroke="#ef4444" (red), stroke="#10b981" (green)
   - Label ALL forces, angles, dimensions clearly
   - NO external resources, NO images, NO fonts

OUTPUT: Return ONLY this JSON, no markdown fences, no text before/after:
${example}

Now solve the student's problem the same way - substitute values, compute, show the answer. Include a graph or diagram when the problem involves any function, data, or visual relationship.`;
}

// ── JSON extraction ──
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}

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

// Fix ratio-style finalAnswers for empirical/molecular formula questions
function fixFormulaAnswer(finalAnswer: string, steps: { desc: string; formula: string }[], problem: string): string {
  if (!finalAnswer) return finalAnswer;
  const lower = problem.toLowerCase();
  const isFormulaQ = /empirical\\s*formula|molecular\\s*formula|chemical\\s*formula|formula\\s*of/i.test(lower);
  if (!isFormulaQ) return finalAnswer;

  // If it's already a proper formula (has element symbols with possible subscripts), keep it
  if (/^[A-Z][a-z]?\\d*([A-Z][a-z]?\\d*)*$/.test(finalAnswer.trim())) return finalAnswer;

  // Extract element info from steps - look for patterns like "C: 3.33", "moles of C", etc.
  const elementMap = new Map<string, number>();
  const elementOrder: string[] = [];
  const elRegex = /(?:moles? of |atoms? of |ratio.*?|:\s*)([A-Z][a-z]?)\s*[=:]\s*([\\d.]+)/gi;
  for (const step of steps) {
    const text = step.desc + " " + step.formula;
    let match;
    while ((match = elRegex.exec(text)) !== null) {
      const el = match[1];
      const val = parseFloat(match[2]);
      if (val > 0 && !elementMap.has(el)) {
        elementMap.set(el, val);
        elementOrder.push(el);
      }
    }
  }

  // Also try to extract from percentage/given data in the problem
  // Pattern: "40% C" or "C=40%" or "C: 40%"
  if (elementOrder.length === 0) {
    const pctRegex = /([\\d.]+)%\\s*([A-Z][a-z]?)/g;
    const massRegex = /([A-Z][a-z]?)\s*[=:]\s*([\\d.]+)/g;
    let match;
    while ((match = pctRegex.exec(problem)) !== null) {
      const val = parseFloat(match[1]);
      const el = match[2];
      if (val > 0 && !elementMap.has(el)) {
        elementMap.set(el, val);
        elementOrder.push(el);
      }
    }
  }

  if (elementOrder.length < 2) return finalAnswer;

  // Convert to simplest integer ratio
  const vals = elementOrder.map(el => elementMap.get(el)!);
  const minVal = Math.min(...vals.filter(v => v > 0));
  const ratios = vals.map(v => v / minVal);

  // Round to nearest integer (with tolerance for floating point)
  const intRatios = ratios.map(r => {
    const rounded = Math.round(r);
    return Math.abs(r - rounded) < 0.15 ? rounded : Math.round(r * 2) / 2; // try half-integers
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
      // Fix ratio-style answers for formula questions (e.g. "1:2:1" → "CH2O")
      finalAns = fixFormulaAnswer(finalAns, cleanedSteps, problem);
      const solution = {
        finalAnswer: finalAns,
        finalFormula: cleanLatex(parsed.finalFormula || "") || "",
        steps: cleanedSteps,
        altSteps: cleanedAltSteps,
        similar: Array.isArray(parsed.similar) ? parsed.similar.slice(0, 4) : generateSimilarQuestions(sub),
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.slice(0, 5) : generateCommonMistakes(sub),
        examTips: BOARD_TIPS[brd]?.[sub] || [],
        graph: parsed.graph && parsed.graph.type ? parsed.graph : null,
        diagram: parsed.diagram && parsed.diagram.svg ? parsed.diagram : null,
      };
      return NextResponse.json({ success: true, data: solution, source: "ai" });
    }

    // JSON parse failed but we have text - build solution from raw text
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
