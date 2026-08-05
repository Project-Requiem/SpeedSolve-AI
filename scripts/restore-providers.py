path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# Find the exact block to replace (from line 1 to '// ── Board tips')
start_marker = 'import { NextRequest, NextResponse } from "next/server";'
end_marker = '// ── Board tips ──'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f'ERROR: start={start_idx}, end={end_idx}')
    exit(1)

new_block = '''import { NextRequest, NextResponse } from "next/server";
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

// ── Board tips ──'''

content = content[:start_idx] + new_block + content[end_idx:]

with open(path, 'w') as f:
    f.write(content)

print('Restored original 3-provider setup!')
