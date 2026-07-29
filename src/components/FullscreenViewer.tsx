'use client'

import { useEffect, useCallback, type ReactNode } from 'react'

interface FullscreenViewerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function FullscreenViewer({ open, onClose, title, children }: FullscreenViewerProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleKey])

  if (!open) return null

  return (
    <div className="fs-overlay" onClick={onClose}>
      <div className="fs-container" onClick={e => e.stopPropagation()}>
        <div className="fs-header">
          {title && <span className="fs-title">{title}</span>}
          <button className="fs-close" onClick={onClose} aria-label="Close fullscreen">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="fs-body">{children}</div>
      </div>
    </div>
  )
}
