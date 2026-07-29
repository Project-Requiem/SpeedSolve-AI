'use client'

import { useEffect, useCallback, useRef, type ReactNode } from 'react'

interface FullscreenViewerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function FullscreenViewer({ open, onClose, title, children }: FullscreenViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleClose])

  // Swipe-down to dismiss on touch devices
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Swipe down more than 80px dismisses
    if (dy > 80) {
      handleClose()
    }
    touchStartY.current = null
  }, [handleClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fs-overlay"
      onClick={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="fs-container" onClick={e => e.stopPropagation()}>
        <div className="fs-header">
          {title && <span className="fs-title">{title}</span>}
          <button className="fs-close" onClick={handleClose} aria-label="Close fullscreen">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="fs-body">{children}</div>
        <div className="fs-swipe-hint">
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="9" />
            <line x1="18" y1="2" x2="10" y2="9" />
          </svg>
          <span>Swipe down or press Esc to close</span>
        </div>
      </div>
    </div>
  )
}
