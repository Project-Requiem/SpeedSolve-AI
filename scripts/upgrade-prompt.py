path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Remove verifyAnswer function entirely
start_marker = '// ── Answer Verification'
end_marker = 'function generateSimilarQuestions'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    before = content[:start_idx].rstrip()
    after = content[end_idx:]
    content = before + '\n\n' + after
    print(f'1. Removed verifyAnswer ({start_idx} to {end_idx})')
else:
    print(f'1. WARNING: verifyAnswer not found (start={start_idx}, end={end_idx})')

# 2. Remove verifyAnswer calls in POST handler
old_verify1 = '''      // ── Verify answer before returning ──
      console.log(`[SpeedSolve] Verifying answer: "${finalAns}"`);
      const verification = await verifyAnswer(problem, finalAns, cleanedSteps, sub);
      if (!verification.verified && verification.correctedAnswer) {
        const corrected = sanitizeFinalAnswer(verification.correctedAnswer);
        const fixedCorrected = fixFormulaAnswer(corrected, cleanedSteps, problem);
        console.log(`[SpeedSolve] Using corrected answer: "${finalAns}" → "${fixedCorrected}"`);
        finalAns = fixedCorrected;
      }'''

if old_verify1 in content:
    content = content.replace(old_verify1, '      // Verification skipped for speed')
    print('2. Removed verifyAnswer call in main path')
else:
    print('2. WARNING: Could not find verifyAnswer call in main path')

old_verify2 = '''    // ── Verify text-fallback answer too ──
    const textVerification = await verifyAnswer(problem, textSolution.finalAnswer, textSolution.steps || [], sub);
    if (!textVerification.verified && textVerification.correctedAnswer) {
      textSolution.finalAnswer = sanitizeFinalAnswer(textVerification.correctedAnswer);
      textSolution.finalAnswer = fixFormulaAnswer(textSolution.finalAnswer, textSolution.steps || [], problem);
      console.log(`[SpeedSolve] Text-fallback corrected: "${textSolution.finalAnswer}"`);
    }'''

if old_verify2 in content:
    content = content.replace(old_verify2, '')
    print('3. Removed verifyAnswer call in text fallback')
else:
    print('3. WARNING: Could not find verifyAnswer call in text fallback')

with open(path, 'w') as f:
    f.write(content)

print('Phase 1 done - verifyAnswer removed')
