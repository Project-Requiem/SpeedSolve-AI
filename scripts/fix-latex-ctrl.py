import re

with open('src/app/api/solve/route.ts', 'r') as f:
    lines = f.readlines()

# Find the function and replace it
in_func = False
new_lines = []
skip_until = -1

i = 0
while i < len(lines):
    line = lines[i]
    
    if skip_until > 0 and i < skip_until:
        i += 1
        continue
    skip_until = 0
    
    if '// Post-parse safety net' in line:
        # Found start - write the new function
        new_lines.append(line)  # keep the comment
        new_lines.append('function fixParsedLatexControlChars(obj: any): any {\n')
        new_lines.append('  if (typeof obj === \'string\') {\n')
        new_lines.append('    let s = obj;\n')
        new_lines.append('    // Replace control chars with backslash\n')
        new_lines.append('    s = s.replace(/\\x0c/g, \'\\\\\')  // form-feed → \\ (from \\f in \\frac, \\forall)\n')
        new_lines.append('    s = s.replace(/\\x08/g, \'\\\\\')  // backspace → \\ (from \\b in \\beta, \\binom)\n')
        new_lines.append('    s = s.replace(/\\x0b/g, \'\\\\\'); // vertical-tab → \\ (from \\v in \\vec)\n')
        new_lines.append('    // Detect and fix exploded fractions: \"rac{\" without leading backslash\n')
        new_lines.append('    s = s.replace(/(?<!\\\\)rac\{/g, \'\\\\frac{\');\n')
        new_lines.append('    // Fix orphaned LaTeX commands missing backslash\n')
        new_lines.append('    s = s.replace(/(?<!\\\\)(?=beta\{|gamma\{|delta\{|theta\{|alpha\{|lambda\{|sqrt\{|vec\{|sum\{|prod\{|int\{|sin\{|cos\{|tan\{)/g, \'\\\\\');\n')
        new_lines.append('    // Auto-wrap bare \\frac{}{} in $ if not already wrapped\n')
        new_lines.append('    s = s.replace(/(?<!\\$)(\\frac\{[^}]*\}\s*\\{[^}]*\})(?!\\$)/g, \'\\$\\$1\\$\\$\');\n')
        new_lines.append('    return s;\n')
        new_lines.append('  }\n')
        # Skip old function body until the closing }
        i += 1
        while i < len(lines) and not (lines[i].strip() == '}' and 'return obj;' in lines[i-1] if i > 0 else False):
            i += 1
        # Actually, let me just skip until we see 'return obj;' followed by '}'
        # Reset approach: skip from here until closing brace at col 0
        while i < len(lines):
            if lines[i].strip() == '}' and i > 0:
                break
            i += 1
        i += 1  # skip the closing }
        continue
    
    new_lines.append(line)
    i += 1

with open('src/app/api/solve/route.ts', 'w') as f:
    f.writelines(new_lines)

print('Done')
