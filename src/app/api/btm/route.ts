import { NextRequest, NextResponse } from 'next/server'
import { generateProblem, generateDailyChallenge, getDifficultyLabel, getDifficultyEmoji } from '@/lib/btm/problem-generator'
import { validateAnswer } from '@/lib/btm/answer-validator'
import { BTMDifficulty, BTMSubject } from '@/lib/btm/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action as string

    if (action === 'generate') {
      return handleGenerate(body)
    } else if (action === 'daily') {
      return handleDaily()
    } else if (action === 'validate') {
      return handleValidate(body)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[BTM] Error:', err)
    return NextResponse.json({ error: 'The machine malfunctioned.' }, { status: 500 })
  }
}

// ─── Generate a challenge ─────────────────────────────────────
async function handleGenerate(body: Record<string, unknown>) {
  const subject = body.subject as BTMSubject | undefined
  const difficulty = body.difficulty as BTMDifficulty | undefined
  const forceTrap = body.forceTrap as boolean | undefined

  const problem = generateProblem(subject, difficulty, forceTrap)
  const benchmark = await createBenchmark(problem, difficulty)

  return NextResponse.json({
    problem,
    benchmark,
    difficultyLabel: getDifficultyLabel(problem.difficulty),
    difficultyEmoji: getDifficultyEmoji(problem.difficulty),
  })
}

// ─── Daily challenge ─────────────────────────────────────────
async function handleDaily() {
  const problem = generateDailyChallenge()
  const benchmark = await createBenchmark(problem, 'scholar')
  return NextResponse.json({
    problem,
    benchmark,
    difficultyLabel: 'DAILY MACHINE',
    difficultyEmoji: '🌍',
  })
}

// ─── Validate answer ─────────────────────────────────────────
function handleValidate(body: Record<string, unknown>) {
  const { userAnswer, problem } = body as {
    userAnswer: string
    problem: { correctAnswer: number; unit: string; question: string; concept: string; trapType: string | null }
  }
  const validation = validateAnswer(userAnswer, problem as any)
  return NextResponse.json(validation)
}

// ─── Create AI benchmark ─────────────────────────────────────
async function createBenchmark(
  problem: ReturnType<typeof generateProblem>,
  difficulty?: BTMDifficulty,
) {
  // Dynamically import the local solver
  let aiCorrect = false
  let aiAnswer = ''
  let solution = problem.solution

  try {
    const { solveLocal } = await import('./local-solver-adapter')
    const start = performance.now()
    const result = solveLocal(problem.question, problem.subject)
    const elapsed = performance.now() - start

    if (result) {
      aiAnswer = result.finalAnswer
      const parsed = parseSolverAnswer(result.finalAnswer)
      if (parsed !== null) {
        const tolerance = Math.max(0.05, Math.abs(problem.correctAnswer) * 0.02)
        aiCorrect = Math.abs(parsed - problem.correctAnswer) <= tolerance
      }
      if (result.steps?.length > 0) {
        solution = result.steps.map((s: { desc: string; formula: string }) => `${s.desc}: ${s.formula}`).join('\n')
      }
    }

    // ── Human-realistic AI benchmark ──
    // Simulates: reading the question + solving mentally + typing the answer
    // so average students feel they CAN beat it with practice.

    const questionLen = problem.question.length
    const answerStr = String(Math.abs(problem.correctAnswer))
    const answerDigits = answerStr.replace(/[^0-9]/g, '').length
    const hasDecimal = answerStr.includes('.')

    // Reading time: longer questions take more time to parse
    const readTime = 2000 + questionLen * 18 + problem.steps * 400

    // Solving time: based on complexity, number of steps, and difficulty
    const solveBase: Record<string, [number, number]> = {
      rookie:     [3000, 5000],   // 3-5s mental math
      scholar:    [7000, 13000],  // 7-13s multi-step
      expert:     [14000, 24000], // 14-24s complex reasoning
      nightmare:  [22000, 38000], // 22-38s olympiad-style
      requiem:    [30000, 50000], // 30-50s very hard but doable
    }
    const [solveMin, solveMax] = solveBase[difficulty || 'scholar'] || solveBase.scholar
    // Scale solve time by complexity within the range
    const solveTime = solveMin + problem.complexity * (solveMax - solveMin) + problem.steps * 800

    // Typing time: based on answer length
    const typeTime = 1200 + answerDigits * 250 + (hasDecimal ? 400 : 0)

    // Total with small random variance (±8%) so it's not identical each time
    const variance = 0.92 + Math.random() * 0.16
    const aiTimeMs = (readTime + solveTime + typeTime) * variance

    // Hard caps: min 6s (rookie), max 75s (requiem)
    const capped = Math.min(75000, Math.max(6000, aiTimeMs))

    return { aiTimeMs: parseFloat(capped.toFixed(0)), aiAnswer, aiCorrect, solution }
  } catch {
    // Fallback: use human-realistic estimate
    const readTime = 2000 + problem.question.length * 18 + problem.steps * 400
    const solveTime = 7000 + problem.complexity * 10000 + problem.steps * 800
    const typeTime = 1200 + 600
    const aiTimeMs = Math.min(75000, Math.max(6000, (readTime + solveTime + typeTime) * (0.92 + Math.random() * 0.16)))
    return { aiTimeMs: parseFloat(aiTimeMs.toFixed(0)), aiAnswer: String(problem.correctAnswer), aiCorrect: true, solution }
  }
}

function parseSolverAnswer(answer: string): number | null {
  if (!answer) return null
  const cleaned = answer.replace(/[^0-9.\-eE+]/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const val = parseFloat(parts[0])
  return isNaN(val) ? null : val
}