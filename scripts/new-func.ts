function fixParsedLatexControlChars(obj: any): any {
  if (typeof obj === 'string') {
    let s = obj;
    // Replace control chars with backslash
    s = s.replace(/\x0c/g, '\\')  // form-feed -> \\ (from \f in \frac, \forall)
    s = s.replace(/\x08/g, '\\')  // backspace -> \\ (from \b in \beta, \binom)
    s = s.replace(/\x0b/g, '\\'); // vertical-tab -> \\ (from \v in \vec)
    // Detect and fix exploded fractions: "rac{" without leading backslash
    s = s.replace(/(?<!\\)rac\{/g, '\\frac{');
    // Fix orphaned LaTeX commands missing backslash
    s = s.replace(/(?<!\\)(?=beta\{|gamma\{|delta\{|theta\{|alpha\{|lambda\{|sqrt\{|vec\{|sum\{|prod\{|int\{|sin\{|cos\{|tan\{)/g, '\\');
    // Auto-wrap bare \frac{}{} in $ if not already wrapped
    s = s.replace(/(?<!\$)(\\frac\{[^}]*\}\s*\\{[^}]*\})(?!\$)/g, '\$$1\$$');
    return s;
  }
  if (Array.isArray(obj)) return obj.map(fixParsedLatexControlChars);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = fixParsedLatexControlChars(obj[key]);
    }
    return result;
  }
  return obj;
}