'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import FullscreenViewer from './FullscreenViewer'

interface DiagramSpec {
  svg?: string
  caption?: string
  diagramPreset?: string
  values?: Record<string, any>
}

interface SolutionDiagramProps {
  spec: DiagramSpec
  theme: 'dark' | 'light'
}

// ─── Preset SVG Generators ───────────────────────────────────

const ARROW = '<defs><marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="%233b82f6"/></marker><marker id="arr-r" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="%23ef4444"/></marker><marker id="arr-g" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="%2310b981"/></marker><marker id="arr-y" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="%23f59e0b"/></marker></defs>'

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function forceArrow(cx: number, cy: number, angleDeg: number, len: number, color: string, label: string, mag: string) {
  const rad = (angleDeg - 90) * Math.PI / 180
  const ex = cx + len * Math.cos(rad)
  const ey = cy + len * Math.sin(rad)
  const mx = cx + (len + 18) * Math.cos(rad)
  const my = cy + (len + 18) * Math.sin(rad)
  return `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="2" marker-end="url(#${color === '%233b82f6' ? 'arr' : color === '%23ef4444' ? 'arr-r' : color === '%2310b981' ? 'arr-g' : 'arr-y'})"/><text x="${mx}" y="${my}" text-anchor="middle" font-size="11" fill="${color}" dominant-baseline="middle">${label} = ${mag}</text>`
}

function presetFreeBody(v: Record<string, any>): string {
  const obj = v.object || 'Block'
  const mass = v.mass || 'm'
  const forces: any[] = v.forces || []
  const hasSurface = v.surface !== false
  const cx = 150, cy = 125, bw = 70, bh = 50

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Ground -->
  ${hasSurface ? `<line x1="40" y1="${cy + bh/2 + 2}" x2="260" y2="${cy + bh/2 + 2}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>` : ''}
  <!-- Object -->
  <rect x="${cx - bw/2}" y="${cy - bh/2}" width="${bw}" height="${bh}" rx="4" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="12" fill="#94a3b8">${obj} (${mass})</text>
`

  for (const f of forces) {
    svg += `  ${forceArrow(cx, cy, f.angle || 0, 55, f.color || '%233b82f6', f.label || '', f.magnitude || '')}\n`
  }

  svg += '</svg>'
  return svg
}

function presetInclinedPlane(v: Record<string, any>): string {
  const angle = v.angle || 30
  const mass = v.mass || 'm'
  const obj = v.object || 'Block'
  const forces: any[] = v.forces || []
  const rad = angle * Math.PI / 180
  const bx = 60, by = 210, baseLen = 200
  const tx = bx + baseLen, ty = by - baseLen * Math.tan(rad)
  // Block position ~40% up the slope
  const t = 0.4
  const blockCx = bx + t * (tx - bx)
  const blockCy = by + t * (ty - by)
  const bw = 50, bh = 35

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Inclined plane -->
  <polygon points="${bx},${by} ${tx},${ty} ${tx},${by}" fill="none" stroke="#64748b" stroke-width="1.5"/>
  <text x="${(bx+tx)/2 - 20}" y="${(by+ty)/2 + 25}" font-size="10" fill="#64748b">θ = ${angle}°</text>
  <!-- Angle arc -->
  <path d="M ${bx+30} ${by} A 30 30 0 0 0 ${bx + 30*Math.cos(rad)} ${by - 30*Math.sin(rad)}" fill="none" stroke="#64748b" stroke-width="1"/>
  <!-- Block on slope -->
  <rect x="${blockCx - bw/2}" y="${blockCy - bh/2}" width="${bw}" height="${bh}" rx="3" fill="none" stroke="#94a3b8" stroke-width="1.5" transform="rotate(${-angle} ${blockCx} ${blockCy})"/>
  <text x="${blockCx}" y="${blockCy + 4}" text-anchor="middle" font-size="10" fill="#94a3b8" transform="rotate(${-angle} ${blockCx} ${blockCy})">${obj}</text>
  <!-- Ground -->
  <line x1="40" y1="${by}" x2="280" y2="${by}" stroke="#64748b" stroke-width="1.5"/>
`

  for (const f of forces) {
    svg += `  ${forceArrow(blockCx, blockCy, f.angle || 0, 45, f.color || '%233b82f6', f.label || '', f.magnitude || '')}\n`
  }

  svg += '</svg>'
  return svg
}

function presetCircuitSeries(v: Record<string, any>): string {
  const comps: any[] = v.components || []
  const y = 70, h = 110
  const leftX = 50, rightX = 250

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Wires -->
  <line x1="${leftX}" y1="${y}" x2="${rightX}" y2="${y}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${rightX}" y1="${y}" x2="${rightX}" y2="${y+h}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${rightX}" y1="${y+h}" x2="${leftX}" y2="${y+h}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${leftX}" y1="${y+h}" x2="${leftX}" y2="${y}" stroke="#64748b" stroke-width="1.5"/>
`

  const resistors = comps.filter((c: any) => c.type === 'resistor')
  const batteries = comps.filter((c: any) => c.type === 'battery')
  const allComps = [...batteries, ...resistors]
  const n = allComps.length
  const usableTop = rightX - leftX - 60
  const spacing = n > 1 ? usableTop / (n - 1) : 0
  const startX = leftX + 30

  allComps.forEach((c: any, i: number) => {
    const cx = n === 1 ? 150 : startX + i * spacing
    if (c.type === 'battery') {
      svg += `  <!-- Battery: ${c.label} -->
  <line x1="${cx - 8}" y1="${y - 14}" x2="${cx - 8}" y2="${y + 14}" stroke="#ef4444" stroke-width="2"/>
  <line x1="${cx + 8}" y1="${y - 8}" x2="${cx + 8}" y2="${y + 8}" stroke="#3b82f6" stroke-width="2"/>
  <text x="${cx}" y="${y - 22}" text-anchor="middle" font-size="10" fill="#e2e8f0">${c.label}</text>\n`
    } else if (c.type === 'resistor') {
      svg += `  <!-- Resistor: ${c.label} -->
  <rect x="${cx - 16}" y="${y - 8}" width="32" height="16" rx="2" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="${cx}" y="${y + 26}" text-anchor="middle" font-size="10" fill="#e2e8f0">${c.label}</text>\n`
    }
  })

  // Current arrow
  svg += `  <text x="150" y="${y + h/2 + 5}" text-anchor="middle" font-size="10" fill="#10b981">I →</text>\n`
  svg += '</svg>'
  return svg
}

function presetCircuitParallel(v: Record<string, any>): string {
  const comps: any[] = v.components || []
  const resistors = comps.filter((c: any) => c.type === 'resistor')
  const battery = comps.find((c: any) => c.type === 'battery')
  const n = resistors.length || 2
  const y = 40, h = 170
  const leftX = 60, rightX = 240
  const branchSpacing = (h - 40) / (n + 1)

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Main wires -->
  <line x1="${leftX}" y1="${y}" x2="${rightX}" y2="${y}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${leftX}" y1="${y}" x2="${leftX}" y2="${y + h}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${rightX}" y1="${y}" x2="${rightX}" y2="${y + h}" stroke="#64748b" stroke-width="1.5"/>
  <line x1="${leftX}" y1="${y + h}" x2="${rightX}" y2="${y + h}" stroke="#64748b" stroke-width="1.5"/>
  <!-- Battery on left -->
  <line x1="${leftX - 8}" y1="${y + h/2 - 12}" x2="${leftX - 8}" y2="${y + h/2 + 12}" stroke="#ef4444" stroke-width="2"/>
  <line x1="${leftX + 8}" y1="${y + h/2 - 7}" x2="${leftX + 8}" y2="${y + h/2 + 7}" stroke="#3b82f6" stroke-width="2"/>
  ${battery ? `<text x="${leftX}" y="${y + h/2 - 20}" text-anchor="middle" font-size="10" fill="#e2e8f0">${battery.label}</text>` : ''}
`

  resistors.forEach((r: any, i: number) => {
    const by = y + 20 + (i + 1) * branchSpacing
    // Branch wires
    svg += `  <!-- Branch ${i+1} -->
  <line x1="${leftX}" y1="${by}" x2="110" y2="${by}" stroke="#64748b" stroke-width="1"/>
  <line x1="190" y1="${by}" x2="${rightX}" y2="${by}" stroke="#64748b" stroke-width="1"/>
  <!-- Resistor -->
  <rect x="110" y="${by - 8}" width="80" height="16" rx="2" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="150" y="${by + 22}" text-anchor="middle" font-size="10" fill="#e2e8f0">${r.label}</text>\n`
  })

  svg += '</svg>'
  return svg
}

function presetProjectile(v: Record<string, any>): string {
  const u = v.u || 20, angle = v.angle || 45, g = v.g || 9.8
  const rad = angle * Math.PI / 180
  const H = (u * u * Math.sin(2 * rad)) / (2 * g)
  const R = (u * u * Math.sin(2 * rad)) / g
  const maxH = Math.max(H, 1), maxR = Math.max(R, 1)

  // Scale to fit viewBox
  const sx = 240 / maxR, sy = 160 / maxH
  const s = Math.min(sx, sy)
  const scaledR = maxR * s, scaledH = maxH * s
  const ox = 30, oy = 210

  // Generate parabola path
  const pts: string[] = []
  for (let t = 0; t <= 1; t += 0.02) {
    const x = t * scaledR
    const y = scaledH * 4 * t * (1 - t)
    pts.push(`${ox + x},${oy - y}`)
  }

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Ground -->
  <line x1="20" y1="${oy}" x2="285" y2="${oy}" stroke="#64748b" stroke-width="1.5"/>
  <!-- Trajectory -->
  <path d="M ${pts.join(' L')}" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4,2"/>
  <!-- Velocity vector at start -->
  <line x1="${ox}" y1="${oy}" x2="${ox + 30*Math.cos(rad)}" y2="${oy - 30*Math.sin(rad)}" stroke="#10b981" stroke-width="1.5" marker-end="url(#arr-g)"/>
  <text x="${ox + 35*Math.cos(rad)}" y="${oy - 35*Math.sin(rad)}" font-size="9" fill="#10b981">u = ${u} m/s</text>
  <!-- Angle arc -->
  <path d="M ${ox+25} ${oy} A 25 25 0 0 0 ${ox + 25*Math.cos(rad)} ${oy - 25*Math.sin(rad)}" fill="none" stroke="#f59e0b" stroke-width="1"/>
  <text x="${ox + 32}" y="${oy - 10}" font-size="9" fill="#f59e0b">${angle}°</text>
  <!-- Max height -->
  <line x1="${ox + scaledR/2}" y1="${oy}" x2="${ox + scaledR/2}" y2="${oy - scaledH}" stroke="#64748b" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="${ox + scaledR/2 + 5}" y="${oy - scaledH/2}" font-size="9" fill="#e2e8f0">H = ${maxH.toFixed(1)} m</text>
  <!-- Range -->
  <line x1="${ox}" y1="${oy + 15}" x2="${ox + scaledR}" y2="${oy + 15}" stroke="#64748b" stroke-width="1"/>
  <text x="${ox + scaledR/2}" y="${oy + 28}" text-anchor="middle" font-size="9" fill="#e2e8f0">R = ${maxR.toFixed(1)} m</text>
  <!-- g arrow -->
  <line x1="${ox + scaledR/2 + 30}" y1="${oy - 30}" x2="${ox + scaledR/2 + 30}" y2="${oy - 5}" stroke="#ef4444" stroke-width="1.5" marker-end="url(#arr-r)"/>
  <text x="${ox + scaledR/2 + 38}" y="${oy - 15}" font-size="9" fill="#ef4444">g</text>
</svg>`
  return svg
}

function presetTriangle(v: Record<string, any>): string {
  const verts: any[] = v.vertices || [{label:'A',x:50,y:30},{label:'B',x:50,y:220},{label:'C',x:260,y:220}]
  const sides: Record<string,string> = v.sides || {}
  const angles: Record<string,string> = v.angles || {}
  const markRA = v.markRightAngle || ''

  const [A, B, C] = verts
  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <polygon points="${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
`

  // Right angle marker
  if (markRA && verts.length === 3) {
    const idx = ['A','B','C'].indexOf(markRA)
    if (idx >= 0) {
      const p = verts[idx]
      const others = verts.filter((_: any, i: number) => i !== idx)
      const sz = 12
      svg += `  <polyline points="${p.x + (others[0].x > p.x ? sz : -sz)},${p.y} ${p.x + (others[0].x > p.x ? sz : -sz)},${p.y + (others[0].y > p.y ? sz : -sz)} ${p.x},${p.y + (others[0].y > p.y ? sz : -sz)}" fill="none" stroke="#f59e0b" stroke-width="1"/>\n`
    }
  }

  // Labels
  verts.forEach((vt: any) => {
    svg += `  <text x="${vt.x - 15}" y="${vt.y - 8}" font-size="13" fill="#10b981" font-weight="600">${vt.label}</text>\n`
  })

  // Side labels (midpoints)
  const sideKeys = Object.entries(sides)
  if (sideKeys.length >= 2) {
    const midAB = { x: (A.x+B.x)/2, y: (A.y+B.y)/2 }
    const midBC = { x: (B.x+C.x)/2, y: (B.y+C.y)/2 }
    const midAC = { x: (A.x+C.x)/2, y: (A.y+C.y)/2 }
    if (sides.AB) svg += `  <text x="${midAB.x - 20}" y="${midAB.y}" font-size="11" fill="#e2e8f0">${sides.AB}</text>\n`
    if (sides.BC) svg += `  <text x="${midBC.x}" y="${midBC.y + 20}" font-size="11" fill="#e2e8f0">${sides.BC}</text>\n`
    if (sides.AC) svg += `  <text x="${midAC.x + 10}" y="${midAC.y + 5}" font-size="11" fill="#e2e8f0">${sides.AC}</text>\n`
  }

  svg += '</svg>'
  return svg
}

function presetCircleGeometry(v: Record<string, any>): string {
  const r = v.radius || 80
  const center: any = v.center || {x:150, y:130}
  const points: any[] = v.points || [{label:'A',angle:30},{label:'B',angle:150},{label:'C',angle:270}]

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <circle cx="${center.x}" cy="${center.y}" r="${r}" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
  <circle cx="${center.x}" cy="${center.y}" r="2" fill="#3b82f6"/>
  <text x="${center.x + 5}" y="${center.y - 5}" font-size="9" fill="#64748b">O</text>
`

  // Draw radii and points
  points.forEach((p: any) => {
    const pos = polarToXY(center.x, center.y, r, p.angle)
    svg += `  <line x1="${center.x}" y1="${center.y}" x2="${pos.x}" y2="${pos.y}" stroke="#64748b" stroke-width="1" stroke-dasharray="3,2"/>\n`
    svg += `  <circle cx="${pos.x}" cy="${pos.y}" r="3" fill="#10b981"/>\n`
    const lx = pos.x + (pos.x > center.x ? 10 : -10)
    const ly = pos.y + (pos.y > center.y ? 15 : -10)
    svg += `  <text x="${lx}" y="${ly}" text-anchor="middle" font-size="12" fill="#10b981" font-weight="600">${p.label}</text>\n`
  })

  // Draw chords between consecutive points
  for (let i = 0; i < points.length; i++) {
    const p1 = polarToXY(center.x, center.y, r, points[i].angle)
    const p2 = polarToXY(center.x, center.y, r, points[(i+1) % points.length].angle)
    svg += `  <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#f59e0b" stroke-width="1.5"/>\n`
  }

  if (v.showTangent) {
    const tp = points.find((p: any) => p.label === (v.tangentPoint || 'A')) || points[0]
    const tPos = polarToXY(center.x, center.y, r, tp.angle)
    const trad = (tp.angle) * Math.PI / 180
    const tx1 = tPos.x - 30 * Math.sin(trad)
    const ty1 = tPos.y + 30 * Math.cos(trad)
    const tx2 = tPos.x + 30 * Math.sin(trad)
    const ty2 = tPos.y - 30 * Math.cos(trad)
    svg += `  <line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" stroke="#ef4444" stroke-width="1.5"/>\n`
  }

  svg += '</svg>'
  return svg
}

function presetPulley(v: Record<string, any>): string {
  const m1 = v.m1 || '5 kg', m2 = v.m2 || '3 kg'
  const l1 = v.label1 || 'm₁', l2 = v.label2 || 'm₂'
  const cx = 150, cy = 60, pr = 25

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Support -->
  <line x1="${cx - 60}" y1="20" x2="${cx + 60}" y2="20" stroke="#64748b" stroke-width="2"/>
  <line x1="${cx}" y1="20" x2="${cx}" y2="${cy - pr}" stroke="#64748b" stroke-width="1.5"/>
  <!-- Pulley -->
  <circle cx="${cx}" cy="${cy}" r="${pr}" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="2" fill="#94a3b8"/>
  <!-- Left rope + mass -->
  <line x1="${cx - pr}" y1="${cy}" x2="${cx - pr}" y2="${cy + 60}" stroke="#64748b" stroke-width="1.5"/>
  <rect x="${cx - pr - 25}" y="${cy + 60}" width="50" height="40" rx="4" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="${cx - pr}" y="${cy + 84}" text-anchor="middle" font-size="11" fill="#3b82f6">${l1}</text>
  <text x="${cx - pr}" y="${cy + 115}" text-anchor="middle" font-size="10" fill="#e2e8f0">${m1}</text>
  <!-- Right rope + mass -->
  <line x1="${cx + pr}" y1="${cy}" x2="${cx + pr}" y2="${cy + 60}" stroke="#64748b" stroke-width="1.5"/>
  <rect x="${cx + pr - 25}" y="${cy + 60}" width="50" height="40" rx="4" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <text x="${cx + pr}" y="${cy + 84}" text-anchor="middle" font-size="11" fill="#ef4444">${l2}</text>
  <text x="${cx + pr}" y="${cy + 115}" text-anchor="middle" font-size="10" fill="#e2e8f0">${m2}</text>
  <!-- Acceleration arrows -->
  <line x1="${cx - pr - 35}" y1="${cy + 75}" x2="${cx - pr - 35}" y2="${cy + 95}" stroke="#10b981" stroke-width="1.5" marker-end="url(#arr-g)"/>
  <text x="${cx - pr - 48}" y="${cy + 90}" font-size="9" fill="#10b981">a</text>
  <line x1="${cx + pr + 35}" y1="${cy + 95}" x2="${cx + pr + 35}" y2="${cy + 75}" stroke="#10b981" stroke-width="1.5" marker-end="url(#arr-g)"/>
  <text x="${cx + pr + 42}" y="${cy + 90}" font-size="9" fill="#10b981">a</text>
</svg>`
  return svg
}

function presetRayMirror(v: Record<string, any>): string {
  const f = v.f || 10, u = v.objectDist || 20, h = v.objectHeight || 3
  const mirrorType = v.mirrorType || 'concave'
  const isConcave = mirrorType === 'concave'

  // Scale: 1 unit = 8px
  const s = 7
  const cx = 150, axisY = 125
  const mirrorX = isConcave ? 250 : 50
  const objX = isConcave ? cx - u * s : cx + u * s
  const fImg = isConcave ? mirrorX - f * s : mirrorX + f * s

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Principal axis -->
  <line x1="20" y1="${axisY}" x2="280" y2="${axisY}" stroke="#64748b" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Mirror -->
  ${isConcave
    ? `<path d="M ${mirrorX} ${axisY-60} Q ${mirrorX-10} ${axisY} ${mirrorX} ${axisY+60}" fill="none" stroke="#3b82f6" stroke-width="2"/>`
    : `<path d="M ${mirrorX} ${axisY-60} Q ${mirrorX+10} ${axisY} ${mirrorX} ${axisY+60}" fill="none" stroke="#3b82f6" stroke-width="2"/>`}
  <!-- Focus -->
  <circle cx="${fImg}" cy="${axisY}" r="3" fill="#f59e0b"/>
  <text x="${fImg}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="#f59e0b">F</text>
  <!-- Object arrow -->
  <line x1="${objX}" y1="${axisY}" x2="${objX}" y2="${axisY - h * s}" stroke="#10b981" stroke-width="2" marker-end="url(#arr-g)"/>
  <text x="${objX}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="#10b981">Object</text>
  <!-- Ray 1: parallel to axis → through F -->
  <line x1="${objX}" y1="${axisY - h * s}" x2="${mirrorX}" y2="${axisY - h * s}" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="${mirrorX}" y1="${axisY - h * s}" x2="${isConcave ? 30 : 270}" y2="${axisY + (isConcave ? 1 : -1) * 40}" stroke="#ef4444" stroke-width="1"/>
  <!-- Ray 2: through center → reflects back -->
  <line x1="${objX}" y1="${axisY - h * s}" x2="${mirrorX}" y2="${axisY}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="${mirrorX}" y1="${axisY}" x2="${isConcave ? 30 : 270}" y2="${axisY + (isConcave ? 1 : -1) * 30}" stroke="#f59e0b" stroke-width="1"/>
  <text x="${mirrorX + (isConcave ? 8 : -8)}" y="${axisY - 65}" font-size="9" fill="#3b82f6">${isConcave ? 'Concave' : 'Convex'} Mirror</text>
</svg>`
  return svg
}

function presetRayLens(v: Record<string, any>): string {
  const f = v.f || 15, u = v.objectDist || 30, h = v.objectHeight || 2
  const lensType = v.lensType || 'convex'
  const isConvex = lensType === 'convex'

  const s = 6
  const cx = 150, axisY = 125
  const objX = cx - u * s
  const f1x = cx - f * s, f2x = cx + f * s

  let svg = `<svg viewBox="0 0 300 250">${ARROW}
  <!-- Principal axis -->
  <line x1="20" y1="${axisY}" x2="280" y2="${axisY}" stroke="#64748b" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Lens -->
  <line x1="${cx}" y1="${axisY - 55}" x2="${cx}" y2="${axisY + 55}" stroke="#3b82f6" stroke-width="2"/>
  <!-- Arrowheads on lens -->
  <polygon points="${cx},${axisY-55} ${cx-5},${axisY-48} ${cx+5},${axisY-48}" fill="#3b82f6"/>
  <polygon points="${cx},${axisY+55} ${cx-5},${axisY+48} ${cx+5},${axisY+48}" fill="#3b82f6"/>
  <!-- Foci -->
  <circle cx="${f1x}" cy="${axisY}" r="3" fill="#f59e0b"/>
  <text x="${f1x}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="#f59e0b">F</text>
  <circle cx="${f2x}" cy="${axisY}" r="3" fill="#f59e0b"/>
  <text x="${f2x}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="#f59e0b">F'</text>
  <!-- Object arrow -->
  <line x1="${objX}" y1="${axisY}" x2="${objX}" y2="${axisY - h * s}" stroke="#10b981" stroke-width="2" marker-end="url(#arr-g)"/>
  <text x="${objX}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="#10b981">Object</text>
  <!-- Ray 1: parallel → through F' -->
  <line x1="${objX}" y1="${axisY - h * s}" x2="${cx}" y2="${axisY - h * s}" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="${cx}" y1="${axisY - h * s}" x2="270" y2="${axisY + 40}" stroke="#ef4444" stroke-width="1"/>
  <!-- Ray 2: through F → parallel -->
  <line x1="${objX}" y1="${axisY - h * s}" x2="${cx}" y2="${axisY}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="${cx}" y1="${axisY}" x2="270" y2="${axisY - h * s}" stroke="#f59e0b" stroke-width="1"/>
  <text x="${cx + 8}" y="${axisY - 60}" font-size="9" fill="#3b82f6">${isConvex ? 'Convex' : 'Concave'} Lens</text>
</svg>`
  return svg
}

// ─── Preset Router ────────────────────────────────────────────
function renderPreset(preset: string, values: Record<string, any>): string | null {
  switch (preset) {
    case 'free-body': return presetFreeBody(values)
    case 'inclined-plane': return presetInclinedPlane(values)
    case 'circuit-series': return presetCircuitSeries(values)
    case 'circuit-parallel': return presetCircuitParallel(values)
    case 'projectile': return presetProjectile(values)
    case 'triangle': return presetTriangle(values)
    case 'circle-geometry': return presetCircleGeometry(values)
    case 'pulley': return presetPulley(values)
    case 'ray-mirror': return presetRayMirror(values)
    case 'ray-lens': return presetRayLens(values)
    default: return null
  }
}

// ─── Main Component ────────────────────────────────────────────
export default function SolutionDiagram({ spec, theme }: SolutionDiagramProps) {
  const [fullscreen, setFullscreen] = useState(false)
  const [valid, setValid] = useState(true)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
  }, [])

  const svgContent = useMemo(() => {
    // Priority 1: Preset diagram
    if (spec.diagramPreset && spec.values) {
      const presetSvg = renderPreset(spec.diagramPreset, spec.values)
      if (presetSvg) return presetSvg
    }
    // Priority 2: Raw SVG
    if (spec.svg && typeof spec.svg === 'string') {
      const trimmed = spec.svg.trim()
      if (!trimmed.startsWith('<svg')) {
        setValid(false)
        return ''
      }
      return trimmed
    }
    setValid(false)
    return ''
  }, [spec.svg, spec.diagramPreset, spec.values])

  // Inject theme-aware styling
  const styledSvg = useMemo(() => {
    if (!svgContent) return ''
    if (svgContent.includes('<style') || svgContent.includes('style=')) return svgContent
    const textColor = theme === 'dark' ? '#e0e7ff' : '#1e293b'
    const strokeColor = theme === 'dark' ? '#94a3b8' : '#475569'
    const inject = `<style>text{fill:${textColor};font-family:Inter,system-ui,sans-serif}line,polyline,rect,circle,ellipse,path,polygon{stroke:${strokeColor}}</style>`
    return svgContent.replace('<svg', inject + '<svg')
  }, [svgContent, theme])

  const handleOpen = useCallback(() => {
    if (valid) setFullscreen(true)
  }, [valid])

  if (!valid || !styledSvg) return null

  const caption = spec.caption || 'Diagram'

  return (
    <>
      <div
        ref={containerRef}
        className="diagram-container"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') handleOpen() }}
        aria-label={`View diagram: ${caption}`}
      >
        <div
          className="diagram-svg-wrap"
          dangerouslySetInnerHTML={{ __html: styledSvg }}
        />
        {caption && <div className="diagram-caption">{caption}</div>}
        <div className={`graph-expand-hint${isTouchDevice ? ' touch-visible' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>Tap to expand</span>
        </div>
      </div>

      <FullscreenViewer open={fullscreen} onClose={() => setFullscreen(false)} title={caption}>
        <div
          className="diagram-svg-fullscreen"
          dangerouslySetInnerHTML={{ __html: styledSvg }}
        />
      </FullscreenViewer>
    </>
  )
}
