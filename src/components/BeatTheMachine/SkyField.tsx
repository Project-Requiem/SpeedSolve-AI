'use client'

import { useEffect, useRef } from 'react'
import anime from 'animejs'

// ─── Seeded random ─────────
function sr(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// ─── Star types ─────────
interface StarData {
  x: number; y: number; size: number; color: string
  glowColor: string; glowSize: number; baseOpacity: number
  twinkleSpeed: number; driftRadius: number; driftDuration: number; delay: number
}

const STAR_COLORS = [
  { core: '#ffffff', glow: 'rgba(255,255,255,0.5)' },
  { core: '#bfdbfe', glow: 'rgba(191,219,254,0.4)' },
  { core: '#fef3c7', glow: 'rgba(254,243,199,0.4)' },
  { core: '#c7d2fe', glow: 'rgba(199,210,254,0.4)' },
  { core: '#e0e7ff', glow: 'rgba(224,231,255,0.35)' },
]

function generateStars(count: number, seed = 42): StarData[] {
  const stars: StarData[] = []
  for (let i = 0; i < count; i++) {
    const r = sr(seed + i), r2 = sr(seed + i + 1000), r3 = sr(seed + i + 2000)
    const r4 = sr(seed + i + 3000), r5 = sr(seed + i + 4000)
    const r6 = sr(seed + i + 5000), r7 = sr(seed + i + 6000)
    const colorIdx = Math.floor(r4 * STAR_COLORS.length)
    let size: number, glowSize: number
    if (r3 < 0.35) { size = 1.5 + r5 * 1.5; glowSize = 4 + r6 * 4 }
    else if (r3 < 0.72) { size = 2.5 + r5 * 2; glowSize = 8 + r6 * 8 }
    else { size = 4 + r5 * 2.5; glowSize = 16 + r6 * 14 }
    stars.push({
      x: r * 100, y: r2 * 100, size,
      color: STAR_COLORS[colorIdx].core, glowColor: STAR_COLORS[colorIdx].glow,
      glowSize, baseOpacity: 0.25 + r7 * 0.75,
      twinkleSpeed: 2 + r5 * 4, driftRadius: 6 + r6 * 20,
      driftDuration: 18000 + r7 * 35000, delay: r5 * 7000,
    })
  }
  return stars
}

// ─── Cloud data ─────────
interface CloudData { x: number; y: number; scale: number; speed: number; opacity: number }
const CLOUDS: CloudData[] = [
  { x: 10, y: 15, scale: 1, speed: 45000, opacity: 0.7 },
  { x: 55, y: 8, scale: 0.7, speed: 60000, opacity: 0.5 },
  { x: 80, y: 22, scale: 0.85, speed: 52000, opacity: 0.6 },
  { x: 30, y: 30, scale: 0.6, speed: 70000, opacity: 0.4 },
  { x: -10, y: 12, scale: 0.9, speed: 55000, opacity: 0.55 },
]

function cloudSVG(scale: number, opacity: number): string {
  const w = 120 * scale, h = 50 * scale
  return `<svg width="${w}" height="${h}" viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:${opacity}">
    <ellipse cx="60" cy="35" rx="45" ry="14" fill="white" opacity="0.9"/>
    <ellipse cx="40" cy="28" rx="28" ry="18" fill="white" opacity="0.95"/>
    <ellipse cx="75" cy="26" rx="25" ry="16" fill="white" opacity="0.9"/>
    <ellipse cx="55" cy="20" rx="20" ry="15" fill="white"/>
    <ellipse cx="30" cy="32" rx="18" ry="10" fill="white" opacity="0.85"/>
    <ellipse cx="85" cy="32" rx="16" ry="9" fill="white" opacity="0.8"/>
  </svg>`
}

// ─── Sunrise / Sunset gradient palettes ─────────
const SUNRISE_GRADIENT = 'linear-gradient(180deg, #0b1a2e 0%, #1a1040 12%, #3d2060 22%, #8e3a59 34%, #c0504d 44%, #e8834a 54%, #f5b041 66%, #f7dc6f 78%, #aed6f1 100%)'
const SUNSET_GRADIENT = 'linear-gradient(180deg, #0b1a2e 0%, #1a1040 10%, #3d2060 20%, #8e3a59 30%, #c0504d 42%, #e8834a 52%, #f5b041 62%, #f7dc6f 72%, #e8834a 82%, #c0392b 92%, #0b1a2e 100%)'

interface SkyFieldProps {
  mode: 'night' | 'day'
}

export default function SkyField({ mode }: SkyFieldProps) {
  const nightSkyRef = useRef<HTMLDivElement>(null)
  const transitionSkyRef = useRef<HTMLDivElement>(null)
  const daySkyRef = useRef<HTMLDivElement>(null)
  const moonWrapRef = useRef<HTMLDivElement>(null)
  const sunWrapRef = useRef<HTMLDivElement>(null)
  const starsContainerRef = useRef<HTMLDivElement>(null)
  const cloudsContainerRef = useRef<HTMLDivElement>(null)
  const prevMode = useRef<'night' | 'day' | null>(null)
  const starEls = useRef<HTMLDivElement[]>([])
  const cloudEls = useRef<HTMLDivElement[]>([])

  // ─── Init: create stars + clouds, set initial visibility ───
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Create stars
    const stars = generateStars(55)
    stars.forEach((s, i) => {
      const el = document.createElement('div')
      el.style.cssText = `position:absolute;left:${s.x}%;top:${s.y}%;width:${s.size}px;height:${s.size}px;border-radius:50%;background:${s.color};pointer-events:none;opacity:${s.baseOpacity};box-shadow:0 0 ${s.glowSize}px ${s.glowSize * 0.35}px ${s.glowColor};will-change:transform,opacity;`
      starsContainerRef.current?.appendChild(el)
      starEls.current.push(el)
      if (!reduced) {
        anime({
          targets: el, opacity: [s.baseOpacity * 0.2, s.baseOpacity, s.baseOpacity * 0.6, s.baseOpacity * 0.9, s.baseOpacity * 0.3],
          scale: [0.7, 1.2, 0.85, 1.05, 0.85], duration: s.twinkleSpeed * 1000, delay: s.delay,
          easing: 'easeInOutSine', loop: true, direction: 'alternate',
        })
        const a1 = sr(i + 100) * Math.PI * 2
        const a2 = a1 + Math.PI * (0.5 + sr(i + 200) * 0.8)
        const a3 = a1 + Math.PI * (1 + sr(i + 300) * 0.6)
        anime({
          targets: el,
          translateX: [
            { value: Math.cos(a1) * s.driftRadius, duration: s.driftDuration * 0.33 },
            { value: Math.cos(a2) * s.driftRadius * 0.7, duration: s.driftDuration * 0.33 },
            { value: 0, duration: s.driftDuration * 0.34 },
          ],
          translateY: [
            { value: Math.sin(a1) * s.driftRadius, duration: s.driftDuration * 0.33 },
            { value: Math.sin(a2) * s.driftRadius * 0.7, duration: s.driftDuration * 0.33 },
            { value: 0, duration: s.driftDuration * 0.34 },
          ],
          easing: 'easeInOutSine', loop: true, delay: s.delay,
        })
      }
    })

    // Create clouds
    CLOUDS.forEach((c, i) => {
      const el = document.createElement('div')
      el.style.cssText = `position:absolute;left:${c.x}%;top:${c.y}%;pointer-events:none;will-change:transform;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.06));`
      el.innerHTML = cloudSVG(c.scale, c.opacity)
      cloudsContainerRef.current?.appendChild(el)
      cloudEls.current.push(el)
      if (!reduced) {
        anime({
          targets: el,
          translateX: [{ value: window.innerWidth * 0.6, duration: c.speed }],
          easing: 'linear', loop: true, delay: i * 3000,
        })
      }
    })

    // Set initial visibility instantly (no animation on first paint)
    const isDay = mode === 'day'
    if (nightSkyRef.current) nightSkyRef.current.style.opacity = isDay ? '0' : '1'
    if (daySkyRef.current) daySkyRef.current.style.opacity = isDay ? '1' : '0'
    if (transitionSkyRef.current) transitionSkyRef.current.style.opacity = '0'
    if (moonWrapRef.current) {
      moonWrapRef.current.style.opacity = isDay ? '0' : '1'
      moonWrapRef.current.style.transform = isDay ? 'translateY(40px) scale(0.5)' : 'translateY(0) scale(1)'
    }
    if (sunWrapRef.current) {
      sunWrapRef.current.style.opacity = isDay ? '1' : '0'
      sunWrapRef.current.style.transform = isDay ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.5)'
    }
    if (starsContainerRef.current) starsContainerRef.current.style.opacity = isDay ? '0' : '1'
    if (cloudsContainerRef.current) cloudsContainerRef.current.style.opacity = isDay ? '0.8' : '0'

    prevMode.current = mode

    return () => {
      starEls.current.forEach(el => el.remove())
      cloudEls.current.forEach(el => el.remove())
      starEls.current = []
      cloudEls.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Mode change: cinematic sunrise / sunset transition ───
  useEffect(() => {
    // Skip on first mount (handled in init above)
    if (prevMode.current === null) {
      prevMode.current = mode
      return
    }
    if (prevMode.current === mode) return

    const goingToDay = mode === 'day'
    prevMode.current = mode
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = reduced ? 0 : 2200

    // Pick the right transition gradient
    if (transitionSkyRef.current) {
      transitionSkyRef.current.style.background = goingToDay ? SUNRISE_GRADIENT : SUNSET_GRADIENT
    }

    // ── Celestial bodies: moon sets / sun rises (or vice-versa) ──
    if (moonWrapRef.current) {
      anime({
        targets: moonWrapRef.current,
        opacity: goingToDay ? [1, 0] : [0, 1],
        translateY: goingToDay ? [0, 40] : [40, 0],
        scale: goingToDay ? [1, 0.5] : [0.5, 1],
        duration: dur,
        easing: 'easeInOutSine',
      })
    }

    if (sunWrapRef.current) {
      anime({
        targets: sunWrapRef.current,
        opacity: goingToDay ? [0, 1] : [1, 0],
        translateY: goingToDay ? [40, 0] : [0, 40],
        scale: goingToDay ? [0.5, 1] : [1, 0.5],
        duration: dur,
        easing: 'easeInOutSine',
      })
    }

    // ── Sky gradient layers ──
    if (nightSkyRef.current) {
      anime({
        targets: nightSkyRef.current,
        opacity: goingToDay ? [1, 0] : [0, 1],
        duration: dur,
        easing: 'easeInOutSine',
      })
    }

    if (daySkyRef.current) {
      anime({
        targets: daySkyRef.current,
        opacity: goingToDay ? [0, 1] : [1, 0],
        duration: dur,
        easing: 'easeInOutSine',
      })
    }

    // Transition sky — peaks in the middle of the animation
    if (transitionSkyRef.current) {
      anime({
        targets: transitionSkyRef.current,
        opacity: [
          { value: 0, duration: 0 },
          { value: 1, duration: dur * 0.35 },
          { value: 1, duration: dur * 0.30 },
          { value: 0, duration: dur * 0.35 },
        ],
        easing: 'easeInOutSine',
      })
    }

    // ── Stars: fade out during sunrise, fade in during sunset ──
    if (starsContainerRef.current) {
      anime({
        targets: starsContainerRef.current,
        opacity: goingToDay ? [1, 0] : [0, 1],
        duration: dur * 0.6,
        easing: 'easeInSine',
        delay: goingToDay ? 0 : dur * 0.4,
      })
    }

    // ── Clouds: fade in during sunrise, fade out during sunset ──
    if (cloudsContainerRef.current) {
      anime({
        targets: cloudsContainerRef.current,
        opacity: goingToDay ? [0, 0.8] : [0.8, 0],
        duration: dur * 0.6,
        easing: 'easeOutSine',
        delay: goingToDay ? dur * 0.4 : 0,
      })
    }
  }, [mode])

  return (
    <>
      {/* Sky gradient layers */}
      <div ref={nightSkyRef} className="btm-sky-layer btm-sky-night" />
      <div ref={transitionSkyRef} className="btm-sky-layer btm-sky-transition" />
      <div ref={daySkyRef} className="btm-sky-layer btm-sky-day" />

      {/* Stars container (night) */}
      <div ref={starsContainerRef} className="btm-skyfield" />

      {/* Clouds container (day) */}
      <div ref={cloudsContainerRef} className="btm-dayfield" />

      {/* Moon — wrapper for transition anim, inner for ambient CSS anim */}
      <div ref={moonWrapRef} className="btm-celestial-wrap">
        <div className="btm-moon-anime" />
      </div>

      {/* Sun — wrapper for transition anim, inner for ambient CSS anim */}
      <div ref={sunWrapRef} className="btm-celestial-wrap">
        <div className="btm-sun-anime">
          <div className="btm-sun-core" />
          <div className="btm-sun-rays" />
        </div>
      </div>
    </>
  )
}
