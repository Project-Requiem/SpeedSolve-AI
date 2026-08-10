'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  BTMProblem, BTMDifficulty, BTMSubject, BTMBenchmark, BTMValidationResponse,
  BTMStats, BTMHistoryEntry, DIFFICULTY_XP, getLevelFromXP, getXPForNextLevel,
} from '@/lib/btm/types'
import { loadStats, saveStats, addHistoryEntry, getSubjectStats, getDifficultyStats } from '@/lib/btm/storage'

// ─── Types ──────────────────────────────────────────────────
type Screen = 'home' | 'intro' | 'difficulty' | 'loading' | 'challenge' | 'result' | 'wrong' | 'stats'
type ChallengeType = 'normal' | 'daily'

// ─── Difficulty Config ──────────────────────────────────────
const DIFFICULTIES: { key: BTMDifficulty; emoji: string; label: string; desc: string; color: string; minLevel: number }[] = [
  { key: 'rookie',    emoji: '🟢', label: 'ROOKIE',    desc: 'Basic calculations',          color: '#22c55e', minLevel: 1 },
  { key: 'scholar',   emoji: '🔵', label: 'SCHOLAR',   desc: 'Multi-step problems',         color: '#3b82f6', minLevel: 1 },
  { key: 'expert',    emoji: '🟣', label: 'EXPERT',    desc: 'Complex reasoning',           color: '#8b5cf6', minLevel: 2 },
  { key: 'nightmare', emoji: '🔴', label: 'NIGHTMARE', desc: 'Olympiad-style challenges',     color: '#ef4444', minLevel: 4 },
  { key: 'requiem',   emoji: '⚫', label: 'REQUIEM',   desc: 'The machine has stopped holding back.', color: '#f5f5f5', minLevel: 7 },
]

const SUBJECTS: { key: BTMSubject; label: string; emoji: string }[] = [
  { key: 'mathematics', label: 'Mathematics', emoji: '📐' },
  { key: 'physics',     label: 'Physics',     emoji: '⚡' },
  { key: 'chemistry',   label: 'Chemistry',   emoji: '🧪' },
]

// ─── Confetti Component ─────────────────────────────────────
function Confetti() {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; color: string; delay: number; dur: number; size: number }>>([])
  useEffect(() => {
    const colors = ['#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb923c', '#fbbf24', '#34d399']
    setPieces(Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 0.5,
      dur: 1.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 6,
    })))
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: '-10px', left: `${p.x}%`,
          width: p.size, height: p.size,
          background: p.color, borderRadius: '2px',
          animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────
export default function BeatTheMachine({ onExit }: { onExit?: () => void }) {
  // Screen state
  const [screen, setScreen] = useState<Screen>('home')
  const [challengeType, setChallengeType] = useState<ChallengeType>('normal')

  // Challenge data
  const [problem, setProblem] = useState<BTMProblem | null>(null)
  const [benchmark, setBenchmark] = useState<BTMBenchmark | null>(null)
  const [subject, setSubject] = useState<BTMSubject>('mathematics')
  const [difficulty, setDifficulty] = useState<BTMDifficulty>('scholar')

  // Timer
  const [timerMs, setTimerMs] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  // User input
  const [userAnswer, setUserAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Result
  const [validation, setValidation] = useState<BTMValidationResponse | null>(null)
  const [aiTimeMs] = useState(0)

  // Stats
  const [stats, setStats] = useState<BTMStats>(loadStats)
  const [xpAnimation, setXpAnimation] = useState<number | null>(null)
  const [problemNumber, setProblemNumber] = useState(0)

  // Loading
  const [loading, setLoading] = useState(false)
  const [errorMsg, seterrorMsg] = useState('')

  // ─── Timer Logic ────────────────────────────────────────
  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now()
    setTimerRunning(true)
    setSubmitted(false)
    const tick = () => {
      timerRef.current = requestAnimationFrame(tick)
      setTimerMs(performance.now() - startTimeRef.current)
    }
    timerRef.current = requestAnimationFrame(tick)
  }, [])

  const stopTimer = useCallback(() => {
    cancelAnimationFrame(timerRef.current)
    setTimerRunning(false)
    return performance.now() - startTimeRef.current
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => cancelAnimationFrame(timerRef.current), [])

  // ─── Generate Challenge ──────────────────────────────────
  const generateChallenge = useCallback(async (diff: BTMDifficulty, sub: BTMSubject, type: ChallengeType) => {
    setLoading(true)
    seterrorMsg('')
    try {
      const endpoint = type === 'daily' ? '/api/btm' : '/api/btm'
      const body = type === 'daily' ? { action: 'daily' } : { action: 'generate', subject: sub, difficulty: diff }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) { seterrorMsg('The machine malfunctioned. Try again.'); setLoading(false); return }
      setProblem(data.problem)
      setBenchmark(data.benchmark)
      setDifficulty(diff)
      setSubject(sub)
      setUserAnswer('')
      setValidation(null)
      setTimerMs(0)
      setProblemNumber(n => n + 1)
      setScreen('challenge')
      // Focus input after render
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch {
      seterrorMsg('The machine malfunctioned. Try again.')
    }
    setLoading(false)
  }, [])

  // ─── Submit Answer ───────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    if (!problem || submitted || !userAnswer.trim()) return
    setSubmitted(true)
    const elapsed = stopTimer()

    try {
      const res = await fetch('/api/btm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', userAnswer, problem }),
      })
      const val: BTMValidationResponse = await res.json()
      setValidation(val)

      // Update stats
      let newStats = { ...stats, problemsAttempted: stats.problemsAttempted + 1 }
      const xpBase = DIFFICULTY_XP[problem.difficulty]
      let xpGained = 0

      const historyEntry: BTMHistoryEntry = {
        id: Math.random().toString(36).slice(2),
        date: new Date().toISOString().slice(0, 10),
        subject: problem.subject,
        difficulty: problem.difficulty,
        problemText: problem.question,
        userAnswer,
        correctAnswer: problem.correctAnswer,
        unit: problem.unit,
        correct: val.correct,
        timeMs: elapsed,
        aiTimeMs: benchmark?.aiTimeMs || 5000,
        xpGained: 0,
        trapType: problem.trapType,
      }

      if (val.correct) {
        // WIN
        const timeDiff = (benchmark?.aiTimeMs || 5000) - elapsed
        const bonusXP = timeDiff > 0 ? 50 : 0
        const isPB = !newStats.bestTimeMs || elapsed < newStats.bestTimeMs
        xpGained = xpBase + bonusXP + (isPB ? 100 : 0)
        newStats = {
          ...newStats,
          xp: newStats.xp + xpGained,
          totalWins: newStats.totalWins + 1,
          streak: newStats.streak + 1,
          bestStreak: Math.max(newStats.bestStreak, newStats.streak + 1),
          bestTimeMs: isPB ? elapsed : newStats.bestTimeMs,
        }
        historyEntry.xpGained = xpGained
        setXpAnimation(xpGained)
        setScreen('result')
      } else if (val.userAnswer !== null) {
        // WRONG ANSWER
        newStats = {
          ...newStats,
          totalWrong: newStats.totalWrong + 1,
          streak: 0,
        }
        if (val.trapDetected) {
          newStats.trapStats = { ...newStats.trapStats, fallen: newStats.trapStats.fallen + 1 }
        }
        historyEntry.xpGained = 0
        setScreen('wrong')
      }

      // Update subject/difficulty stats
      const subKey = problem.subject
      const subStats = getSubjectStats(newStats, subKey)
      if (val.correct) { subStats.wins++; if (!subStats.bestTime || elapsed < subStats.bestTime) subStats.bestTime = elapsed }
      else if (val.userAnswer !== null) { subStats.wrong++ }
      else { subStats.losses++ }
      newStats.subjectStats = { ...newStats.subjectStats, [subKey]: subStats }

      const diffKey = problem.difficulty
      const diffStats = getDifficultyStats(newStats, diffKey)
      if (val.correct) { diffStats.wins++; if (!diffStats.bestTime || elapsed < diffStats.bestTime) diffStats.bestTime = elapsed }
      else if (val.userAnswer !== null) { diffStats.wrong++ }
      newStats.difficultyStats = { ...newStats.difficultyStats, [diffKey]: diffStats }

      // Daily challenge tracking
      if (challengeType === 'daily') {
        const today = new Date().toISOString().slice(0, 10)
        newStats.dailyChallenge = {
          date: today, completed: true,
          result: val.correct ? 'win' : 'wrong',
          timeMs: elapsed,
        }
      }

      newStats = addHistoryEntry(newStats, historyEntry)
      setStats(newStats)
      saveStats(newStats)
    } catch {
      seterrorMsg('Something went wrong while checking your answer. Your attempt wasn\'t counted.')
      setSubmitted(false)
    }
  }, [problem, submitted, userAnswer, stopTimer, stats, benchmark, challengeType])

  // ─── Format time ─────────────────────────────────────────
  const fmtTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  // ─── Share result ────────────────────────────────────────
  const shareResult = async () => {
    if (!problem || !benchmark) return
    const text = `🤖 SPEEDSOLVE AI — BEAT THE MACHINE\n${validation?.correct ? 'Machine defeated.' : 'AI won.'}\nHuman: ${fmtTime(timerMs)} | AI: ${fmtTime(benchmark.aiTimeMs)}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Beat The Machine', text }) } catch { }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  // ─── Adaptive recommendation ─────────────────────────────
  const getRecommendedDifficulty = (): BTMDifficulty => {
    const level = getLevelFromXP(stats.xp)
    if (stats.bestStreak >= 10 && stats.totalWins > 20) return 'nightmare'
    if (stats.bestStreak >= 5 && stats.totalWins > 10) return 'expert'
    if (stats.totalWins > 5) return 'scholar'
    return 'rookie'
  }

  // ─── RENDER ─────────────────────────────────────────────
  const s = stats // alias
  const lvl = getLevelFromXP(s.xp)
  const xpInfo = getXPForNextLevel(s.xp)

  return (
    <div className="btm-container" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* XP Bar - always visible */}
      <div style={{
        position: 'relative', zIndex: 50, padding: '10px 16px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem',
      }}>
        {onExit && <button onClick={onExit} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: '1.1rem', padding: '4px', lineHeight: 1,
        }} aria-label="Exit Beat The Machine">✕</button>}
        <div style={{
          color: 'var(--accent-start)', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        }}>LVL {lvl}</div>
        <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(xpInfo.current / xpInfo.needed) * 100}%`,
            background: 'var(--accent-start)', borderRadius: '3px',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
          {s.xp.toLocaleString()} XP
        </div>
        {s.streak > 0 && (
          <div style={{ color: '#fb923c', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            🔥 {s.streak}
          </div>
        )}
        <button onClick={() => setScreen('stats')} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
        }} aria-label="View stats">📊</button>
      </div>

      {/* Screens */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {/* ── HOME SCREEN ── */}
        {screen === 'home' && (
          <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setScreen('difficulty')} className="btm-btn-primary">
                ⚡ Challenge the Machine
              </button>
              <button onClick={() => { setChallengeType('daily'); generateChallenge('scholar', 'mathematics', 'daily') }} className="btm-btn-secondary">
                🌎 Daily Machine
              </button>
              {s.streak >= 5 && (
                <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Recommended: <strong style={{ color: getRecommendedDifficulty() === 'requiem' ? '#f5f5f5' : DIFFICULTIES.find(d => d.key === getRecommendedDifficulty())?.color }}>{getRecommendedDifficulty().toUpperCase()}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DIFFICULTY SELECTION ── */}
        {screen === 'difficulty' && (
          <div style={{ textAlign: 'center', maxWidth: '520px', width: '100%' }}>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 6px', fontSize: '1.3rem' }}>SELECT DIFFICULTY</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 20px', fontSize: '0.85rem' }}>Choose your opponent level</p>
            {/* Subject selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {SUBJECTS.map(sub => (
                <button key={sub.key} onClick={() => setSubject(sub.key)} className="btm-subject-btn" style={{
                  borderColor: subject === sub.key ? 'var(--accent-start)' : 'var(--border-color)',
                  background: subject === sub.key ? 'var(--accent-glow)' : 'var(--bg-card)',
                  color: subject === sub.key ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                  {sub.emoji} {sub.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DIFFICULTIES.map(d => {
                const locked = lvl < d.minLevel
                const dStats = getDifficultyStats(s, d.key)
                return (
                  <button key={d.key} onClick={() => !locked && generateChallenge(d.key, subject, 'normal')}
                    className="btm-diff-card" disabled={locked}
                    style={{
                      opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer',
                      borderLeft: `4px solid ${d.color}`,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: d.key === 'requiem' ? '#f5f5f5' : 'var(--text-primary)', fontSize: '1rem' }}>
                          {d.emoji} {d.label}
                          {locked && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>🔒 LVL {d.minLevel}</span>}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>{d.desc}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {dStats.wins > 0 && <div>W: {dStats.wins}</div>}
                        {dStats.bestTime && <div>PB: {fmtTime(dStats.bestTime)}</div>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setScreen('home')} style={{
              marginTop: '20px', background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.85rem',
            }}>← Back</button>
          </div>
        )}

        {/* ── LOADING ── */}
        {screen === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px', animation: 'btmPulse 1s ease-in-out infinite' }}>🤖</div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>GENERATING CHALLENGE...</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>The machine is preparing your problem.</p>
          </div>
        )}

        {/* ── CHALLENGE SCREEN ── */}
        {screen === 'challenge' && problem && benchmark && (
          <div style={{ maxWidth: '600px', width: '100%' }}>
            {/* AI Status */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
                {difficulty === 'requiem' ? '⚫ REQUIEM ONLINE' : '🤖 MACHINE READY'}
              </div>
              {challengeType === 'daily' && (
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '4px' }}>🌍 TODAY&apos;S MACHINE</div>
              )}
            </div>

            {/* Problem Card */}
            <div className="btm-problem-card" style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: '16px', padding: '24px', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PROBLEM #{problemNumber}</span>
                <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px',
                  background: DIFFICULTIES.find(d => d.key === difficulty)?.color + '22',
                  color: DIFFICULTIES.find(d => d.key === difficulty)?.color,
                  fontWeight: 600,
                }}>
                  {DIFFICULTIES.find(d => d.key === difficulty)?.emoji} {DIFFICULTIES.find(d => d.key === difficulty)?.label}
                </span>
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6, margin: '0' }}>
                {problem.question}
              </p>
              {problem.unit && (
                <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Expected unit: {problem.unit}
                </div>
              )}
            </div>

            {/* Timer & AI Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', padding: '14px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>SPEEDSOLVE&apos;S TIME</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {(benchmark.aiTimeMs / 1000).toFixed(2)}s
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px', background: timerRunning ? 'rgba(139,92,246,0.08)' : 'var(--bg-card)', borderRadius: '12px', border: `1px solid ${timerRunning ? 'var(--accent-start)' : 'var(--border-color)'}`, transition: 'all 0.3s' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>YOUR TIME</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: timerRunning ? 'var(--accent-start)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {timerMs < 1000 ? `${timerMs.toFixed(0)} ms` : `${(timerMs / 1000).toFixed(2)} s`}
                </div>
              </div>
            </div>

            {/* Answer Input */}
            {!timerRunning && !submitted && (
              <button onClick={startTimer} className="btm-btn-primary" style={{ width: '100%', marginBottom: '14px', fontSize: '1rem', padding: '14px' }}>
                ▶ START CHALLENGE
              </button>
            )}
            {timerRunning && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && userAnswer.trim()) submitAnswer() }}
                  placeholder={problem.unit ? `Your answer (${problem.unit})` : 'Your answer'}
                  className="btm-input"
                  autoComplete="off"
                  aria-label="Your answer"
                />
                <button onClick={submitAnswer} disabled={!userAnswer.trim() || submitted}
                  className="btm-btn-primary" style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
                  SUBMIT
                </button>
              </div>
            )}
            {submitted && !validation && (
              <div style={{ textAlign: 'center', padding: '14px', color: 'var(--text-muted)' }}>
                <div style={{ animation: 'btmPulse 1s ease-in-out infinite' }}>Checking answer...</div>
              </div>
            )}

            {/* AI Status during solve */}
            {timerRunning && (
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                🤖 COMPUTING...
              </div>
            )}
            {errorMsg && <div style={{ color: 'var(--error)', textAlign: 'center', marginTop: '10px', fontSize: '0.85rem' }}>{errorMsg}</div>}
          </div>
        )}

        {/* ── WIN RESULT ── */}
        {screen === 'result' && problem && benchmark && validation && (
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            {validation.correct && <Confetti />}
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🥶</div>
            <h2 style={{ color: '#22c55e', margin: '0 0 16px', fontSize: '1.6rem', fontWeight: 800 }}>
              YOU BEAT THE MACHINE
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(34,197,94,0.08)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: '0.7rem', color: '#22c55e', marginBottom: '6px' }}>YOU</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtTime(timerMs)}
                </div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>SPEEDSOLVE</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtTime(benchmark.aiTimeMs)}
                </div>
              </div>
            </div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>
              VICTORY: +{((benchmark.aiTimeMs - timerMs) / 1000).toFixed(2)} s
            </div>
            {xpAnimation !== null && (
              <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1rem', marginBottom: '16px' }}>
                ⚡ +{xpAnimation} XP
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { setXpAnimation(null); generateChallenge(difficulty, subject, challengeType) }} className="btm-btn-primary">
                REMATCH
              </button>
              <button onClick={shareResult} className="btm-btn-secondary">
                SHARE RESULT
              </button>
              <button onClick={() => setScreen('difficulty')} className="btm-btn-ghost">
                CHANGE LEVEL
              </button>
            </div>
          </div>
        )}

        {/* ── AI WINS (slow but correct) — shouldn't reach here with current flow, but just in case */}
        {/* Wrong answers go to 'wrong' screen */}

        {/* ── WRONG ANSWER ── */}
        {screen === 'wrong' && problem && validation && (
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{validation.trapDetected ? '🧠' : '⚠️'}</div>
            <h2 style={{ color: validation.trapDetected ? '#f59e0b' : 'var(--error)', margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 800 }}>
              {validation.trapDetected ? 'TRAP DETECTED' : 'THE MACHINE CAUGHT YOU'}
            </h2>
            <div style={{
              background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '16px',
              border: '1px solid var(--border-color)', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Your answer:</span>
                <span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.95rem' }}>{userAnswer}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Correct answer:</span>
                <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.95rem' }}>{validation.correctAnswer} {problem.unit}</span>
              </div>
            </div>
            {validation.trapExplanation && (
              <div style={{
                background: 'rgba(245,158,11,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '14px',
                border: '1px solid rgba(245,158,11,0.2)', textAlign: 'left', fontSize: '0.88rem', color: 'var(--text-secondary)',
              }}>
                <strong style={{ color: '#f59e0b' }}>Trap: </strong>{validation.trapExplanation}
              </div>
            )}
            {validation.mistakeExplanation && (
              <div style={{
                background: 'var(--bg-card)', borderRadius: '12px', padding: '14px', marginBottom: '14px',
                border: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-secondary)',
              }}>
                <strong>What happened:</strong> {validation.mistakeExplanation}
              </div>
            )}
            {!validation.trapDetected && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
                The speed wasn&apos;t the problem. The interpretation was.
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => generateChallenge(difficulty, subject, challengeType)} className="btm-btn-primary">
                TRY AGAIN
              </button>
              <button onClick={() => setScreen('difficulty')} className="btm-btn-ghost">
                CHANGE LEVEL
              </button>
            </div>
          </div>
        )}

        {/* ── STATS SCREEN ── */}
        {screen === 'stats' && (
          <div style={{ maxWidth: '480px', width: '100%' }}>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 20px', fontSize: '1.2rem', textAlign: 'center' }}>📊 YOUR STATS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'WINS', value: s.totalWins, color: '#22c55e' },
                { label: 'WRONG', value: s.totalWrong, color: 'var(--error)' },
                { label: 'STREAK', value: s.streak, color: '#fb923c' },
                { label: 'BEST STREAK', value: s.bestStreak, color: '#fbbf24' },
                { label: 'LEVEL', value: lvl, color: 'var(--accent-start)' },
                { label: 'BEST TIME', value: s.bestTimeMs ? fmtTime(s.bestTimeMs) : '—', color: 'var(--text-primary)' },
              ].map(item => (
                <div key={item.label} style={{
                  textAlign: 'center', padding: '12px 8px', background: 'var(--bg-card)',
                  borderRadius: '12px', border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {/* Subject breakdown */}
            <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 10px', fontSize: '0.9rem' }}>BY SUBJECT</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {SUBJECTS.map(sub => {
                const ss = getSubjectStats(s, sub.key)
                return (
                  <div key={sub.key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{sub.emoji} {sub.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                      {ss.wins}W / {ss.wrong}W / PB: {ss.bestTime ? fmtTime(ss.bestTime) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* History */}
            {s.history.length > 0 && (
              <>
                <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 10px', fontSize: '0.9rem' }}>RECENT</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[...s.history].reverse().slice(0, 20).map((h, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px',
                      border: '1px solid var(--border-color)', fontSize: '0.78rem',
                    }}>
                      <span style={{ color: h.correct ? '#22c55e' : 'var(--error)', fontWeight: 600, width: '24px' }}>{h.correct ? '✓' : '✗'}</span>
                      <span style={{ color: 'var(--text-muted)', flex: 1, marginLeft: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.problemText.slice(0, 50)}...
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', marginLeft: '8px' }}>{fmtTime(h.timeMs)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setScreen('home')} style={{
              marginTop: '20px', display: 'block', margin: '20px auto 0', background: 'none',
              border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
            }}>← Back</button>
          </div>
        )}
      </div>

      {/* ── BTM Styles ── */}
      <style>{`
        .btm-container { font-family: var(--font); }
        .btm-btn-primary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 14px 28px; border-radius: 12px; border: none;
          background: var(--accent-start); color: white;
          font-weight: 700; font-size: 0.95rem; cursor: pointer;
          transition: all 0.2s ease; letter-spacing: 0.5px;
          box-shadow: 0 4px 20px var(--accent-glow);
        }
        .btm-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px var(--accent-glow); }
        .btm-btn-primary:active { transform: translateY(0); }
        .btm-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btm-btn-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 12px 24px; border-radius: 12px;
          border: 1.5px solid var(--border-color); background: var(--bg-card);
          color: var(--text-primary); font-weight: 600; font-size: 0.88rem; cursor: pointer;
          transition: all 0.2s ease;
        }
        .btm-btn-secondary:hover { border-color: var(--accent-start); background: var(--bg-card-hover); }
        .btm-btn-ghost {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 10px 20px; border-radius: 10px; border: none;
          background: none; color: var(--text-muted); font-weight: 600;
          font-size: 0.85rem; cursor: pointer; transition: color 0.2s;
        }
        .btm-btn-ghost:hover { color: 'var(--text-primary)'; }
        .btm-subject-btn {
          padding: 8px 16px; border-radius: 10px; border: 1.5px solid var(--border-color);
          background: var(--bg-card); color: var(--text-muted); font-weight: 600;
          font-size: 0.82rem; cursor: pointer; transition: all 0.2s;
        }
        .btm-subject-btn:hover { border-color: var(--accent-start); }
        .btm-diff-card {
          width: 100%; padding: 14px 18px; border-radius: 12px;
          background: var(--bg-card); border: 1px solid var(--border-color);
          text-align: left; transition: all 0.2s;
        }
        .btm-diff-card:hover:not(:disabled) { background: var(--bg-card-hover); transform: translateX(4px); }
        .btm-input {
          flex: 1; padding: 12px 16px; border-radius: 12px;
          border: 1.5px solid var(--border-color); background: var(--bg-input);
          color: var(--text-primary); font-size: 1rem; outline: none;
          font-family: var(--font); transition: border-color 0.2s;
        }
        .btm-input:focus { border-color: var(--accent-start); box-shadow: 0 0 0 3px var(--accent-glow); }
        @keyframes btmPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        @media (max-width: 640px) {
          .btm-diff-card { padding: 12px 14px; }
        }
      `}</style>
    </div>
  )
}
