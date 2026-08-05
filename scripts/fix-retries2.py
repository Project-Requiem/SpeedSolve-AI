path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    lines = f.readlines()

result = []
i = 0
gemini_fixed = False
groq_fixed = False

while i < len(lines):
    # Fix Gemini: change attempt < 3 to attempt < 2
    if not gemini_fixed and 'attempt < 3' in lines[i] and i > 5 and i < 40:
        lines[i] = lines[i].replace('attempt < 3', 'attempt < 2')
        gemini_fixed = True
        print(f'1. Fixed Gemini retries at line {i+1}')
    
    # Fix Groq: remove inner retry loop entirely
    if not groq_fixed and 'for (let attempt = 0; attempt < 2; attempt++)' in lines[i] and i > 35 and i < 80:
        # Skip this line (remove the inner loop start)
        groq_fixed = True
        print(f'2. Removed Groq inner retry loop at line {i+1}')
        i += 1
        continue
    
    # Skip the Groq retry delay line
    if groq_fixed and 'await new Promise(r => setTimeout(r, 500))' in lines[i] and i < 80:
        print(f'3. Removed Groq retry delay at line {i+1}')
        i += 1
        continue
    
    result.append(lines[i])
    i += 1

with open(path, 'w') as f:
    f.writelines(result)

print('\nDone!')
