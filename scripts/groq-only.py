path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# Remove Gemini import and init
content = content.replace('import { GoogleGenAI } from "@google/genai";', '')
content = content.replace('''const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

''', '')

# Remove all 3 provider functions + callAI, replace with single Groq function
old_all = '''// ── AI Provider 1: Google Gemini ──
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
}'''

new_all = '''// ── AI Provider: Groq (single model, fast) ──
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("[SpeedSolve] GROQ_API_KEY not set!");
    return "";
  }
  const model = "llama-3.3-70b-versatile";
  try {
    console.log(`[SpeedSolve] Calling Groq ${model}...`);
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
      const errText = await res.text().catch(() => '');
      console.error(`[SpeedSolve] Groq ${model} error: ${res.status} ${errText.slice(0, 200)}`);
      return "";
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    console.log(`[SpeedSolve] Groq response: ${text.length} chars`);
    return text;
  } catch (err: any) {
    console.error(`[SpeedSolve] Groq error: ${err?.message?.slice(0, 200)}`);
    return "";
  }
}'''

if old_all in content:
    content = content.replace(old_all, new_all)
    print('Replaced all 3 providers with single Groq call')
else:
    print('ERROR: Could not find the old provider block')
    exit(1)

with open(path, 'w') as f:
    f.write(content)

print('Done!')
