with open('src/app/api/solve/route.ts', 'r') as f:
    lines = f.readlines()

with open('scripts/new-backend-cleanup.ts', 'r') as f:
    new_func = f.read()

# Find function start and end
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'function cleanSolutionStrings(obj: any): any' in line:
        start_idx = i
    if start_idx is not None and i > start_idx and line.strip() == '}':
        end_idx = i
        break

if start_idx is None:
    print('ERROR: function not found')
    exit(1)

print(f'Replacing lines {start_idx+1}-{end_idx+1}')
new_lines = lines[:start_idx] + [new_func + '\n'] + lines[end_idx+1:]

with open('src/app/api/solve/route.ts', 'w') as f:
    f.writelines(new_lines)

print(f'Done. Old: {len(lines)} lines, new: {len(new_lines)} lines')
