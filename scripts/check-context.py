# Check context around specific positions in route.ts
filepath = '/home/z/my-project/src/app/api/solve/route.ts'
with open(filepath, 'r') as f:
    lines = f.readlines()

# Check lines around the theta occurrences (near line ~170 based on char pos)
for i, line in enumerate(lines):
    if 'theta' in line.lower():
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'frac' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'times' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'neq' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'sqrt' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'angle' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'leq' in line or 'geq' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'approx' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'pm' in line and '\\' not in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'partial' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'rightarrow' in line or 'Rightarrow' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'overline' in line or 'underline' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'nabla' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'forall' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'infty' in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
    if 'delta' in line and 'useDelta' not in line:
        print(f'Line {i+1}: {line.rstrip()[:120]}')
