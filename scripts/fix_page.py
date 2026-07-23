import re

with open('/home/z/my-project/src/app/page.tsx', 'r') as f:
    lines = f.readlines()

# Find and remove the fallback button block
# It starts with: {solution && solveSource === 'fallback' && (
# And ends 10 lines later with: )}
new_lines = []
skip = False
for i, line in enumerate(lines):
    if "solveSource === 'fallback'" in line and 'solution &&' in line:
        skip = True
        continue
    if skip:
        if line.strip() == ')}' or (line.strip().startswith(')') and new_lines[-1].strip().startswith('</button>')):
            # Check if the previous non-empty line was a button close
            skip = False
            continue
        continue
    new_lines.append(line)

with open('/home/z/my-project/src/app/page.tsx', 'w') as f:
    f.writelines(new_lines)

print(f'Removed fallback block. Lines: {len(lines)} -> {len(new_lines)}')
