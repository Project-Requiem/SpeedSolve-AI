const http = require('http');

function post(problem, subject = 'mathematics', board = 'icse') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ problem, subject, board });
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/solve',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { reject(new Error('Parse error: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function main() {
  const tests = [
    ['Linear', 'Solve 3x + 5 = 14', 'mathematics'],
    ['Quadratic', 'Solve x^2 - 5x + 6 = 0', 'mathematics'],
    ['Percentage', 'Find 15% of 200', 'mathematics'],
    ['pH', 'Find the pH of 0.01 M HCl solution.', 'chemistry'],
    ['Ohm', 'Find the resistance of a circuit with 12V battery and 3A current.', 'physics'],
    ['Speed', 'A train travels 360 km in 4 hours. Find its speed in m/s.', 'physics'],
    ['SI', 'Simple Interest on Rs 5000 at 8% per annum for 3 years', 'mathematics'],
    ['Stats', 'Find the mean, median, mode of: 5, 3, 7, 3, 5, 9, 3, 1', 'mathematics'],
    ['Moles', 'How many moles are in 80g of NaOH? (Na=23, O=16, H=1)', 'chemistry'],
    ['Force', 'A 2 kg block is pushed with 10 N force on a frictionless surface. Find acceleration.', 'physics'],
  ];

  for (const [label, problem, subj] of tests) {
    try {
      const d = await post(problem, subj);
      const src = d.source || '?';
      const ans = d.data?.finalAnswer || d.error || 'NO DATA';
      console.log(`OK ${label.padEnd(12)} | ${src.padEnd(6)} | ${ans}`);
    } catch(e) {
      console.log(`FAIL ${label.padEnd(12)} | ${e.message.slice(0, 80)}`);
    }
  }
}

main().catch(console.error);