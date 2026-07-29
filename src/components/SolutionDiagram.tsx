'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import FullscreenViewer from './FullscreenViewer'

interface DiagramSpec {
  svg: string
  caption?: string
}

interface SolutionDiagramProps {
  spec: DiagramSpec
  theme: 'dark' | 'light'
}

export default function SolutionDiagram({ spec, theme }: SolutionDiagramProps) {
  const [fullscreen, setFullscreen] = useState(false)
  const [valid, setValid] = useState(true)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
  }, [])

  // Basic SVG validation and theme-aware styling
  const sanitizedSvg = useMemo(() => {
    if (!spec.svg || typeof spec.svg !== 'string') {
      setValid(false)
      return ''
    }
    const trimmed = spec.svg.trim()
    if (!trimmed.startsWith('<svg')) {
      setValid(false)
      return ''
    }
    // Inject default styling if no style block exists
    if (!trimmed.includes('<style') && !trimmed.includes('style=')) {
      const textColor = theme === 'dark' ? '#e0e7ff' : '#1e293b'
      const strokeColor = theme === 'dark' ? '#94a3b8' : '#475569'
      const inject = `<style>text{fill:${textColor};font-family:Inter,system-ui,sans-serif}line,polyline,rect,circle,ellipse,path,polygon{stroke:${strokeColor}}</style>`
      return trimmed.replace('<svg', inject + '<svg')
    }
    return trimmed
  }, [spec.svg, theme])

  const handleOpen = useCallback(() => {
    if (valid) setFullscreen(true)
  }, [valid])

  if (!valid) return null

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
          dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
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
          dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        />
      </FullscreenViewer>
    </>
  )
}