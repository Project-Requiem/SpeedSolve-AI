path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Gemini: reduce from 3 attempts per model to 2
old_gemini = '''    for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {'''
new_gemini = '''    for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {'''
if old_gemini in content:
    content = content.replace(old_gemini, new_gemini, 1)
    print('1. Gemini: 3 -> 2 attempts per model')

# 2. Groq: reduce from 2 attempts per model to 1
old_groq = '''    for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions"'''
new_groq = '''    for (const model of models) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions"'''
if old_groq in content:
    # Need to also remove the retry delay and closing brace
    content = content.replace(old_groq, new_groq, 1)
    print('2. Groq: removed inner retry loop start')

# Find and fix the Groq retry delay and extra closing brace
old_groq_end = '''      await new Promise(r => setTimeout(r, 500));
    }
  }'''
new_groq_end = '''  }'''
if old_groq_end in content:
    content = content.replace(old_groq_end, new_groq_end, 1)
    print('3. Groq: removed retry delay and extra brace')

# 3. Remove the final Gemini retry (step 4 in callAI)
old_retry = '''  // 4. Retry Gemini one more time (transient errors)
  console.log("[SpeedSolve] All providers failed, retrying Gemini...");
  await new Promise(r => setTimeout(r, 2000));
  const retryResult = await callGemini(systemPrompt, userPrompt);
  if (retryResult) return retryResult;

  console.error("[SpeedSolve] ALL AI providers failed after full retry");'''
new_retry = '''  console.error("[SpeedSolve] ALL AI providers failed");'''
if old_retry in content:
    content = content.replace(old_retry, new_retry)
    print('4. Removed final Gemini retry')

with open(path, 'w') as f:
    f.write(content)

print('\nDone!')
