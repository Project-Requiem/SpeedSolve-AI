# Fix all LaTeX backslashes in route.ts prompt and examples
# Problem: JS template literals / strings eat \f, \t, \n, \b, and drop \ for unrecognized escapes
# Fix: double-escape all \cmd sequences: \frac -> \\frac

import re

filepath = '/home/z/my-project/src/app/api/solve/route.ts'
with open(filepath, 'r') as f:
    content = f.read()

# All LaTeX commands that need double-escaping
latex_cmds = [
    'frac', 'sqrt', 'times', 'neq', 'leq', 'geq', 'approx', 'angle',
    'pm', 'sum', 'prod', 'int', 'lim', 'log', 'ln', 'sin', 'cos',
    'tan', 'cot', 'sec', 'csc', 'exp', 'det', 'binom', 'overline',
    'underline', 'hat', 'vec', 'dot', 'tilde', 'bar', 'nabla',
    'theta', 'alpha', 'beta', 'gamma', 'delta', 'lambda', 'mu',
    'sigma', 'omega', 'rho', 'tau', 'phi', 'psi', 'epsilon', 'eta',
    'nu', 'pi', 'infty', 'partial', 'circ', 'div', 'quad', 'qquad',
    'left', 'right', 'begin', 'end', 'hline', 'to', 'rightarrow',
    'leftarrow', 'Rightarrow', 'textbf', 'mathrm', 'mathbf', 'text',
    'forall', 'exists', 'in', 'notin', 'subset', 'supset', 'cup', 'cap',
    'vee', 'wedge', 'oplus', 'otimes', 'cdot', 'cdots', 'ldots',
    'dagger', 'ddagger', 'ell', 'boldsymbol', 'boxed',
]

# Build a regex pattern that matches single-backslash LaTeX commands
# Negative lookbehind for \ ensures we don't double-escape already-escaped ones
# Negative lookahead for { ensures we match the command name
pattern_parts = '|'.join(latex_cmds)
pattern = rf'(?<!\\)\\({pattern_parts})(?![a-zA-Z])'

# Count matches before
before_matches = len(re.findall(pattern, content))
print(f'Found {before_matches} single-backslash LaTeX commands to fix')

# Replace: add extra backslash
content = re.sub(pattern, r'\\\\1', content)

# Verify
after_single = len(re.findall(pattern, content))
print(f'Remaining single-backslash commands: {after_single}')

with open(filepath, 'w') as f:
    f.write(content)

print(f'Fixed {before_matches - after_single} LaTeX commands')
print('Done!')
