'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import FullscreenViewer from './FullscreenViewer'

// ─── Types ──────────────────────────────────────────────────
export interface GraphSpec {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'function'
  title?: string
  xLabel?: string
  yLabel?: string
  xData?: (string | number)[]
  series?: { name: string; data: (string | number)[] }[]
  fn?: string
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  points?: { x: number; y: number; label?: string }[]
}

interface SolutionGraphProps {
  spec: GraphSpec
  theme: 'dark' | 'light'
}

// ─── Safe math evaluator ────────────────────────────────────
function evalMathExpr(expr: string, x: number): number {
  try {
    let s = expr
      .replace(/\bMath\.sin\b/g, 'Math.sin')
      .replace(/\bMath\.cos\b/g, 'Math.cos')
      .replace(/\bMath\.tan\b/g, 'Math.tan')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\blog\b/g, 'Math.log10')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b(?!xp)/g, 'Math.E')
      .replace(/\^/g, '**')
    return new Function('x', 'return ' + s)(x) as number
  } catch {
    return NaN
  }
}

// ─── Generate data points from function expression ───────────
function generateFunctionData(
  fn: string,
  xMin: number,
  xMax: number,
  yMin?: number,
  yMax?: number,
): { xData: number[]; yData: number[] } {
  const steps = 300
  const dx = (xMax - xMin) / steps
  const xData: number[] = []
  const yData: number[] = []

  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx
    const y = evalMathExpr(fn, x)
    if (isFinite(y) && (!yMin || y >= yMin - 50) && (!yMax || y <= yMax + 50)) {
      xData.push(Math.round(x * 1000) / 1000)
      yData.push(Math.round(y * 1000) / 1000)
    }
  }
  return { xData, yData }
}

// ─── Responsive font sizes based on container width ─────────
function getSizes(large: boolean, containerWidth?: number) {
  if (large) {
    return { title: 16, label: 12, tick: 12, nameText: 13, gridLeft: 65, gridRight: 35, gridTop: 50, gridBottom: 55, barWidth: 45, symbolSize: 7, lineW: 2.5 }
  }
  // Responsive for inline view
  if (containerWidth && containerWidth < 380) {
    return { title: 11, label: 9, tick: 9, nameText: 9, gridLeft: 42, gridRight: 12, gridTop: 32, gridBottom: 36, barWidth: 18, symbolSize: 3, lineW: 1.5 }
  }
  if (containerWidth && containerWidth < 550) {
    return { title: 11, label: 10, tick: 10, nameText: 10, gridLeft: 48, gridRight: 16, gridTop: 35, gridBottom: 40, barWidth: 22, symbolSize: 4, lineW: 1.8 }
  }
  return { title: 12, label: 11, tick: 11, nameText: 11, gridLeft: 52, gridRight: 22, gridTop: 38, gridBottom: 42, barWidth: 28, symbolSize: 5, lineW: 2 }
}

// ─── Build ECharts option from spec ──────────────────────────
function buildOption(spec: GraphSpec, isDark: boolean, large: boolean, containerWidth?: number) {
  const sz = getSizes(large, containerWidth)
  const textCol = isDark ? '#c8d0e0' : '#1e293b'
  const subTextCol = isDark ? '#6a7a9a' : '#64748b'
  const lineCol = isDark ? '#1d254a' : '#e2e8f0'
  const bgCol = 'transparent'
  const accent = '#3b82f6'
  const green = '#10b981'
  const orange = '#f59e0b'
  const purple = '#8b5cf6'
  const colors = [accent, green, orange, purple, '#ec4899', '#06b6d4']

  const baseAxis = {
    axisLine: { lineStyle: { color: lineCol } },
    axisTick: { lineStyle: { color: lineCol } },
    axisLabel: { color: textCol, fontSize: sz.tick },
    splitLine: { lineStyle: { color: lineCol, type: 'dashed' as const } },
    nameTextStyle: { color: subTextCol, fontSize: sz.nameText, padding: [0, 0, 0, 0] },
  }

  // ── Function plot ──
  if (spec.type === 'function' && spec.fn) {
    const xMin = spec.xMin ?? -10
    const xMax = spec.xMax ?? 10
    const { xData, yData } = generateFunctionData(spec.fn, xMin, xMax, spec.yMin, spec.yMax)

    const markPoints = (spec.points || []).map(p => ({
      coord: [p.x, p.y],
      name: p.label || `(${p.x}, ${p.y})`,
      label: {
        show: true,
        formatter: p.label || `(${p.x}, ${p.y})`,
        position: 'top' as const,
        color: textCol,
        fontSize: sz.label,
        backgroundColor: isDark ? '#191f3e' : '#f1f5f9',
        borderColor: accent,
        borderWidth: 1,
        padding: [2, 5],
        borderRadius: 4,
      },
      itemStyle: { color: accent, borderWidth: 2, borderColor: isDark ? '#11162a' : '#ffffff' },
    }))

    return {
      backgroundColor: bgCol,
      title: spec.title ? {
        text: spec.title,
        left: 'center',
        top: large ? 8 : 4,
        textStyle: { color: textCol, fontSize: sz.title, fontWeight: 600 },
      } : undefined,
      grid: { left: sz.gridLeft, right: sz.gridRight, top: (spec.title ? 35 : 18), bottom: sz.gridBottom },
      xAxis: {
        ...baseAxis,
        type: 'value',
        name: spec.xLabel || 'x',
        min: xMin, max: xMax,
      },
      yAxis: {
        ...baseAxis,
        type: 'value',
        name: spec.yLabel || 'y',
        min: spec.yMin, max: spec.yMax,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1a2035' : '#ffffff',
        borderColor: lineCol,
        textStyle: { color: textCol, fontSize: 12 },
      },
      series: [{
        type: 'line',
        data: xData.map((x, i) => [x, yData[i]]),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: accent, width: sz.lineW },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
        markPoint: markPoints.length > 0 ? { data: markPoints, symbol: 'circle', symbolSize: sz.symbolSize + 3 } : undefined,
      }],
    }
  }

  // ── Pie chart ──
  if (spec.type === 'pie') {
    const pieData = (spec.xData || []).map((name, i) => ({
      name: String(name),
      value: spec.series?.[0]?.data?.[i] ?? 0,
    }))
    return {
      backgroundColor: bgCol,
      title: spec.title ? {
        text: spec.title, left: 'center', top: large ? 8 : 4,
        textStyle: { color: textCol, fontSize: sz.title, fontWeight: 600 },
      } : undefined,
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#1a2035' : '#ffffff',
        borderColor: lineCol,
        textStyle: { color: textCol, fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: subTextCol, fontSize: sz.label - 1 },
        itemWidth: 10,
        itemHeight: 10,
      },
      color: colors,
      series: [{
        type: 'pie',
        radius: large ? ['35%', '65%'] : ['28%', '58%'],
        center: ['50%', '45%'],
        data: pieData,
        label: {
          color: textCol,
          fontSize: sz.label - 1,
          formatter: '{b}: {d}%',
        },
        itemStyle: { borderColor: isDark ? '#11162a' : '#ffffff', borderWidth: 2 },
      }],
    }
  }

  // ── Line / Bar / Scatter ──
  const chartType = spec.type === 'bar' ? 'bar' : spec.type === 'scatter' ? 'scatter' : 'line'
  const series = (spec.series || []).map((s, i) => {
    const base: any = {
      name: s.name,
      type: chartType,
      data: s.data,
      color: colors[i % colors.length],
      itemStyle: { color: colors[i % colors.length] },
    }
    if (chartType === 'line') {
      base.smooth = true
      base.symbol = 'circle'
      base.symbolSize = sz.symbolSize
      base.lineStyle = { width: sz.lineW }
      base.areaStyle = i === 0 ? {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)' },
            { offset: 1, color: 'transparent' },
          ],
        },
      } : undefined
    }
    if (chartType === 'bar') {
      base.barMaxWidth = sz.barWidth
      base.itemStyle = { color: colors[i % colors.length], borderRadius: [4, 4, 0, 0] }
    }
    if (chartType === 'scatter') {
      base.symbolSize = sz.symbolSize + 2
      base.itemStyle = { color: colors[i % colors.length], borderWidth: 1.5, borderColor: isDark ? '#11162a' : '#ffffff' }
    }
    return base
  })

  if (spec.points && spec.points.length > 0 && series[0]) {
    series[0].markPoint = {
      data: spec.points.map(p => ({
        coord: [p.x, p.y],
        name: p.label || '',
        label: {
          show: true, formatter: p.label || `(${p.x}, ${p.y})`,
          position: 'top' as const,
          color: textCol, fontSize: sz.label,
          backgroundColor: isDark ? '#191f3e' : '#f1f5f9',
          borderColor: accent, borderWidth: 1, padding: [2, 5], borderRadius: 4,
        },
        itemStyle: { color: accent, borderWidth: 2, borderColor: isDark ? '#11162a' : '#ffffff' },
      })),
      symbol: 'circle', symbolSize: sz.symbolSize + 3,
    }
  }

  return {
    backgroundColor: bgCol,
    title: spec.title ? {
      text: spec.title, left: 'center', top: large ? 8 : 4,
      textStyle: { color: textCol, fontSize: sz.title, fontWeight: 600 },
    } : undefined,
    grid: { left: sz.gridLeft, right: sz.gridRight, top: (spec.title ? 35 : 18), bottom: sz.gridBottom },
    legend: series.length > 1 ? {
      bottom: 0, textStyle: { color: subTextCol, fontSize: sz.label - 1 }, itemWidth: 10, itemHeight: 10,
    } : undefined,
    xAxis: {
      ...baseAxis,
      type: 'category',
      data: spec.xData,
      name: spec.xLabel,
      axisLabel: { ...baseAxis.axisLabel, rotate: (spec.xData || []).length > 6 ? 30 : 0 },
    },
    yAxis: {
      ...baseAxis,
      type: 'value',
      name: spec.yLabel,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1a2035' : '#ffffff',
      borderColor: lineCol,
      textStyle: { color: textCol, fontSize: 12 },
    },
    color: colors,
    series,
  }
}

// ─── Responsive height hook ─────────────────────────────────
function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState<number | undefined>(undefined)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

// ─── ECharts chart renderer (shared for inline + fullscreen) ──
function EChartsRenderer({ spec, theme, large, onReady }: {
  spec: GraphSpec
  theme: 'dark' | 'light'
  large: boolean
  onReady?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const [echartsLib, setEchartsLib] = useState<any>(null)
  const containerWidth = useContainerWidth(containerRef)

  useEffect(() => {
    import('echarts').then(mod => {
      setEchartsLib(mod.default)
      onReady?.()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!echartsLib || !containerRef.current) return
    if (!chartRef.current) {
      chartRef.current = echartsLib.init(containerRef.current)
    }
    const option = buildOption(spec, theme === 'dark', large, large ? undefined : containerWidth)
    chartRef.current.setOption(option, true)
  }, [echartsLib, spec, theme, large, containerWidth])

  // Resize on window resize + container size change
  useEffect(() => {
    if (!echartsLib || !containerRef.current || !chartRef.current) return
    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    const ro = new ResizeObserver(() => chartRef.current?.resize())
    ro.observe(containerRef.current)
    return () => {
      window.removeEventListener('resize', handleResize)
      ro.disconnect()
    }
  }, [echartsLib])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  // Responsive height: fullscreen fills container, inline adapts to screen
  const inlineHeight = large ? '100%' : 'clamp(200px, 40vw, 320px)'

  return (
    <div
      ref={containerRef}
      className="echarts-container"
      style={{ width: '100%', height: inlineHeight }}
    />
  )
}

// ─── Main component ──────────────────────────────────────────
export default function SolutionGraph({ spec, theme }: SolutionGraphProps) {
  const [fullscreen, setFullscreen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
  }, [])

  const handleOpen = useCallback(() => {
    if (loaded) setFullscreen(true)
  }, [loaded])

  return (
    <>
      <div className="graph-container" onClick={handleOpen} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') handleOpen() }}
        aria-label={spec.title ? `View graph: ${spec.title}` : 'View graph fullscreen'}>
        {!loaded && (
          <div className="graph-loading">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>Rendering graph...</span>
          </div>
        )}
        <EChartsRenderer spec={spec} theme={theme} large={false} onReady={() => setLoaded(true)} />
        <div className={`graph-expand-hint${isTouchDevice ? ' touch-visible' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>Tap to expand</span>
        </div>
      </div>

      <FullscreenViewer
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={spec.title || 'Graph'}
      >
        <EChartsRenderer spec={spec} theme={theme} large={true} />
      </FullscreenViewer>
    </>
  )
}
