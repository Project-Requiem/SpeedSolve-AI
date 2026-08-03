# Fix LaTeX in route.ts by replacing control chars back to double-escaped LaTeX
# The source file has \f (form-feed) instead of \frac, \t (tab) instead of \times, etc.
# We replace control chars + remaining text with properly double-escaped LaTeX.

filepath = '/home/z/my-project/src/app/api/solve/route.ts'
with open(filepath, 'r') as f:
    content = f.read()

# First, fix control characters that replaced LaTeX backslash+letter
# \f (0x0C) followed by 'rac' -> \\frac
# \f (0x0C) followed by 'orall' -> \\forall
content = content.replace('\x0crac', '\\\\frac')
content = content.replace('\x0corall', '\\\\forall')

# \b (0x08) followed by 'eta' -> \\beta, 'inom' -> \\binom, 'oldsymbol' -> \\boldsymbol
content = content.replace('\x08eta', '\\\\beta')
content = content.replace('\x08inom', '\\\\binom')
content = content.replace('\x08old', '\\\\bold')  # partial match for boldsymbol

# \v (0x0B) followed by 'ec' -> \\vec
content = content.replace('\x0bec', '\\\\vec')

# \t (0x09) followed by specific letters -> double-escaped
# \theta, \times, \tan, \text, \tilde, \tabular, \to
content = content.replace('\x09heta', '\\\\theta')
content = content.replace('\x09imes', '\\\\times')
content = content.replace('\x09an\\b', '\\\\tan')  # \tan (but \b was already eaten)
content = content.replace('\x09ext', '\\\\text')
content = content.replace('\x09ilde', '\\\\tilde')
content = content.replace('\x09o ', '\\\\to ')  # \to followed by space
content = content.replace('\x09o$\', '\\\\to$\\')  # \to at end of math

# \n (0x0A) followed by specific letters
# \neq, \nu, \nabla, \notin
content = content.replace('\x0aeq', '\\\\neq')
content = content.replace('\x0au', '\\\\nu')  # careful: \nu not \n (newline) + u
content = content.replace('\x0aabla', '\\\\nabla')
content = content.replace('\x0aotin', '\\\\notin')

# \r (0x0D) followed by specific letters  
# \rho, \right, \Rightarrow
content = content.replace('\x0dho', '\\\\rho')
content = content.replace('\x0dight', '\\\\right')
content = content.replace('\x0dRightarrow', '\\\\Rightarrow')

# Now fix ALL remaining single-backslash LaTeX commands that lost their backslash
# These are commands where JS dropped the unrecognized escape: \sin -> sin, \cos -> cos, etc.
# We need to add \\ back before these commands.
# But we must be careful to only fix in the prompt/examples sections, not in code.

import re

# Find the buildSystemPrompt function boundaries
prompt_start = content.index('function buildSystemPrompt')

# Find the EXAMPLES section
examples_start = content.index('const EXAMPLES')

# For the EXAMPLES section (JSON.stringify'd strings), fix dropped backslashes
# In JSON.stringify output, these appear as just the command name without backslash
# We need to add \\ before them WITHIN the JSON string values

# LaTeX commands that lose their backslash in JS strings (unrecognized escapes)
lost_cmds = [
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'log', 'exp', 'det', 'lim',
    'sum', 'prod', 'int',
    'pi', 'infty', 'partial', 'circ', 'div',
    'pm', 'leq', 'geq', 'approx', 'angle',
    'sqrt', 'frac', 'cdot', 'quad', 'qquad',
    'theta', 'alpha', 'gamma', 'delta', 'lambda', 'mu',
    'sigma', 'omega', 'tau', 'phi', 'psi', 'epsilon', 'eta',
    'overline', 'underline', 'hat', 'bar', 'nabla',
    'binom', 'to', 'rightarrow', 'leftarrow',
    'begin', 'end', 'hline',
    'textbf', 'mathrm', 'mathbf', 'text',
    'forall', 'exists', 'subset', 'cup', 'cap',
    'cdot', 'cdots', 'ldots',
    'boxed', 'dagger', 'ddagger', 'ell',
    'Rightarrow', 'vec', 'dot', 'tilde',
    'beta', 'nu', 'rho', 'times',
    'left', 'right', 'boldsymbol',
]

# For each command, find instances in the file that are NOT preceded by \
# and NOT inside regex patterns (between / and /)
fixed_count = 0
for cmd in lost_cmds:
    # Match the command NOT preceded by backslash
    # But also not inside a regex literal or already escaped
    pattern = rf'(?<!\\)(?<!\\\\)\b{cmd}\b'
    matches = list(re.finditer(pattern, content))
    for m in reversed(matches):
        pos = m.start()
        # Skip if inside a regex (between / chars) - rough check
        line_start = content.rfind('\n', 0, pos) + 1
        line = content[line_start:pos]
        # Skip if in a comment line or console.log
        if 'console.' in line or '//' in line:
            continue
        # Skip if this looks like code (has = before it on same line without quotes)
        # Actually let's be more targeted - only fix within the EXAMPLES and prompt sections
        if pos < examples_start - 100 or pos > content.index('// ── JSON extraction ──'):
            continue
        
        content = content[:pos] + '\\\\' + content[pos:]
        fixed_count += 1

print(f'Fixed {fixed_count} dropped-backslash commands')

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
