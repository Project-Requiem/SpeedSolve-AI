// Adapter to use the existing local solver from BTM API route
import { tryLocalSolve } from '../solve/local-solver'

export interface LocalSolveResult {
  finalAnswer: string
  steps: { desc: string; formula: string }[]
}

export async function solveLocal(problem: string, subject: string): Promise<LocalSolveResult | null> {
  try {
    const result = await tryLocalSolve(problem, subject)
    if (result && result.finalAnswer) {
      const ans = result.finalAnswer
      // Skip if answer looks like an error/refusal
      if (ans.includes('cannot') || ans.includes('unable') || ans.includes('provide more') || ans.includes('please provide')) return null
      return {
        finalAnswer: ans.replace(/[=\s]/g, '').replace(/\$([^$]+)\$/g, '$1'),
        steps: (result.steps || []).map(s => ({ desc: s.desc, formula: s.formula })),
      }
    }
    return null
  } catch {
    return null
  }
}
