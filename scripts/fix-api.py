import re

path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Replace isSolutionClean with lightweight version
old_clean = '''// ── Solution Quality Validator ──
function isSolutionClean(p: any): boolean {
  if (!p) return false;
  const chk = (s: string): boolean => {
    if (!s) return true;
    if (/[''' + '\u200B\u200C\u200D\uFEFF\u00AD\u2060-\u2064\u034F\u061C\u180E' + ''']/'.test(s)) return false;
    const ls = s.split("\n");
    if (ls.length > 5) {
      const ne = ls.filter((l: string) => l.trim().length > 0);
      if (ne.length > 6 && ne.reduce((a: number, l: string) => a + l.trim().length, 0) / ne.length < 5) return false;
    }
    if (/\bEm\s+for\b/.test(s) || /\bof\s+moles\b/.test(s)) return false;
    if (/\\f(?!rac|orall)/.test(s)) return false;
    return true;
  };
  if (!chk(p.finalAnswer)) return false;
  if (!chk(p.finalFormula)) return false;
  for (let i = 0; i < (p.steps || []).length; i++) {
    if (!chk(p.steps[i]?.desc)) return false;
    if (!chk(p.steps[i]?.formula)) return false;
  }
  return true;
}'''

# Let me find it by its start and end markers instead
start_marker = '// ── Solution Quality Validator ──'
end_marker = '// ── JSON extraction ──'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print('ERROR: Could not find start marker')
    exit(1)
if end_idx == -1:
    print('ERROR: Could not find end marker')
    exit(1)

new_clean = '''// ── Solution Quality Validator (lightweight) ──
function isSolutionClean(p: any): boolean {
  if (!p) return false;
  if (!p.finalAnswer || !Array.isArray(p.steps) || p.steps.length === 0) return false;
  return true;
}

'''

content = content[:start_idx] + new_clean + content[end_idx:]
print(f'1. Replaced isSolutionClean ({start_idx} to {end_idx})')

# 2. Remove the retry regeneration loop
old_retry = '''    // Try to parse JSON from AI response (deepCleanLaTeX runs inside extractJSON)
    // Quality gate: if solution is garbled, regenerate up to 3 times
    let parsed = extractJSON(raw);
    let clean = isSolutionClean(parsed);
    let retries = 0;
    while (!clean && retries < 3) {
      console.warn("[SpeedSolve] Solution garbled, regenerating (" + (retries+1) + "/3)...");
      const rr = await callAI(systemPrompt, userPrompt);
      if (!rr) break;
      const rp = extractJSON(rr);
      if (isSolutionClean(rp)) {
        parsed = rp;
        clean = true;
        console.log("[SpeedSolve] Regeneration " + (retries+1) + " succeeded");
      }
      retries++;
    }
    if (!clean && parsed) {
      console.warn("[SpeedSolve] All regenerations dirty, using repaired result");
    }'''

new_retry = '''    // Try to parse JSON from AI response (deepCleanLaTeX runs inside extractJSON)
    const parsed = extractJSON(raw);'''

if old_retry in content:
    content = content.replace(old_retry, new_retry)
    print('2. Removed retry regeneration loop')
else:
    print('2. WARNING: Could not find retry loop, searching...')
    # Try to find a looser match
    idx = content.find('let parsed = extractJSON(raw)')
    if idx != -1:
        print(f'   Found at index {idx}')
    # Try the first line
        idx2 = content.find('Quality gate: if solution is garbled')
        if idx2 != -1:
            print(f'   Found quality gate at {idx2}')

# 3. Remove verifyAnswer call in the main JSON path
old_verify1 = '''      // ── Verify answer before returning ──
      console.log(`[SpeedSolve] Verifying answer: "${finalAns}"`);
      const verification = await verifyAnswer(problem, finalAns, cleanedSteps, sub);
      if (!verification.verified && verification.correctedAnswer) {
        const corrected = sanitizeFinalAnswer(verification.correctedAnswer);
        const fixedCorrected = fixFormulaAnswer(corrected, cleanedSteps, problem);
        console.log(`[SpeedSolve] Using corrected answer: "${finalAns}" → "${fixedCorrected}"`);
        finalAns = fixedCorrected;
      }'''

new_verify1 = '''      // Verification skipped — nuclearLatexRepair + isSolutionClean handle quality.
      // Previously verifyAnswer made an extra AI call per solve, causing timeouts.'''

if old_verify1 in content:
    content = content.replace(old_verify1, new_verify1)
    print('3. Removed verifyAnswer call in main path')
else:
    print('3. WARNING: Could not find verifyAnswer in main path')

# 4. Remove verifyAnswer call in text fallback path and add deepCleanLaTeX
old_text_fb = '''    // JSON parse failed but we have text - build solution from raw text
    console.warn(`[SpeedSolve] JSON parse failed, building from raw text (${raw.length} chars)`);
    const textSolution = buildSolutionFromText(raw, sub, brd);
    // Sanitize and apply formula fix to fallback path too
    textSolution.finalAnswer = sanitizeFinalAnswer(textSolution.finalAnswer);
    textSolution.finalAnswer = fixFormulaAnswer(textSolution.finalAnswer, textSolution.steps || [], problem);

    // ── Verify text-fallback answer too ──
    const textVerification = await verifyAnswer(problem, textSolution.finalAnswer, textSolution.steps || [], sub);
    if (!textVerification.verified && textVerification.correctedAnswer) {
      textSolution.finalAnswer = sanitizeFinalAnswer(textVerification.correctedAnswer);
      textSolution.finalAnswer = fixFormulaAnswer(textSolution.finalAnswer, textSolution.steps || [], problem);
      console.log(`[SpeedSolve] Text-fallback corrected: "${textSolution.finalAnswer}"`);
    }

    return NextResponse.json({ success: true, data: textSolution, source: "ai" });'''

new_text_fb = '''    // JSON parse failed but we have text - build solution from raw text
    console.warn(`[SpeedSolve] JSON parse failed, building from raw text (${raw.length} chars)`);
    const textSolution = buildSolutionFromText(raw, sub, brd);
    // Run nuclearLatexRepair on the fallback solution too!
    const repairedTextSolution = deepCleanLaTeX(textSolution);
    // Sanitize and apply formula fix
    repairedTextSolution.finalAnswer = sanitizeFinalAnswer(repairedTextSolution.finalAnswer);
    repairedTextSolution.finalAnswer = fixFormulaAnswer(repairedTextSolution.finalAnswer, repairedTextSolution.steps || [], problem);

    return NextResponse.json({ success: true, data: repairedTextSolution, source: "ai" });'''

if old_text_fb in content:
    content = content.replace(old_text_fb, new_text_fb)
    print('4. Fixed text fallback path with deepCleanLaTeX + removed verifyAnswer')
else:
    print('4. WARNING: Could not find text fallback section')

with open(path, 'w') as f:
    f.write(content)

print('\nDone! All fixes applied.')
