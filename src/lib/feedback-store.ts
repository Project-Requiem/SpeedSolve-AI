// Shared in-memory feedback store for Vercel (SQLite filesystem is ephemeral in serverless)
// Falls back to this when Prisma/SQLite is unavailable

export type FeedbackEntry = {
  id: string;
  name: string;
  feedback: string;
  ipAddress: string;
  userAgent: string;
  subject: string;
  board: string;
  problem: string;
  grade: string;
  createdAt: Date | string;
};

// Global singleton — persists across warm invocations on the same Vercel instance
const globalForStore = globalThis as unknown as {
  __feedbackStore?: FeedbackEntry[];
};

export const memoryStore: FeedbackEntry[] = globalForStore.__feedbackStore ?? [];
if (!globalForStore.__feedbackStore) globalForStore.__feedbackStore = memoryStore;

export function addEntry(entry: FeedbackEntry): void {
  memoryStore.unshift(entry);
  if (memoryStore.length > 500) memoryStore.length = 500; // cap to prevent memory leak
}

export function getEntries(opts?: { search?: string; limit?: number; offset?: number }): { entries: FeedbackEntry[]; total: number } {
  let filtered = memoryStore;
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    filtered = memoryStore.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.feedback.toLowerCase().includes(q) ||
        e.ipAddress.toLowerCase().includes(q)
    );
  }
  const total = filtered.length;
  const offset = opts?.offset || 0;
  const limit = opts?.limit || 50;
  return { entries: filtered.slice(offset, offset + limit), total };
}

export function deleteEntry(id: string): boolean {
  const idx = memoryStore.findIndex((e) => e.id === id);
  if (idx !== -1) {
    memoryStore.splice(idx, 1);
    return true;
  }
  return false;
}

export function getAllEntries(): FeedbackEntry[] {
  return [...memoryStore];
}
