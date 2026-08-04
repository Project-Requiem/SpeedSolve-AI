// ─── KaTeX Helper ────────────────────────────────────────
// Strip problematic LaTeX commands that cause rendering issues
function sanitizeLatexForKatex(text: string): string {
  if (!text) return ''
  let t = text
  t = t.replace(/\\text\{[^}]*\}/g, '')
  t = t.replace(/\\mathrm\{[^}]*\}/g, '')
  t = t.replace(/\\mathbf\{[^}]*\}/g, '')
  t = t.replace(/\\textbf\{[^}]*\}/g, '')
  return t
}

// NUCLEAR pre-sanitizer: strips ALL invisible chars, control chars, exploded text
function nukeBadChars(text: string): string {
  if (!text) return ''
  let s = text
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060-\u2064\u034F\u061C\u180E]/g, '')
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
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
  s = s.replace(/(?<!\\)(?=frac\{|sqrt\{|sum\{|prod\{|int\{|lim\{|log\{|ln\{|sin\{|cos\{|tan\{|cot\{|sec\{|csc\{|exp\{|det\{|binom\{|vec\{|hat\{|bar\{|tilde\{|dot\{|nabla\{|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|rightarrow|leftarrow|Rightarrow|forall|exists)/g, '\\')
  s = s.replace(/(?<!\\)rac\{/g, '\\frac{')
  s = s.replace(/  +/g, ' ').trim()
  return s
}

// Check if LaTeX is likely valid for KaTeX
function isSafeLatex(tex: string): boolean {
  if (!tex || tex.trim().length === 0) return false
  const t = tex.trim()
  let depth = 0
  for (const ch of t) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth < 0) return false
  }
  if (depth !== 0) return false
  const words = t.split(/\s+/).filter(w => w.length > 0)
  if (words.length > 8) {
    const avgWordLen = words.reduce((a, w) => a + w.length, 0) / words.length
    if (avgWordLen < 2) return false
  }
  return true
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Safe KaTeX: never shows red errors
function safeKatex(tex: string, displayMode: boolean): string {
  if (!isSafeLatex(tex)) {
    return '<span class="math-fallback">' + escapeHtml(cleanBareLatex(tex)) + '</span>'
  }
  const sanitized = sanitizeLatexForKatex(tex.trim())
  try {
    const html = katex.renderToString(sanitized, { displayMode, throwOnError: false })
    if (html.includes('katex-error')) {
      return '<span class="math-fallback">' + escapeHtml(cleanBareLatex(tex)) + '</span>'
    }
    return html
  } catch {
    return '<span class="math-fallback">' + escapeHtml(cleanBareLatex(tex)) + '</span>'
  }
}

// Wrap bare LaTeX commands (not in $...$) so KaTeX can render them
function wrapBareLatex(text: string): string {
  let t = text
  t = t.replace(/\\frac(\{[^}]*\}\s*\{[^}]*\})/g, '$\\frac$1$$')
  t = t.replace(/\\sqrt(\[[^\]]*\])?(\{[^}]*\})/g, '$\\sqrt$1$2$$')
  t = t.replace(/\\binom(\{[^}]*\}\s*\{[^}]*\})/g, '$\\binom$1$$')
  t = t.replace(/\\(overline|underline)(\{[^}]*\})/g, '$\\$1$2$$')
  t = t.replace(/\\(theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|sum|prod|int|lim|log|ln|sin|cos|tan|cot|sec|csc|exp|det|rightarrow|leftarrow|Rightarrow|vec|hat|bar|tilde|dot|nabla|forall|exists)(?=[^a-zA-Z]|$)/g, '$\\$1$$')
  t = t.replace(/\$\$\s*\$/g, '$')
  return t
}

function renderLatex(text: string): string {
  if (!text) return ''
  // NUCLEAR: strip all invisible/broken chars FIRST
  text = nukeBadChars(text)
  // Pre-sanitize
  text = sanitizeLatexForKatex(text)
  // Fix double-escaped backslashes
  text = text.replace(/\\\\/g, '\\')
  // Auto-wrap bare LaTeX
  const hasDelimiters = /\$\$[\s\S]+?\$\$|\$[^$]+?\$/g.test(text)
  const hasLatexCommands = /\\[a-zA-Z]/.test(text)
  if (!hasDelimiters && hasLatexCommands) {
    const wrapped = wrapBareLatex(text)
    if (wrapped !== text) return renderLatex(wrapped)
  }
  // Split by math delimiters, use safeKatex for each block
  const mathBlockRegex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g
  const parts: string[] = []
  let lastIndex = 0
  let match
  while ((match = mathBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleanBareLatex(text.slice(lastIndex, match.index)))
    }
    const displayTex = match[1]
    const inlineTex = match[2]
    if (displayTex) {
      parts.push(safeKatex(displayTex, true))
    } else if (inlineTex) {
      parts.push(safeKatex(inlineTex, false))
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(cleanBareLatex(text.slice(lastIndex)))
  }
  return parts.join('')
}
