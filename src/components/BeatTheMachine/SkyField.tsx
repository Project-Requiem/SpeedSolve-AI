'use client'

import { useEffect, useRef } from 'react'
import anime from 'animejs'

// ─── Seeded random ─────────
function sr(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

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

// ─── Moon surface detail ─────────
interface MoonDetail {
  x: number; y: number; rx: number; ry: number
  color: string; opacity: number; blur: number
}
const MOON_DETAILS: MoonDetail[] = [
  // Major maria — very subtle dark patches
  { x: 32, y: 28, rx: 16, ry: 13, color: 'rgba(140,138,125,0.12)', opacity: 0.25, blur: 3 },
  { x: 52, y: 52, rx: 20, ry: 16, color: 'rgba(135,133,120,0.1)', opacity: 0.2, blur: 4 },
  { x: 25, y: 60, rx: 11, ry: 9, color: 'rgba(138,136,124,0.1)', opacity: 0.18, blur: 3 },
  // Small craters — extremely subtle
  { x: 42, y: 20, rx: 5, ry: 5, color: 'rgba(255,252,245,0.06)', opacity: 0.2, blur: 1 },
  { x: 60, y: 36, rx: 3.5, ry: 3.5, color: 'rgba(255,252,245,0.05)', opacity: 0.18, blur: 1 },
  { x: 35, y: 46, rx: 6, ry: 5, color: 'rgba(255,252,245,0.04)', opacity: 0.15, blur: 1.5 },
  { x: 68, y: 26, rx: 4, ry: 3.5, color: 'rgba(255,252,245,0.04)', opacity: 0.15, blur: 1 },
  { x: 48, y: 66, rx: 7, ry: 6, color: 'rgba(255,252,245,0.03)', opacity: 0.12, blur: 2 },
  { x: 22, y: 40, rx: 3.5, ry: 3, color: 'rgba(255,252,245,0.05)', opacity: 0.16, blur: 1 },
  // Tycho-like bright spot
  { x: 50, y: 70, rx: 3, ry: 3, color: 'rgba(255,255,248,0.08)', opacity: 0.2, blur: 0.5 },
]

// ─── Cloud data for day mode ─────────
interface CloudData { x: number; y: number; scale: number; speed: number; opacity: number }
const CLOUDS: CloudData[] = [
  { x: 10, y: 15, scale: 1, speed: 45000, opacity: 0.7 },
  { x: 55, y: 8, scale: 0.7, speed: 60000, opacity: 0.5 },
  { x: 80, y: 22, scale: 0.85, speed: 52000, opacity: 0.6 },
  { x: 30, y: 30, scale: 0.6, speed: 70000, opacity: 0.4 },
  { x: -10, y: 12, scale: 0.9, speed: 55000, opacity: 0.55 },
]

// ─── SVG cloud shape ─────────
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

interface SkyFieldProps {
  mode: 'night' | 'day'
}

export default function SkyField({ mode }: SkyFieldProps) {
  const nightContainerRef = useRef<HTMLDivElement>(null)
  const dayContainerRef = useRef<HTMLDivElement>(null)
  const moonRef = useRef<HTMLDivElement>(null)
  const sunRef = useRef<HTMLDivElement>(null)
  const anims = useRef<anime.AnimeInstance[]>([])

  useEffect(() => {
    // Cleanup previous
    anims.current.forEach(a => a.pause())
    anims.current = []

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    if (mode === 'night') {
      if (!nightContainerRef.current || !moonRef.current) return
      const container = nightContainerRef.current
      const moon = moonRef.current

      // Create stars
      const stars = generateStars(55)
      const starEls: HTMLDivElement[] = []
      stars.forEach((s, i) => {
        const el = document.createElement('div')
        el.style.cssText = `position:absolute;left:${s.x}%;top:${s.y}%;width:${s.size}px;height:${s.size}px;border-radius:50%;background:${s.color};pointer-events:none;opacity:${s.baseOpacity};box-shadow:0 0 ${s.glowSize}px ${s.glowSize * 0.35}px ${s.glowColor};will-change:transform,opacity;`
        container.appendChild(el)
        starEls.push(el)

        // Twinkle
        anims.current.push(anime({
          targets: el, opacity: [s.baseOpacity * 0.2, s.baseOpacity, s.baseOpacity * 0.6, s.baseOpacity * 0.9, s.baseOpacity * 0.3],
          scale: [0.7, 1.2, 0.85, 1.05, 0.85], duration: s.twinkleSpeed * 1000, delay: s.delay,
          easing: 'easeInOutSine', loop: true, direction: 'alternate',
        }))
        // Drift
        const a1 = sr(i + 100) * Math.PI * 2
        const a2 = a1 + Math.PI * (0.5 + sr(i + 200) * 0.8)
        const a3 = a1 + Math.PI * (1 + sr(i + 300) * 0.6)
        anims.current.push(anime({
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
        }))
      })

      // Moon float — gentle, slow, minimal rotation
      anims.current.push(anime({
        targets: moon,
        translateX: [{ value: -12, duration: 15000 }, { value: -20, duration: 12000 }, { value: -8, duration: 18000 }, { value: 0, duration: 15000 }],
        translateY: [{ value: 8, duration: 15000 }, { value: 16, duration: 12000 }, { value: 5, duration: 18000 }, { value: 0, duration: 15000 }],
        easing: 'easeInOutSine', loop: true,
      }))
      // Moon glow pulse
      anims.current.push(anime({
        targets: moon,
        boxShadow: [
          '0 0 2px 1px rgba(240,236,220,0.2), 0 0 15px 4px rgba(220,225,240,0.1), 0 0 50px 15px rgba(180,195,230,0.06), 0 0 100px 30px rgba(150,170,210,0.03)',
          '0 0 3px 1px rgba(240,236,220,0.25), 0 0 20px 6px rgba(220,225,240,0.13), 0 0 60px 18px rgba(180,195,230,0.08), 0 0 110px 35px rgba(150,170,210,0.04)',
          '0 0 2px 1px rgba(240,236,220,0.15), 0 0 12px 3px rgba(220,225,240,0.07), 0 0 40px 12px rgba(180,195,230,0.04), 0 0 90px 25px rgba(150,170,210,0.02)',
        ],
        duration: 12000, easing: 'easeInOutSine', loop: true, direction: 'alternate',
      }))

      return () => { anims.current.forEach(a => a.pause()); anims.current = []; starEls.forEach(el => el.remove()) }
    } else {
      // Day mode — clouds
      if (!dayContainerRef.current || !sunRef.current) return
      const container = dayContainerRef.current
      const sun = sunRef.current

      // Create cloud elements
      const cloudEls: HTMLDivElement[] = []
      CLOUDS.forEach((c, i) => {
        const el = document.createElement('div')
        el.style.cssText = `position:absolute;left:${c.x}%;top:${c.y}%;pointer-events:none;will-change:transform;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.06));`
        el.innerHTML = cloudSVG(c.scale, c.opacity)
        container.appendChild(el)
        cloudEls.push(el)

        // Cloud drift
        anims.current.push(anime({
          targets: el,
          translateX: [{ value: window.innerWidth * 0.6, duration: c.speed }],
          easing: 'linear', loop: true,
          delay: i * 3000,
        }))
      })

      // Sun pulse
      anims.current.push(anime({
        targets: sun,
        boxShadow: [
          '0 0 30px 10px rgba(255,200,50,0.3), 0 0 80px 30px rgba(255,180,50,0.15), 0 0 140px 50px rgba(255,160,50,0.06)',
          '0 0 40px 15px rgba(255,200,50,0.4), 0 0 100px 40px rgba(255,180,50,0.2), 0 0 160px 60px rgba(255,160,50,0.08)',
          '0 0 25px 8px rgba(255,200,50,0.25), 0 0 70px 25px rgba(255,180,50,0.12), 0 0 120px 45px rgba(255,160,50,0.05)',
        ],
        scale: [1, 1.03, 0.98, 1.02, 1],
        duration: 8000, easing: 'easeInOutSine', loop: true,
      }))

      return () => { anims.current.forEach(a => a.pause()); anims.current = []; cloudEls.forEach(el => el.remove()) }
    }
  }, [mode])

  return (
    <>
      {mode === 'night' && (
        <>
          <div ref={nightContainerRef} className="btm-skyfield" />
          <div ref={moonRef} className="btm-moon-anime">
            {MOON_DETAILS.map((d, i) => (
              <div key={i} className="btm-moon-detail" style={{
                left: `${d.x}%`, top: `${d.y}%`,
                width: d.rx * 2, height: d.ry * 2,
                borderRadius: '50%',
                background: `radial-gradient(ellipse, ${d.color} 0%, transparent 70%)`,
                opacity: d.opacity,
                filter: `blur(${d.blur}px)`,
                position: 'absolute', pointerEvents: 'none',
              }} />
            ))}
            <div className="btm-moon-crescent" />
          </div>
        </>
      )}
      {mode === 'day' && (
        <>
          <div ref={dayContainerRef} className="btm-dayfield" />
          <div ref={sunRef} className="btm-sun-anime">
            <div className="btm-sun-core" />
            <div className="btm-sun-rays" />
          </div>
        </>
      )}
    </>
  )
}
