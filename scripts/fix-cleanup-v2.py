import re

path = 'src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# The old block to find (between two specific markers)
old_block = '''    // 3. Fix newlines within formulas: collapse multi-line into single line
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
    }'''

new_block = '''    // 3. Only collapse if EXPLODED formula (many tiny lines)
    //    Do NOT touch text with HTML tags or normal multi-line content
    const hasHTML = /<[a-z][\\s\\S]*?>/i.test(s);
    if (!hasHTML) {
      const lines = s.split('\n');
      if (lines.length > 4) {
        const nonEmpty = lines.filter(l => l.trim().length > 0);
        const avgLen = nonEmpty.reduce((a, l) => a + l.trim().length, 0) / (nonEmpty.length || 1);
        if (nonEmpty.length > 5 && avgLen < 3) {
          s = nonEmpty.map(l => l.trim()).join(' ');
        }
      }
    }'''

if old_block in content:
    content = content.replace(old_block, new_block)
    # Also fix: remove the line that strips ALL newlines
    content = content.replace("    // 9. Remove stray \\n/\\r that may remain\n    s = s.replace(/[\\r\\n]/g, ' ');\n", '')
    with open(path, 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('OLD BLOCK NOT FOUND')
    # Debug: find nearby content
    idx = content.find('exploded patterns')
    if idx >= 0:
        print(repr(content[idx:idx+100]))
