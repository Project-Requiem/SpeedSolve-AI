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

    // Benchmark: scale based on complexity and steps
    const diffScale: Record<string, number> = {
      rookie: 1.3, scholar: 1.1, expert: 1.0, nightmare: 0.9, requiem: 0.85,
    }
    const mult = diffScale[difficulty || 'scholar'] || 1.0
    const aiTimeMs = Math.min(12000, Math.max(2000,
      problem.complexity * 7000 + problem.steps * 500 + 1500
    ) * mult)

    return { aiTimeMs: parseFloat(aiTimeMs.toFixed(0)), aiAnswer, aiCorrect, solution }
  } catch {
    const aiTimeMs = Math.min(12000, Math.max(2000,
      problem.complexity * 7000 + problem.steps * 500 + 2000
    ))
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