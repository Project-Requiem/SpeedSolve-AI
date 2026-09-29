import { NextResponse } from 'next/server';

export async function GET() {
  // Collect up to 5 Groq keys, filter empty ones
  const groqKeys = [
    process.env.GROQ_KEY_1 || '',
    process.env.GROQ_KEY_2 || '',
    process.env.GROQ_KEY_3 || '',
    process.env.GROQ_KEY_4 || '',
    process.env.GROQ_KEY_5 || '',
  ].filter(k => k.length > 10);

  // Include primary Groq key if available
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10) {
    if (!groqKeys.includes(process.env.GROQ_API_KEY)) {
      groqKeys.unshift(process.env.GROQ_API_KEY);
    }
  }

  return NextResponse.json({
    groqKeys,
    // Expose which alternative providers have keys configured
    providers: {
      groq: groqKeys.length > 0,
      cerebras: !!(process.env.CEREBRAS_API_KEY),
      openrouter: !!(process.env.OPENROUTER_API_KEY),
      together: !!(process.env.TOGETHER_API_KEY),
      gemini: !!(process.env.GEMINI_API_KEY),
    },
    // Expose alternative provider keys for browser-side calls
    cerebrasKey: process.env.CEREBRAS_API_KEY || '',
    openrouterKey: process.env.OPENROUTER_API_KEY || '',
    togetherKey: process.env.TOGETHER_API_KEY || '',
  });
}
