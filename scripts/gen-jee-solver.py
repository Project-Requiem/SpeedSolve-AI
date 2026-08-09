#!/usr/bin/env python3
"""Generate local-solver-jee.ts - JEE Advanced/Mains/KCET level solver"""

import os

OUTPUT = "/home/z/my-project/src/app/api/solve/local-solver-jee.ts"

parts = []

# Helper to add content
parts.append(r'''// ═══════════════════════════════════════════════════════════════════════════════
// SpeedSolve AI - JEE Advanced / Mains / KCET Local Solver
// Covers: Advanced Calculus, Algebra, Coordinate Geometry, Trigonometry,
//          Probability, JEE-level Physics & Chemistry
// ═══════════════════════════════════════════════════════════════════════════════

export interface LocalSolution {
  finalAnswer: string;
  finalFormula: string;
  steps: { desc: string; formula: string }[];
  altSteps: { desc: string; formula: string }[];
  similar: string[];
  mistakes: string[];
  examTips?: string[];
}

interface PatternRule {
  regex: RegExp;
  solver: (m: RegExpMatchArray, fullText?: string) => LocalSolution | null;
  useFullText?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, d = 4): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(d)).toString();
}
function fact(n: number): number {
  if (n < 0 || n > 170) return NaN;
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function N(t: string): number[] { return (t.match(/-?\d+\.?\d*/g) || []).map(Number); }
function pN(t: string): number[] { return (t.match(/\d+\.?\d*/g) || []).map(Number); }
function gcf(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function lcm(a: number, b: number): number { return Math.abs(a * b) / gcf(a, b); }
function comb(n: number, r: number): number {
  if (r < 0 || r > n) return 0; if (r === 0 || r === n) return 1;
  let r2 = Math.min(r, n - r), res = 1;
  for (let i = 0; i < r2; i++) res = res * (n - i) / (i + 1);
  return Math.round(res);
}
''')

# We'll append all sections as separate writes to avoid the limit
# For now, let's write the whole thing via bash chunks

with open(OUTPUT, 'w') as f:
    f.write(parts[0])

print(f"Started {OUTPUT} with {len(parts[0])} chars")
print("Will continue appending sections...")
