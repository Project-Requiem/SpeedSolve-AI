# Fix renderLatex - use raw strings for backslash preservation

filepath = '/home/z/my-project/src/app/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

start_marker = '// Wrap bare LaTeX commands (not in $...$) so KaTeX can render them'
start_idx = content.index(start_marker)

render_marker = 'function renderLatex(text: string): string {'
render_idx = content.index(render_marker, start_idx)

brace_count = 0
end_idx = render_idx
for i in range(render_idx, len(content)):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            end_idx = i + 1
            break

old_block = content[start_idx:end_idx]
print(f'Found block at {start_idx}-{end_idx} ({len(old_block)} chars)')

# Read the replacement from a separate file to avoid escaping hell
new_block = open('/home/z/my-project/scripts/render-latex-new.tsx', 'r').read()

content = content[:start_idx] + new_block + content[end_idx:]

with open(filepath, 'w') as f:
    f.write(content)

print('Done! Block replaced successfully')
