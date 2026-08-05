path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

start_marker = '// ── Answer Verification'
end_marker = 'function generateSimilarQuestions'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    before = content[:start_idx].rstrip()
    after = content[end_idx:]
    content = before + '\n\n// ── Utility functions ──\n\n' + after
    print(f'Removed verifyAnswer function ({start_idx} to {end_idx})')
else:
    print(f'ERROR: start={start_idx}, end={end_idx}')
    exit(1)

with open(path, 'w') as f:
    f.write(content)

print('Done!')
