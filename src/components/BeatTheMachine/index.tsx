'use client'

import './btm.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useBTMStore, fmtTime, getAIResponse, DIFFICULTIES } from '@/lib/btm/store'
import { BTMDifficulty, BTMSubject, getXPForNextLevel, getComboMultiplier, getComboColor, POWER_UPS, PowerUpType } from '@/lib/btm/types'
import { getActiveUser } from '@/lib/btm/user'
import { WORLDS, getTotalStars, isWorldUnlocked, isLevelUnlocked, getLevelStars } from '@/lib/btm/worldLevels'
import { ACHIEVEMENTS, getRarityColor, getRarityLabel } from '@/lib/btm/achievements'
import { COSMETIC_ITEMS, getEquippedTitle } from '@/lib/btm/cosmetics'
import dynamic from 'next/dynamic'

const SkyField = dynamic(() => import('./SkyField'), { ssr: false })

// ─── Types ──────────────────────────────────────────────────
const SUBJECTS: { key: BTMSubject; label: string }[] = [
  { key: 'mathematics', label: 'Mathematics' },
  { key: 'physics', label: 'Physics' },
  { key: 'chemistry', label: 'Chemistry' },
]

// ─── Particles — Cinematic Burst ────────────────────────
function WinParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => {
    const angle = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const dist = 60 + Math.random() * 120
    const size = 4 + Math.random() * 8
    const colors = ['#00e676', '#ffd740', '#00e5ff', '#b388ff', '#ff4081', '#ffffff']
    return {
      id: i, px: Math.cos(angle) * dist, py: Math.sin(angle) * dist - 40,
      color: colors[i % colors.length], size,
      delay: Math.random() * 0.15,
    }
  })
  return (
    <div className="btm-particles">
      {particles.map(p => (
        <div key={p.id} className="btm-particle" style={{
          left: '50%', top: '35%', width: p.size, height: p.size,
          background: p.color, color: p.color,
          '--px': `${p.px}px`, '--py': `${p.py}px`,
          animationDelay: `${p.delay}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

// ─── Confetti ──────────────────────────────────────────
function Confetti({ count = 40 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const x = Math.random() * 100
    const delay = Math.random() * 0.6
    const duration = 1.2 + Math.random() * 1.5
    const colors = ['#00e5ff', '#b388ff', '#ffd740', '#00e676', '#ff4081', '#ff9100']
    return { id: i, x, delay, duration, color: colors[i % colors.length], rot: Math.random() * 360 }
  })
  return (
    <div className="btm-particles">
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: '-10px',
          width: 6, height: 10, background: p.color, borderRadius: 2,
          animation: `btmConfettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          transform: `rotate(${p.rot}deg)`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

// ─── Component ─────────────────────────────────────────────
export default function BeatTheMachine({ onExit }: { onExit?: () => void }) {
  const store = useBTMStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localElapsed, setLocalElapsed] = useState(0)
  const [skyMode, setSkyMode] = useState<'night' | 'day'>('night')
  const [screenKey, setScreenKey] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [shake, setShake] = useState(false)
  const prevScreen = useRef(store.screen)

  // Init
  useEffect(() => {
    const user = getActiveUser()
    if (user) {
      const { refreshStats } = useBTMStore.getState()
      refreshStats()
      useBTMStore.setState({ user, screen: 'home' })
    }
  }, [])

  // Screen transition
  useEffect(() => {
    if (prevScreen.current !== store.screen) {
      prevScreen.current = store.screen
      setScreenKey(k => k + 1)
    }
  }, [store.screen])

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

  // Auto-focus
  useEffect(() => {
    if (store.screen === 'challenge' && store.timerRunning && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [store.screen, store.timerRunning])

  // Achievement popup auto-dismiss
  useEffect(() => {
    if (store.achievementPopup) {
      const t = setTimeout(() => store.dismissAchievementPopup(), 3500)
      return () => clearTimeout(t)
    }
  }, [store.achievementPopup])

  // Win particles & confetti
  useEffect(() => {
    if (store.screen === 'result' && store.result?.correct) {
      const isWin = store.result.userTimeMs < store.result.aiTimeMs
      setShowParticles(true)
      if (isWin) setShowConfetti(true)
      const t = setTimeout(() => { setShowParticles(false); setShowConfetti(false) }, 1500)
      return () => clearTimeout(t)
    }
  }, [store.screen, store.result?.correct])

  // Screen shake on wrong
  useEffect(() => {
    if (store.screen === 'result' && store.result && !store.result.correct) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 300)
      return () => clearTimeout(t)
    }
  }, [store.screen, store.result?.correct])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !store.submitted && store.timerRunning) {
      if (store.screen === 'levelPlay') store.submitLevelAnswer()
      else if (store.screen === 'tower') store.submitTowerAnswer()
      else store.submitAnswer()
    }
  }, [store.submitted, store.timerRunning, store.submitAnswer, store.screen])

  // Handle paste for anti-cheat
  const handlePaste = useCallback(() => {
    store.keystrokeTracker?.markPaste()
  }, [store.keystrokeTracker])

  const xpInfo = getXPForNextLevel(store.stats.xp)
  const title = getEquippedTitle(store.stats.cosmetics)

  return (
    <div className={`btm-root${skyMode === 'day' ? ' btm-day' : ''}${shake ? ' btm-shake' : ''}`} onKeyDown={handleKeyDown}>
      <SkyField mode={skyMode} />
      {showParticles && store.result?.correct && <WinParticles />}
      {showConfetti && <Confetti />}

      {/* Achievement popup */}
      {store.achievementPopup && (
        <div className="btm-achievement-popup">
          <div className="btm-achievement-icon">{store.achievementPopup.icon}</div>
          <div className="btm-achievement-info">
            <div className="btm-achievement-name">{store.achievementPopup.name}</div>
            <div className={`btm-achievement-rarity btm-achievement-rarity-${store.achievementPopup.rarity}`}>
              {getRarityLabel(store.achievementPopup.rarity as any)}
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      {store.screen !== 'setup' && (
        <div className="btm-topbar">
          <button className="btm-back" onClick={() => { if (store.screen === 'home' || store.screen === 'setup') onExit?.() ; else store.goToHome() }} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="btm-topbar-title">BEAT THE MACHINE</div>
          <div className="btm-topbar-right">
            <div className="btm-xp-badge">{title}</div>
            <div className="btm-xp-badge">LVL {store.stats.level}</div>
            {store.stats.streak > 0 && <div className="btm-streak-badge">{store.stats.streak} streak</div>}
          </div>
          <button className="btm-icon-btn btm-sky-toggle" onClick={() => setSkyMode(m => m === 'night' ? 'day' : 'night')} aria-label="Toggle sky">
            {skyMode === 'night' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button className="btm-icon-btn" onClick={() => store.setScreen(store.screen === 'stats' ? 'home' : 'stats')} aria-label="Stats">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </button>
          <button className="btm-icon-btn" onClick={() => store.logout(); onExit?.()} aria-label="Switch user">
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

      {/* Screens */}
      <div className="btm-content" key={screenKey}>
        {store.screen === 'setup' && <SetupScreen />}
        {store.screen === 'home' && <HomeScreen />}
        {store.screen === 'worldMap' && <WorldMapScreen />}
        {store.screen === 'levelPlay' && <LevelPlayScreen elapsed={localElapsed} inputRef={inputRef} onPaste={handlePaste} />}
        {store.screen === 'loading' && <LoadingScreen />}
        {store.screen === 'challenge' && <ChallengeScreen elapsed={localElapsed} inputRef={inputRef} onPaste={handlePaste} />}
        {store.screen === 'result' && <ResultScreen />}
        {store.screen === 'stats' && <StatsScreen />}
        {store.screen === 'tower' && <TowerScreen elapsed={localElapsed} inputRef={inputRef} onPaste={handlePaste} />}
        {store.screen === 'towerResult' && <TowerResultScreen />}
        {store.screen === 'shop' && <ShopScreen />}
        {store.screen === 'achievements' && <AchievementsScreen />}
        {store.screen === 'verification' && <VerificationScreen />}
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
          <input ref={inputRef} className="btm-input" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="e.g. Alex" maxLength={20} autoComplete="off" />
        </div>
        <button className="btm-btn-primary" onClick={handleCreate} disabled={name.trim().length < 2}>CREATE ACCOUNT</button>
        <a href="/" className="btm-back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to SpeedSolve AI
        </a>
        {store.allUsers.length > 0 && (
          <div className="btm-existing-users">
            <div className="btm-divider"><span>or continue as</span></div>
            {store.allUsers.slice(0, 3).map(u => (
              <button key={u.id} className="btm-user-chip" onClick={() => store.selectUser(u.id)}>{u.username}</button>
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
  const winRate = stats.totalWins + stats.totalLosses > 0 ? Math.round((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100) : 0
  const totalStars = getTotalStars(stats)

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
          <button className="btm-btn-primary" onClick={() => store.setScreen('worldMap')}>WORLD MAP</button>
          <button className="btm-btn-secondary" onClick={() => store.generateChallenge('scholar', 'mathematics', true)}>DAILY MACHINE</button>
          <button className="btm-btn-secondary" onClick={() => store.startTower()}>TOWER CLIMB</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('shop')}>SHOP</button>
        </div>

        <div className="btm-home-stats">
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{stats.totalWins}</div>
            <div className="btm-stat-label">wins</div>
          </div>
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{totalStars}★</div>
            <div className="btm-stat-label">stars</div>
          </div>
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{stats.bestStreak}</div>
            <div className="btm-stat-label">best streak</div>
          </div>
          <div className="btm-stat-chip">
            <div className="btm-stat-value">{winRate}%</div>
            <div className="btm-stat-label">win rate</div>
          </div>
        </div>

        {stats.combo >= 2 && (
          <div className={`btm-combo${stats.combo >= 10 ? ' btm-combo-mega' : stats.combo >= 5 ? ' btm-combo-fire' : ''}`} style={{ color: getComboColor(stats.combo) }}>
            {stats.combo}x COMBO
            <div className="btm-combo-mult">({getComboMultiplier(stats.combo)}x XP)</div>
          </div>
        )}

        {stats.heatStreak > 1 && (
          <div style={{ fontSize: 12, color: '#f97316' }}>🔥 {stats.heatStreak} day heat streak</div>
        )}

        <a href="/" className="btm-back-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to SpeedSolve AI
        </a>
      </div>
    </div>
  )
}

// ─── WORLD MAP ─────────────────────────────────────────────
function WorldMapScreen() {
  const store = useBTMStore()
  const stats = store.stats

  return (
    <div className="btm-screen">
      <div className="btm-world-map">
        <div className="btm-world-map-title">WORLD MAP</div>
        {WORLDS.map(world => {
          const unlocked = isWorldUnlocked(world, stats)
          return (
            <div key={world.id} className={`btm-world-card${unlocked ? '' : ' btm-world-card-locked'}`} style={{ background: unlocked ? world.gradient : 'var(--c-bg-s)' }}>
              <div className="btm-world-header">
                <div className="btm-world-icon">{world.icon}</div>
                <div>
                  <div className="btm-world-name" style={{ color: unlocked ? '#fff' : 'var(--c-text3)' }}>{world.name}</div>
                  <div className="btm-world-desc">{world.description}</div>
                </div>
                {!unlocked && <div className="btm-world-stars-req">★ {world.requiredStars} needed</div>}
              </div>
              <div className="btm-level-row">
                {world.levels.map(level => {
                  const levelUnlocked = unlocked && isLevelUnlocked(level, stats)
                  const completed = stats.completedLevels.includes(level.id)
                  const stars = getLevelStars(level.id, stats)
                  return (
                    <button key={level.id}
                      className={`btm-level-node${completed ? ' btm-level-node-completed' : level.isBoss ? ' btm-level-node-boss' : !levelUnlocked ? ' btm-level-node-locked' : ''}`}
                      disabled={!levelUnlocked}
                      onClick={() => levelUnlocked && store.startLevel(level.id)}
                    >
                      {level.isBoss ? '⚔' : level.number}
                      {completed && (
                        <div className="btm-level-stars">
                          {[1, 2, 3].map(s => (
                            <span key={s} className={s <= stars ? 'btm-star-filled' : 'btm-star-empty'}>★</span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── LEVEL PLAY (replaces old difficulty+challenge for world map) ──
function LevelPlayScreen({ elapsed, inputRef, onPaste }: { elapsed: number; inputRef: React.RefObject<HTMLInputElement | null>; onPaste: () => void }) {
  const store = useBTMStore()
  const { problem, benchmark, timerRunning, submitted, userInput, levelPlay, stats } = store
  if (!problem || !benchmark || !levelPlay) return null

  const displayTime = timerRunning ? elapsed : store.elapsedMs
  const isOvertime = timerRunning && displayTime > benchmark.aiTimeMs
  const timerColor = !timerRunning && submitted ? 'var(--text-primary)' : isOvertime ? '#dc2626' : 'var(--text-primary)'
  const revealed = timerRunning || submitted
  const playerProgress = Math.min(displayTime / benchmark.aiTimeMs, 1)
  const diff = DIFFICULTIES.find(d => d.key === problem.difficulty)

  return (
    <div className="btm-screen">
      <div className="btm-challenge">
        {/* Level progress */}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text3)', marginBottom: 4 }}>
          Problem {levelPlay.currentIndex + 1} of {levelPlay.problems.length}
          {levelPlay.results.length > 0 && ` — ${levelPlay.results.filter(Boolean).length} correct`}
        </div>

        {/* Race track */}
        <div className="btm-race-track">
          <div className="btm-race-lane btm-race-player">
            <div className="btm-race-label btm-race-label-player">YOU</div>
            <div className="btm-race-bar">
              <div className="btm-race-fill" style={{ width: `${playerProgress * 100}%` }} />
            </div>
          </div>
          <div className="btm-race-lane btm-race-ai">
            <div className="btm-race-label btm-race-label-ai">AI</div>
            <div className="btm-race-bar">
              <div className="btm-race-fill" style={{ width: '100%' }} />
              <div className="btm-race-finish" />
            </div>
          </div>
        </div>

        {/* AI Benchmark */}
        <div className="btm-ai-benchmark">
          <div className="btm-ai-label">SPEEDSOLVE</div>
          <div className="btm-ai-time">{fmtTime(benchmark.aiTimeMs)}</div>
          <div className="btm-ai-sub">Beat my time!</div>
        </div>

        {/* Problem */}
        <div className={`btm-problem-card${revealed ? ' btm-problem-revealed' : ' btm-problem-hidden'}`}>
          <div className="btm-problem-meta">
            <span className="btm-problem-badge" style={{ color: diff?.color }}>{diff?.label}</span>
            <span className="btm-problem-concept">{problem.concept}</span>
          </div>
          <p className="btm-problem-text">{problem.question}</p>
        </div>

        {/* Timer */}
        <div className="btm-timer-wrap">
          <div className={`btm-timer${isOvertime ? ' btm-heartbeat' : ''}`} style={{ color: timerColor }}>
            {timerRunning || submitted ? fmtTime(displayTime) : '0.00'}
          </div>
          {!timerRunning && !submitted && <button className="btm-btn-start" onClick={() => store.startTimer()}>START</button>}
        </div>

        {/* Power-up bar */}
        <PowerUpBar />

        {/* Input */}
        {timerRunning && !submitted && (
          <div className="btm-input-wrap btm-slide-up">
            <input ref={inputRef} className="btm-input btm-input-large" value={userInput}
              onChange={e => store.setUserInput(e.target.value)} onPaste={onPaste}
              placeholder="Your answer" autoComplete="off" />
            <button className="btm-btn-submit" onClick={() => store.submitLevelAnswer()} disabled={!userInput.trim()}>SUBMIT</button>
          </div>
        )}

        {/* Combo */}
        {stats.combo >= 2 && (
          <div className={`btm-combo${stats.combo >= 10 ? ' btm-combo-mega' : stats.combo >= 5 ? ' btm-combo-fire' : ''}`} style={{ color: getComboColor(stats.combo) }}>
            {stats.combo}x
          </div>
        )}
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

// ─── CHALLENGE (quick play) ────────────────────────────────
function ChallengeScreen({ elapsed, inputRef, onPaste }: { elapsed: number; inputRef: React.RefObject<HTMLInputElement | null>; onPaste: () => void }) {
  const store = useBTMStore()
  const { problem, benchmark, timerRunning, submitted, userInput, stats } = store
  if (!problem || !benchmark) return null

  const displayTime = timerRunning ? elapsed : store.elapsedMs
  const isOvertime = timerRunning && displayTime > benchmark.aiTimeMs
  const timerColor = !timerRunning && submitted ? 'var(--text-primary)' : isOvertime ? '#dc2626' : 'var(--text-primary)'
  const revealed = timerRunning || submitted
  const playerProgress = Math.min(displayTime / benchmark.aiTimeMs, 1)
  const diff = DIFFICULTIES.find(d => d.key === problem.difficulty)

  return (
    <div className="btm-screen">
      <div className="btm-challenge">
        {/* Race track */}
        <div className="btm-race-track">
          <div className="btm-race-lane btm-race-player">
            <div className="btm-race-label btm-race-label-player">YOU</div>
            <div className="btm-race-bar">
              <div className="btm-race-fill" style={{ width: `${playerProgress * 100}%` }} />
            </div>
          </div>
          <div className="btm-race-lane btm-race-ai">
            <div className="btm-race-label btm-race-label-ai">AI</div>
            <div className="btm-race-bar">
              <div className="btm-race-fill" style={{ width: '100%' }} />
              <div className="btm-race-finish" />
            </div>
          </div>
        </div>

        <div className="btm-ai-benchmark">
          <div className="btm-ai-label">SPEEDSOLVE</div>
          <div className="btm-ai-time">{fmtTime(benchmark.aiTimeMs)}</div>
          <div className="btm-ai-sub">Can you beat me?</div>
        </div>

        <div className={`btm-problem-card${revealed ? ' btm-problem-revealed' : ' btm-problem-hidden'}`}>
          <div className="btm-problem-meta">
            <span className="btm-problem-badge" style={{ color: diff?.color }}>{diff?.label}</span>
            <span className="btm-problem-concept">{problem.concept}</span>
          </div>
          <p className="btm-problem-text">{problem.question}</p>
        </div>

        <div className="btm-timer-wrap">
          <div className={`btm-timer${isOvertime ? ' btm-heartbeat' : ''}`} style={{ color: timerColor }}>
            {timerRunning || submitted ? fmtTime(displayTime) : '0.00'}
          </div>
          {!timerRunning && !submitted && <button className="btm-btn-start" onClick={() => store.startTimer()}>START</button>}
        </div>

        <PowerUpBar />

        {timerRunning && !submitted && (
          <div className="btm-input-wrap btm-slide-up">
            <input ref={inputRef} className="btm-input btm-input-large" value={userInput}
              onChange={e => store.setUserInput(e.target.value)} onPaste={onPaste}
              placeholder="Your answer" autoComplete="off" />
            <button className="btm-btn-submit" onClick={() => store.submitAnswer()} disabled={!userInput.trim()}>SUBMIT</button>
          </div>
        )}

        {stats.combo >= 2 && (
          <div className={`btm-combo${stats.combo >= 10 ? ' btm-combo-mega' : stats.combo >= 5 ? ' btm-combo-fire' : ''}`} style={{ color: getComboColor(stats.combo) }}>
            {stats.combo}x
          </div>
        )}
      </div>
    </div>
  )
}

// ─── POWER-UP BAR ──────────────────────────────────────────
function PowerUpBar() {
  const store = useBTMStore()
  const powerUpTypes: PowerUpType[] = ['timeFreeze', 'shield', 'hint', 'doubleXP', 'comboBoost']

  return (
    <div className="btm-powerup-bar">
      {powerUpTypes.map(type => {
        const pu = POWER_UPS[type]
        const count = store.stats.powerUps[type] || 0
        const isActive = store.activePowerUps.includes(type)
        return (
          <button key={type}
            className={`btm-powerup-slot${isActive ? ' btm-powerup-active' : count === 0 ? ' btm-powerup-empty' : ''}`}
            onClick={() => count > 0 && store.usePowerUp(type)}
            disabled={count === 0 || !store.timerRunning}
            title={pu.description}
          >
            <span>{pu.icon}</span>
            <span className="btm-powerup-count">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── RESULT ─────────────────────────────────────────────────
function ResultScreen() {
  const store = useBTMStore()
  const { problem, benchmark, result, stats, levelPlay } = store
  if (!problem || !benchmark || !result) return null

  const isWin = result.correct && result.userTimeMs < result.aiTimeMs
  const isLoss = result.correct && result.userTimeMs >= result.aiTimeMs
  const isWrong = !result.correct
  const gap = Math.abs(result.userTimeMs - result.aiTimeMs)

  return (
    <div className="btm-screen">
      <div className="btm-result">
        <div className={`btm-result-heading ${isWin ? 'win' : isLoss ? 'loss' : 'wrong'}`}>
          {isWin ? 'YOU BEAT THE MACHINE' : isLoss ? 'AI WON' : 'INCORRECT'}
        </div>

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

        <div className="btm-result-context">
          {isWin && <p>Advantage: <strong>{(gap / 1000).toFixed(2)}s</strong></p>}
          {isLoss && gap < 1000 && <p>{(gap / 1000).toFixed(2)} seconds. Almost.</p>}
          {isLoss && gap >= 1000 && <p>You were <strong>{(gap / 1000).toFixed(2)}s</strong> away.</p>}
        </div>

        {isWrong && result.validation && (
          <div className="btm-result-error">
            <div className="btm-result-error-row"><span>Your answer</span><span>{store.userInput}</span></div>
            <div className="btm-result-error-row"><span>Correct answer</span><span>{problem.correctAnswer}{problem.unit ? ' ' + problem.unit : ''}</span></div>
            {result.validation.trapDetected && result.validation.trapExplanation && (
              <div className="btm-trap-detected"><div className="btm-trap-label">TRAP DETECTED</div><p>{result.validation.trapExplanation}</p></div>
            )}
            {result.validation.mistakeExplanation && (
              <div className="btm-mistake"><div className="btm-mistake-label">LIKELY ERROR</div><p>{result.validation.mistakeExplanation}</p></div>
            )}
          </div>
        )}

        <div className="btm-result-rewards">
          <div className="btm-xp-gain" style={result.xpGained < 0 ? { color: '#ef4444' } : undefined}>{result.xpGained} XP</div>
          {result.comboCount >= 2 && <div className="btm-reward" style={{ color: getComboColor(result.comboCount) }}>{result.comboCount}x COMBO ({result.comboMultiplier}x XP)</div>}
          {result.isPersonalBest && <div className="btm-reward">NEW PERSONAL BEST — {fmtTime(result.userTimeMs)}</div>}
          {result.wasStreakMilestone && <div className="btm-reward">{stats.streak} SOLVE STREAK</div>}
          {result.newLevel && <div className="btm-reward btm-reward-level">LEVEL {result.newLevel}</div>}
        </div>

        {/* Level completion stars */}
        {levelPlay?.completed && (
          <div style={{ fontSize: 24, textAlign: 'center', margin: '8px 0' }}>
            {[1, 2, 3].map(s => (
              <span key={s} style={{ color: s <= levelPlay.stars ? '#fbbf24' : '#334155', margin: '0 4px' }}>★</span>
            ))}
          </div>
        )}

        {isLoss && <div className="btm-ai-response">{getAIResponse(stats.streak)}</div>}

        <div className="btm-result-actions">
          <button className="btm-btn-primary" onClick={() => store.rematch()}>REMATCH</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('worldMap')}>WORLD MAP</button>
        </div>
      </div>
    </div>
  )
}

// ─── TOWER CLIMB ───────────────────────────────────────────
function TowerScreen({ elapsed, inputRef, onPaste }: { elapsed: number; inputRef: React.RefObject<HTMLInputElement | null>; onPaste: () => void }) {
  const store = useBTMStore()
  const { problem, benchmark, timerRunning, submitted, userInput, tower, stats } = store
  if (!problem || !benchmark || !tower) return null

  const displayTime = timerRunning ? elapsed : store.elapsedMs
  const revealed = timerRunning || submitted
  const diff = DIFFICULTIES.find(d => d.key === problem.difficulty)

  return (
    <div className="btm-screen">
      <div className="btm-tower">
        <div className="btm-tower-floor-label">FLOOR</div>
        <div className="btm-tower-floor-display">{tower.currentFloor}</div>
        <div className="btm-tower-best">Best: Floor {Math.max(stats.towerFloor, tower.currentFloor)}</div>

        <div className="btm-race-track">
          <div className="btm-race-lane btm-race-player">
            <div className="btm-race-label btm-race-label-player">YOU</div>
            <div className="btm-race-bar">
              <div className="btm-race-fill" style={{ width: `${Math.min(displayTime / benchmark.aiTimeMs, 1) * 100}%` }} />
            </div>
          </div>
          <div className="btm-race-lane btm-race-ai">
            <div className="btm-race-label btm-race-label-ai">AI</div>
            <div className="btm-race-bar">
              <div className="btm-race-fill" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        <div className={`btm-problem-card${revealed ? ' btm-problem-revealed' : ' btm-problem-hidden'}`}>
          <div className="btm-problem-meta">
            <span className="btm-problem-badge" style={{ color: diff?.color }}>{diff?.label}</span>
            <span className="btm-problem-concept">{problem.concept}</span>
          </div>
          <p className="btm-problem-text">{problem.question}</p>
        </div>

        <div className="btm-timer-wrap">
          <div className="btm-timer" style={{ color: 'var(--text-primary)' }}>
            {timerRunning || submitted ? fmtTime(displayTime) : '0.00'}
          </div>
          {!timerRunning && !submitted && <button className="btm-btn-start" onClick={() => store.startTimer()}>START</button>}
        </div>

        <PowerUpBar />

        {timerRunning && !submitted && (
          <div className="btm-input-wrap btm-slide-up">
            <input ref={inputRef} className="btm-input btm-input-large" value={userInput}
              onChange={e => store.setUserInput(e.target.value)} onPaste={onPaste}
              placeholder="Your answer" autoComplete="off" />
            <button className="btm-btn-submit" onClick={() => store.submitTowerAnswer()} disabled={!userInput.trim()}>SUBMIT</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TOWER RESULT ──────────────────────────────────────────
function TowerResultScreen() {
  const store = useBTMStore()
  const { tower, stats } = store
  if (!tower) return null

  return (
    <div className="btm-screen btm-screen-center">
      <div className="btm-tower">
        <div className="btm-tower-floor-label">YOU REACHED</div>
        <div className="btm-tower-floor-display">{tower.currentFloor}</div>
        <div className="btm-tower-best">Best: Floor {stats.towerFloor}</div>
        <div style={{ fontSize: 13, color: 'var(--c-gold)', marginTop: 8 }}>+{tower.totalBonusXP} XP</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btm-btn-primary" onClick={() => store.startTower()}>CLIMB AGAIN</button>
          <button className="btm-btn-secondary" onClick={() => store.goToHome()}>HOME</button>
        </div>
      </div>
    </div>
  )
}

// ─── SHOP ──────────────────────────────────────────────────
function ShopScreen() {
  const store = useBTMStore()
  const stats = store.stats
  const types = ['theme', 'frame', 'effect', 'title'] as const
  const typeLabels = { theme: 'Themes', frame: 'Frames', effect: 'Effects', title: 'Titles' }

  return (
    <div className="btm-screen">
      <div className="btm-shop">
        <h2>SHOP</h2>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>
          {stats.xp.toLocaleString()} XP available
        </div>

        {/* Power-ups */}
        <div className="btm-shop-section-title">POWER-UPS</div>
        <div className="btm-shop-grid">
          {(Object.entries(POWER_UPS) as [PowerUpType, typeof POWER_UPS[PowerUpType]][]).map(([type, pu]) => (
            <div key={type} className="btm-shop-item" onClick={() => store.buyPowerUp(type)}>
              <div style={{ fontSize: 20 }}>{pu.icon}</div>
              <div className="btm-shop-item-name">{pu.name}</div>
              <div className="btm-shop-cost">{pu.cost} XP</div>
              <div style={{ fontSize: 9, color: 'var(--c-text3)' }}>Have: {stats.powerUps[type] || 0}</div>
            </div>
          ))}
        </div>

        {/* Cosmetics */}
        {types.map(type => {
          const items = COSMETIC_ITEMS.filter(c => c.type === type)
          return (
            <div key={type}>
              <div className="btm-shop-section-title">{typeLabels[type].toUpperCase()}</div>
              <div className="btm-shop-grid">
                {items.map(item => {
                  const owned = stats.cosmetics.owned.includes(item.id)
                  const equipped = (stats.cosmetics as Record<string, string>)[`equipped${type.charAt(0).toUpperCase() + type.slice(1)}`] === item.id
                  return (
                    <div key={item.id}
                      className={`btm-shop-item${owned ? ' btm-shop-owned' : ''}${equipped ? ' btm-shop-equipped' : ''}`}
                      onClick={() => {
                        if (!owned && stats.xp >= item.cost) store.buyCosmetic(item.id, item.cost)
                        else if (owned) store.equipCosmetic(type, item.id)
                      }}
                    >
                      <div className="btm-shop-preview" style={{ background: item.preview === 'none' ? 'var(--c-bg-s)' : item.preview }} />
                      <div className="btm-shop-item-name">{item.name}</div>
                      <div className="btm-shop-cost">{owned ? (equipped ? '✓' : 'EQUIP') : `${item.cost} XP`}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── ACHIEVEMENTS ──────────────────────────────────────────
function AchievementsScreen() {
  const store = useBTMStore()
  const stats = store.stats
  const categories = ['speed', 'accuracy', 'streak', 'mastery', 'special'] as const

  return (
    <div className="btm-screen">
      <div className="btm-achievements">
        <h2>ACHIEVEMENTS</h2>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text3)' }}>
          {stats.unlockedAchievements.length} / {ACHIEVEMENTS.length} unlocked
        </div>
        {categories.map(cat => (
          <div key={cat}>
            <div className="btm-shop-section-title">{cat.toUpperCase()}</div>
            {ACHIEVEMENTS.filter(a => a.category === cat).map(ach => {
              const unlocked = stats.unlockedAchievements.includes(ach.id)
              return (
                <div key={ach.id} className={`btm-achievement-row${unlocked ? '' : ' btm-achievement-row-locked'}`}>
                  <div className="btm-achievement-row-icon">{ach.icon}</div>
                  <div className="btm-achievement-row-info">
                    <div className="btm-achievement-row-name">{ach.name}</div>
                    <div className="btm-achievement-row-desc">{ach.description}</div>
                  </div>
                  <div className={`btm-achievement-rarity btm-achievement-rarity-${ach.rarity}`} style={{ background: 'none', color: getRarityColor(ach.rarity) }}>
                    {getRarityLabel(ach.rarity)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── VERIFICATION (Anti-Cheat) ─────────────────────────────
function VerificationScreen() {
  const store = useBTMStore()
  const { verificationChallenge, verificationPassed } = store
  if (!verificationChallenge) return null

  return (
    <div className="btm-verify-overlay">
      <div className="btm-verify-modal">
        <div className="btm-verify-title">SHOW YOUR WORK</div>
        <div className="btm-verify-subtitle">Prove you solved it yourself</div>
        <div className="btm-verify-question">{verificationChallenge.question}</div>
        <div className="btm-verify-options">
          {verificationChallenge.options.map((opt, i) => (
            <button key={i}
              className={`btm-verify-option${verificationPassed === true && i === verificationChallenge.correctIndex ? ' btm-verify-correct' : verificationPassed === false && i !== verificationChallenge.correctIndex ? '' : ''}${verificationPassed === false && i === verificationChallenge.correctIndex ? ' btm-verify-correct' : ''}`}
              onClick={() => verificationPassed === null && store.submitVerification(i)}
              disabled={verificationPassed !== null}
            >
              {opt}
            </button>
          ))}
        </div>
        {verificationPassed === true && <div style={{ textAlign: 'center', color: '#22c55e', marginTop: 12, fontSize: 13 }}>Verified! Your answer counts.</div>}
        {verificationPassed === false && <div style={{ textAlign: 'center', color: '#ef4444', marginTop: 12, fontSize: 13 }}>Incorrect verification. XP reduced.</div>}
        {verificationPassed !== null && (
          <button className="btm-btn-primary" onClick={() => store.setScreen('result')} style={{ marginTop: 12, width: '100%' }}>CONTINUE</button>
        )}
      </div>
    </div>
  )
}

// ─── STATS ──────────────────────────────────────────────────
function StatsScreen() {
  const store = useBTMStore()
  const stats = store.stats
  const xpInfo = getXPForNextLevel(stats.xp)
  const winRate = stats.totalWins + stats.totalLosses > 0 ? Math.round((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100) : 0
  const totalStars = getTotalStars(stats)

  return (
    <div className="btm-screen">
      <div className="btm-stats">
        <h2>STATISTICS</h2>
        <div className="btm-stats-name">{store.user?.username}</div>

        <div className="btm-stats-grid">
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.totalWins}</div><div className="btm-stat-card-label">Total Wins</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{winRate}%</div><div className="btm-stat-card-label">Win Rate</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.bestTimeMs ? fmtTime(stats.bestTimeMs) : '--'}</div><div className="btm-stat-card-label">Fastest Win</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.bestStreak}</div><div className="btm-stat-card-label">Best Streak</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.bestCombo}</div><div className="btm-stat-card-label">Best Combo</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{totalStars}★</div><div className="btm-stat-card-label">Total Stars</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.towerFloor}</div><div className="btm-stat-card-label">Tower Best</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.bossDefeated.length}</div><div className="btm-stat-card-label">Bosses Beat</div></div>
          <div className="btm-stat-card"><div className="btm-stat-card-value">{stats.heatStreak}</div><div className="btm-stat-card-label">Heat Streak</div></div>
        </div>

        <div className="btm-level-section">
          <div className="btm-level-header"><span>Level {stats.level}</span><span>{xpInfo.current} / {xpInfo.needed} XP</span></div>
          <div className="btm-xp-bar btm-xp-bar-lg">
            <div className="btm-xp-fill" style={{ width: `${(xpInfo.current / xpInfo.needed) * 100}%` }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('achievements')}>ACHIEVEMENTS</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('shop')}>SHOP</button>
        </div>

        {stats.history.length > 0 && (
          <div className="btm-history-section">
            <h3>Recent</h3>
            <div className="btm-history-list">
              {stats.history.slice(-10).reverse().map(h => (
                <div key={h.id} className={`btm-history-row ${h.correct ? '' : 'wrong'}`}>
                  <div className="btm-history-result">{h.correct ? 'WIN' : 'WRONG'}</div>
                  <div className="btm-history-problem">{h.problemText.length > 50 ? h.problemText.slice(0, 50) + '...' : h.problemText}</div>
                  <div className="btm-history-time">{fmtTime(h.timeMs)}</div>
                  <div className={`btm-history-xp ${h.xpGained < 0 ? 'negative' : ''}`}>{h.xpGained > 0 ? '+' : ''}{h.xpGained}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}
