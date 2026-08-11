import { BTMProblem, BTMValidationResponse, TrapType } from './types'

// ─── Parse user answer into a numeric value ─────────────────
function parseAnswer(input: string): { value: number | null; unit: string } {
  let text = input.trim().replace(/\s+/g, ' ')
  if (!text) return { value: null, unit: '' }

  // Extract unit (alphabetic characters at the end)
  let unit = ''
  const unitMatch = text.match(/\s+([a-zA-Z°%²³/]+\.?[a-zA-Z°%²³/]*)$/)
  if (unitMatch) {
    unit = unitMatch[1].trim()
    text = text.slice(0, -unitMatch[0].length).trim()
  }

  let value: number | null = null

  // Try scientific notation: 1.5e-5, 1.5E5
  const sciMatch = text.match(/^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/)
  if (sciMatch) {
    value = parseFloat(sciMatch[1]) * Math.pow(10, parseInt(sciMatch[2]))
    return { value, unit }
  }

  // Try fraction: a/b
  const fracMatch = text.match(/^([+-]?\d+)\s*\/\s*(\d+)$/)
  if (fracMatch) {
    value = parseInt(fracMatch[1]) / parseInt(fracMatch[2])
    return { value, unit }
  }

  // Try mixed number: a b/c
  const mixedMatch = text.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1])
    const num = parseInt(mixedMatch[2])
    const den = parseInt(mixedMatch[3])
    value = whole + (whole >= 0 ? num / den : -num / den)
    return { value, unit }
  }

  // Plain number
  const numMatch = text.match(/^([+-]?\d*\.?\d+)$/)
  if (numMatch) {
    value = parseFloat(numMatch[1])
    return { value, unit }
  }

  return { value: null, unit }
}

// ─── Normalize unit for comparison ─────────────────────────
function normalizeUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/m\/s/g, 'm/s')
    .replace(/ms\^-?1/g, 'm/s')
    .replace(/kgm\/s/g, 'kg·m/s')
    .replace(/kgms\^-?1/g, 'kg·m/s')
    .replace(/newton/g, 'n')
    .replace(/joule/g, 'j')
    .replace(/watt/g, 'w')
    .replace(/ampere/g, 'a')
    .replace(/metre/g, 'm')
    .replace(/meter/g, 'm')
    .replace(/seconds?/g, 's')
    .replace(/minutes?/g, 'min')
    .replace(/hours?/g, 'h')
    .replace(/kelvin/g, 'k')
    .replace(/litres?/g, 'l')
    .replace(/grams?/g, 'g')
    .replace(/kilograms?/g, 'kg')
    .replace(/cm2?/g, 'cm²')
    .replace(/m2?/g, 'm²')
    .replace(/cm3?/g, 'cm³')
    .replace(/m3?/g, 'm³')
}

function unitsMatch(a: string, b: string): boolean {
  if (!a && !b) return true
  if (!a || !b) return true // don't fail on missing unit
  return normalizeUnit(a) === normalizeUnit(b)
}

// ─── Tolerance based on answer magnitude ───────────────────
function getTolerance(correct: number): number {
  const abs = Math.abs(correct)
  if (abs === 0) return 0.01
  if (abs < 0.01) return 0.001
  if (abs < 1) return 0.01
  if (abs < 100) return 0.05
  return 0.5
}

// ─── Trap explanation generator ─────────────────────────────
function getTrapExplanation(trapType: TrapType, problem: BTMProblem): string {
  if (!trapType) return ''
  switch (trapType) {
    case 'unit_trap':
      return 'The problem used mixed units (e.g. km/h and minutes). You need to convert all quantities to consistent units before calculating.'
    case 'hidden_wording':
      return `The question asked for a different quantity than what the numbers directly suggest. Read the question carefully — it asks for "${problem.question.toLowerCase().includes('remain') ? 'what remains' : problem.question.toLowerCase().includes('left') ? 'what is left' : 'the actual target quantity'}" not the intermediate value.`
    case 'formula_trap':
      return 'The obvious formula is not the correct one for this problem. Consider what the question is actually asking for.'
    case 'sign_trap':
      return 'The problem involves deceleration or a direction change. Watch your signs — velocity decreases when decelerating.'
    case 'average_trap':
      return 'Average speed is NOT the arithmetic mean of the two speeds. It is total distance divided by total time.'
    case 'irrelevant_info':
      return 'Some numbers in the problem were irrelevant distractors. Identify what is actually needed before calculating.'
    default:
      return ''
  }
}

// ─── Mistake explanation ─────────────────────────────────────
function guessMistake(userAns: number, correctAns: number, problem: BTMProblem): string {
  const ratio = correctAns !== 0 ? userAns / correctAns : 0
  const diff = Math.abs(userAns - correctAns)
  const pctDiff = correctAns !== 0 ? (diff / Math.abs(correctAns)) * 100 : 0

  // Common mistake patterns
  if (Math.abs(ratio - 10) < 0.05 || Math.abs(ratio - 0.1) < 0.05) {
    return 'Check your unit conversion — you may be off by a factor of 10.'
  }
  if (Math.abs(ratio - 100) < 0.05) {
    return 'You may have forgotten to divide by 100 (percentage conversion).'
  }
  if (Math.abs(ratio - 2) < 0.05) {
    return 'You may have forgotten a factor of ½ (e.g. in KE = ½mv² or area formulas).'
  }
  if (Math.abs(ratio - 0.5) < 0.05) {
    return 'You may have included an extra factor of ½.'
  }
  if (Math.abs(ratio + 1) < 0.05) {
    return 'Check your sign convention — your answer has the opposite sign.'
  }
  if (pctDiff < 5) {
    return 'Very close! You likely made a small rounding error.'
  }
  if (pctDiff < 15) {
    return 'You are in the right ballpark but made a calculation error in one of the steps.'
  }

  // Concept-specific hints
  const concept = problem.concept.toLowerCase()
  if (concept.includes('quadratic') && pctDiff > 50) {
    return 'Double-check your quadratic formula application — verify the discriminant calculation.'
  }
  if (concept.includes('momentum') && pctDiff > 30) {
    return 'Remember: momentum is conserved, not velocity. Use m₁v₁ + m₂v₂ = (m₁+m₂)vₓ.'
  }
  if (concept.includes('pythagor')) {
    return 'Remember: c = √(a² + b²). Make sure you are squaring before adding.'
  }
  if (concept.includes('compound interest')) {
    return 'For compound interest, use A = P(1 + r/100)^t. For simple interest, use SI = PRT/100.'
  }

  return 'Review the solution steps carefully and identify where the calculation diverged.'
}

// ─── Main validation ─────────────────────────────────────────
export function validateAnswer(
  userInput: string,
  problem: BTMProblem,
): BTMValidationResponse {
  const parsed = parseAnswer(userInput)

  if (parsed.value === null) {
    return {
      correct: false,
      userAnswer: null,
      correctAnswer: problem.correctAnswer,
      tolerance: getTolerance(problem.correctAnswer),
      unitMatch: true,
      trapDetected: false,
      mistakeExplanation: 'Could not parse your answer as a number. Enter a numeric value.',
    }
  }

  const tolerance = getTolerance(problem.correctAnswer)
  const isCorrect = Math.abs(parsed.value - problem.correctAnswer) <= tolerance
  const unitOk = unitsMatch(parsed.unit, problem.unit)
  const fullCorrect = isCorrect && unitOk

  // Check if trap was triggered
  let trapDetected = false
  let trapExplanation: string | undefined
  if (problem.trapType && !isCorrect) {
    // Check if user made the "expected trap mistake"
    // For unit traps, see if answer matches unconverted calculation
    // For other traps, just flag it
    trapDetected = true
    trapExplanation = getTrapExplanation(problem.trapType, problem)
  }

  return {
    correct: fullCorrect,
    userAnswer: parsed.value,
    correctAnswer: problem.correctAnswer,
    tolerance,
    unitMatch: unitOk,
    trapDetected,
    trapExplanation,
    mistakeExplanation: !isCorrect ? guessMistake(parsed.value, problem.correctAnswer, problem) : undefined,
  }
}
