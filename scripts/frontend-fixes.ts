// ═══════════════════════════════════════════════════════════════════════════
// NUCLEAR-GRADE FRONTEND SANITIZER
// Runs FIRST on every string before any LaTeX processing
// ═══════════════════════════════════════════════════════════════════════════
function nukeBadChars(text: string): string {
  if (!text) return ''
  let s = text
  // 1. Strip ALL zero-width and invisible Unicode
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060-\u2064\u034F\u061C\u180E]/g, '')
  // 2. Strip ALL control characters except normal tab/newline
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // 3. Collapse multi-line exploded text into single line
  //    Detect: many short lines (avg < 5 chars) = exploded formula
  const lines = s.split('\n')
  if (lines.length > 2) {
    const nonEmpty = lines.filter(l => l.trim().length > 0)
    const avgLen = nonEmpty.reduce((a, l) => a + l.trim().length, 0) / (nonEmpty.length || 1)
    if (nonEmpty.length > 3 && avgLen < 5) {
      s = nonEmpty.map(l => l.trim()).join(' ')
    } else {
      s = lines.map(l => l.trim()).filter(l => l.length > 0).join(' ')
    }
  }
  // 4. Fix orphaned LaTeX commands
  s = s.replace(/(?<!\\)(?=frac\{|sqrt\{|sum\{|prod\{|int\{|lim\{|log\{|ln\{|sin\{|cos\{|tan\{|cot\{|sec\{|csc\{|exp\{|det\{|binom\{|vec\{|hat\{|bar\{|tilde\{|dot\{|nabla\{|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|rightarrow|leftarrow|Rightarrow|forall|exists)/g, '\\')
  // 5. Fix broken rac{ → \frac{
  s = s.replace(/(?<!\\)rac\{/g, '\\frac{')
  // 6. Clean whitespace
  s = s.replace(/  +/g, ' ').trim()
  return s
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK IF A LATEX STRING IS LIKELY VALID (safe for KaTeX)
// ═══════════════════════════════════════════════════════════════════════════
function isSafeLatex(tex: string): boolean {
  if (!tex || tex.trim().length === 0) return false
  const t = tex.trim()
  // Must have balanced braces
  let depth = 0
  for (const ch of t) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth < 0) return false
  }
  if (depth !== 0) return false
  // Must not contain spaces that look like broken text
  // (single char words separated by spaces = exploded formula)
  const words = t.split(/\s+/).filter(w => w.length > 0)
  if (words.length > 8) {
    const avgWordLen = words.reduce((a, w) => a + w.length, 0) / words.length
    if (avgWordLen < 2) return false  // Too many tiny fragments
  }
  // Must have at least one math-like character or command
  if (!/[\\{}_^=+\-*/()\d]/.test(t) && !/[a-zA-Z]/.test(t)) return false
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE KaTeX RENDERER — never shows red errors
// ═══════════════════════════════════════════════════════════════════════════
function safeKatex(tex: string, displayMode: boolean): string {
  // If tex looks broken, skip KaTeX entirely and return clean text
  if (!isSafeLatex(tex)) {
    return '<span class="math-fallback">' + escapeHtml(cleanBareLatex(tex)) + '</span>'
  }
  const sanitized = sanitizeLatexForKatex(tex.trim())
  try {
    const html = katex.renderToString(sanitized, { displayMode, throwOnError: false })
    // Check if KaTeX still produced an error (red text)
    if (html.includes('katex-error')) {
      return '<span class="math-fallback">' + escapeHtml(cleanBareLatex(tex)) + '</span>'
    }
    return html
  } catch {
    return '<span class="math-fallback">' + escapeHtml(cleanBareLatex(tex)) + '</span>'
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
