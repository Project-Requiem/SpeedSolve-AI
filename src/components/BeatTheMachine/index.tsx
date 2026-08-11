'use client'

import './btm.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useBTMStore, fmtTime, getAIResponse, DIFFICULTIES } from '@/lib/btm/store'
import { BTMDifficulty, BTMSubject, getXPForNextLevel } from '@/lib/btm/types'
import { getActiveUser } from '@/lib/btm/user'
import dynamic from 'next/dynamic'

const SkyField = dynamic(() => import('./SkyField'), { ssr: false })

// ─── Types ──────────────────────────────────────────────────
const SUBJECTS: { key: BTMSubject; label: string }[] = [
  { key: 'mathematics', label: 'Mathematics' },
  { key: 'physics', label: 'Physics' },
  { key: 'chemistry', label: 'Chemistry' },
]

// ─── Component ─────────────────────────────────────────────
export default function BeatTheMachine({ onExit }: { onExit?: () => void }) {
  const store = useBTMStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localElapsed, setLocalElapsed] = useState(0)

  // Init: check for existing user on mount
  useEffect(() => {
    const user = getActiveUser()
    if (user) {
      const { refreshStats } = useBTMStore.getState()
      refreshStats()
      useBTMStore.setState({ user, screen: 'home' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Timer loop
  useEffect(() => {
    if (!store.timerRunning || !store.timerStartedAt) return
    let raf: number
    const tick = () => {
      setLocalElapsed(performance.now() - store.timerStartedAt!)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [store.timerRunning, store.timerStartedAt])

  // Auto-focus input on challenge screen
  useEffect(() => {
    if (store.screen === 'challenge' && !store.submitted && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [store.screen, store.submitted])

  // Enter to submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !store.submitted && store.timerRunning) {
      store.submitAnswer()
    }
  }, [store.submitted, store.timerRunning, store.submitAnswer])

  const xpInfo = getXPForNextLevel(store.stats.xp)

  return (
    <div className="btm-root" onKeyDown={handleKeyDown}>
      {/* ── Anime.js powered sky ── */}
      <SkyField />

      {/* ── Top bar (all screens except setup) ── */}
      {store.screen !== 'setup' && (
        <div className="btm-topbar">
          <button className="btm-back" onClick={() => { if (store.screen === 'home' || store.screen === 'setup') onExit?.() ; else store.goToHome() }} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="btm-topbar-title">BEAT THE MACHINE</div>
          <div className="btm-topbar-right">
            <div className="btm-xp-badge">LVL {store.stats.level}</div>
            {store.stats.streak > 0 && (
              <div className="btm-streak-badge">{store.stats.streak} streak</div>
            )}
          </div>
          <button className="btm-icon-btn" onClick={() => store.setScreen(store.screen === 'stats' ? 'home' : 'stats')} aria-label="Stats">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </button>
          <button className="btm-icon-btn" onClick={() => { store.logout(); onExit?.() }} aria-label="Switch user">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      )}

      {/* XP bar */}
      {store.screen !== 'setup' && (
        <div className="btm-xp-bar-wrap">
          <div className="btm-xp-bar">
            <div className="btm-xp-fill" style={{ width: `${(xpInfo.current / xpInfo.needed) * 100}%` }} />
          </div>
          <div className="btm-xp-label">{store.stats.xp.toLocaleString()} XP</div>
        </div>
      )}

      {/* ── Screens ── */}
      <div className="btm-content">
        {store.screen === 'setup' && <SetupScreen />}
        {store.screen === 'home' && <HomeScreen />}
        {store.screen === 'difficulty' && <DifficultyScreen />}
        {store.screen === 'loading' && <LoadingScreen />}
        {store.screen === 'challenge' && <ChallengeScreen elapsed={localElapsed} inputRef={inputRef} />}
        {store.screen === 'result' && <ResultScreen />}
        {store.screen === 'stats' && <StatsScreen />}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCREENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── SETUP ──────────────────────────────────────────────────
function SetupScreen() {
  const store = useBTMStore()
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleCreate = () => {
    if (name.trim().length >= 2) store.initUser(name)
  }

  return (
    <div className="btm-screen btm-screen-center">
      <div className="btm-setup-card">
        <h1 className="btm-logo">BEAT THE MACHINE</h1>
        <p className="btm-subtitle">Can you solve it faster than SpeedSolve?</p>
        <div className="btm-form-group">
          <label className="btm-label">Choose a username</label>
          <input
            ref={inputRef}
            className="btm-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Alex"
            maxLength={20}
            autoComplete="off"
          />
        </div>
        <button className="btm-btn-primary" onClick={handleCreate} disabled={name.trim().length < 2}>
          CREATE ACCOUNT
        </button>
        <a href="/" className="btm-back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to SpeedSolve AI
        </a>
        {store.allUsers.length > 0 && (
          <div className="btm-existing-users">
            <div className="btm-divider"><span>or continue as</span></div>
            {store.allUsers.slice(0, 3).map(u => (
              <button key={u.id} className="btm-user-chip" onClick={() => store.selectUser(u.id)}>
                {u.username}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── HOME ──────────────────────────────────────────────────
function HomeScreen() {
  const store = useBTMStore()
  const stats = store.stats
  const winRate = stats.totalWins + stats.totalLosses > 0
    ? Math.round((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100) : 0

  return (
    <div className="btm-screen btm-screen-center">
      <div className="btm-home">
        <div className="btm-home-heading">
          <div className="btm-ai-says">
            <div className="btm-ai-label">SPEEDSOLVE</div>
            <div className="btm-ai-text">I can solve this.</div>
            <div className="btm-ai-text">Can you beat me?</div>
          </div>
        </div>

        <div className="btm-home-actions">
          <button className="btm-btn-primary" onClick={() => store.setScreen('difficulty')}>CHALLENGE</button>
          <button className="btm-btn-secondary" onClick={() => store.generateChallenge('scholar', 'mathematics', true)}>DAILY MACHINE</button>
        </div>
        <a href="/" className="btm-back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to SpeedSolve AI
        </a>

        <div className="btm-home-stats">
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{stats.totalWins}</div>
            <div className="btm-stat-label">wins</div>
          </div>
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{stats.bestStreak}</div>
            <div className="btm-stat-label">best streak</div>
          </div>
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{stats.bestTimeMs ? fmtTime(stats.bestTimeMs) : '--'}</div>
            <div className="btm-stat-label">personal best</div>
          </div>
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{winRate}%</div>
            <div className="btm-stat-label">win rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DIFFICULTY ─────────────────────────────────────────────
function DifficultyScreen() {
  const store = useBTMStore()
  const lvl = store.stats.level

  return (
    <div className="btm-screen">
      <div className="btm-difficulty">
        <div className="btm-section-heading">
          <h2>SELECT DIFFICULTY</h2>
          <p>Choose your opponent level</p>
        </div>

        <div className="btm-subject-row">
          {SUBJECTS.map(s => (
            <button
              key={s.key}
              className={`btm-subject-btn${store.subject === s.key ? ' active' : ''}`}
              onClick={() => store.setSubject(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="btm-diff-cards">
          {DIFFICULTIES.map(d => {
            const locked = lvl < d.minLevel
            const ds = store.stats.difficultyStats[d.key]
            return (
              <button
                key={d.key}
                className="btm-diff-card"
                style={{ borderLeftColor: d.color, opacity: locked ? 0.35 : 1 }}
                disabled={locked}
                onClick={() => !locked && store.generateChallenge(d.key, store.subject)}
              >
                <div className="btm-diff-top">
                  <span className="btm-diff-label" style={{ color: d.color }}>{d.label}</span>
                  {locked && <span className="btm-diff-lock">LVL {d.minLevel}</span>}
                </div>
                <div className="btm-diff-desc">{d.desc}</div>
                {ds && (ds.wins > 0 || ds.bestTime) && (
                  <div className="btm-diff-meta">
                    {ds.wins > 0 && <span>W {ds.wins}</span>}
                    {ds.bestTime && <span>PB {fmtTime(ds.bestTime)}</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
        <a href="/" className="btm-back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to SpeedSolve AI
        </a>
      </div>
    </div>
  )
}

// ─── LOADING ───────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="btm-screen btm-screen-center">
      <div className="btm-loading">
        <div className="btm-loading-bar" />
        <p>Generating challenge...</p>
      </div>
    </div>
  )
}

// ─── CHALLENGE ─────────────────────────────────────────────
function ChallengeScreen({ elapsed, inputRef }: { elapsed: number; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const store = useBTMStore()
  const { problem, benchmark, timerRunning, submitted, userInput } = store
  if (!problem || !benchmark) return null

  const displayTime = timerRunning ? elapsed : store.elapsedMs
  const isOvertime = timerRunning && displayTime > benchmark.aiTimeMs
  const timerColor = !timerRunning && submitted ? 'var(--text-primary)' : isOvertime ? '#dc2626' : 'var(--text-primary)'

  return (
    <div className="btm-screen">
      <div className="btm-challenge">
        {/* AI Benchmark */}
        <div className="btm-ai-benchmark">
          <div className="btm-ai-label">SPEEDSOLVE</div>
          <div className="btm-ai-time">{fmtTime(benchmark.aiTimeMs)}</div>
          <div className="btm-ai-sub">Can you beat me?</div>
        </div>

        {/* Problem */}
        <div className="btm-problem-card">
          <div className="btm-problem-meta">
            <span className="btm-problem-badge" style={{ color: DIFFICULTIES.find(d => d.key === problem.difficulty)?.color }}>{DIFFICULTIES.find(d => d.key === problem.difficulty)?.label}</span>
            <span className="btm-problem-concept">{problem.concept}</span>
          </div>
          <p className="btm-problem-text">{problem.question}</p>
        </div>

        {/* Timer */}
        <div className="btm-timer-wrap">
          <div className="btm-timer" style={{ color: timerColor }}>
            {timerRunning || submitted
              ? (displayTime < 1000 ? displayTime.toFixed(0) + 'ms' : (displayTime / 1000).toFixed(2))
              : '0.00'}
          </div>
          {!timerRunning && !submitted && (
            <button className="btm-btn-start" onClick={() => store.startTimer()}>START</button>
          )}
        </div>

        {/* Input */}
        {timerRunning && !submitted && (
          <div className="btm-input-wrap">
            <input
              ref={inputRef}
              className="btm-input btm-input-large"
              value={userInput}
              onChange={e => store.setUserInput(e.target.value)}
              placeholder="Your answer"
              autoComplete="off"
              autoFocus
            />
            <button
              className="btm-btn-submit"
              onClick={() => store.submitAnswer()}
              disabled={!userInput.trim()}
            >
              SUBMIT
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── RESULT ─────────────────────────────────────────────────
function ResultScreen() {
  const store = useBTMStore()
  const { problem, benchmark, result, stats } = store
  if (!problem || !benchmark || !result) return null

  const isWin = result.correct && result.userTimeMs < result.aiTimeMs
  const isLoss = result.correct && result.userTimeMs >= result.aiTimeMs
  const isWrong = !result.correct
  const gap = Math.abs(result.userTimeMs - result.aiTimeMs)

  return (
    <div className="btm-screen">
      <div className="btm-result">
        {/* Heading */}
        <div className={`btm-result-heading ${isWin ? 'win' : isLoss ? 'loss' : 'wrong'}`}>
          {isWin ? 'YOU BEAT THE MACHINE' : isLoss ? 'AI WON' : 'INCORRECT'}
        </div>

        {/* Times */}
        <div className="btm-result-times">
          <div className="btm-result-time">
            <div className="btm-result-time-label">You</div>
            <div className={`btm-result-time-value ${isWin ? 'accent' : ''}`}>{fmtTime(result.userTimeMs)}</div>
          </div>
          <div className="btm-result-vs">vs</div>
          <div className="btm-result-time">
            <div className="btm-result-time-label">SpeedSolve</div>
            <div className="btm-result-time-value">{fmtTime(result.aiTimeMs)}</div>
          </div>
        </div>

        {/* Context */}
        <div className="btm-result-context">
          {isWin && <p>Advantage: <strong>{(gap / 1000).toFixed(2)}s</strong></p>}
          {isLoss && gap < 1000 && <p>{(gap / 1000).toFixed(2)} seconds. Almost.</p>}
          {isLoss && gap >= 1000 && <p>You were <strong>{(gap / 1000).toFixed(2)}s</strong> away.</p>}
        </div>

        {/* Wrong answer details */}
        {isWrong && result.validation && (
          <div className="btm-result-error">
            <div className="btm-result-error-row">
              <span>Your answer</span>
              <span>{store.userInput}</span>
            </div>
            <div className="btm-result-error-row">
              <span>Correct answer</span>
              <span>{problem.correctAnswer}{problem.unit ? ' ' + problem.unit : ''}</span>
            </div>
            {result.validation.trapDetected && result.validation.trapExplanation && (
              <div className="btm-trap-detected">
                <div className="btm-trap-label">TRAP DETECTED</div>
                <p>{result.validation.trapExplanation}</p>
              </div>
            )}
            {result.validation.mistakeExplanation && (
              <div className="btm-mistake">
                <div className="btm-mistake-label">LIKELY ERROR</div>
                <p>{result.validation.mistakeExplanation}</p>
              </div>
            )}
          </div>
        )}

        {/* XP & Rewards */}
        <div className="btm-result-rewards">
          <div className="btm-xp-gain">+{result.xpGained} XP</div>
          {result.isPersonalBest && <div className="btm-reward">NEW PERSONAL BEST — {fmtTime(result.userTimeMs)}</div>}
          {result.wasStreakMilestone && <div className="btm-reward">{stats.streak} SOLVE STREAK</div>}
          {result.newLevel && <div className="btm-reward btm-reward-level">LEVEL {result.newLevel}</div>}
        </div>

        {/* AI Response */}
        {isLoss && <div className="btm-ai-response">{getAIResponse(stats.streak)}</div>}

        {/* Actions */}
        <div className="btm-result-actions">
          <button className="btm-btn-primary" onClick={() => store.rematch()}>REMATCH</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('difficulty')}>CHANGE LEVEL</button>
        </div>
      </div>
    </div>
  )
}

// ─── STATS ──────────────────────────────────────────────────
function StatsScreen() {
  const store = useBTMStore()
  const stats = store.stats
  const xpInfo = getXPForNextLevel(stats.xp)
  const winRate = stats.totalWins + stats.totalLosses > 0
    ? Math.round((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100) : 0

  return (
    <div className="btm-screen">
      <div className="btm-stats">
        <h2>STATISTICS</h2>
        <div className="btm-stats-name">{store.user?.username}</div>

        <div className="btm-stats-grid">
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.totalWins}</div><div className="btm-stat-card-label">Total Wins</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.totalLosses}</div><div className="btm-stat-card-label">AI Wins</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{winRate}%</div><div className="btm-stat-card-label">Win Rate</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.bestTimeMs ? fmtTime(stats.bestTimeMs) : '--'}</div><div className="btm-stat-card-label">Fastest Win</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.bestStreak}</div><div className="btm-stat-card-label">Best Streak</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.problemsAttempted}</div><div className="btm-stat-card-label">Attempted</div></div>
        </div>

        {/* Level Progress */}
        <div className="btm-level-section">
          <div className="btm-level-header"><span>Level {stats.level}</span><span>{xpInfo.current} / {xpInfo.needed} XP</span></div>
          <div className="btm-xp-bar btm-xp-bar-lg">
            <div className="btm-xp-fill" style={{ width: `${(xpInfo.current / xpInfo.needed) * 100}%` }} />
          </div>
        </div>

        {/* Recent History */}
        {stats.history.length > 0 && (
          <div className="btm-history-section">
            <h3>Recent</h3>
            <div className="btm-history-list">
              {stats.history.slice(-10).reverse().map(h => (
                <div key={h.id} className={`btm-history-row ${h.correct ? '' : 'wrong'}`}>
                  <div className="btm-history-result">{h.correct ? 'WIN' : 'WRONG'}</div>
                  <div className="btm-history-problem">{h.problemText.length > 50 ? h.problemText.slice(0, 50) + '...' : h.problemText}</div>
                  <div className="btm-history-time">{fmtTime(h.timeMs)}</div>
                  <div className="btm-history-xp">+{h.xpGained}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
        <a href="/" className="btm-back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to SpeedSolve AI
        </a>
      </div>
    </div>
  )
}
