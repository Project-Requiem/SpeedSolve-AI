'use client'

import './btm.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useBTMStore, fmtTime, getAIResponse, DIFFICULTIES } from '@/lib/btm/store'
import { BTMDifficulty, BTMSubject, getXPForNextLevel, getComboMultiplier, getComboColor, POWER_UPS, PowerUpType } from '@/lib/btm/types'
import { getActiveUser } from '@/lib/btm/user'
import { WORLDS, getTotalStars, isWorldUnlocked, isLevelUnlocked, getLevelStars } from '@/lib/btm/worldLevels'
import { ACHIEVEMENTS, getRarityColor, getRarityLabel } from '@/lib/btm/achievements'
import { COSMETIC_ITEMS, getEquippedTitle } from '@/lib/btm/cosmetics'
import { ALL_BEASTS, ELEMENTS, RARITY_DATA, getMonstersByElement, getMonstersByRarity, getMonsterEvolutions, MindBeast, Element as BeastElement, MonsterRarity } from '@/lib/btm/monsters'
import { ALL_RELICS, RELIC_SLOT_INFO, getRelicsBySlot, RelicSlot } from '@/lib/btm/relics'
import { generateDailyQuests, generateWeeklyQuests, Quest, QuestProgress } from '@/lib/btm/quests'
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

// ─── Ready Phase & Countdown ─────────────────────────────
function ReadyPhase({ difficulty, subject, aiTimeMs, onStart }: { difficulty: BTMDifficulty; subject: BTMSubject; aiTimeMs: number; onStart: () => void }) {
  const [countdown, setCountdown] = useState<number | null>(null)

  const handleStart = () => {
    setCountdown(3)
  }

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      // "GO!" shown briefly then start
      const t = setTimeout(() => onStart(), 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCountdown(c => c !== null ? c - 1 : null), 700)
    return () => clearTimeout(t)
  }, [countdown, onStart])

  const diff = DIFFICULTIES.find(d => d.key === difficulty)
  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1)

  if (countdown !== null) {
    return (
      <div className="btm-ready-overlay">
        <div className={`btm-countdown${countdown === 0 ? ' btm-countdown-go' : ''}`}>
          {countdown === 0 ? 'GO!' : countdown}
        </div>
      </div>
    )
  }

  return (
    <div className="btm-ready-overlay">
      <div className="btm-ready-card">
        <div className="btm-ready-badge" style={{ color: diff?.color, borderColor: diff?.color }}>
          {diff?.label?.toUpperCase()}
        </div>
        <div className="btm-ready-subject">{subjectLabel}</div>
        <div className="btm-ready-title">ARE YOU READY?</div>
        <div className="btm-ready-ai">
          <span className="btm-ready-ai-label">SpeedSolve time:</span>
          <span className="btm-ready-ai-time">{fmtTime(aiTimeMs)}</span>
        </div>
        <div className="btm-ready-warning">⏱ Timer starts immediately — reading time counts!</div>
        <button className="btm-btn-ready" onClick={handleStart}>
          <span className="btm-btn-ready-text">I'M READY</span>
          <span className="btm-btn-ready-glow" />
        </button>
      </div>
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
        {store.screen === 'collection' && <CollectionScreen />}
        {store.screen === 'codex' && <CodexScreen />}
        {store.screen === 'beastDetail' && <BeastDetailScreen />}
        {store.screen === 'monsterLab' && <MonsterLabScreen />}
        {store.screen === 'quests' && <QuestsScreen />}
        {store.screen === 'relics' && <RelicsScreen />}
        {store.screen === 'adventure' && <AdventureScreen />}
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
  const discoveredCount = new Set(store.capturedBeasts.map(cb => cb.beastId)).size
  const featuredBeast = store.capturedBeasts.length > 0 ? store.capturedBeasts[Math.floor(Math.random() * Math.min(store.capturedBeasts.length, 10))] : null
  const featuredMindBeast = featuredBeast ? ALL_BEASTS.find(b => b.id === featuredBeast.beastId) : null

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

        {/* Active Team Display */}
        {store.activeTeam.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0', padding: '8px 12px', background: 'rgba(15,23,42,0.6)', borderRadius: 10, backdropFilter: 'blur(6px)' }}>
            <span style={{ fontSize: 10, color: '#64748b', alignSelf: 'center' }}>TEAM</span>
            {store.activeTeam.slice(0, 5).map(instanceId => {
              const cb = store.capturedBeasts.find(b => b.instanceId === instanceId)
              const beast = cb ? ALL_BEASTS.find(b => b.id === cb.beastId) : null
              if (!beast) return null
              const elColor = ELEMENT_COLORS[beast.element] || '#94a3b8'
              return (
                <div key={instanceId} style={{ fontSize: 24, filter: `drop-shadow(0 0 4px ${elColor})`, cursor: 'pointer' }} onClick={() => { store.selectBeast(cb!.beastId); store.setScreen('beastDetail') }}>{beast.icon}</div>
              )
            })}
          </div>
        )}

        {/* Main Actions Grid */}
        <div className="btm-home-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 360, margin: '0 auto' }}>
          <button className="btm-btn-primary" onClick={() => store.setScreen('adventure')} style={{ gridColumn: '1 / -1' }}>🗺️ ADVENTURE</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('worldMap')}>WORLD MAP</button>
          <button className="btm-btn-secondary" onClick={() => store.generateChallenge('scholar', 'mathematics', true)}>DAILY MACHINE</button>
          <button className="btm-btn-secondary" onClick={() => store.startTower()}>TOWER CLIMB</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('shop')}>SHOP</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('collection')}>📦 COLLECTION <span style={{ fontSize: 10, color: '#94a3b8' }}>({store.capturedBeasts.length})</span></button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('codex')}>📖 CODEX <span style={{ fontSize: 10, color: '#94a3b8' }}>({discoveredCount}/{ALL_BEASTS.length})</span></button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('monsterLab')}>🧬 MONSTER LAB</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('quests')}>📜 QUESTS</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('relics')}>✨ RELICS</button>
          <button className="btm-btn-secondary" onClick={() => store.setScreen('stats')}>📊 STATS</button>
        </div>

        {/* Featured Beast Card */}
        {featuredMindBeast && featuredBeast && (
          <div style={{ margin: '8px auto', maxWidth: 280, background: 'rgba(15,23,42,0.7)', border: `1px solid ${featuredMindBeast.color}40`, borderRadius: 10, padding: 10, backdropFilter: 'blur(8px)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 36, filter: `drop-shadow(0 0 8px ${featuredMindBeast.color})` }}>{featuredMindBeast.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Featured Beast</div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{featuredMindBeast.name}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Lv {featuredBeast.level} · {RARITY_DATA[featuredMindBeast.rarity]?.label}</div>
            </div>
          </div>
        )}

        {/* Quick Stats Row */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '4px 0' }}>
          <span style={{ fontSize: 10, color: '#64748b', background: '#0f172a', padding: '2px 8px', borderRadius: 4 }}>📦 {store.capturedBeasts.length} beasts</span>
          <span style={{ fontSize: 10, color: '#64748b', background: '#0f172a', padding: '2px 8px', borderRadius: 4 }}>✨ {store.ownedRelics.length} relics</span>
          <span style={{ fontSize: 10, color: '#64748b', background: '#0f172a', padding: '2px 8px', borderRadius: 4 }}>📜 {store.activeQuests.filter(q => q.claimed).length} claimed</span>
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
  const [gameStarted, setGameStarted] = useState(false)
  if (!problem || !benchmark || !levelPlay) return null

  const displayTime = timerRunning ? elapsed : store.elapsedMs
  const isOvertime = timerRunning && displayTime > benchmark.aiTimeMs
  const timerColor = !timerRunning && submitted ? 'var(--text-primary)' : isOvertime ? '#dc2626' : 'var(--text-primary)'
  const revealed = timerRunning || submitted
  const playerProgress = Math.min(displayTime / benchmark.aiTimeMs, 1)
  const diff = DIFFICULTIES.find(d => d.key === problem.difficulty)

  if (!gameStarted) {
    return <ReadyPhase difficulty={problem.difficulty} subject={problem.subject} aiTimeMs={benchmark.aiTimeMs} onStart={() => { setGameStarted(true); store.startTimer() }} />
  }

  return (
    <div className="btm-screen btm-screen-enter">
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
        <div className="btm-problem-card btm-problem-revealed btm-problem-enter">
          <div className="btm-problem-meta">
            <span className="btm-problem-badge" style={{ color: diff?.color }}>{diff?.label}</span>
            <span className="btm-problem-concept">{problem.concept}</span>
          </div>
          <p className="btm-problem-text">{problem.question}</p>
        </div>

        {/* Timer */}
        <div className="btm-timer-wrap">
          <div className={`btm-timer${isOvertime ? ' btm-heartbeat' : ''}`} style={{ color: timerColor }}>
            {fmtTime(displayTime)}
          </div>
        </div>

        {/* Power-up bar */}
        <PowerUpBar />

        {/* Input */}
        {!submitted && (
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
  const [gameStarted, setGameStarted] = useState(false)
  if (!problem || !benchmark) return null

  const displayTime = timerRunning ? elapsed : store.elapsedMs
  const isOvertime = timerRunning && displayTime > benchmark.aiTimeMs
  const timerColor = !timerRunning && submitted ? 'var(--text-primary)' : isOvertime ? '#dc2626' : 'var(--text-primary)'
  const revealed = timerRunning || submitted
  const playerProgress = Math.min(displayTime / benchmark.aiTimeMs, 1)
  const diff = DIFFICULTIES.find(d => d.key === problem.difficulty)

  if (!gameStarted) {
    return <ReadyPhase difficulty={problem.difficulty} subject={problem.subject} aiTimeMs={benchmark.aiTimeMs} onStart={() => { setGameStarted(true); store.startTimer() }} />
  }

  return (
    <div className="btm-screen btm-screen-enter">
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

        <div className="btm-problem-card btm-problem-revealed btm-problem-enter">
          <div className="btm-problem-meta">
            <span className="btm-problem-badge" style={{ color: diff?.color }}>{diff?.label}</span>
            <span className="btm-problem-concept">{problem.concept}</span>
          </div>
          <p className="btm-problem-text">{problem.question}</p>
        </div>

        <div className="btm-timer-wrap">
          <div className={`btm-timer${isOvertime ? ' btm-heartbeat' : ''}`} style={{ color: timerColor }}>
            {fmtTime(displayTime)}
          </div>
        </div>

        <PowerUpBar />

        {!submitted && (
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
  const [gameStarted, setGameStarted] = useState(false)
  if (!problem || !benchmark || !tower) return null

  const displayTime = timerRunning ? elapsed : store.elapsedMs
  const revealed = timerRunning || submitted
  const diff = DIFFICULTIES.find(d => d.key === problem.difficulty)

  if (!gameStarted) {
    return <ReadyPhase difficulty={problem.difficulty} subject={problem.subject} aiTimeMs={benchmark.aiTimeMs} onStart={() => { setGameStarted(true); store.startTimer() }} />
  }

  return (
    <div className="btm-screen btm-screen-enter">
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

        <div className="btm-problem-card btm-problem-revealed btm-problem-enter">
          <div className="btm-problem-meta">
            <span className="btm-problem-badge" style={{ color: diff?.color }}>{diff?.label}</span>
            <span className="btm-problem-concept">{problem.concept}</span>
          </div>
          <p className="btm-problem-text">{problem.question}</p>
        </div>

        <div className="btm-timer-wrap">
          <div className="btm-timer" style={{ color: 'var(--text-primary)' }}>
            {fmtTime(displayTime)}
          </div>
        </div>

        <PowerUpBar />

        {!submitted && (
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RPG SCREENS — Collection, Codex, BeastDetail, MonsterLab, Quests, Relics, Adventure
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ELEMENT_COLORS: Record<string, string> = {
  algebraic: '#2979ff', geometric: '#00e676', kinetic: '#ff9100', thermal: '#ff1744',
  quantum: '#b388ff', chemical: '#00bcd4', analytic: '#00e5ff', topologic: '#ff4081',
}

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b', mythic: '#ef4444',
}

// ─── COLLECTION ─────────────────────────────────────────────
function CollectionScreen() {
  const store = useBTMStore()
  const [filterElement, setFilterElement] = useState<BeastElement | null>(null)
  const captured = store.capturedBeasts
  const filtered = filterElement
    ? captured.filter(cb => ALL_BEASTS.find(b => b.id === cb.beastId)?.element === filterElement)
    : captured

  return (
    <div className="btm-screen">
      <div className="btm-collection">
        <h2 style={{ color: '#00e5ff', textAlign: 'center' }}>📦 Collection <span style={{ color: '#94a3b8', fontSize: 14 }}>({captured.length} captured)</span></h2>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <button className={`btm-ghost${!filterElement ? ' btm-ghost-active' : ''}`} onClick={() => setFilterElement(null)} style={!filterElement ? { borderColor: '#00e5ff', color: '#00e5ff' } : {}}>All</button>
          {Object.entries(ELEMENTS).map(([key, el]) => (
            <button key={key} className={`btm-ghost${filterElement === key ? ' btm-ghost-active' : ''}`} onClick={() => setFilterElement(key as BeastElement)} style={filterElement === key ? { borderColor: el.color, color: el.color } : {}}>{el.icon} {el.name}</button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>No captured beasts yet. Solve problems to capture Mind Beasts!</div>
        )}

        <div className="btm-codex-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {filtered.map(cb => {
            const beast = ALL_BEASTS.find(b => b.id === cb.beastId)
            if (!beast) return null
            const isActive = store.activeTeam.includes(cb.instanceId)
            const xpInfo = getXPForNextLevel(cb.xp)
            const xpPct = xpInfo.needed > 0 ? Math.min((xpInfo.current / xpInfo.needed) * 100, 100) : 0
            const elColor = ELEMENT_COLORS[beast.element] || '#94a3b8'
            const rarColor = RARITY_COLORS[beast.rarity] || '#94a3b8'

            return (
              <div key={cb.instanceId} className="btm-beast-card" style={{
                background: 'rgba(15,23,42,0.8)', border: `2px solid ${rarColor}`, borderRadius: 12, padding: 12,
                boxShadow: `0 0 12px ${rarColor}40`, cursor: 'pointer', position: 'relative',
                backdropFilter: 'blur(8px)', transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onClick={() => { store.selectBeast(cb.beastId); store.setScreen('beastDetail') }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 0 20px ${rarColor}80` }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 12px ${rarColor}40` }}
              >
                {isActive && <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 16, color: '#f59e0b' }}>⭐</div>}
                <div className="btm-beast-icon" style={{ fontSize: 40, textAlign: 'center', margin: '4px 0', filter: `drop-shadow(0 0 8px ${elColor})` }}>{beast.icon}</div>
                <div style={{ textAlign: 'center', fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{cb.nickname || beast.name}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: elColor }}>{ELEMENTS[beast.element]?.icon} {ELEMENTS[beast.element]?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: rarColor, background: `${rarColor}20`, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{RARITY_DATA[beast.rarity]?.label}</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Lv {cb.level}</div>
                <div style={{ background: '#1e293b', borderRadius: 4, height: 4, margin: '4px 0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${xpPct}%`, background: elColor, borderRadius: 4 }} />
                </div>
                <div className="btm-beast-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 4 }}>
                  {(['speed', 'power', 'wisdom', 'luck'] as const).map(stat => (
                    <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 8, color: '#64748b', width: 32 }}>{stat.slice(0, 3)}</span>
                      <div style={{ flex: 1, background: '#1e293b', borderRadius: 2, height: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${beast.stats[stat]}%`, background: stat === 'speed' ? '#00e5ff' : stat === 'power' ? '#ff4081' : stat === 'wisdom' ? '#b388ff' : '#00e676', borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                {!isActive && (
                  <button className="btm-ghost" style={{ width: '100%', marginTop: 6, fontSize: 10, borderColor: elColor, color: elColor }} onClick={e => { e.stopPropagation(); store.addToTeam(cb.instanceId) }}>Set Active</button>
                )}
              </div>
            )
          })}
        </div>
        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── CODEX ──────────────────────────────────────────────────
function CodexScreen() {
  const store = useBTMStore()
  const [filterElement, setFilterElement] = useState<BeastElement | null>(null)
  const [filterRarity, setFilterRarity] = useState<MonsterRarity | null>(null)
  const discoveredIds = new Set(store.capturedBeasts.map(cb => cb.beastId))
  const discoveredCount = discoveredIds.size

  let beasts = ALL_BEASTS
  if (filterElement) beasts = beasts.filter(b => b.element === filterElement)
  if (filterRarity) beasts = beasts.filter(b => b.rarity === filterRarity)

  return (
    <div className="btm-screen">
      <div className="btm-codex">
        <h2 style={{ color: '#b388ff', textAlign: 'center' }}>📖 Codex <span style={{ color: '#94a3b8', fontSize: 14 }}>{discoveredCount}/{ALL_BEASTS.length} Discovered</span></h2>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <button className={`btm-ghost${!filterElement ? ' btm-ghost-active' : ''}`} onClick={() => setFilterElement(null)} style={!filterElement ? { borderColor: '#b388ff', color: '#b388ff' } : {}}>All</button>
          {Object.entries(ELEMENTS).map(([key, el]) => (
            <button key={key} className={`btm-ghost${filterElement === key ? ' btm-ghost-active' : ''}`} onClick={() => setFilterElement(key as BeastElement)} style={filterElement === key ? { borderColor: el.color, color: el.color } : {}}>{el.icon}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <button className={`btm-ghost${!filterRarity ? ' btm-ghost-active' : ''}`} onClick={() => setFilterRarity(null)} style={!filterRarity ? { borderColor: '#b388ff', color: '#b388ff' } : {}}>All</button>
          {(['common', 'rare', 'epic', 'legendary', 'mythic'] as MonsterRarity[]).map(r => (
            <button key={r} className={`btm-ghost${filterRarity === r ? ' btm-ghost-active' : ''}`} onClick={() => setFilterRarity(r)} style={filterRarity === r ? { borderColor: RARITY_COLORS[r], color: RARITY_COLORS[r] } : {}}>{RARITY_DATA[r]?.label}</button>
          ))}
        </div>

        <div className="btm-codex-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {beasts.map(beast => {
            const discovered = discoveredIds.has(beast.id)
            const elColor = ELEMENT_COLORS[beast.element] || '#94a3b8'
            const rarColor = RARITY_COLORS[beast.rarity] || '#94a3b8'

            return (
              <div key={beast.id} className={discovered ? 'btm-beast-card' : 'btm-codex-silhouette'} style={{
                background: discovered ? 'rgba(15,23,42,0.8)' : 'rgba(5,10,20,0.9)',
                border: `1.5px solid ${discovered ? rarColor : '#1e293b'}`, borderRadius: 10, padding: 10,
                boxShadow: discovered ? `0 0 8px ${rarColor}30` : 'none', cursor: discovered ? 'pointer' : 'default',
                backdropFilter: 'blur(6px)', textAlign: 'center', transition: 'transform 0.2s',
              }}
                onClick={() => { if (discovered) { store.selectBeast(beast.id); store.setScreen('beastDetail') } }}
                onMouseEnter={e => { if (discovered) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = '' }}
              >
                <div style={{ fontSize: 32, margin: '4px 0', filter: discovered ? `drop-shadow(0 0 6px ${elColor})` : 'brightness(0) invert(0.15)', opacity: discovered ? 1 : 0.4 }}>{beast.icon}</div>
                <div style={{ fontWeight: 700, color: discovered ? '#e2e8f0' : '#334155', fontSize: 12 }}>{discovered ? beast.name : '???'}</div>
                {discovered && (
                  <>
                    <div style={{ fontSize: 9, color: elColor, marginTop: 2 }}>{ELEMENTS[beast.element]?.icon} {ELEMENTS[beast.element]?.name}</div>
                    <div style={{ fontSize: 9, color: rarColor, marginTop: 1 }}>{RARITY_DATA[beast.rarity]?.label}</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <button className="btm-ghost" onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── BEAST DETAIL ───────────────────────────────────────────
function BeastDetailScreen() {
  const store = useBTMStore()
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameVal, setNicknameVal] = useState('')
  const beast = ALL_BEASTS.find(b => b.id === store.selectedBeast)
  const captured = store.capturedBeasts.find(cb => cb.beastId === store.selectedBeast)
  const evo = store.selectedBeast ? getMonsterEvolutions(store.selectedBeast) : null

  if (!beast) return <div className="btm-screen"><div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Beast not found</div></div>

  const elColor = ELEMENT_COLORS[beast.element] || '#94a3b8'
  const rarColor = RARITY_COLORS[beast.rarity] || '#94a3b8'
  const xpInfo = captured ? getXPForNextLevel(captured.xp) : null
  const xpPct = xpInfo && xpInfo.needed > 0 ? Math.min((xpInfo.current / xpInfo.needed) * 100, 100) : 0

  const statColors: Record<string, string> = { speed: '#00e5ff', power: '#ff4081', wisdom: '#b388ff', luck: '#00e676' }

  return (
    <div className="btm-screen">
      <div className="btm-beast-detail" style={{ maxWidth: 440, margin: '0 auto', padding: 16 }}>
        {/* Icon + Name */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 72, filter: `drop-shadow(0 0 20px ${elColor})`, animation: 'btm-pulse 2s infinite' }}>{beast.icon}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0', marginTop: 8 }}>{beast.name}</div>
          <div style={{ fontSize: 12, fontStyle: 'italic', color: '#64748b' }}>{beast.codexName}</div>
          {captured?.nickname && <div style={{ fontSize: 13, color: '#f59e0b', marginTop: 2 }}>&ldquo;{captured.nickname}&rdquo;</div>}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: elColor, background: `${elColor}20`, padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>{ELEMENTS[beast.element]?.icon} {ELEMENTS[beast.element]?.name}</span>
          <span style={{ fontSize: 12, color: rarColor, background: `${rarColor}20`, padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>{RARITY_DATA[beast.rarity]?.label}</span>
          {beast.stage && <span style={{ fontSize: 12, color: '#94a3b8', background: '#1e293b', padding: '3px 10px', borderRadius: 6 }}>Stage {beast.stage}</span>}
        </div>

        {/* Lore */}
        <div className="btm-beast-lore" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 16, backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{beast.description}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, fontStyle: 'italic' }}>{beast.lore}</div>
        </div>

        {/* Stats */}
        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 16, backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>Stats</div>
          {(['speed', 'power', 'wisdom', 'luck'] as const).map(stat => (
            <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: statColors[stat], width: 50, fontWeight: 600 }}>{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
              <div style={{ flex: 1, background: '#0f172a', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${beast.stats[stat]}%`, background: statColors[stat], borderRadius: 4, boxShadow: `0 0 6px ${statColors[stat]}60` }} />
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', width: 28, textAlign: 'right' }}>{beast.stats[stat]}</span>
            </div>
          ))}
        </div>

        {/* Abilities */}
        {beast.abilities.length > 0 && (
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 16, backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>Abilities</div>
            {beast.abilities.map(ab => (
              <div key={ab.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{ab.icon}</span>
                <div>
                  <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{ab.name} <span style={{ color: '#64748b', fontWeight: 400 }}>(CD: {ab.cooldown})</span></div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{ab.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Evolution Chain */}
        {evo && (evo.prev || evo.next) && (
          <div className="btm-evo-chain" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 16, backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>Evolution Chain</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {evo.prev && (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, opacity: 0.7 }}>{evo.prev.icon}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{evo.prev.name}</div>
                  </div>
                  <span style={{ color: '#64748b' }}>→</span>
                </>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, filter: `drop-shadow(0 0 8px ${elColor})` }}>{beast.icon}</div>
                <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 700 }}>{beast.name}</div>
              </div>
              {evo.next && (
                <>
                  <span style={{ color: '#64748b' }}>→</span>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, opacity: 0.7 }}>{evo.next.icon}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{evo.next.name}</div>
                    {beast.evolveCondition && <div style={{ fontSize: 9, color: '#64748b' }}>{beast.evolveCondition}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Captured info */}
        {captured && (
          <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 16, backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>Level {captured.level}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{xpInfo ? `${xpInfo.current}/${xpInfo.needed}` : '—'} XP</span>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 6, height: 6, margin: '6px 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpPct}%`, background: elColor, borderRadius: 6, boxShadow: `0 0 8px ${elColor}60` }} />
            </div>

            {/* Nickname edit */}
            <div style={{ marginTop: 8 }}>
              {editingNickname ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input className="btm-input" style={{ flex: 1, fontSize: 12 }} value={nicknameVal} onChange={e => setNicknameVal(e.target.value)} placeholder="Nickname" maxLength={20} />
                  <button className="btm-ghost" style={{ fontSize: 10 }} onClick={() => { store.renameBeast(captured.instanceId, nicknameVal); setEditingNickname(false) }}>Save</button>
                  <button className="btm-ghost" style={{ fontSize: 10 }} onClick={() => setEditingNickname(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btm-ghost" style={{ fontSize: 10 }} onClick={() => { setNicknameVal(captured.nickname || ''); setEditingNickname(true) }}>
                  {captured.nickname ? `✏️ "${captured.nickname}"` : '✏️ Set Nickname'}
                </button>
              )}
            </div>

            {/* Evolve button */}
            {beast.evolvesTo && beast.evolveCondition && (
              <button className="btm-btn-primary" style={{ width: '100%', marginTop: 8, fontSize: 12, borderColor: rarColor, color: rarColor }} onClick={() => store.evolveBeast(captured.instanceId)}>
                ⚡ Evolve — {beast.evolveCondition}
              </button>
            )}
          </div>
        )}

        <button className="btm-ghost" onClick={() => store.setScreen('collection')}>Back</button>
      </div>
    </div>
  )
}

// ─── MONSTER LAB ────────────────────────────────────────────
function MonsterLabScreen() {
  const store = useBTMStore()
  const [tab, setTab] = useState<'evolve' | 'fusion' | 'train'>('evolve')
  const [selectedBeast, setSelectedBeast] = useState<string | null>(null)
  const [fusionA, setFusionA] = useState<string | null>(null)
  const [fusionB, setFusionB] = useState<string | null>(null)
  const [trainXp, setTrainXp] = useState(100)

  const eligibleBeasts = store.capturedBeasts.filter(cb => {
    const beast = ALL_BEASTS.find(b => b.id === cb.beastId)
    return beast?.evolvesTo
  })

  const tabStyle = (t: string) => ({
    padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    color: tab === t ? '#00e5ff' : '#64748b', borderBottom: tab === t ? '2px solid #00e5ff' : '2px solid transparent',
    background: 'none', border: 'none', transition: 'color 0.2s, border-color 0.2s',
  } as React.CSSProperties)

  return (
    <div className="btm-screen">
      <div className="btm-lab" style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <h2 style={{ color: '#ff9100', textAlign: 'center' }}>🧬 Monster Lab</h2>

        <div className="btm-lab-tabs" style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, borderBottom: '1px solid #1e293b' }}>
          <button style={tabStyle('evolve')} onClick={() => setTab('evolve')}>⚡ Evolve</button>
          <button style={tabStyle('fusion')} onClick={() => setTab('fusion')}>🔮 Fusion</button>
          <button style={tabStyle('train')} onClick={() => setTab('train')}>📈 Train</button>
        </div>

        {tab === 'evolve' && (
          <div className="btm-lab-evolve">
            {eligibleBeasts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>No beasts eligible for evolution yet</div>
            ) : (
              eligibleBeasts.map(cb => {
                const beast = ALL_BEASTS.find(b => b.id === cb.beastId)
                if (!beast) return null
                const rarColor = RARITY_COLORS[beast.rarity] || '#94a3b8'
                return (
                  <div key={cb.instanceId} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,23,42,0.7)', border: `1px solid ${rarColor}40`, borderRadius: 10, padding: 10, marginBottom: 8, backdropFilter: 'blur(6px)' }}>
                    <span style={{ fontSize: 32 }}>{beast.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{beast.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>Lv {cb.level}</span></div>
                      {beast.evolveCondition && <div style={{ fontSize: 11, color: '#94a3b8' }}>Requires: {beast.evolveCondition}</div>}
                    </div>
                    <button className="btm-btn-primary" style={{ fontSize: 10, borderColor: rarColor, color: rarColor }} onClick={() => store.evolveBeast(cb.instanceId)}>Evolve</button>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'fusion' && (
          <div className="btm-lab-fusion">
            <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>Select 2 beasts of the same element to fuse into a stronger one</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {['A', 'B'].map(slot => {
                const instanceId = slot === 'A' ? fusionA : fusionB
                const cb = instanceId ? store.capturedBeasts.find(c => c.instanceId === instanceId) : null
                const beast = cb ? ALL_BEASTS.find(b => b.id === cb.beastId) : null
                return (
                  <div key={slot} style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: 10, padding: 12, textAlign: 'center', backdropFilter: 'blur(6px)' }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Beast {slot}</div>
                    {beast ? (
                      <>
                        <div style={{ fontSize: 28 }}>{beast.icon}</div>
                        <div style={{ fontSize: 12, color: '#e2e8f0' }}>{beast.name}</div>
                        <button className="btm-ghost" style={{ fontSize: 9, marginTop: 4 }} onClick={() => slot === 'A' ? setFusionA(null) : setFusionB(null)}>Remove</button>
                      </>
                    ) : (
                      <div style={{ fontSize: 20, color: '#334155' }}>?</div>
                    )}
                  </div>
                )
              })}
            </div>
            {!fusionA && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {store.capturedBeasts.map(cb => {
                  const beast = ALL_BEASTS.find(b => b.id === cb.beastId)
                  if (!beast) return null
                  return (
                    <button key={cb.instanceId} className="btm-ghost" style={{ fontSize: 10 }} onClick={() => setFusionA(cb.instanceId)}>{beast.icon} {beast.name}</button>
                  )
                })}
              </div>
            )}
            {fusionA && !fusionB && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {store.capturedBeasts.filter(cb => {
                  const beastA = ALL_BEASTS.find(b => b.id === store.capturedBeasts.find(c => c.instanceId === fusionA)?.beastId)
                  const beastB = ALL_BEASTS.find(b => b.id === cb.beastId)
                  return beastA && beastB && beastA.element === beastB.element && cb.instanceId !== fusionA
                }).map(cb => {
                  const beast = ALL_BEASTS.find(b => b.id === cb.beastId)
                  if (!beast) return null
                  return (
                    <button key={cb.instanceId} className="btm-ghost" style={{ fontSize: 10 }} onClick={() => setFusionB(cb.instanceId)}>{beast.icon} {beast.name}</button>
                  )
                })}
              </div>
            )}
            {fusionA && fusionB && (
              <button className="btm-btn-primary" style={{ width: '100%', fontSize: 12 }} onClick={() => { const bA = ALL_BEASTS.find(b => b.id === store.capturedBeasts.find(c => c.instanceId === fusionA)?.beastId); if (bA) { const higher = ALL_BEASTS.filter(b => b.element === bA.element && (b.stage > (bA.stage))); const pick = higher[Math.floor(Math.random() * higher.length)]; if (pick) store.captureBeast(pick.id); } setFusionA(null); setFusionB(null); }}>🔮 Fuse!</button>
            )}
          </div>
        )}

        {tab === 'train' && (
          <div className="btm-lab-train">
            <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>Select a beast and spend XP to level it up</div>
            {!selectedBeast ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {store.capturedBeasts.map(cb => {
                  const beast = ALL_BEASTS.find(b => b.id === cb.beastId)
                  if (!beast) return null
                  return (
                    <button key={cb.instanceId} className="btm-ghost" style={{ fontSize: 10 }} onClick={() => setSelectedBeast(cb.instanceId)}>{beast.icon} {beast.name} Lv{cb.level}</button>
                  )
                })}
              </div>
            ) : (
              (() => {
                const cb = store.capturedBeasts.find(c => c.instanceId === selectedBeast)
                const beast = cb ? ALL_BEASTS.find(b => b.id === cb.beastId) : null
                if (!cb || !beast) return null
                return (
                  <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: 10, padding: 16, textAlign: 'center', backdropFilter: 'blur(6px)' }}>
                    <div style={{ fontSize: 40 }}>{beast.icon}</div>
                    <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>{beast.name}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Level {cb.level} → {cb.level + 1}</div>
                    <div style={{ margin: '12px 0' }}>
                      <label style={{ fontSize: 11, color: '#64748b' }}>XP to invest: </label>
                      <input type="range" min={50} max={500} step={50} value={trainXp} onChange={e => setTrainXp(Number(e.target.value))} style={{ width: '60%' }} />
                      <span style={{ fontSize: 12, color: '#00e5ff', marginLeft: 8 }}>{trainXp} XP</span>
                    </div>
                    <button className="btm-btn-primary" style={{ fontSize: 12 }} onClick={() => { store.feedBeast(selectedBeast, trainXp); setSelectedBeast(null) }}>📈 Train!</button>
                    <button className="btm-ghost" style={{ fontSize: 10, marginTop: 8 }} onClick={() => setSelectedBeast(null)}>Cancel</button>
                  </div>
                )
              })()
            )}
          </div>
        )}

        <button className="btm-ghost" style={{ marginTop: 16 }} onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── QUESTS ─────────────────────────────────────────────────
function QuestsScreen() {
  const store = useBTMStore()
  const playerLevel = store.stats.level
  const dailyQuests = generateDailyQuests(playerLevel)
  const weeklyQuests = generateWeeklyQuests(playerLevel)
  const questProgressMap = new Map(store.activeQuests.map(q => [q.questId, q]))
  const now = new Date()
  const nextDailyReset = new Date(now); nextDailyReset.setDate(nextDailyReset.getDate() + 1); nextDailyReset.setHours(0, 0, 0, 0)
  const nextWeeklyReset = new Date(now); nextWeeklyReset.setDate(nextWeeklyReset.getDate() + (7 - nextWeeklyReset.getDay())); nextWeeklyReset.setHours(0, 0, 0, 0)

  const renderQuest = (quest: Quest) => {
    const progress = questProgressMap.get(quest.id)
    const current = progress?.current || 0
    const completed = progress?.completed || current >= quest.target
    const claimed = progress?.claimed || false
    const pct = Math.min((current / quest.target) * 100, 100)
    const diffColors: Record<string, string> = { easy: '#00e676', medium: '#ffd740', hard: '#ff9100', legendary: '#ef4444' }
    const diffColor = diffColors[quest.difficulty] || '#94a3b8'

    return (
      <div key={quest.id} className="btm-quest-card" style={{
        background: 'rgba(15,23,42,0.7)', border: `1px solid ${completed ? '#00e67640' : '#1e293b'}`, borderRadius: 10, padding: 12, marginBottom: 8,
        backdropFilter: 'blur(6px)', opacity: claimed ? 0.5 : 1,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 24 }}>{quest.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{quest.name}</span>
              <span style={{ fontSize: 9, color: diffColor, background: `${diffColor}20`, padding: '1px 6px', borderRadius: 4 }}>{quest.difficulty}</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{quest.description}</div>
            <div className="btm-quest-progress" style={{ margin: '6px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                <span>{current}/{quest.target}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: completed ? '#00e676' : '#00e5ff', borderRadius: 4, boxShadow: completed ? '0 0 6px #00e67660' : 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#f59e0b' }}>🎁 {quest.reward.xp} XP</span>
              {completed && !claimed && (
                <button className="btm-btn-primary" style={{ fontSize: 10, padding: '2px 10px', borderColor: '#00e676', color: '#00e676' }} onClick={() => store.claimQuestReward(quest.id)}>Claim</button>
              )}
              {claimed && <span style={{ fontSize: 10, color: '#64748b' }}>✅ Claimed</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="btm-screen">
      <div className="btm-quests" style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <h2 style={{ color: '#ffd740', textAlign: 'center' }}>📜 Quests</h2>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginBottom: 16 }}>
          Daily reset: {nextDailyReset.toLocaleTimeString()} · Weekly reset: {nextWeeklyReset.toLocaleDateString()}
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#00e5ff', fontSize: 14, marginBottom: 8 }}>☀️ Daily Quests</h3>
          {dailyQuests.map(renderQuest)}
        </div>

        <div>
          <h3 style={{ color: '#b388ff', fontSize: 14, marginBottom: 8 }}>🌙 Weekly Quests</h3>
          {weeklyQuests.map(renderQuest)}
        </div>

        <button className="btm-ghost" style={{ marginTop: 16 }} onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── RELICS ─────────────────────────────────────────────────
function RelicsScreen() {
  const store = useBTMStore()
  const [shopOpen, setShopOpen] = useState(false)
  const slots: RelicSlot[] = ['head', 'body', 'weapon', 'accessory', 'aura']

  const totalBonuses = slots.reduce((acc, slot) => {
    const relicId = store.equippedRelics[slot]
    if (!relicId) return acc
    const relic = ALL_RELICS.find(r => r.id === relicId)
    if (!relic) return acc
    return {
      speed: acc.speed + (relic.bonuses.speedBonus || 0),
      xp: acc.xp + (relic.bonuses.xpBonus || 0),
      combo: acc.combo + (relic.bonuses.comboBonus || 0),
      capture: acc.capture + (relic.bonuses.captureBonus || 0),
      luck: acc.luck + (relic.bonuses.luckBonus || 0),
      shield: acc.shield + (relic.bonuses.shieldChance || 0),
      crit: acc.crit + (relic.bonuses.critChance || 0),
    }
  }, { speed: 0, xp: 0, combo: 0, capture: 0, luck: 0, shield: 0, crit: 0 })

  const shopRelics = ALL_RELICS.filter(r => !store.ownedRelics.includes(r.id)).sort((a, b) => a.cost - b.cost)

  return (
    <div className="btm-screen">
      <div className="btm-relics" style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <h2 style={{ color: '#a855f7', textAlign: 'center' }}>✨ Relics</h2>

        {/* Active bonuses summary */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
          {totalBonuses.speed > 0 && <span style={{ fontSize: 10, color: '#00e5ff', background: '#00e5ff20', padding: '2px 8px', borderRadius: 4 }}>⚡ Speed +{totalBonuses.speed}%</span>}
          {totalBonuses.xp > 0 && <span style={{ fontSize: 10, color: '#00e676', background: '#00e67620', padding: '2px 8px', borderRadius: 4 }}>📊 XP +{totalBonuses.xp}%</span>}
          {totalBonuses.combo > 0 && <span style={{ fontSize: 10, color: '#ffd740', background: '#ffd74020', padding: '2px 8px', borderRadius: 4 }}>🔥 Combo +{totalBonuses.combo}%</span>}
          {totalBonuses.capture > 0 && <span style={{ fontSize: 10, color: '#b388ff', background: '#b388ff20', padding: '2px 8px', borderRadius: 4 }}>🎯 Capture +{totalBonuses.capture}%</span>}
          {totalBonuses.luck > 0 && <span style={{ fontSize: 10, color: '#00e676', background: '#00e67620', padding: '2px 8px', borderRadius: 4 }}>🍀 Luck +{totalBonuses.luck}%</span>}
          {totalBonuses.shield > 0 && <span style={{ fontSize: 10, color: '#2979ff', background: '#2979ff20', padding: '2px 8px', borderRadius: 4 }}>🛡 Shield {totalBonuses.shield}%</span>}
          {totalBonuses.crit > 0 && <span style={{ fontSize: 10, color: '#ff4081', background: '#ff408120', padding: '2px 8px', borderRadius: 4 }}>💥 Crit {totalBonuses.crit}%</span>}
        </div>

        {/* Equipment slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {slots.map(slot => {
            const info = RELIC_SLOT_INFO[slot]
            const equippedId = store.equippedRelics[slot]
            const relic = equippedId ? ALL_RELICS.find(r => r.id === equippedId) : null
            return (
              <div key={slot} className="btm-relic-slot" style={{
                background: 'rgba(15,23,42,0.7)', border: `1.5px solid ${relic ? relic.color + '80' : '#1e293b'}`, borderRadius: 10, padding: 8, textAlign: 'center',
                backdropFilter: 'blur(6px)', boxShadow: relic ? `0 0 8px ${relic.color}30` : 'none',
              }}>
                <div style={{ fontSize: 16 }}>{info.icon}</div>
                <div style={{ fontSize: 9, color: '#64748b', margin: '2px 0' }}>{info.label}</div>
                {relic ? (
                  <>
                    <div style={{ fontSize: 18 }}>{relic.icon}</div>
                    <div style={{ fontSize: 9, color: '#e2e8f0' }}>{relic.name}</div>
                    <button className="btm-ghost" style={{ fontSize: 8, marginTop: 2, padding: '1px 4px' }} onClick={() => store.unequipRelic(slot)}>Unequip</button>
                  </>
                ) : (
                  <div style={{ fontSize: 14, color: '#334155' }}>—</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Owned Relics */}
        <h3 style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Owned Relics ({store.ownedRelics.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
          {store.ownedRelics.map(relicId => {
            const relic = ALL_RELICS.find(r => r.id === relicId)
            if (!relic) return null
            const isEquipped = Object.values(store.equippedRelics).includes(relicId)
            return (
              <div key={relicId} className="btm-relic-card" style={{
                background: 'rgba(15,23,42,0.7)', border: `1px solid ${relic.color}40`, borderRadius: 8, padding: 8,
                backdropFilter: 'blur(6px)', opacity: isEquipped ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{relic.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{relic.name}</div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{RELIC_SLOT_INFO[relic.slot].label}</div>
                  </div>
                </div>
                <div className="btm-relic-bonuses" style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
                  {relic.bonuses.speedBonus && <span>⚡+{relic.bonuses.speedBonus}% </span>}
                  {relic.bonuses.xpBonus && <span>📊+{relic.bonuses.xpBonus}% </span>}
                  {relic.bonuses.comboBonus && <span>🔥+{relic.bonuses.comboBonus}% </span>}
                  {relic.bonuses.captureBonus && <span>🎯+{relic.bonuses.captureBonus}% </span>}
                </div>
                {!isEquipped && (
                  <button className="btm-ghost" style={{ fontSize: 9, marginTop: 4, width: '100%' }} onClick={() => store.equipRelic(relicId, relic.slot)}>Equip</button>
                )}
              </div>
            )
          })}
        </div>

        {/* Shop toggle */}
        <button className="btm-btn-secondary" style={{ width: '100%', fontSize: 12, marginBottom: 8 }} onClick={() => setShopOpen(!shopOpen)}>
          {shopOpen ? '▼ Close Shop' : '▶ Open Shop'} ({shopRelics.length} available)
        </button>

        {shopOpen && (
          <div>
            {shopRelics.map(relic => {
              const rarColor = RARITY_COLORS[relic.rarity] || '#94a3b8'
              const canAfford = store.stats.xp >= relic.cost
              return (
                <div key={relic.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(15,23,42,0.5)', border: `1px solid ${rarColor}30`, borderRadius: 8, padding: 8, marginBottom: 6, backdropFilter: 'blur(4px)' }}>
                  <span style={{ fontSize: 22 }}>{relic.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{relic.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{relic.description}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#f59e0b' }}>{relic.cost} XP</div>
                    <button className="btm-btn-primary" style={{ fontSize: 9, padding: '2px 8px', borderColor: canAfford ? '#00e676' : '#334155', color: canAfford ? '#00e676' : '#334155' }} disabled={!canAfford} onClick={() => store.buyRelic(relic.id)}>Buy</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button className="btm-ghost" style={{ marginTop: 16 }} onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}

// ─── ADVENTURE ──────────────────────────────────────────────
function AdventureScreen() {
  const store = useBTMStore()
  const regions = Object.entries(ELEMENTS).map(([key, el], regionIdx) => {
    const nodeTypes = ['📖', '⚔️', '💎', '👑', '🏕️']
    const nodeLabels = ['Story', 'Encounter', 'Treasure', 'Boss', 'Rest']
    const nodes = nodeTypes.map((icon, i) => {
      const nodeId = `${key}-node-${i}`
      const completed = store.adventureProgress[nodeId] || false
      const prevCompleted = i === 0 || store.adventureProgress[`${key}-node-${i - 1}`] || false
      const unlocked = i === 0 ? true : prevCompleted
      return { id: nodeId, icon, label: nodeLabels[i], completed, unlocked, index: i }
    })
    const completedCount = nodes.filter(n => n.completed).length
    return { id: key, name: el.name, icon: el.icon, color: el.color, gradient: el.gradient, nodes, completedCount, regionIdx }
  })

  const currentRegion = store.currentRegion

  return (
    <div className="btm-screen">
      <div className="btm-adventure" style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
        <h2 style={{ color: '#00e676', textAlign: 'center' }}>🗺️ Adventure</h2>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginBottom: 16 }}>
          Journey through 8 elemental regions. Complete nodes to unlock the next!
        </div>

        {regions.map(region => {
          const isCurrent = currentRegion === region.id
          return (
            <div key={region.id} className="btm-region" style={{
              background: isCurrent ? 'rgba(15,23,42,0.9)' : 'rgba(15,23,42,0.6)',
              border: `1.5px solid ${isCurrent ? region.color : '#1e293b'}`, borderRadius: 12, padding: 14, marginBottom: 12,
              backdropFilter: 'blur(8px)', boxShadow: isCurrent ? `0 0 12px ${region.color}30` : 'none',
            }}>
              {/* Region header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{region.icon}</span>
                  <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>{region.name}</span>
                  {isCurrent && <span style={{ fontSize: 9, color: region.color, background: `${region.color}20`, padding: '1px 6px', borderRadius: 4 }}>CURRENT</span>}
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>{region.completedCount}/5</span>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#0f172a', borderRadius: 4, height: 4, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(region.completedCount / 5) * 100}%`, background: region.color, borderRadius: 4, boxShadow: `0 0 4px ${region.color}60` }} />
              </div>

              {/* Node path */}
              <div className="btm-adventure-path" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {region.nodes.map((node, i) => (
                  <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button className="btm-adventure-node" style={{
                      width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: node.completed ? `${region.color}20` : node.unlocked ? 'rgba(30,41,59,0.8)' : 'rgba(10,15,25,0.9)',
                      border: `1.5px solid ${node.completed ? region.color : node.unlocked ? '#334155' : '#1e293b'}`,
                      boxShadow: node.completed ? `0 0 8px ${region.color}40` : 'none',
                      color: node.completed ? '#e2e8f0' : node.unlocked ? '#94a3b8' : '#334155',
                      fontSize: 18, cursor: node.unlocked ? 'pointer' : 'default', transition: 'transform 0.2s, box-shadow 0.2s',
                      position: 'relative',
                    }}
                      disabled={!node.unlocked}
                      onClick={() => { if (node.unlocked && !node.completed) { store.setRegion(region.id); store.completeAdventureNode(node.id) } }}
                      onMouseEnter={e => { if (node.unlocked) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 12px ${region.color}60` } }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = node.completed ? `0 0 8px ${region.color}40` : 'none' }}
                    >
                      {node.icon}
                    </button>
                    {i < region.nodes.length - 1 && (
                      <div style={{
                        width: 20, height: 2,
                        background: node.completed ? region.color : '#1e293b',
                        boxShadow: node.completed ? `0 0 4px ${region.color}40` : 'none',
                        transition: 'background 0.3s',
                      }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Set as current region */}
              {!isCurrent && region.nodes.some(n => n.unlocked && !n.completed) && (
                <button className="btm-ghost" style={{ fontSize: 10, marginTop: 8, width: '100%', borderColor: region.color, color: region.color }} onClick={() => store.setRegion(region.id)}>Set as Current Region</button>
              )}
            </div>
          )
        })}

        <button className="btm-ghost" style={{ marginTop: 16 }} onClick={() => store.setScreen('home')}>Back</button>
      </div>
    </div>
  )
}
