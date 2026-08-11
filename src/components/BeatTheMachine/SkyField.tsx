'use client'

import { useEffect, useRef } from 'react'
import anime from 'animejs'

// ─── Generate deterministic random positions using seed ─────────
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface StarData {
  x: number
  y: number
  size: number
  color: string
  glowColor: string
  glowSize: number
  baseOpacity: number
  twinkleSpeed: number
  driftRadius: number
  driftDuration: number
  delay: number
}

interface MoonCrater {
  x: number
  y: number
  r: number
  color: string
  opacity: number
}

const STAR_COLORS = [
  { core: '#ffffff', glow: 'rgba(255,255,255,0.6)' },
  { core: '#bfdbfe', glow: 'rgba(191,219,254,0.5)' },
  { core: '#fef3c7', glow: 'rgba(254,243,199,0.5)' },
  { core: '#c7d2fe', glow: 'rgba(199,210,254,0.5)' },
  { core: '#e0e7ff', glow: 'rgba(224,231,255,0.4)' },
]

function generateStars(count: number, seed: number = 42): StarData[] {
  const stars: StarData[] = []
  for (let i = 0; i < count; i++) {
    const r = seededRandom(seed + i)
    const r2 = seededRandom(seed + i + 1000)
    const r3 = seededRandom(seed + i + 2000)
    const r4 = seededRandom(seed + i + 3000)
    const r5 = seededRandom(seed + i + 4000)
    const r6 = seededRandom(seed + i + 5000)
    const r7 = seededRandom(seed + i + 6000)
    const colorIdx = Math.floor(r4 * STAR_COLORS.length)
    const sizeBucket = r3
    let size: number, glowSize: number
    if (sizeBucket < 0.3) {
      // Small stars
      size = 1.5 + r5 * 1.5
      glowSize = 4 + r6 * 4
    } else if (sizeBucket < 0.7) {
      // Medium stars
      size = 3 + r5 * 2
      glowSize = 10 + r6 * 8
    } else {
      // Large bright stars
      size = 4.5 + r5 * 2.5
      glowSize = 18 + r6 * 12
    }
    stars.push({
      x: r * 100,
      y: r2 * 100,
      size,
      color: STAR_COLORS[colorIdx].core,
      glowColor: STAR_COLORS[colorIdx].glow,
      glowSize,
      baseOpacity: 0.3 + r7 * 0.7,
      twinkleSpeed: 2 + r5 * 4,
      driftRadius: 8 + r6 * 25,
      driftDuration: 15000 + r7 * 40000,
      delay: r5 * 8000,
    })
  }
  return stars
}

function generateMoonCraters(): MoonCrater[] {
  return [
    { x: 30, y: 25, r: 8, color: '#e8e0c8', opacity: 0.3 },
    { x: 55, y: 18, r: 5, color: '#d4cfe8', opacity: 0.25 },
    { x: 40, y: 60, r: 10, color: '#c7d8f5', opacity: 0.2 },
    { x: 70, y: 50, r: 6, color: '#f5e6d0', opacity: 0.25 },
    { x: 22, y: 68, r: 7, color: '#dbeafe', opacity: 0.2 },
    { x: 60, y: 70, r: 4, color: '#e0d4f5', opacity: 0.15 },
    { x: 48, y: 40, r: 12, color: '#f0e7ce', opacity: 0.15 },
  ]
}

export default function SkyField() {
  const containerRef = useRef<HTMLDivElement>(null)
  const moonRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<anime.AnimeInstance[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    // Check reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const stars = generateStars(60)
    const craters = generateMoonCraters()

    // ── Create star elements ──
    const starEls: HTMLDivElement[] = []
    stars.forEach((s, i) => {
      const el = document.createElement('div')
      el.style.cssText = `
        position: absolute;
        left: ${s.x}%;
        top: ${s.y}%;
        width: ${s.size}px;
        height: ${s.size}px;
        border-radius: 50%;
        background: ${s.color};
        pointer-events: none;
        opacity: ${s.baseOpacity};
        box-shadow: 0 0 ${s.glowSize}px ${s.glowSize * 0.4}px ${s.glowColor};
        will-change: transform, opacity;
      `
      containerRef.current!.appendChild(el)
      starEls.push(el)

      if (!prefersReduced) {
        // Twinkle animation
        animRef.current.push(
          anime({
            targets: el,
            opacity: [s.baseOpacity * 0.3, s.baseOpacity, s.baseOpacity * 0.5, s.baseOpacity * 0.8, s.baseOpacity * 0.4],
            scale: [0.7, 1.15, 0.85, 1.05, 0.9],
            duration: s.twinkleSpeed * 1000,
            delay: s.delay,
            easing: 'easeInOutSine',
            loop: true,
            direction: 'alternate',
          })
        )

        // Drift animation
        const angle1 = seededRandom(i + 100) * Math.PI * 2
        const angle2 = angle1 + Math.PI * (0.5 + seededRandom(i + 200) * 0.8)
        const angle3 = angle1 + Math.PI * (1 + seededRandom(i + 300) * 0.6)
        const angle4 = angle1 + Math.PI * (1.5 + seededRandom(i + 400) * 0.7)

        animRef.current.push(
          anime({
            targets: el,
            translateX: [
              { value: Math.cos(angle1) * s.driftRadius, duration: s.driftDuration * 0.25 },
              { value: Math.cos(angle2) * s.driftRadius * 0.8, duration: s.driftDuration * 0.25 },
              { value: Math.cos(angle3) * s.driftRadius * 0.6, duration: s.driftDuration * 0.25 },
              { value: 0, duration: s.driftDuration * 0.25 },
            ],
            translateY: [
              { value: Math.sin(angle1) * s.driftRadius, duration: s.driftDuration * 0.25 },
              { value: Math.sin(angle2) * s.driftRadius * 0.8, duration: s.driftDuration * 0.25 },
              { value: Math.sin(angle3) * s.driftRadius * 0.6, duration: s.driftDuration * 0.25 },
              { value: 0, duration: s.driftDuration * 0.25 },
            ],
            easing: 'easeInOutSine',
            loop: true,
            delay: s.delay,
          })
        )
      }
    })

    // ── Create moon element ──
    if (moonRef.current && !prefersReduced) {
      // Moon gentle float with complex path
      animRef.current.push(
        anime({
          targets: moonRef.current,
          translateX: [
            { value: -15, duration: 12000 },
            { value: -28, duration: 10000 },
            { value: -10, duration: 14000 },
            { value: 0, duration: 12000 },
          ],
          translateY: [
            { value: 10, duration: 12000 },
            { value: 22, duration: 10000 },
            { value: 8, duration: 14000 },
            { value: 0, duration: 12000 },
          ],
          rotate: [
            { value: 1.5, duration: 12000 },
            { value: -0.8, duration: 10000 },
            { value: 0.5, duration: 14000 },
            { value: 0, duration: 12000 },
          ],
          easing: 'easeInOutSine',
          loop: true,
        })
      )

      // Animate crater opacities subtly
      const craterEls = moonRef.current.querySelectorAll<HTMLDivElement>('.btm-moon-crater')
      craterEls.forEach((crater, i) => {
        animRef.current.push(
          anime({
            targets: crater,
            opacity: [craters[i].opacity * 0.5, craters[i].opacity, craters[i].opacity * 0.7],
            duration: 6000 + i * 1500,
            easing: 'easeInOutSine',
            loop: true,
            direction: 'alternate',
            delay: i * 800,
          })
        )
      })

      // Moon glow pulse
      animRef.current.push(
        anime({
          targets: moonRef.current,
          boxShadow: [
            '0 0 15px 3px rgba(254,249,231,0.2), 0 0 40px 8px rgba(191,219,254,0.12), 0 0 80px 16px rgba(147,197,253,0.06)',
            '0 0 20px 5px rgba(254,249,231,0.3), 0 0 50px 12px rgba(191,219,254,0.18), 0 0 100px 22px rgba(147,197,253,0.08)',
            '0 0 12px 2px rgba(254,249,231,0.15), 0 0 35px 6px rgba(191,219,254,0.1), 0 0 70px 14px rgba(147,197,253,0.05)',
          ],
          duration: 8000,
          easing: 'easeInOutSine',
          loop: true,
          direction: 'alternate',
        })
      )
    }

    // Cleanup
    return () => {
      animRef.current.forEach(a => a.pause())
      animRef.current = []
      starEls.forEach(el => el.remove())
    }
  }, [])

  const craters = generateMoonCraters()

  return (
    <>
      <div ref={containerRef} className="btm-skyfield" />
      <div ref={moonRef} className="btm-moon-anime">
        {craters.map((c, i) => (
          <div
            key={i}
            className="btm-moon-crater"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: c.r * 2,
              height: c.r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${c.color} 0%, transparent 70%)`,
              opacity: c.opacity,
              position: 'absolute',
              pointerEvents: 'none',
            }}
          />
        ))}
        <div className="btm-moon-crescent" />
      </div>
    </>
  )
}
