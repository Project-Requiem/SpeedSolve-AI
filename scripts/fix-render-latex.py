import re

filepath = '/home/z/my-project/src/app/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# The old renderLatex function (exact match needed)
old_func = '''function renderLatex(text: string): string {
  if (!text) return ''
  // Pre-sanitize to remove problematic commands before any processing
  text = sanitizeLatexForKatex(text)
  // Fix double-escaped backslashes from LLM JSON output
  text = text.replace(/\\\\/g, '\\')
  // Split by math delimiters, clean non-math parts separately, then render math
  const mathBlockRegex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g
  const parts: string[] = []
  let lastIndex = 0
  let match
  while ((match = mathBlockRegex.exec(text)) !== null) {
    // Non-math text before this match — clean bare LaTeX artifacts
    if (match.index > lastIndex) {
      parts.push(cleanBareLatex(text.slice(lastIndex, match.index)))
    }
    // Render the math block with KaTeX
    const displayTex = match[1]
    const inlineTex = match[2]
    if (displayTex) {
      const sanitized = sanitizeLatexForKatex(displayTex.trim())
      try {
        parts.push(katex.renderToString(sanitized, { displayMode: true, throwOnError: false }))
      } catch { parts.push(cleanBareLatex(match[0])) }
    } else if (inlineTex) {
      const sanitized = sanitizeLatexForKatex(inlineTex.trim())
      try {
        parts.push(katex.renderToString(sanitized, { displayMode: false, throwOnError: false }))
      } catch { parts.push(cleanBareLatex(match[0])) }
    }
    lastIndex = match.index + match[0].length
  }
  // Remaining text after last math block
  if (lastIndex < text.length) {
    parts.push(cleanBareLatex(text.slice(lastIndex)))
  }
  return parts.join('')
}'''

# Find the exact function boundaries
start_marker = 'function renderLatex(text: string): string {'
start_idx = content.index(start_marker)

# Find the closing brace at the right level
brace_count = 0
end_idx = start_idx
for i in range(start_idx, len(content)):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            end_idx = i + 1
            break

old_function = content[start_idx:end_idx]
print(f"Found renderLatex at {start_idx}-{end_idx} ({len(old_function)} chars)")
print(f"First 100 chars: {repr(old_function[:100])}")

new_function = '''// Wrap bare LaTeX commands (not in $...$) so KaTeX can render them
function wrapBareLatex(text: string): string {
  let t = text
  // \\frac{A}{B} → $\\frac{A}{B}$
  t = t.replace(/\\frac(\{[^}]*\}\s*\{[^}]*\})/g, '$\\frac$1$$')
  // \\sqrt{X}, \\sqrt[X]{Y} → $\\sqrt{X}$
  t = t.replace(/\\sqrt(\[[^\]]*\])?(\{[^}]*\})/g, '$\\sqrt$1$2$$')
  // \\binom{A}{B} → $\\binom{A}{B}$
  t = t.replace(/\\binom(\{[^}]*\}\s*\{[^}]*\})/g, '$\\binom$1$$')
  // \\overline{X}, \\underline{X}
  t = t.replace(/\\(overline|underline)(\{[^}]*\})/g, '$\\$1$2$$')
  // Greek letters and common math commands
  t = t.replace(/\\(theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|sum|prod|int|lim|log|ln|sin|cos|tan|cot|sec|csc|exp|det|rightarrow|leftarrow|Rightarrow|vec|hat|bar|tilde|dot|nabla)(?=[^a-zA-Z]|$)/g, '$\\$1$$')
  // Merge adjacent $$ into single $
  t = t.replace(/\$\$\s*\$/g, '$')
  return t
}

function renderLatex(text: string): string {
  if (!text) return ''
  // Pre-sanitize to remove problematic commands before any processing
  text = sanitizeLatexForKatex(text)
  // Fix double-escaped backslashes from LLM JSON output
  text = text.replace(/\\\\/g, '\\')
  // If no $ delimiters but text has LaTeX commands, auto-wrap them
  const hasDelimiters = /\$\$[\s\S]+?\$\$|\$[^$]+?\$/g.test(text)
  const hasLatexCommands = /\\[a-zA-Z]/.test(text)
  if (!hasDelimiters && hasLatexCommands) {
    const wrapped = wrapBareLatex(text)
    if (wrapped !== text) return renderLatex(wrapped)
  }
  // Split by math delimiters, clean non-math parts separately, then render math
  const mathBlockRegex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g
  const parts: string[] = []
  let lastIndex = 0
  let match
  while ((match = mathBlockRegex.exec(text)) !== null) {
    // Non-math text before this match — clean bare LaTeX artifacts
    if (match.index > lastIndex) {
      parts.push(cleanBareLatex(text.slice(lastIndex, match.index)))
    }
    // Render the math block with KaTeX
    const displayTex = match[1]
    const inlineTex = match[2]
    if (displayTex) {
      const sanitized = sanitizeLatexForKatex(displayTex.trim())
      try {
        parts.push(katex.renderToString(sanitized, { displayMode: true, throwOnError: false }))
      } catch { parts.push(cleanBareLatex(match[0])) }
    } else if (inlineTex) {
      const sanitized = sanitizeLatexForKatex(inlineTex.trim())
      try {
        parts.push(katex.renderToString(sanitized, { displayMode: false, throwOnError: false }))
      } catch { parts.push(cleanBareLatex(match[0])) }
    }
    lastIndex = match.index + match[0].length
  }
  // Remaining text after last math block
  if (lastIndex < text.length) {
    parts.push(cleanBareLatex(text.slice(lastIndex)))
  }
  return parts.join('')
}'''

content = content[:start_idx] + new_function + content[end_idx:]

with open(filepath, 'w') as f:
    f.write(content)

print("Done! renderLatex replaced with new version including wrapBareLatex")
