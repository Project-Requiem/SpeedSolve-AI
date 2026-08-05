with open('src/app/page.tsx', 'r') as f:
    lines = f.readlines()

with open('scripts/new-render.ts', 'r') as f:
    new_render = f.read()

# Replace lines 158-235 (0-indexed 157-234) — from KaTeX Helper through end of renderLatex
# Line 236 (0-idx 235) is blank, line 237 (0-idx 236) is the next function
new_lines = lines[:157] + [new_render + '\n'] + lines[235:]

with open('src/app/page.tsx', 'w') as f:
    f.writelines(new_lines)

print(f'Done. Old file had {len(lines)} lines, new file has {len(new_lines)} lines')
