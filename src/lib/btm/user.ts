// ─── User Account System ─────────────────────────────────────
// Backend-ready abstraction: swap localStorage for Prisma when backend is ready.
// All persistence goes through this layer — never access localStorage directly in components.

export interface BTMUser {
  id: string
  username: string
  createdAt: string
  lastActiveAt: string
}

const USERS_KEY = 'speedsolve-btm-users'
const ACTIVE_USER_KEY = 'speedsolve-btm-active-user'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function getTimestamp(): string {
  return new Date().toISOString()
}

// ─── User CRUD (localStorage) ──────────────────────────────────

function loadUsers(): Record<string, BTMUser> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveUsers(users: Record<string, BTMUser>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch { /* silently fail */ }
}

export function getActiveUser(): BTMUser | null {
  if (typeof window === 'undefined') return null
  try {
    const id = localStorage.getItem(ACTIVE_USER_KEY)
    if (!id) return null
    const users = loadUsers()
    const user = users[id]
    if (!user) {
      localStorage.removeItem(ACTIVE_USER_KEY)
      return null
    }
    return user
  } catch {
    return null
  }
}

export function createUser(username: string): BTMUser {
  const users = loadUsers()
  const id = uid()
  const user: BTMUser = {
    id,
    username: username.trim().slice(0, 20),
    createdAt: getTimestamp(),
    lastActiveAt: getTimestamp(),
  }
  users[id] = user
  saveUsers(users)
  localStorage.setItem(ACTIVE_USER_KEY, id)
  return user
}

export function switchUser(userId: string): BTMUser | null {
  const users = loadUsers()
  const user = users[userId]
  if (!user) return null
  localStorage.setItem(ACTIVE_USER_KEY, userId)
  return user
}

export function getAllUsers(): BTMUser[] {
  const users = loadUsers()
  return Object.values(users).sort((a, b) => 
    new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  )
}

export function updateUserActivity(): void {
  const user = getActiveUser()
  if (!user) return
  const users = loadUsers()
  if (users[user.id]) {
    users[user.id].lastActiveAt = getTimestamp()
    saveUsers(users)
  }
}

// ─── Stats per user ─────────────────────────────────────────────
// Each user gets their own stats key based on their user ID.

export function getStatsKey(userId: string): string {
  return `speedsolve-btm-stats-${userId}`
}
