import { NextResponse } from 'next/server';

export async function GET() {
  // Collect up to 5 Groq keys, filter empty ones
  const keys = [
    process.env.GROQ_KEY_1 || '',
    process.env.GROQ_KEY_2 || '',
    process.env.GROQ_KEY_3 || '',
    process.env.GROQ_KEY_4 || '',
    process.env.GROQ_KEY_5 || '',
  ].filter(k => k.length > 10);
  return NextResponse.json({ groqKeys: keys });
}
