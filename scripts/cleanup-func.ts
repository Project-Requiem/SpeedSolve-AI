// ── Deep clean all strings in the parsed solution ──
// Fixes: zero-width spaces, multi-line exploded formulas, missing backslashes,
// orphaned LaTeX commands, and garbled fraction patterns.
function cleanSolutionStrings(obj: any): any {
  if (typeof obj === 'string') {
    let s = obj;
    // 1. Strip ALL zero-width/invisible Unicode characters
    s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]/g, '');
    // 2. Strip literal form-feed, backspace, vertical-tab (shouldn't exist after fixParsedLatexControlChars, but safety net)
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
    // 3. Fix newlines within formulas: collapse multi-line into single line
    //    Detect "exploded" patterns where chars are on separate lines
    const lines = s.split('\n');
    if (lines.length > 1) {
      const nonEmpty = lines.filter(l => l.trim().length > 0);
      const avgLen = nonEmpty.reduce((a, l) => a + l.trim().length, 0) / (nonEmpty.length || 1);
      // If most lines are very short (< 4 chars), it's an "exploded" formula - collapse it
      if (nonEmpty.length > 3 && avgLen < 4) {
        s = nonEmpty.map(l => l.trim()).join(' ');
      } else {
        // Normal multi-line: collapse into single line for desc/formula fields
        s = lines.map(l => l.trim()).filter(l => l.length > 0).join(' ');
      }
    }
    // 4. Fix orphaned LaTeX commands (missing leading backslash)
    s = s.replace(/(?<!\\)(?=frac\{|sqrt\{|sum\{|prod\{|int\{|lim\{|log\{|ln\{|sin\{|cos\{|tan\{|cot\{|sec\{|csc\{|exp\{|det\{|binom\{|vec\{|hat\{|bar\{|tilde\{|dot\{|nabla\{|forall\{|exists\{|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|rho|tau|phi|psi|epsilon|eta|nu|pi|infty|partial|times|div|pm|neq|leq|geq|approx|angle|cdot|rightarrow|leftarrow|Rightarrow)/g, '\\');
    // 5. Fix broken \frac: "rac{" without leading backslash
    s = s.replace(/(?<!\\)rac\{/g, '\\frac{');
    // 6. Auto-wrap bare \frac{}{} in $...$ 
    s = s.replace(/(?<!\$)(\\frac\{[^}]*\}\s*\{[^}]*\})(?!\$)/g, '\$$1\$');
    // 7. Fix \left/\right without backslash
    s = s.replace(/(?<!\\)(?=left[\(\[\{\|]|right[\)\]\}\|])/g, '\\');
    // 8. Clean up excessive whitespace
    s = s.replace(/  +/g, ' ').trim();
    // 9. Remove stray \n/\r that may remain
    s = s.replace(/[\r\n]/g, ' ');
    return s;
  }
  if (Array.isArray(obj)) return obj.map(cleanSolutionStrings);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = cleanSolutionStrings(obj[key]);
    }
    return result;
  }
  return obj;
}
