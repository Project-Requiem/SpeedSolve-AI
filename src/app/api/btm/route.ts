import { NextRequest, NextResponse } from 'next/server'
import { generateProblem, generateDailyChallenge, getDifficultyLabel, getDifficultyEmoji } from '@/lib/btm/problem-generator'
import { validateAnswer } from '@/lib/btm/answer-validator'
import { BTMDifficulty, BTMSubject } from '@/lib/btm/types'
import { solveBTMQuestion } from './btm-solver'

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
  const attemptCount = (body.attemptCount as number) || 0

  const problem = generateProblem(subject, difficulty, forceTrap, attemptCount)
  const benchmark = createBenchmark(problem, difficulty)

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
  const benchmark = createBenchmark(problem, 'scholar')
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
function createBenchmark(
  problem: ReturnType<typeof generateProblem>,
  difficulty?: BTMDifficulty,
) {
  // Use BTM-specific solver that knows all question templates
  let aiCorrect = false
  let aiAnswer = ''
  let solution = problem.solution

  try {
    const result = solveBTMQuestion(problem.question, problem.correctAnswer)
    aiCorrect = result.aiCorrect
    aiAnswer = result.finalAnswer
    if (result.steps?.length > 0) {
      solution = result.steps.map((s) => `${s.desc}: ${s.formula}`).join('\n')
    }
  } catch {
    // Fallback: machine always knows the answer
    aiCorrect = true
    aiAnswer = String(problem.correctAnswer)
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
    rookie:     [5000, 12000],  // 5-12s — very generous, kids can win easily
    scholar:    [12000, 22000], // 12-22s — comfortable for students
    expert:     [20000, 35000], // 20-35s — challenging but doable
    nightmare:  [30000, 50000], // 30-50s — hard but solvable
    requiem:    [40000, 65000], // 40-65s — very hard but possible
  }
  const [solveMin, solveMax] = solveBase[difficulty || 'scholar'] || solveBase.scholar
  // Scale solve time by complexity within the range
  const solveTime = solveMin + problem.complexity * (solveMax - solveMin) + problem.steps * 400

  // Typing time: based on answer length
  const typeTime = 1200 + answerDigits * 250 + (hasDecimal ? 400 : 0)

  // Total with small random variance (±8%) so it's not identical each time
  const variance = 0.92 + Math.random() * 0.16
  const aiTimeMs = (readTime + solveTime + typeTime) * variance

  // Hard caps: min 6s (rookie), max 75s (requiem)
  const capped = Math.min(75000, Math.max(6000, aiTimeMs))

  return { aiTimeMs: parseFloat(capped.toFixed(0)), aiAnswer, aiCorrect, solution }
}