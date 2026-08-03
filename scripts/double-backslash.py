# Double all backslashes within the buildSystemPrompt template literal
# In the .ts source file, \frac (2 chars: \, f, r, a, c) is what we need
# so JS template literal produces \frac (1 backslash) at runtime

import re

filepath = '/home/z/my-project/src/app/api/solve/route.ts'
with open(filepath, 'r') as f:
    content = f.read()

# Find the template literal: between 'return `' and the matching '`;'
ret_marker = 'return `'
ret_start = content.index(ret_marker) + len(ret_marker)
# Find the closing backtick
# We need to find the `; that ends the return statement
# The template literal starts after 'return `'
depth = 0
i = ret_start
while i < len(content):
    if content[i] == '`':
        ret_end = i
        break
    i += 1

template_content = content[ret_start:ret_end]
print(f'Template literal: {ret_start} to {ret_end} ({len(template_content)} chars)')

# List of LaTeX command names that follow a backslash
latex_cmds = [
    'frac', 'sqrt', 'times', 'neq', 'leq', 'geq', 'approx', 'angle',
    'pm', 'sum', 'prod', 'int', 'lim', 'log', 'ln', 'sin', 'cos',
    'tan', 'cot', 'sec', 'csc', 'exp', 'det', 'binom', 'overline',
    'underline', 'hat', 'vec', 'dot', 'tilde', 'bar', 'nabla',
    'theta', 'alpha', 'beta', 'gamma', 'delta', 'lambda', 'mu',
    'sigma', 'omega', 'rho', 'tau', 'phi', 'psi', 'epsilon', 'eta',
    'nu', 'pi', 'infty', 'partial', 'circ', 'div', 'cdot', 'quad',
    'qquad', 'left', 'right', 'begin', 'end', 'hline', 'to',
    'rightarrow', 'leftarrow', 'Rightarrow', 'textbf', 'mathrm',
    'mathbf', 'text', 'forall', 'exists', 'subset', 'cup', 'cap',
    'cdots', 'ldots', 'boxed', 'boldsymbol',
]

# Build regex: match single backslash followed by a LaTeX command
# Negative lookbehind ensures we don't double already-doubled backslashes
cmds_pattern = '|'.join(re.escape(c) for c in sorted(latex_cmds, key=len, reverse=True))
pattern = rf'(?<!\)\(?=({cmds_pattern})\b)'

matches = list(re.finditer(pattern, template_content))
print(f'Found {len(matches)} single-backslash LaTeX commands to double')

# Replace in reverse order to maintain positions
for m in reversed(matches):
    pos = m.start() - ret_start + ret_start  # absolute position
    # Actually m.start() is relative to template_content
    local_pos = m.start()
    template_content = template_content[:local_pos] + '\\' + template_content[local_pos:]

print(f'After fix: {len(template_content)} chars')

# Reassemble
content = content[:ret_start] + template_content + content[ret_end:]

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
