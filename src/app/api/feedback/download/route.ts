import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'user_responses.json')

// GET /api/feedback/download — returns all feedback as a downloadable JSON file
export async function GET() {
  try {
    let data: unknown[] = []
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8')
      data = JSON.parse(raw)
    } catch {
      // File doesn't exist yet — return empty array
    }

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="speedsolve-feedbacks.json"',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to read feedback data.' },
      { status: 500 }
    )
  }
}