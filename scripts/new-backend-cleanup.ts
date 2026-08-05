function cleanSolutionStrings(obj: any): any {
  if (typeof obj === 'string') {
    let s = obj;
    // 1. Strip invisible Unicode
    s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u2060-\u2064]/g, '');
    // 2. Strip control chars (keep \n and \t)
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
    // 3. Only collapse if EXPLODED formula (many tiny lines)
    //    Do NOT touch text with HTML tags
    const hasHTML = /<[a-z][\s\S]*?>/i.test(s);
    if (!hasHTML) {
      const lines = s.split('\n');
      if (lines.length > 4) {
        const nonEmpty = lines.filter(l => l.trim().length > 0);
        const avgLen = nonEmpty.reduce((a, l) => a + l.trim().length, 0) / (nonEmpty.length || 1);
        if (nonEmpty.length > 5 && avgLen < 3) {
          s = nonEmpty.map(l => l.trim()).join(' ');
        }
      }
      // Fix orphaned LaTeX
      s = s.replace(/(?<!\\)(?=frac\{|sqrt\{|sum\{|prod\{|int\{|lim\{|log\{|ln\{|sin\{|cos\{|tan\{)/g, '\\\\');
      s = s.replace(/(?<!\\)rac\{/g, '\\\\frac{');
      s = s.replace(/(?<!\\)(?=left[\(\[\{\|]|right[\)\]\}\|])/g, '\\\\');
      // Auto-wrap bare \frac in $
      s = s.replace(/(?<!\$)(\\frac\{[^}]*\}\s*\{[^}]*\})(?!\$)/g, '\$$1\$');
    }
    s = s.replace(/  +/g, ' ').trim();
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
