import os

path = 'src/app/api/solve/route.ts'
with open(path, 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function extractJSON' in line:
        new_lines = lines[:556] + lines[i-1:]
        with open(path, 'w') as f:
            f.writelines(new_lines)
        print(f'Removed orphaned lines. New total: {len(new_lines)}')
        break
