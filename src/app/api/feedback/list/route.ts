import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'user_responses.json')

// GET /api/feedback/list — returns feedback count and recent entries
export async function GET() {
  try {
    let data: unknown[] = []
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8')
      data = JSON.parse(raw)
    } catch {
      // No data yet
    }

    return NextResponse.json({
      total: data.length,
      recent: data.slice(-20).reverse(),
      downloadUrl: '/api/feedback/download',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to read feedback data.' },
      { status: 500 }
    )
  }
}