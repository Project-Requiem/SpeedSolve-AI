import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.GROQ_API_KEY || '';
  return NextResponse.json({ groqKey: key });
}
