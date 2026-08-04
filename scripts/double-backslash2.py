# Double all backslashes within the buildSystemPrompt template literal
# Simple approach: find all \ + LaTeX-command and add an extra backslash

import re

filepath = '/home/z/my-project/src/app/api/solve/route.ts'
with open(filepath, 'r') as f:
    content = f.read()

# Find the template literal boundaries
ret_start = content.index('return `') + len('return `')
ret_end = content.index('`;', ret_start)

template_content = content[ret_start:ret_end]
print(f'Template literal: {ret_start} to {ret_end} ({len(template_content)} chars)')

# LaTeX commands to double-escape (sorted by length desc for greedy matching)
latex_cmds = [
    'rightarrow', 'leftarrow', 'Rightarrow', 'overline', 'underline',
    'boldsymbol', 'textbf', 'mathrm', 'mathbf', 'nabla',
    'forall', 'exists', 'subset', 'sqrt', 'frac', 'binom',
    'theta', 'alpha', 'beta', 'gamma', 'delta', 'lambda',
    'sigma', 'omega', 'epsilon', 'partial', 'infty',
    'times', 'leq', 'geq', 'neq', 'approx', 'angle', 'cdot',
    'rightarrow', 'sum', 'prod', 'left', 'right',
    'begin', 'hline', 'cdots', 'ldots', 'boxed',
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'log', 'exp', 'det', 'lim', 'hat', 'vec', 'dot',
    'bar', 'tilde', 'rho', 'tau', 'phi', 'psi', 'eta', 'nu', 'mu',
    'pi', 'pm', 'div', 'circ', 'quad', 'qquad', 'to', 'int',
    'cup', 'cap', 'text',
]

# Remove duplicates while preserving order
seen = set()
unique_cmds = []
for c in latex_cmds:
    if c not in seen:
        seen.add(c)
        unique_cmds.append(c)
latex_cmds = unique_cmds

fixed = 0
# Process each command: find \cmd NOT preceded by another \  
for cmd in latex_cmds:
    # Pattern: a backslash that is NOT preceded by another backslash,
    # followed by the command name followed by a non-letter or end
    old_len = len(template_content)
    # Use a simple approach: replace \cmd with \\cmd, but only when not already doubled
    result = []
    i = 0
    cmd_with_slash = '\\' + cmd
    while i < len(template_content):
        # Check if we're at \cmd
        if (template_content[i] == '\\' and 
            template_content[i+1:i+1+len(cmd)] == cmd and
            (i + 1 + len(cmd) >= len(template_content) or not template_content[i+1+len(cmd)].isalpha()) and
            (i == 0 or template_content[i-1] != '\\')):
            result.append('\\\\' + cmd)  # double the backslash
            i += 1 + len(cmd)
            fixed += 1
        else:
            result.append(template_content[i])
            i += 1
    template_content = ''.join(result)

print(f'Fixed {fixed} single-backslash commands')

# Reassemble
content = content[:ret_start] + template_content + content[ret_end:]

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
