# Comprehensive fix for ALL LaTeX backslash issues in route.ts
# Two types of problems:
# 1. Control chars (0x0C, 0x08, 0x0B, 0x09) from JS escape interpretation in template literal
# 2. Single backslash in double-quoted strings that JS will interpret at runtime

filepath = '/home/z/my-project/src/app/api/solve/route.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)

# === PART 1: Fix control characters in template literal (buildSystemPrompt) ===
# These are actual control chars in the file from previous Python script write
control_fixes = [
    ('\x0crac', '\\\\frac'),       # form-feed + rac -> \frac
    ('\x0corall', '\\\\forall'),    # form-feed + orall -> \forall
    ('\x08eta', '\\\\beta'),        # backspace + eta -> \beta
    ('\x08inom', '\\\\binom'),      # backspace + inom -> \binom
    ('\x08old', '\\\\bold'),        # backspace + old -> \bold (boldsymbol)
    ('\x0bec', '\\\\vec'),          # vertical-tab + ec -> \vec
    ('\x09heta', '\\\\theta'),      # tab + heta -> \theta
    ('\x09imes', '\\\\times'),      # tab + imes -> \times
    ('\x09an\\b', '\\\\tan'),     # tab + an + backspace -> \tan
    ('\x09an ', '\\\\tan '),       # tab + an + space -> \tan
    ('\x09ext', '\\\\text'),       # tab + ext -> \text  
    ('\x09ilde', '\\\\tilde'),      # tab + ilde -> \tilde
    ('\x09o ', '\\\\to '),         # tab + o + space -> \to
    ('\x0aeq', '\\\\neq'),         # newline + eq -> \neq
    ('\x0au', '\\\\nu'),           # newline + u -> \nu (be careful)
    ('\x0aabla', '\\\\nabla'),     # newline + abla -> \nabla
    ('\x0dho', '\\\\rho'),         # CR + ho -> \rho
    ('\x0dight', '\\\\right'),     # CR + ight -> \right
]

for old, new in control_fixes:
    if old in content:
        count = content.count(old)
        content = content.replace(old, new)
        print(f'Fixed {count}x: {repr(old)} -> {repr(new)}')

# === PART 2: In the template literal, fix commands that lost their backslash ===
# These appear as just the command name without any backslash
# Only fix within the buildSystemPrompt function (between 'function buildSystemPrompt' and the closing)
import re

prompt_start = content.index('function buildSystemPrompt')
prompt_end = content.index('\n// ── JSON extraction ──')

# Commands that need \\ prefix in the template literal
# (JS template literal drops \ for unrecognized escapes like \sin, \cos, \pi, etc.)
template_cmds = [
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp',
    'det', 'lim', 'sum', 'prod', 'int', 'sqrt',
    'pi', 'infty', 'partial', 'circ', 'div', 'pm',
    'leq', 'geq', 'approx', 'angle', 'cdot', 'quad', 'qquad',
    'delta', 'lambda', 'mu', 'sigma', 'omega', 'tau', 'phi', 'psi',
    'epsilon', 'eta', 'gamma', 'overline', 'underline', 'hat', 'bar',
    'nabla', 'boxed', 'begin', 'end', 'hline', 'to',
    'rightarrow', 'leftarrow', 'forall', 'exists',
    'cup', 'cap', 'subset', 'mathrm', 'mathbf', 'textbf',
    'cdot', 'cdots', 'ldots', 'dagger', 'ddagger', 'ell',
    'boldsymbol', 'Rightarrow',
]

before_section = content[:prompt_start]
after_section = content[prompt_end:]
prompt_section = content[prompt_start:prompt_end]

fixed_in_prompt = 0
for cmd in template_cmds:
    # Find cmd NOT preceded by backslash, and NOT inside comments or code
    pattern = rf'(?<![\\a-zA-Z])\b{cmd}\b'
    matches = list(re.finditer(pattern, prompt_section))
    for m in reversed(matches):
        pos = m.start()
        # Skip if inside a JS comment or console.log or code patterns
        line_start = prompt_section.rfind('\n', 0, pos) + 1
        line_prefix = prompt_section[line_start:pos]
        if 'console.' in line_prefix or '//' in line_prefix or '.replace(' in line_prefix:
            continue
        if '.test(' in line_prefix or 'rg' in line_prefix or 'grep' in line_prefix:
            continue
        # Skip if already has \\ before it
        if pos >= 2 and prompt_section[pos-2:pos] == '\\\\':
            continue
        # Skip 'angle' in JSON preset values (like "angle":30)
        if cmd == 'angle' and ('"angle"' in line_prefix or "'angle'" in line_prefix):
            continue
        # Skip 'delta' if it's in 'useDelta' or variable names
        if cmd == 'delta' and re.search(r'\b(useDelta|setDelta|delta\w*=)', line_prefix):
            continue
        # Skip common English words that match
        if cmd in ('int', 'to', 'bar', 'hat', 'exp') and not re.search(r'\$|\\{|formula|step|desc|LaTeX|math', prompt_section[max(0,pos-50):pos+50]):
            continue
        # Only fix if it looks like it's in a LaTeX/math context
        context = prompt_section[max(0,pos-30):pos+30]
        if any(kw in context for kw in ['$', '\\{', 'formula', 'LaTeX', 'LATEX', 'USE ', 'WRAP', 'math', 'step', 'Example', 'rule', 'Rule', 'RULE']):
            prompt_section = prompt_section[:pos] + '\\\\' + prompt_section[pos:]
            fixed_in_prompt += 1

print(f'Fixed {fixed_in_prompt} dropped-backslash commands in template literal')

# === PART 3: Fix single backslash in EXAMPLES (double-quoted strings inside JSON.stringify) ===
# In the file on disk, these have \frac (0x5c + frac) which JS will interpret as form-feed
# We need to change to \\frac (0x5c + 0x5c + frac) which JS interprets as \frac
examples_start = content[:prompt_start].rfind('const EXAMPLES')
examples_end = content[:prompt_start].index('};', examples_start) + 2
examples_section = content[examples_start:examples_end]

# Replace single backslash + LaTeX cmd with double backslash + cmd
# Only within the EXAMPLES section
single_bs_fixes = [
    ('\\frac', '\\\\frac'),
    ('\\sqrt', '\\\\sqrt'),
    ('\\times', '\\\\times'),
    ('\\pm', '\\\\pm'),
    ('\\pi', '\\\\pi'),
    ('\\delta', '\\\\delta'),
    ('\\theta', '\\\\theta'),
    ('\\alpha', '\\\\alpha'),
    ('\\beta', '\\\\beta'),
    ('\\gamma', '\\\\gamma'),
    ('\\lambda', '\\\\lambda'),
    ('\\mu', '\\\\mu'),
    ('\\sigma', '\\\\sigma'),
    ('\\omega', '\\\\omega'),
    ('\\rho', '\\\\rho'),
    ('\\tau', '\\\\tau'),
    ('\\phi', '\\\\phi'),
    ('\\psi', '\\\\psi'),
    ('\\epsilon', '\\\\epsilon'),
    ('\\eta', '\\\\eta'),
    ('\\nu', '\\\\nu'),
    ('\\infty', '\\\\infty'),
    ('\\partial', '\\\\partial'),
    ('\\circ', '\\\\circ'),
    ('\\div', '\\\\div'),
    ('\\leq', '\\\\leq'),
    ('\\geq', '\\\\geq'),
    ('\\neq', '\\\\neq'),
    ('\\approx', '\\\\approx'),
    ('\\angle', '\\\\angle'),
    ('\\cdot', '\\\\cdot'),
    ('\\sum', '\\\\sum'),
    ('\\prod', '\\\\prod'),
    ('\\int', '\\\\int'),
    ('\\lim', '\\\\lim'),
    ('\\log', '\\\\log'),
    ('\\ln', '\\\\ln'),
    ('\\sin', '\\\\sin'),
    ('\\cos', '\\\\cos'),
    ('\\tan', '\\\\tan'),
    ('\\cot', '\\\\cot'),
    ('\\sec', '\\\\sec'),
    ('\\csc', '\\\\csc'),
    ('\\exp', '\\\\exp'),
    ('\\det', '\\\\det'),
    ('\\sqrt', '\\\\sqrt'),
    ('\\overline', '\\\\overline'),
    ('\\vec', '\\\\vec'),
    ('\\to', '\\\\to'),
    ('\\Rightarrow', '\\\\Rightarrow'),
    ('\\rightarrow', '\\\\rightarrow'),
    ('\\left', '\\\\left'),
    ('\\right', '\\\\right'),
]

fixed_in_examples = 0
for old, new in single_bs_fixes:
    if old in examples_section:
        count = examples_section.count(old)
        examples_section = examples_section.replace(old, new)
        fixed_in_examples += count
        print(f'Examples: {count}x {old} -> {new}')

# Reassemble
content = before_section + examples_section + content[examples_end:prompt_start] + prompt_section + after_section

print(f'\nTotal file size: {original_len} -> {len(content)} chars')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done! All LaTeX escaping fixed.')