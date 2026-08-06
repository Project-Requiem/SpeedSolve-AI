path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# Fix Groq indentation: the try block has 6 spaces instead of 4
old_groq_block = '''  for (const model of models) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 8192,
          }),
          signal: AbortSignal.timeout(35000),
        });
        if (!res.ok) {
          console.error(`[SpeedSolve] Groq ${model}: ${res.status}`);
          continue;
        }
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || "";
        if (text.trim().length > 20) {
          console.log(`[SpeedSolve] Groq ${model} OK (${text.length} chars)`);
          return text;
        }
      } catch (err: any) {
        console.error(`[SpeedSolve] Groq ${model}: ${err?.message?.slice(0, 100)}`);
      }
  }'''

new_groq_block = '''  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(35000),
      });
      if (!res.ok) {
        console.error(`[SpeedSolve] Groq ${model}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      if (text.trim().length > 20) {
        console.log(`[SpeedSolve] Groq ${model} OK (${text.length} chars)`);
        return text;
      }
    } catch (err: any) {
      console.error(`[SpeedSolve] Groq ${model}: ${err?.message?.slice(0, 100)}`);
    }
  }'''

if old_groq_block in content:
    content = content.replace(old_groq_block, new_groq_block)
    print('Fixed Groq indentation')
else:
    print('WARNING: Could not match Groq block')

with open(path, 'w') as f:
    f.write(content)

print('Done!')
