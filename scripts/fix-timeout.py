path = '/home/z/my-project/src/app/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add AbortController timeout to main solve fetch
old1 = '''      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: trimmed, subject: activeSubject, board }),
      })'''

new1 = '''      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: trimmed, subject: activeSubject, board }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)'''

if old1 in content:
    content = content.replace(old1, new1, 1)  # only first occurrence
    print('1. Added timeout to main fetch')
else:
    print('1. WARNING: Could not find main fetch')

# Fix the catch block to handle abort errors
old_catch1 = '''    } catch {
      clearInterval(progressRef.current!)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }'''

new_catch1 = '''    } catch (err: any) {
      clearInterval(progressRef.current!)
      if (err?.name === 'AbortError') {
        setError('Request timed out. The AI providers may be busy - please try again.')
      } else {
        setError('Network error. Please check your connection and try again.')
      }
      setLoading(false)
    }'''

if old_catch1 in content:
    content = content.replace(old_catch1, new_catch1, 1)
    print('2. Fixed catch block for abort error')
else:
    print('2. WARNING: Could not find catch block')

with open(path, 'w') as f:
    f.write(content)

print('Done!')
