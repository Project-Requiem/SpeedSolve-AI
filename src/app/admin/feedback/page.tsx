'use client'

import { useState, useEffect, useCallback } from 'react'

interface FeedbackEntry {
  id: string
  name: string
  feedback: string
  ipAddress: string
  userAgent: string
  subject: string
  board: string
  problem: string
  createdAt: string
}

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'speedsolve2024'

export default function FeedbackAdmin() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pageSize = 20

  const fetchEntries = useCallback(async (p: number, q: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(pageSize) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/feedback/list?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setEntries(data.entries || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    if (authenticated) fetchEntries(page, search)
  }, [authenticated, page, search, fetchEntries])

  const totalPages = Math.ceil(total / pageSize)

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('Wrong password. Try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback?')) return
    try {
      await fetch(`/api/feedback/delete?id=${id}`, { method: 'DELETE' })
      fetchEntries(page, search)
    } catch {
      setError('Failed to delete')
    }
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return d }
  }

  const getBadgeColor = (subject: string) => {
    switch (subject) {
      case 'mathematics': return '#8b5cf6'
      case 'physics': return '#f97316'
      case 'chemistry': return '#10b981'
      default: return '#6b7280'
    }
  }

  // ── Login screen ──
  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '48px 40px',
          maxWidth: 400, width: '90%', textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>&#128274;</div>
          <h1 style={{ color: '#fff', fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Admin Access</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>SpeedSolve AI Feedback Dashboard</p>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box'
            }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}
          <button onClick={handleLogin} style={{
            width: '100%', marginTop: 16, padding: '12px', borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
            border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer'
          }}>Unlock Dashboard</button>
        </div>
      </div>
    )
  }

  // ── Dashboard ──
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
      fontFamily: "'Inter', system-ui, sans-serif", color: '#fff', padding: '24px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Feedback Dashboard
            </h1>
            <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>
              {total} total feedback{total !== 1 ? 's' : ''} &middot; Permanent storage with IP tracking
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/api/feedback/download?format=json" download style={{
              padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc', fontSize: 14, fontWeight: 500
            }}>&#128196; Download JSON</a>
            <a href="/api/feedback/download?format=csv" download style={{
              padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#6ee7b7', fontSize: 14, fontWeight: 500
            }}>&#128202; Download CSV</a>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search by name, feedback text, or IP address..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{
              width: '100%', maxWidth: 500, padding: '12px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {error && <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>}

        {/* Table */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
              No feedback yet. Feedbacks will appear here when users submit them.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {['Date', 'Name', 'IP Address', 'Feedback', 'Context', ''].map(h => (
                        <th key={h} style={{
                          padding: '14px 12px', textAlign: h ? 'left' : 'left',
                          color: '#9ca3af', fontWeight: 600, fontSize: 12, textTransform: 'uppercase',
                          letterSpacing: '0.05em', whiteSpace: 'nowrap'
                        }}>{h || 'Actions'}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => (
                      <tr key={entry.id} style={{
                        borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 12px', whiteSpace: 'nowrap', color: '#d1d5db', fontSize: 13 }}>
                          {formatDate(entry.createdAt)}
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
                            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace'
                          }}>{entry.ipAddress || 'unknown'}</span>
                        </td>
                        <td style={{ padding: '14px 12px', maxWidth: 350, color: '#e5e7eb', lineHeight: 1.5 }}>
                          {entry.feedback}
                        </td>
                        <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                          {entry.subject && (
                            <span style={{
                              background: `${getBadgeColor(entry.subject)}22`,
                              color: getBadgeColor(entry.subject),
                              padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, marginRight: 6
                            }}>{entry.subject}</span>
                          )}
                          {entry.board && (
                            <span style={{
                              background: 'rgba(255,255,255,0.08)', color: '#d1d5db',
                              padding: '3px 8px', borderRadius: 6, fontSize: 11
                            }}>{entry.board}</span>
                          )}
                          {entry.problem && (
                            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Problem: {entry.problem}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            style={{
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                              color: '#fca5a5', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12
                            }}
                          >Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                  padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.4 : 1
                    }}
                  >Prev</button>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.4 : 1
                    }}
                  >Next</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Back link */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>
            &larr; Back to SpeedSolve AI
          </a>
        </div>
      </div>
    </div>
  )
}