import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { isPromptInjection, INJECTION_MESSAGE } from '@/lib/injection-guard'

const DATA_FILE = path.join(process.cwd(), 'data', 'user_responses.json')

interface FeedbackEntry {
  id: string
  name: string
  message: string
  subject: string
  board: string
  grade: string
  ip: string
  userAgent: string
  timestamp: string
}

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

function extractIPv4(raw: string): string {
  if (!raw || raw === 'unknown' || raw === '::1' || raw === '::ffff:127.0.0.1') {
    return raw === '::ffff:127.0.0.1' ? '127.0.0.1' : (raw || 'unknown')
  }
  // Handle IPv6-mapped IPv4 like ::ffff:192.168.1.1
  const mapped = raw.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
  if (mapped) return mapped[1]
  // Direct IPv4
  if (IPV4_REGEX.test(raw)) return raw
  // If it's a comma-separated list (x-forwarded-for), pick the first IPv4
  const parts = raw.split(',').map(s => s.trim())
  for (const part of parts) {
    const m = part.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
    if (m) return m[1]
    if (IPV4_REGEX.test(part)) return part
  }
  return raw
}

function getClientIp(request: NextRequest): string {
  // Priority: proxy headers → request.ip (Node.js) → fallback
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return extractIPv4(forwarded)

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return extractIPv4(realIp)

  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return extractIPv4(cfIp)

  // Next.js / Node.js built-in (works in production behind a proxy)
  // @ts-expect-error -- request.ip is added by Node/Connect in some setups
  if (request.ip) return extractIPv4(request.ip)

  return 'unknown'
}

async function readData(): Promise<FeedbackEntry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeData(data: FeedbackEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, message, subject, board, grade, clientIp } = body

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name and message are required.' }, { status: 400 })
    }

    // Prompt injection check on both name and message fields
    if (isPromptInjection(name) || isPromptInjection(message)) {
      return NextResponse.json({ error: INJECTION_MESSAGE }, { status: 403 })
    }

    // Prefer client-sent IP (from ipify), fall back to server headers
    const ip = (clientIp && IPV4_REGEX.test(clientIp)) ? clientIp : getClientIp(request)
    const ua = request.headers.get('user-agent') || ''

    const entry: FeedbackEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      message: message.trim(),
      subject: subject || 'not specified',
      board: board || 'not specified',
      grade: grade || 'not specified',
      ip,
      userAgent: ua,
      timestamp: new Date().toISOString(),
    }

    const data = await readData()
    data.push(entry)
    await writeData(data)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const data = await readData()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to read data.' }, { status: 500 })
  }
}