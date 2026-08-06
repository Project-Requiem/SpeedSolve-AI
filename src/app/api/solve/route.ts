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
  const geminiResult = await callGemini(systemPrompt, userPrompt);
  if (geminiResult) return geminiResult;
  console.log("[SpeedSolve] Gemini failed, trying Groq...");
  const groqResult = await callGroq(systemPrompt, userPrompt);
  if (groqResult) return groqResult;
  console.error("[SpeedSolve] ALL AI providers failed");
  return "";
}

// ── Board tips for ALL subjects ──
const BOARD_TIPS: Record<string, Record<string, string[]>> = {
  icse: {
    mathematics: [
      "ICSE values clear step-by-step working with reasons. Always show the formula before substituting.",
      "For trigonometry, ICSE often asks to prove identities — show LHS and RHS transformations separately.",
      "ICSE often tests Mensuration with composite figures — break them into simpler shapes.",
      "ICSE marks each step. Even if the final answer is wrong, correct steps earn marks.",
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
    biology: [
      "ICSE Biology expects detailed labelled diagrams. Always draw neat diagrams with pencil.",
      "Definitions must be precise — ICSE marks are strict on scientific terminology.",
      "For physiology questions, trace the pathway step by step (e.g., digestion, circulation).",
    ],
    english: [
      "ICSE English Literature requires text-based answers with quotes. Always reference the chapter/act/line.",
      "For essays, ICSE expects a clear introduction, 3 body paragraphs, and a conclusion.",
      "Grammar questions test precise rules — know your tenses, voices, and transformation rules.",
    ],
    history: [
      "ICSE History expects dates, events, and causes/effects in a structured format.",
      "For 'Discuss' questions, cover causes, events, and consequences separately.",
      "Map work is important — practice locating historical places on a map.",
    ],
    geography: [
      "ICSE Geography requires precise map work with proper scale, legend, and direction.",
      "For climate questions, reference data and explain patterns using geographic terms.",
      "Toposheet questions need careful reading of contour lines, symbols, and scales.",
    ],
    economics: [
      "ICSE Economics expects definitions, examples, and diagrams (demand/supply curves).",
      "For numericals, show all workings. Label axes properly on graphs.",
      "Distinguish between similar concepts clearly (e.g., economic vs accounting cost).",
    ],
    civics: [
      "ICSE Civics requires article/section references from the Constitution.",
      "For function questions, list each function with a brief explanation and example.",
      "Current affairs related to constitutional amendments are frequently asked.",
    ],
    computerscience: [
      "ICSE Computer Science expects precise syntax — pseudo-code must match the specified format.",
      "For programming questions, write the complete program with comments.",
      "Trace tables and dry runs are common — show each step of variable changes.",
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
    biology: [
      "CBSE Biology (NCERT-based) expects answers directly from textbook language.",
      "Diagrams carry 3-4 marks — always draw labelled diagrams for morphology/anatomy questions.",
      "For 'differentiate between' questions, use a table format (this is what CBSE examiners prefer).",
    ],
    english: [
      "CBSE English (NCERT Flamingo/Vistas) expects answers in 30-40 words for 2-mark, 80-100 words for 5-mark.",
      "For Letter Writing, follow the exact format: sender's address, date, receiver's address, subject, body, closing.",
      "In Reading Comprehension, answers must be in your own words but cover all key points.",
    ],
    history: [
      "CBSE History expects NCERT-based answers with specific examples.",
      "For 5-mark questions, write 5 points with brief explanations. Use subheadings.",
      "Map questions in CBSE carry 2 marks — practice identifying and locating places.",
    ],
    geography: [
      "CBSE Geography follows NCERT closely. Use textbook terminology.",
      "For 5-mark questions, write 5 points with explanations. Include data from the chapter.",
      "Map work is essential — practice locating features on an outline map of India.",
    ],
    economics: [
      "CBSE Economics (NCERT) expects precise definitions and examples from daily life.",
      "For 'How' and 'Why' questions, give step-by-step explanations with examples.",
      "Numerical questions on national income, GDP, and price index are common in Class 12.",
    ],
    civics: [
      "CBSE Political Science expects article references from the Indian Constitution.",
      "For 'evaluate' questions, discuss both advantages and limitations.",
      "Case studies from NCERT are frequently adapted into board questions.",
    ],
    computerscience: [
      "CBSE Computer Science (Python) expects working code with proper indentation.",
      "Output-based questions are common — trace the code step by step.",
      "SQL queries and database concepts are heavily tested in Class 12.",
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
    biology: [
      "State Board Biology expects textbook definitions and labelled diagrams.",
      "Short answer questions (2-3 marks) are the most common format.",
      "Practice writing differences in table format (e.g., mitosis vs meiosis).",
    ],
    english: [
      "State Board English follows the state textbook — answers should reference prescribed lessons.",
      "Grammar rules are tested extensively — practice transformation of sentences.",
      "Letter and essay writing follow specific formats taught in class.",
    ],
    history: [
      "State Board History focuses on regional history alongside Indian history.",
      "Date-based and event-based questions are common.",
      "Write answers in point format for better readability.",
    ],
    geography: [
      "State Board Geography includes detailed study of the state's physiography, climate, and resources.",
      "Map work focusing on the home state is important.",
      "Use textbook maps and data for precise answers.",
    ],
    economics: [
      "State Board Economics follows the state textbook closely.",
      "Focus on definitions, examples, and basic numericals.",
      "Diagram-based questions on demand/supply, cost curves are common.",
    ],
    civics: [
      "State Board Civics focuses on the state's governance, Panchayati Raj, and local administration.",
      "For function questions, list each function with a brief explanation.",
      "Constitutional provisions relevant to the state are frequently tested.",
    ],
    computerscience: [
      "State Board Computer Science follows the state syllabus and prescribed programming language.",
      "Practical-oriented questions (write programs, trace output) are common.",
      "Theory questions test understanding of concepts like data structures, OOP, DBMS.",
    ],
  },
};

// ── Sample problems for ALL subjects ──
const SAMPLE_PROBLEMS: Record<string, { text: string; label: string }[]> = {
  mathematics: [
    { text: "Solve 3x + 5 = 14", label: "Linear Equation" },
    { text: "Solve x^2 - 5x + 6 = 0", label: "Quadratic" },
    { text: "Find 15% of 200", label: "Percentage" },
    { text: "A train travels 360 km in 4 hours. Find its speed in m/s.", label: "Speed" },
    { text: "Find the area of a circle with radius 14 cm.", label: "Area" },
    { text: "If sin theta = 3/5, find cos theta and tan theta.", label: "Trigonometry" },
    { text: "Find the mean, median, mode of: 5, 3, 7, 3, 5, 9, 3, 1", label: "Statistics" },
    { text: "Differentiate f(x) = 3x^4 - 2x^2 + 5x - 7", label: "Derivative" },
    { text: "Find the 10th term of AP: 2, 7, 12, 17, ...", label: "Sequence" },
    { text: "Find the distance between points A(3,4) and B(7,1)", label: "Coordinate" },
    { text: "Prove that root 2 is irrational", label: "Proof" },
    { text: "Integrate (2x + 3)dx", label: "Integration" },
  ],
  physics: [
    { text: "A car travels 150 km in 2.5 hours. Find its average speed.", label: "Kinematics" },
    { text: "A 2 kg block is pushed with 10 N force. Find acceleration.", label: "Newton's Law" },
    { text: "A ball is thrown upward with velocity 20 m/s. Find max height. (g=10)", label: "Projectile" },
    { text: "Find the resistance of a circuit with 12V battery and 3A current.", label: "Ohm's Law" },
    { text: "Convex lens has focal length 20 cm. Object placed 30 cm away. Find image distance.", label: "Lens Formula" },
    { text: "4 ohm and 6 ohm resistors in series with 10V battery. Find current.", label: "Series Circuit" },
  ],
  chemistry: [
    { text: "Find the pH of 0.01 M HCl solution.", label: "pH" },
    { text: "How many moles of NaOH are in 80 g? (Na=23, O=16, H=1)", label: "Moles" },
    { text: "Balance: Fe + O2 = Fe2O3", label: "Balance" },
    { text: "Find the molarity of 4g NaOH in 500 mL solution.", label: "Molarity" },
    { text: "Write the electron configuration of Fe (Z=26)", label: "Electron Config" },
    { text: "Empirical formula of a compound with 40% C, 6.7% H, 53.3% O?", label: "Empirical" },
  ],
  biology: [
    { text: "Explain the process of photosynthesis with a balanced equation.", label: "Photosynthesis" },
    { text: "Differentiate between mitosis and meiosis.", label: "Cell Division" },
    { text: "Describe the human digestive system.", label: "Digestive System" },
    { text: "What is the function of DNA? Explain its structure.", label: "DNA" },
    { text: "Explain the nitrogen cycle in detail.", label: "Nitrogen Cycle" },
    { text: "What are the types of natural selection? Explain with examples.", label: "Evolution" },
  ],
  english: [
    { text: "Write a letter to the editor about water pollution in your city.", label: "Letter Writing" },
    { text: "Change the voice: 'She wrote a poem.'", label: "Voice Change" },
    { text: "Write an essay on 'Importance of Education'.", label: "Essay" },
    { text: "Rewrite as indirect speech: He said, 'I am going home.'", label: "Narration" },
    { text: "Transform: He is too weak to walk. (Remove 'too')", label: "Transformation" },
    { text: "Write a summary of the poem 'The Road Not Taken'.", label: "Poetry" },
  ],
  history: [
    { text: "What were the causes of the French Revolution?", label: "French Revolution" },
    { text: "Explain the significance of the Salt March.", label: "Freedom Struggle" },
    { text: "Describe the impact of British rule on Indian economy.", label: "Colonialism" },
    { text: "What were the main features of the Indian Constitution?", label: "Constitution" },
  ],
  geography: [
    { text: "Explain the factors affecting India's climate.", label: "Climate" },
    { text: "What are the types of forests in India?", label: "Forests" },
    { text: "Describe the plate tectonic theory.", label: "Plate Tectonics" },
    { text: "What is sustainable development? Explain with examples.", label: "Sustainability" },
  ],
  economics: [
    { text: "Explain the law of demand with a diagram.", label: "Demand" },
    { text: "Calculate GDP from: C=500, I=200, G=150, NX=50", label: "GDP" },
    { text: "Differentiate between revenue deficit and fiscal deficit.", label: "Deficits" },
    { text: "What are the types of unemployment? Explain.", label: "Unemployment" },
  ],
  civics: [
    { text: "What are the Fundamental Rights guaranteed by the Indian Constitution?", label: "Fundamental Rights" },
    { text: "Explain the role of the Prime Minister in the Parliamentary system.", label: "Executive" },
    { text: "What is the importance of local self-government (Panchayati Raj)?", label: "Panchayati Raj" },
  ],
  computerscience: [
    { text: "Write a Python program to check if a number is prime.", label: "Python" },
    { text: "What is the output of: print(type(3/2))?", label: "Output Type" },
    { text: "Explain the difference between SQL and NoSQL databases.", label: "Databases" },
    { text: "Write a function to calculate factorial using recursion.", label: "Recursion" },
  ],
};

// ── Rich worked examples for key subjects ──
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
      { desc: "Verification: Substitute $x = 3$ back. LHS = $3(3) + 5 = 9 + 5 = 14$ = RHS. Verified.", formula: "$3(3) + 5 = 14$" },
    ],
    altSteps: [
      { desc: "Using the Balance Method: subtract 5 from both sides.", formula: "$3x + 5 - 5 = 14 - 5$" },
      { desc: "Simplify.", formula: "$3x = 9$" },
      { desc: "Divide by 3.", formula: "$x = 9 / 3 = 3$" },
      { desc: "Verification: $3(3) + 5 = 14$ = RHS. Confirmed.", formula: "$14 = 14$" },
    ],
    similar: ["Solve 5x - 7 = 18", "Solve 2x + 3 = x + 8"],
    mistakes: ["Sign errors when moving terms across = sign", "Forgetting to divide the entire RHS"],
  }),
  physics: JSON.stringify({
    finalAnswer: "v = 19.6 m/s",
    finalFormula: "$v = u + at = 0 + (9.8)(2) = 19.6$ m/s",
    steps: [
      { desc: "Given: $u = 0$ m/s, $a = g = 9.8$ $m/s^{2}$, $t = 2$ s. Find: final velocity v.", formula: "" },
      { desc: "Using the First Equation of Motion.", formula: "$v = u + at$" },
      { desc: "Substituting: $u = 0$, $a = 9.8$ $m/s^{2}$, $t = 2$ s.", formula: "$v = 0 + (9.8)(2)$" },
      { desc: "Compute.", formula: "$v = 19.6$ m/s" },
      { desc: "Verification: $v^{2} = u^{2} + 2as$. $s = 0.5 \times 9.8 \times 4 = 19.6$ m. $v = \sqrt{2 \times 9.8 \times 19.6} = 19.6$ m/s. Matches.", formula: "$v^{2} = u^{2} + 2as$" },
    ],
    altSteps: [
      { desc: "Using Conservation of Energy: $mgh = \frac{1}{2}mv^{2}$.", formula: "$mgh = \frac{1}{2}mv^{2}$" },
      { desc: "Cancel m.", formula: "$gh = \frac{1}{2}v^{2}$" },
      { desc: "Find height: $s = 0.5 \times 9.8 \times 4 = 19.6$ m. Then $v = \sqrt{2 \times 9.8 \times 19.6}$.", formula: "$v = 19.6$ m/s" },
    ],
    similar: ["Stone dropped from 30m. Find time (g=9.8)", "Ball thrown up at 15 m/s. Find max height (g=10)"],
    mistakes: ["Using wrong value of g (9.8 vs 10)", "Forgetting to convert units", "Wrong kinematic equation"],
  }),
  chemistry: JSON.stringify({
    finalAnswer: "Molarity = 0.2 M",
    finalFormula: "$M = n / V = 0.1 / 0.5 = 0.2$ M",
    steps: [
      { desc: "Given: Mass of $NaOH$ = 4 g, Volume = 500 mL = 0.5 L. Atomic masses: $Na$=23, $O$=16, $H$=1.", formula: "" },
      { desc: "Molar mass of $NaOH$:", formula: "$M_{NaOH} = 23 + 16 + 1 = 40$ g/mol" },
      { desc: "Number of moles:", formula: "$n = 4 / 40 = 0.1$ mol" },
      { desc: "Molarity Formula: $M = n / V$.", formula: "$M = 0.1 / 0.5$" },
      { desc: "Compute.", formula: "$M = 0.2$ M" },
    ],
    altSteps: [
      { desc: "Combined formula: $M = mass / (molar\;mass \times volume)$.", formula: "$M = \frac{mass}{M_{molar} \times V}$" },
      { desc: "Substitute: mass = 4, $M_{molar} = 40$, $V = 0.5$ L.", formula: "$M = 4 / (40 \times 0.5) = 0.2$ M" },
    ],
    similar: ["Molarity of 9.8g $H_{2}SO_{4}$ in 250 mL", "Grams of $KOH$ for 200 mL of 0.5 M?"],
    mistakes: ["Forgetting mL to L conversion", "Wrong atomic masses", "Confusing molarity with molality"],
  }),
  biology: JSON.stringify({
    finalAnswer: "Photosynthesis is the process by which green plants prepare food using $CO_{2}$, $H_{2}O$, and sunlight in chlorophyll-containing cells.",
    steps: [
      { desc: "Photosynthesis is a photochemical process in the chloroplasts of green plant cells. The green pigment chlorophyll absorbs light energy.", formula: "" },
      { desc: "RAW MATERIALS: Carbon dioxide ($CO_{2}$) from air through stomata, Water ($H_{2}O$) from soil via roots, Sunlight absorbed by chlorophyll.", formula: "" },
      { desc: "Two phases: LIGHT REACTION (thylakoid membranes) — water splits, $O_{2}$ released, ATP and NADPH formed. DARK REACTION / CALVIN CYCLE (stroma) — $CO_{2}$ fixed using ATP and NADPH to form glucose.", formula: "" },
      { desc: "BALANCED EQUATION:", formula: "$6CO_{2} + 6H_{2}O \rightarrow C_{6}H_{12}O_{6} + 6O_{2}$" },
      { desc: "FACTORS: Light intensity, $CO_{2}$ concentration, Temperature, Water. Rate increases with these up to an optimum, then plateaus or declines.", formula: "" },
      { desc: "SIGNIFICANCE: Primary source of atmospheric oxygen. Base of all food chains. Maintains $CO_{2}$/$O_{2}$ balance.", formula: "" },
    ],
    altSteps: [
      { desc: "Photosynthesis = conversion of light energy into chemical energy stored in glucose.", formula: "" },
      { desc: "Overall equation: 6 molecules of $CO_{2}$ and 6 of $H_{2}O$ produce 1 glucose and 6 $O_{2}$.", formula: "$6CO_{2} + 6H_{2}O \rightarrow C_{6}H_{12}O_{6} + 6O_{2}$" },
      { desc: "Glucose is used for respiration or stored as starch. Oxygen is released as by-product through stomata.", formula: "" },
    ],
    similar: ["Explain the light reaction of photosynthesis", "Differences between photosynthesis and respiration?"],
    mistakes: ["Confusing raw materials and products", "Forgetting chlorophyll's role", "Not writing the balanced equation"],
  }),
  english: JSON.stringify({
    finalAnswer: "A poem was written by her.",
    steps: [
      { desc: "IDENTIFY: The sentence 'She wrote a poem.' is in ACTIVE VOICE — the subject (She) performs the action (wrote) on the object (a poem). Convert to PASSIVE VOICE.", formula: "" },
      { desc: "STEP 1 — Identify Subject, Verb, Object: Subject = She, Verb (past tense) = wrote, Object = a poem.", formula: "" },
      { desc: "STEP 2 — Move the Object to Subject position: 'A poem' becomes the new subject.", formula: "" },
      { desc: "STEP 3 — Change verb to passive form. Past tense uses 'was/were' + past participle. 'A poem' is singular, so use 'was'. Past participle of 'wrote' is 'written'.", formula: "" },
      { desc: "STEP 4 — Original subject 'She' becomes agent, introduced by 'by'.", formula: "" },
      { desc: "RESULT: Active: She wrote a poem. → Passive: A poem was written by her.", formula: "" },
    ],
    altSteps: [
      { desc: "QUICK RULE: Subject + Verb + Object → Object + was/were + past participle + by + Subject", formula: "" },
      { desc: "Apply: 'a poem' + 'was' + 'written' + 'by' + 'her'.", formula: "" },
    ],
    similar: ["Change to passive: 'They play cricket.'", "Change to active: 'The cake was eaten by the children.'"],
    mistakes: ["Forgetting past participle form", "Using 'by' with intransitive verbs", "Wrong was/were for subject number"],
  }),
};

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER — comprehensive, board-specific, all subjects
// ═══════════════════════════════════════════════════════════════
function buildSystemPrompt(board: string, subject: string, retryContext?: { previousAnswer: string; previousSteps: string } | null): string {
  const boardName = board === "icse" ? "ICSE" : board === "cbse" ? "CBSE" : "State Board";
  const example = EXAMPLES[subject] || EXAMPLES.mathematics;

  let retryBlock = "";
  if (retryContext) {
    retryBlock = `
═══════════════════════════════════════════════════════════════
RETRY — PREVIOUS ATTEMPT WAS WRONG
═══════════════════════════════════════════════════════════════
The student tried this question before and the previous answer was INCORRECT or UNSATISFACTORY.
- Previous answer given: "${retryContext.previousAnswer}"
- Previous steps summary: ${retryContext.previousSteps}

YOUR JOB: Figure out what went wrong. Common issues:
  - Wrong formula selected
  - Calculation error
  - Misread the question (solved for wrong variable)
  - Missing steps or incomplete solution
  - Wrong interpretation of question type (e.g., solved numerically when conceptual answer needed)
  - Sign errors, unit conversion errors, formula substitution errors

Solve the problem CORRECTLY this time. Be extra careful with:
  1. Reading the question — identify EXACTLY what is being asked
  2. Choosing the right formula/approach
  3. Every calculation step
  4. The final answer format
DO NOT repeat the same wrong answer.
`;
  }

  let boardRules = '';
  if (board === 'icse') {
    boardRules = `- ICSE BOARD STYLE (CISCE):
- Begin each step by naming the formula, concept, or rule used.
- Use formal connectors: "Given:", "To find:", "Formula:", "Substituting:", "On solving:", "Hence,".
- Include units at every step where a quantity appears.
- End numericals with a verification step.
- For descriptive subjects: Use formal academic language. Structure with clear paragraphs.
- For Literature: Reference the text, chapter, author. Use quotes where relevant.
- ICSE expects precise scientific terminology.
- For 'Differentiate between': use structured comparison with clear points.
- For 'Explain': define first, then elaborate with examples and significance.
- For 'Discuss': cover multiple perspectives, causes/effects.
- For 'Evaluate' or 'Comment': give a balanced view with judgment.
- Mark distribution: 2-mark = 2-3 sentences; 5-mark = 5-6 points with explanations.
- Use "Hence proved" for proofs. Use "Hence" before stating the final answer.`;
  } else if (board === 'cbse') {
    boardRules = `- CBSE BOARD STYLE (NCERT-based):
- Follow NCERT format: "Given:", "To find:", "Formula:", "Calculation:", "Result:".
- List all given quantities with values and SI units as the first step.
- Show unit conversions as a separate step.
- Mark each step with the formula name used.
- For Physics: write formula in general form first, then substitute.
- For Biology: use NCERT textbook language. Diagrams carry marks.
- For 'Differentiate between': use TABLE format with "Basis", "Feature A", "Feature B" columns.
- For English: follow NCERT answer length guidelines (2-mark = 30-40 words, 5-mark = 80-100 words).
- For History/Civics: use subheadings. Reference articles/amendments.
- Conclude with "Therefore, [result].".`;
  } else {
    boardRules = `- STATE BOARD STYLE:
- Follow "Given:", "Formula:", "Solution:", "Answer:" format.
- Name the formula used at each step.
- Show working with full substitution. Be direct but thorough.
- End with a clear "Answer: [value] [unit]" line.
- For descriptive answers: define, explain, give examples.
- Use textbook language and terminology.`;
  }

  return `You are SpeedSolve AI, an expert solver for Indian students (${boardName}, Grades 6-12). You handle ANY problem in ANY subject — from basic arithmetic to advanced calculus, from simple grammar to essay writing, from factual history to analytical economics.

${retryBlock}
═══════════════════════════════════════════════════════════════
CRITICAL: UNDERSTAND THE QUESTION FIRST
═══════════════════════════════════════════════════════════════
Before solving, you MUST identify:
1. QUESTION TYPE: Is this a numerical, conceptual, descriptive, proof, diagram-based, multiple-choice, fill-in-the-blank, true/false, match-the-following, differentiate, explain, discuss, evaluate, or analyze question?
2. WHAT EXACTLY IS BEING ASKED: Read the question carefully. Identify the specific quantity/concept/relationship being asked for. Do NOT solve for the wrong thing.
3. SUBJECT AREA: Which topic within the subject does this belong to?
4. GRADE LEVEL: Is this a basic (6-8), intermediate (9-10), or advanced (11-12) question?
5. COMPETENCY: What specific skill is being tested — calculation, application, analysis, evaluation, or recall?

For COMPETENCY-FOCUSED QUESTIONS (common in modern board exams):
- These test UNDERSTANDING and APPLICATION, not just memorization.
- Read the scenario/context carefully. Extract the relevant data.
- Identify which concept/principle applies to the given situation.
- Explain WHY that concept applies, then solve.
- If a real-world scenario is given, relate the answer back to the scenario.

═══════════════════════════════════════════════════════════════
SUBJECT COVERAGE — ALL SUBJECTS, GRADES 6-12
═══════════════════════════════════════════════════════════════

MATHEMATICS (Grade 6-12):
- Basic: fractions, decimals, percentages, ratio & proportion, BODMAS/PEMDAS, profit-loss-discount, SI/CI, tax
- Algebra: linear equations (1 & 2 variables), quadratic equations, polynomials, inequalities, AP/GP/HP, series, binomial theorem, matrices, determinants
- Geometry: angles, triangles, circles, quadrilaterals, coordinate geometry, straight lines, conic sections
- Trigonometry: ratios, identities, compound angles, double/triple angle, heights & distances, inverse trigonometry
- Mensuration: perimeter, area, surface area, volume of all 2D/3D shapes
- Statistics & Probability: mean, median, mode, grouped data, standard deviation, probability (all types), permutations, combinations
- Calculus: limits, continuity, differentiation, integration, differential equations, applications
- Number Systems, Sets, Relations, Functions, Proofs (induction, contradiction)

PHYSICS (Grade 6-12):
- Kinematics, Newton's Laws, Work Energy Power, Gravitation, Rotational Motion
- Properties of Matter, Thermodynamics, Waves, Optics
- Electrostatics, Current Electricity, Magnetism, EMI & AC, Modern Physics
- Units & Measurements, Dimensional Analysis, Errors

CHEMISTRY (Grade 6-12):
- Basic concepts, Atomic Structure, Periodic Table, Chemical Bonding
- Stoichiometry, States of Matter, Solutions, Thermodynamics, Equilibrium
- Redox Reactions, Chemical Kinetics, Surface Chemistry
- Organic Chemistry (IUPAC, reactions, mechanisms), Analytical Chemistry, Nuclear Chemistry

BIOLOGY (Grade 6-12):
- Cell Biology: cell structure, cell division (mitosis, meiosis), cell organelles
- Genetics: Mendel's laws, DNA structure, replication, transcription, translation, genetic disorders
- Ecology: ecosystem, food chains, food webs, biogeochemical cycles (carbon, nitrogen, water), biodiversity, conservation
- Human Physiology: digestion, respiration, circulation, excretion, nervous system, endocrine system, reproduction
- Plant Physiology: photosynthesis, respiration, transpiration, growth (auxins, gibberellins)
- Evolution: Darwin's theory, natural selection, speciation, origin of life
- Microbiology: bacteria, viruses, fungi, diseases, immunity, vaccines
- Biotechnology: recombinant DNA, PCR, genetic engineering, applications

ENGLISH (Grade 6-12):
- Grammar: tenses, voice (active/passive), narration (direct/indirect), transformation of sentences, clauses, articles, prepositions, conjunctions, subject-verb agreement, conditional sentences
- Writing: letter writing (formal/informal), essay writing, article writing, speech writing, debate, report writing, email writing, notice writing, poster making
- Literature: prose comprehension, poetry analysis, drama (acts/scenes), character analysis, theme analysis, figure of speech (simile, metaphor, personification, alliteration, etc.)
- Reading Comprehension: factual, inferential, vocabulary-based, title-based questions
- Vocabulary: synonyms, antonyms, one-word substitution, idioms, phrases, word formation (prefix/suffix)

HISTORY (Grade 6-12):
- Ancient Civilizations: Indus Valley, Mesopotamia, Egypt
- Indian History: Vedic period, Mauryan/Gupta empires, Delhi Sultanate, Mughal Empire
- Modern Indian History: British rule, Revolt of 1857, Freedom Struggle, Gandhi, Partition
- World History: French Revolution, Russian Revolution, World Wars, Cold War, decolonization
- Answer formats: causes & effects, significance, compare & contrast, timeline events

GEOGRAPHY (Grade 6-12):
- Physical Geography: earth's structure, rocks & minerals, landforms, plate tectonics, volcanoes, earthquakes
- Climate & Weather: factors affecting climate, Indian monsoon, climate zones, climate change
- Indian Geography: physiographic divisions, rivers, soils, natural vegetation, wildlife, mineral & energy resources
- Human Geography: population, migration, urbanization, transport, trade
- Map Work: locate and label on maps, read toposheets, interpret maps
- Environmental Issues: pollution, deforestation, global warming, sustainable development

ECONOMICS (Grade 6-12):
- Basic Concepts: wants, scarcity, types of economy, economic activities
- Microeconomics: demand, supply, market equilibrium, elasticity, consumer behavior, production, cost, revenue
- Macroeconomics: national income, GDP, money & banking, fiscal policy, monetary policy
- Indian Economy: planning, poverty, unemployment, inflation, economic reforms, globalization
- Statistics for Economics: measures of central tendency, dispersion, correlation, index numbers

CIVICS / POLITICAL SCIENCE (Grade 6-12):
- Indian Constitution: Preamble, Fundamental Rights, DPSPs, Fundamental Duties
- Government Structure: Parliament, Executive, Judiciary, State Government, Local Government (Panchayati Raj, Municipalities)
- Elections: Election Commission, electoral process, political parties
- Democratic Rights: civil liberties, gender equality, social justice, rights of weaker sections
- International Organizations: UN, WTO, WHO, international treaties

COMPUTER SCIENCE (Grade 6-12):
- Basics: hardware, software, number systems (binary, octal, hexadecimal), memory, I/O devices
- Programming (Python/Java): variables, data types, operators, control structures, functions, arrays/strings, OOP concepts
- Data Structures: arrays, stacks, queues, linked lists, trees
- Database Management: SQL (DDL, DML, queries, joins), DBMS concepts, normalization
- Networking: OSI model, TCP/IP, topologies, protocols, internet basics
- Boolean Logic: logic gates, truth tables, K-maps
- Society & Cyber Safety: digital citizenship, cyber crime, privacy, intellectual property

═══════════════════════════════════════════════════════════════
SYMBOL & NOTATION RECOGNITION
═══════════════════════════════════════════════════════════════
- Unicode math: \u00d7 \u00f7 \u2212 \u00b0 \u00b2 \u00b3 \u00b9 \u2080 \u221a \u222b \u2211 \u220f \u2202 \u2207 \u2248 \u2260 \u2264 \u2265 \u00b1 \u221e \u2192 \u2190 \u21d2 \u03b8 \u03b1 \u03b2 \u03b3 \u03b4 \u03bb \u03bc \u03c3 \u03c9 \u03c1 \u03c6 \u03c8 \u03b5 \u03b7 \u03c0
- Typed math: x^2, sqrt(), sin^(-1), log, ln, e^x, dy/dx, integral
- Shorthands: "find x", "solve for x", "calc", "evaluate", "simplify", "prove that", "show that", "verify"
- Mixed formats: "sin30\u00b0", "cos theta = 3/5", "v = u + at", "E=mc2", "H2SO4", "Fe2O3"
- Units: "km/h", "m per s", "kilometers per hour", "ms^-1", "centimetres"
- Greek letters: theta, alpha, beta, gamma, delta, lambda, mu, sigma, omega, phi, pi
- Chemical formulas: H2SO4, CH3COOH, Ca(OH)2, Fe2(SO4)3, [Cu(NH3)4]2+
- Logical connectors: "hence", "therefore", "given that", "if", "then", "such that", "where"

═══════════════════════════════════════════════════════════════
STEP QUALITY — THIS IS YOUR #1 PRIORITY
═══════════════════════════════════════════════════════════════
1. MORE STEPS: Break complex problems into MANY small, easy-to-follow steps. Each step does ONE thing.
2. NAME THE FORMULA/CONCEPT/RULE: Every step that uses a formula MUST name it.
   - Numerical: "Using the Quadratic Formula:", "Applying Ohm's Law:", "By the Pythagorean Theorem:"
   - Descriptive: "Definition:", "Explanation:", "Key Point:", "Example:", "Significance:"
   - Proof: "Starting with LHS:", "Applying the identity sin^2 + cos^2 = 1:", "Therefore, LHS = RHS."
3. EXPLAIN WHY: Briefly explain the reasoning at each step.
4. SHOW FULL SUBSTITUTION: Every step.formula must show actual numbers being substituted.
5. USE TABLES for: given data, comparison (differentiate between), element/mole calculations, frequency distributions.
   Format: <table><tr><th>Quantity</th><th>Value</th><th>Unit</th></tr><tr><td>Mass</td><td>$5$</td><td>kg</td></tr></table>
6. USE PROPER SUBSCRIPTS/SUPERSCRIPTS in $...$ LaTeX:
   - Chemical: $H_{2}SO_{4}$, $CaCO_{3}$, $Fe_{2}O_{3}$
   - Units: $m/s^{2}$, $cm^{3}$
   - Powers: $x^{2}$, $10^{-7}$

═══════════════════════════════════════════════════════════════
LATEX RULES — STRICT COMPLIANCE
═══════════════════════════════════════════════════════════════
7. WRAP ALL MATH in $...$ (inline) or $$...$$ (display).
8. USE \\frac{}{} for fractions, \\sqrt{} for roots, _{} for subscripts, ^{} for superscripts.
9. USE \\times for multiplication, \\pm, \\neq, \\leq, \\geq, \\approx, \\angle, \\circ, \\pi.
10. USE \\sum, \\prod, \\int, \\lim, \\infty for advanced notation.
11. NEVER use \\text{}, \\mathrm{}, \\mathbf{} — write words as plain text OUTSIDE the $ delimiters.
12. For units: "$v = 19.6$ m/s" NOT "$v = 19.6 \\text{ m/s}$".
13. Chemical formulas: $H_{2}O$, $CO_{2}$, $NaCl$, $H_{2}SO_{4}$ — always subscripts in LaTeX.
14. In JSON strings, backslashes MUST be double-escaped: \\\\frac not \\frac. This prevents JSON.parse from destroying LaTeX.

═══════════════════════════════════════════════════════════════
FINAL ANSWER
═══════════════════════════════════════════════════════════════
15. finalAnswer MUST be ONLY the result — short: "x = 3", "v = 19.6 m/s", "CH2O".
16. For descriptive/conceptual answers: finalAnswer = the concise answer statement (1-2 sentences max).
17. For chemical formulas: finalAnswer = formula string (e.g. "CH2O"). NEVER ratios like "1:2:1".
18. NEVER output intermediate work as finalAnswer.

═══════════════════════════════════════════════════════════════
ALTERNATE SOLUTION (altSteps) — MANDATORY
═══════════════════════════════════════════════════════════════
19. Include "altSteps" with 3-5 steps showing an ALTERNATIVE method.
- For numericals: use a different approach (energy vs kinematic, factorization vs formula).
- For descriptive: present a different angle or structure (e.g., chronological vs thematic).
- For proofs: start from RHS instead of LHS.
- Must arrive at the SAME final answer. NEVER leave altSteps empty.

═══════════════════════════════════════════════════════════════
SELF-VERIFICATION
═══════════════════════════════════════════════════════════════
20. ALWAYS verify your answer as the LAST step.
    - Equations: plug back, confirm LHS = RHS.
    - Physics/Chem: dimensional check or reverse calculation.
    - Descriptive: cross-check facts, dates, definitions.
    - If verification fails, CORRECT your answer before outputting.

═══════════════════════════════════════════════════════════════
BOARD-SPECIFIC STYLE (${boardName})
═══════════════════════════════════════════════════════════════
${boardRules}

═══════════════════════════════════════════════════════════════
DIFFICULTY & QUESTION TYPE HANDLING
═══════════════════════════════════════════════════════════════
21. EASY: 3-4 steps. MEDIUM: 5-8 steps. HARD: 8-15+ steps.
22. PROOFS: Show LHS and RHS separately. Name each theorem. End with "Hence proved."
23. WORD PROBLEMS: First extract and tabulate given data, then solve step by step.
24. MULTI-PART: Solve each part systematically.
25. COMPETENCY-BASED (scenario/case study): Extract data from the scenario, identify the concept, explain why it applies, then solve.
26. CONCEPTUAL ("What is...", "Why does...", "Explain..."): Provide clear, detailed explanations. Use steps to build the explanation logically.
27. DIFFERENTIATE BETWEEN: Use a structured comparison with clear points (table format in desc).
28. DIAGRAM-BASED: Describe what the diagram shows, extract data from it, then solve.
29. MULTIPLE CHOICE: Solve completely (show working), then state the correct option.
30. TRUE/FALSE: State True or False, then explain WHY with reasoning.

═══════════════════════════════════════════════════════════════
GRAPH GENERATION (when relevant)
═══════════════════════════════════════════════════════════════
31. Include a "graph" field for functions, equations, kinematics, trigonometry, statistics, coordinate geometry, AP/GP.
    GRAPH FORMAT: {"type":"function","title":"y = x^2 - 5x + 6","fn":"x*x - 5*x + 6","xMin":-1,"xMax":6,"yMin":-3,"yMax":10,"points":[{"x":2,"y":0,"label":"Root (2,0)"}]}

═══════════════════════════════════════════════════════════════
DIAGRAM PRESETS (when relevant)
═══════════════════════════════════════════════════════════════
32. Available: "free-body", "inclined-plane", "circuit-series", "circuit-parallel", "ray-mirror", "ray-lens", "projectile", "triangle", "circle-geometry", "pulley"
    Format: {"diagramPreset":"<type>","values":{...},"caption":"..."}

OUTPUT: Return ONLY this JSON, no markdown fences, no text before/after:
${example}

Now solve the student's problem comprehensively. Read the question carefully, identify exactly what is being asked, and give the correct answer on the FIRST attempt.`;
}


// ── JSON extraction ──
function escapeLatexForJSONParse(text: string): string {
  let r = text;
  r = r.replace(/(?<!\\)\\f/g, '\\\\f');
  r = r.replace(/(?<!\\)\\b/g, '\\\\b');
  r = r.replace(/(?<!\\)\\v/g, '\\\\v');
  r = r.replace(/(?<!\\)\\t(?=[a-zA-Z])/g, '\\\\t');
  r = r.replace(/(?<!\\)\\n(?=[a-zA-Z])/g, '\\\\n');
  r = r.replace(/(?<!\\)\\r(?=[a-zA-Z])/g, '\\\\r');
  return r;
}

function fixParsedLatexControlChars(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/\x0c/g, '\\')
      .replace(/\x08/g, '\\')
      .replace(/\x0b/g, '\\');
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

function sanitizeFinalAnswer(answer: string): string {
  if (!answer) return answer;
  let clean = answer.trim();
  if (clean.includes('\n')) {
    const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 120);
    if (lines.length > 0) clean = lines[lines.length - 1];
  }
  clean = clean.replace(/^[A-Za-z]+\s*(Formula)?\s*[=:]\s*/i, '');
  return clean || answer;
}

function fixFormulaAnswer(finalAnswer: string, steps: { desc: string; formula: string }[], problem: string): string {
  if (!finalAnswer) return finalAnswer;
  const lower = problem.toLowerCase();
  const isFormulaQ = /empirical\s*formula|molecular\s*formula|chemical\s*formula|formula\s*of/i.test(lower);
  if (!isFormulaQ) return finalAnswer;
  if (/^[A-Z][a-z]?\d*([A-Z][a-z]?\d*)*$/.test(finalAnswer.trim())) return finalAnswer;
  const elementMap = new Map<string, number>();
  const elementOrder: string[] = [];
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
  if (elementOrder.length === 0) {
    const elValRegex = /([A-Z][a-z]?)\s*[=:]\s*(\d+\.?\d*)/g;
    while ((match = elValRegex.exec(problem)) !== null) {
      const el = match[1]; const val = parseFloat(match[2]);
      if (val > 0 && !elementMap.has(el) && val < 200) {
        elementMap.set(el, val); elementOrder.push(el);
      }
    }
  }
  if (elementOrder.length === 0) {
    const allText = steps.map(s => s.desc + " " + s.formula).join(" ");
    const stepElRegex = /([A-Z][a-z]?)\s*[=:]\s*(\d+\.?\d*)/g;
    while ((match = stepElRegex.exec(allText)) !== null) {
      const el = match[1]; const val = parseFloat(match[2]);
      if (val > 0 && !elementMap.has(el) && val < 200) {
        elementMap.set(el, val); elementOrder.push(el);
      }
    }
  }
  if (elementOrder.length < 2) return finalAnswer;
  const ATOMIC_MASS: Record<string, number> = {
    H: 1, He: 4, Li: 7, Be: 9, B: 11, C: 12, N: 14, O: 16, F: 19, Na: 23,
    Mg: 24, Al: 27, Si: 28, P: 31, S: 32, Cl: 35.5, K: 39, Ca: 40, Fe: 56,
    Cu: 63.5, Zn: 65, Ag: 108, I: 127, Ba: 137, Pb: 207,
  };
  const maxVal = Math.max(...elementMap.values());
  const moles = elementOrder.map(el => {
    const val = elementMap.get(el)!;
    return maxVal > 10 ? val / (ATOMIC_MASS[el] || val) : val;
  });
  const minMole = Math.min(...moles.filter(v => v > 0));
  const ratios = moles.map(m => m / minMole);
  const intRatios = ratios.map(r => {
    const rounded = Math.round(r);
    return Math.abs(r - rounded) < 0.2 ? rounded : Math.round(r * 2) / 2;
  });
  let multiplier = 1;
  if (intRatios.some(r => r % 1 !== 0)) multiplier = 2;
  const finalRatios = intRatios.map(r => Math.round(r * multiplier));
  const formula = elementOrder.map((el, i) => {
    const n = finalRatios[i]; return n === 1 ? el : `${el}${n}`;
  }).join("");
  if (formula.length >= 2) return formula;
  return finalAnswer;
}

function generateSimilarQuestions(subject: string): string[] {
  const t: Record<string, string[]> = {
    mathematics: ["Try solving with different numbers", "Practice a similar problem type", "Verify using an alternative method"],
    physics: ["What if you double the mass or force?", "Try using a different formula", "How does the answer change with g=10?"],
    chemistry: ["What if the concentration was halved?", "Solve a similar stoichiometry problem", "Balance the equation and verify"],
    biology: ["Can you explain this process with a diagram?", "What are the real-life applications?", "How does this relate to human health?"],
    english: ["Try transforming the sentence in a different way", "Practice a similar grammar rule", "Write a similar letter/essay on a different topic"],
    history: ["What were the long-term effects?", "Can you compare this with a similar event?", "How did this impact other regions?"],
    geography: ["Can you explain this with a map/diagram?", "How does this vary across different regions?", "What are the current challenges?"],
    economics: ["What happens if we change the conditions?", "Can you illustrate with a real example?", "How does this relate to the Indian economy?"],
    civics: ["Can you give a recent example?", "What are the limitations of this provision?", "How does this compare with other countries?"],
    computerscience: ["Can you write this in a different way?", "What is the output if we change the input?", "Trace through the code step by step"],
  };
  return t[subject] || t.mathematics;
}

function generateCommonMistakes(subject: string): string[] {
  const t: Record<string, string[]> = {
    mathematics: ["Not following BODMAS/PEMDAS order", "Sign errors when moving terms", "Wrong formula for the problem type"],
    physics: ["Forgetting unit conversions (km/h to m/s)", "Wrong kinematic equation", "Missing units in final answer"],
    chemistry: ["Forgetting to balance the equation", "Wrong atomic masses", "Not converting mL to L for molarity"],
    biology: ["Confusing similar processes (e.g., mitosis vs meiosis)", "Missing key steps in a pathway", "Incorrect terminology"],
    english: ["Tense inconsistency", "Subject-verb agreement error", "Wrong transformation rule applied"],
    history: ["Confusing dates or events", "Missing key causes or effects", "Not structuring the answer properly"],
    geography: ["Confusing similar landforms or climate zones", "Missing data or specific examples", "Incorrect map locations"],
    economics: ["Confusing similar economic terms", "Wrong formula or calculation", "Missing real-life examples"],
    civics: ["Confusing fundamental rights with DPSPs", "Wrong article number", "Missing key provisions"],
    computerscience: ["Syntax errors in code", "Off-by-one errors", "Confusing similar concepts (e.g., stack vs queue)"],
  };
  return t[subject] || t.mathematics;
}

const SUBJECT_META: Record<string, { label: string; icon: string; color: string }> = {
  mathematics: { label: "Mathematics", icon: "\u03A3", color: "#6366f1" },
  physics: { label: "Physics", icon: "\u269B\uFE0F", color: "#ea580c" },
  chemistry: { label: "Chemistry", icon: "\u2697\uFE0F", color: "#059669" },
  biology: { label: "Biology", icon: "\uD83C\uDF31", color: "#16a34a" },
  english: { label: "English", icon: "\uD83D\uDCDD", color: "#8b5cf6" },
  history: { label: "History", icon: "\uD83D\uDCDA", color: "#b45309" },
  geography: { label: "Geography", icon: "\uD83C\uDF0D", color: "#0ea5e9" },
  economics: { label: "Economics", icon: "\uD83D\uDCB0", color: "#059669" },
  civics: { label: "Civics", icon: "\uD83C\uDFDB\uFE0F", color: "#6366f1" },
  computerscience: { label: "Computer Science", icon: "\uD83D\uDCBB", color: "#2563eb" },
};

const ALL_SUBJECTS = ["mathematics", "physics", "chemistry", "biology", "english", "history", "geography", "economics", "civics", "computerscience"];

// ── MAIN POST HANDLER ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem, subject, board, forceAI, previousAnswer, previousSteps } = body;

    if (!problem || typeof problem !== "string") {
      return NextResponse.json({ error: "Problem text is required" }, { status: 400 });
    }

    if (isPromptInjection(problem)) {
      return NextResponse.json({ error: INJECTION_MESSAGE }, { status: 403 });
    }

    // Accept any subject from the full list, default to mathematics
    const sub = ALL_SUBJECTS.includes(subject) ? subject : "mathematics";
    const brd = ["icse", "cbse", "state"].includes(board) ? board : "icse";
    const processed = preprocessProblem(problem);

    // Build retry context if previous attempt was provided
    let retryContext: { previousAnswer: string; previousSteps: string } | null = null;
    if (previousAnswer) {
      retryContext = {
        previousAnswer: previousAnswer,
        previousSteps: previousSteps || "Not available",
      };
    }

    // Step 1: Try local solver (instant) - skip if forceAI or non-STEM subject
    const stemSubjects = ["mathematics", "physics", "chemistry"];
    if (!forceAI && stemSubjects.includes(sub)) {
      const local = await tryLocalSolve(processed, sub);
      if (local) {
        if (local.similar.length === 0) local.similar = generateSimilarQuestions(sub);
        if (local.mistakes.length === 0) local.mistakes = generateCommonMistakes(sub);
        local.examTips = BOARD_TIPS[brd]?.[sub] || [];
        return NextResponse.json({ success: true, data: local, source: "local" });
      }
    }

    // Step 2: AI Solver
    const systemPrompt = buildSystemPrompt(brd, sub, retryContext);
    const boardLabel = brd === "icse" ? "ICSE" : brd === "cbse" ? "CBSE" : "State Board";
    
    let retryNote = "";
    if (retryContext) {
      retryNote = `

IMPORTANT: This is a RETRY. The previous answer was: "${retryContext.previousAnswer}"
The student was not satisfied. Please solve this CORRECTLY, being extra careful with the question interpretation and calculations.`;
    }
    
    const userPrompt = `Subject: ${sub.toUpperCase()}
Board: ${boardLabel}
Problem: ${problem}
${retryNote}
Substitute the given values into the formula and compute. Return JSON only.`;

    console.log(`[SpeedSolve] AI solving: "${processed.slice(0, 80)}..."${retryContext ? ' (RETRY)' : ''}`);
    const raw = await callAI(systemPrompt, userPrompt);

    if (!raw) {
      // Last resort: try local solver even for non-STEM
      if (stemSubjects.includes(sub)) {
        const lastLocal = await tryLocalSolve(processed, sub);
        if (lastLocal) {
          if (lastLocal.similar.length === 0) lastLocal.similar = generateSimilarQuestions(sub);
          if (lastLocal.mistakes.length === 0) lastLocal.mistakes = generateCommonMistakes(sub);
          lastLocal.examTips = BOARD_TIPS[brd]?.[sub] || [];
          return NextResponse.json({ success: true, data: lastLocal, source: "local" });
        }
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
      finalAns = sanitizeFinalAnswer(finalAns);
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
        diagram: (parsed.diagram && parsed.diagram.svg) || (parsed.diagram && parsed.diagram.diagramPreset) ? parsed.diagram : null,
      };
      return NextResponse.json({ success: true, data: solution, source: "ai" });
    }

    // JSON parse failed but we have text
    console.warn(`[SpeedSolve] JSON parse failed, building from raw text (${raw.length} chars)`);
    const textSolution = buildSolutionFromText(raw, sub, brd);
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
