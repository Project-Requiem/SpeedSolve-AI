import { KeystrokeData, VerificationChallenge, BTMProblem } from './types'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANTI-CHEAT ENGINE
// Prevents students from using other AIs to bypass levels
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Keystroke Dynamics ─────────────────────────────────────
// Track typing patterns to detect copy-paste and AI-assisted input

export function createKeystrokeTracker(): {
  record: (char: string) => void
  markPaste: () => void
  getData: () => KeystrokeData
  reset: () => void
} {
  let timestamps: number[] = []
  let chars: string[] = []
  let startTime: number | null = null
  let isPaste = false

  return {
    record: (char: string) => {
      const now = performance.now()
      if (!startTime) startTime = now
      timestamps.push(now - startTime)
      chars.push(char)
    },
    markPaste: () => { isPaste = true },
    getData: () => {
      const totalDuration = timestamps.length > 1
        ? timestamps[timestamps.length - 1] - timestamps[0]
        : 0

      const analysis = analyzeKeystrokes(timestamps, chars, isPaste)

      return {
        timestamps,
        chars,
        totalDuration,
        isPaste,
        isSuspicious: analysis.suspicious,
        suspiciousReason: analysis.reason,
      }
    },
    reset: () => {
      timestamps = []
      chars = []
      startTime = null
      isPaste = false
    },
  }
}

function analyzeKeystrokes(
  timestamps: number[],
  chars: string[],
  isPaste: boolean,
): { suspicious: boolean; reason?: string } {
  if (isPaste) {
    return { suspicious: true, reason: 'PASTE_DETECTED' }
  }

  if (chars.length < 2) {
    return { suspicious: false }
  }

  // Check for abnormally fast typing (bot-like)
  const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i])
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

  // Humans type at ~50-150ms per character on average
  if (avgInterval < 30 && chars.length > 3) {
    return { suspicious: true, reason: 'TOO_FAST' }
  }

  // Check for uniform intervals (bot characteristic)
  const stdDev = Math.sqrt(
    intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
  )
  if (stdDev < 5 && chars.length > 5 && avgInterval < 100) {
    return { suspicious: true, reason: 'UNIFORM_TIMING' }
  }

  // Check for very large gap followed by instant answer (likely switched to another AI)
  const maxGap = Math.max(...intervals)
  if (maxGap > 10000 && avgInterval < 80) {
    return { suspicious: true, reason: 'SUSPICIOUS_PAUSE' }
  }

  // Check if all chars appeared at once (instant input)
  if (totalDuration(timestamps) < 50 && chars.length > 2) {
    return { suspicious: true, reason: 'INSTANT_INPUT' }
  }

  return { suspicious: false }
}

function totalDuration(timestamps: number[]): number {
  if (timestamps.length < 2) return 0
  return timestamps[timestamps.length - 1] - timestamps[0]
}

// ── Answer Timing Analysis ────────────────────────────────
// Detect if the time taken is suspicious for the difficulty

export function analyzeAnswerTiming(
  difficulty: string,
  timeMs: number,
  aiTimeMs: number,
  correct: boolean,
): { suspicious: boolean; reason?: string } {
  // If user is MUCH faster than AI on hard problems, suspicious
  const ratio = timeMs / aiTimeMs

  if (difficulty === 'nightmare' || difficulty === 'requiem') {
    // On nightmare/requiem, beating AI by >80% is very suspicious
    if (correct && ratio < 0.2) {
      return { suspicious: true, reason: 'IMPLAUSIBLE_SPEED' }
    }
    // Even getting it right in <2s on nightmare is suspicious
    if (correct && timeMs < 2000) {
      return { suspicious: true, reason: 'IMPLAUSIBLE_SPEED' }
    }
  }

  if (difficulty === 'expert') {
    if (correct && ratio < 0.15) {
      return { suspicious: true, reason: 'IMPLAUSIBLE_SPEED' }
    }
  }

  return { suspicious: false }
}

// ── Solution Verification ─────────────────────────────────
// After answering correctly, ask HOW they got the answer
// Students who used AI won't know the method

export function generateVerificationChallenge(problem: BTMProblem): VerificationChallenge {
  const concept = problem.concept
  const correctAnswer = problem.correctAnswer

  // Generate a "show your work" challenge based on the concept
  const challenges = getConceptChallenges(concept, correctAnswer)
  const challenge = challenges[Math.floor(Math.random() * challenges.length)]

  return {
    id: Math.random().toString(36).slice(2, 8),
    ...challenge,
    concept,
  }
}

function getConceptChallenges(concept: string, answer: number): Omit<VerificationChallenge, 'id' | 'concept'>[] {
  // Default challenges that test understanding
  const wrongStep1 = Math.round(answer * 1.5 * 100) / 100
  const wrongStep2 = Math.round(answer * 0.7 * 100) / 100
  const wrongStep3 = Math.round((answer + 1) * 100) / 100

  const conceptLC = concept.toLowerCase()

  // Concept-specific verification
  if (conceptLC.includes('pythagor')) {
    return [{
      question: 'Which formula did you use?',
      options: ['c = √(a² + b²)', 'c = a + b', 'c = a² + b²', 'c = 2ab'],
      correctIndex: 0,
    }]
  }

  if (conceptLC.includes('quadratic')) {
    return [{
      question: 'Which method solves ax² + bx + c = 0?',
      options: ['Quadratic formula: x = (-b ± √(b²-4ac)) / 2a', 'x = -b / a', 'x = c / a', 'x = b² - 4ac'],
      correctIndex: 0,
    }]
  }

  if (conceptLC.includes('momentum')) {
    return [{
      question: 'What is conserved in a collision?',
      options: ['Total momentum', 'Individual velocities', 'Kinetic energy only', 'Mass only'],
      correctIndex: 0,
    }]
  }

  if (conceptLC.includes('average') || conceptLC.includes('speed')) {
    return [{
      question: 'How do you calculate average speed?',
      options: ['Total distance / Total time', '(Speed1 + Speed2) / 2', 'Max speed / 2', 'Distance × Time'],
      correctIndex: 0,
    }]
  }

  if (conceptLC.includes('interest')) {
    return [{
      question: 'What formula gives compound interest amount?',
      options: ['A = P(1 + r/100)^t', 'A = P + PRT/100', 'A = P × r × t', 'A = P / (1 + r)^t'],
      correctIndex: 0,
    }]
  }

  if (conceptLC.includes('ohm') || conceptLC.includes('resistance')) {
    return [{
      question: "What is Ohm's Law?",
      options: ['V = IR', 'V = I/R', 'V = I + R', 'V = I²R'],
      correctIndex: 0,
    }]
  }

  if (conceptLC.includes('ph') || conceptLC.includes('acid')) {
    return [{
      question: 'How is pH calculated?',
      options: ['pH = -log[H⁺]', 'pH = log[H⁺]', 'pH = [H⁺] × 10', 'pH = 14 / [H⁺]'],
      correctIndex: 0,
    }]
  }

  // Generic "which step comes first" challenge
  return [{
    question: `Which intermediate value appears in the solution?`,
    options: [
      `${answer} (the final answer)`,
      `${wrongStep1}`,
      `${wrongStep2}`,
      `${wrongStep3}`,
    ],
    correctIndex: 0,
  }]
}

// ── Should Trigger Verification ───────────────────────────
// Not every answer needs verification - random chance + suspicious signals

export function shouldTriggerVerification(
  keystrokeData: KeystrokeData | null,
  correct: boolean,
  difficulty: string,
  recentWinRate: number,
): boolean {
  // Always verify if paste detected
  if (keystrokeData?.isPaste) return true

  // Always verify if keystrokes are suspicious
  if (keystrokeData?.isSuspicious) return true

  // Random 20% chance on correct answers (keeps students honest)
  if (correct && Math.random() < 0.20) return true

  // Higher chance on hard difficulties
  if (correct && (difficulty === 'nightmare' || difficulty === 'requiem') && Math.random() < 0.35) return true

  // If win rate is suspiciously high (>90% with 20+ attempts)
  if (correct && recentWinRate > 0.9 && Math.random() < 0.4) return true

  return false
}

// ── Suspicious Answer Penalty ──────────────────────────────
// What happens when cheating is detected

export function getCheatingPenalty(reason?: string): { xpPenalty: number; message: string } {
  switch (reason) {
    case 'PASTE_DETECTED':
      return { xpPenalty: -100, message: 'Answer pasted — type your answer manually!' }
    case 'TOO_FAST':
      return { xpPenalty: -50, message: 'Typing too fast — are you using a bot?' }
    case 'INSTANT_INPUT':
      return { xpPenalty: -75, message: 'Answer appeared instantly — type it yourself!' }
    case 'IMPLAUSIBLE_SPEED':
      return { xpPenalty: -150, message: 'Impossible solve time for this difficulty — solution verification required.' }
    case 'SUSPICIOUS_PAUSE':
      return { xpPenalty: 0, message: 'Suspicious timing pattern detected — verification required.' }
    default:
      return { xpPenalty: 0, message: 'Verification required.' }
  }
}
