path = '/home/z/my-project/src/app/api/solve/local-solver.ts'
with open(path, 'r') as f:
    content = f.read()

old_fn_start = 'export function preprocessProblem(text: string): string {'
old_fn_end = '  return s;\n}'

s_idx = content.find(old_fn_start)
# Find the last occurrence of the end marker
all_ends = []
pos = 0
while True:
    idx = content.find(old_fn_end, pos)
    if idx == -1:
        break
    all_ends.append(idx)
    pos = idx + 1

e_idx = all_ends[-1] if len(all_ends) > 0 else -1
if e_idx == -1:
    print('ERROR: end not found')
    exit(1)

e_idx += len(old_fn_end)

new_preprocess = '''export function preprocessProblem(text: string): string {
  let s = text;

  // Superscript digits
  const superscripts: Record<string, string> = {
    '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3', '\u2074': '4',
    '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9',
  };
  s = s.replace(/([a-zA-Z0-9)])([\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u2070\u00b9])/g,
    (_, base, sup) => `${base}^${superscripts[sup] || sup}`);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [uni, ascii] of Object.entries(superscripts)) {
      if (s.includes(uni)) { s = s.replace(uni, ascii); changed = true; }
    }
  }

  // Subscript digits
  const subscripts: Record<string, string> = {
    '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4',
    '\u2085': '5', '\u2086': '6', '\u2087': '7', '\u2088': '8', '\u2089': '9',
  };
  for (const [uni, ascii] of Object.entries(subscripts)) {
    s = s.replace(new RegExp(uni, 'g'), `_${ascii}`);
  }

  // Math operation symbols
  s = s.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/\u2212/g, '-');
  s = s.replace(/\u00b2/g, '^2').replace(/\u00b3/g, '^3');

  // Comparison symbols
  s = s.replace(/\u2260/g, '!=').replace(/\u2264/g, '<=').replace(/\u2265/g, '>=');
  s = s.replace(/\u2248/g, ' approximately ');
  s = s.replace(/\u2192/g, '->').replace(/\u2190/g, '<-').replace(/\u2194/g, '<->');

  // Set theory symbols
  s = s.replace(/\u2208/g, ' in ').replace(/\u2209/g, ' not in ');
  s = s.replace(/\u2282/g, ' subset of ').replace(/\u2283/g, ' superset of ');
  s = s.replace(/\u222a/g, ' union ').replace(/\u2229/g, ' intersection ');
  s = s.replace(/\u2205/g, 'empty set');
  s = s.replace(/\u2200/g, 'for all ').replace(/\u2203/g, 'there exists ');
  s = s.replace(/\u2234/g, 'therefore ').replace(/\u2235/g, 'because ');

  // Greek letters (lowercase)
  s = s.replace(/\u03b8/g, 'theta');  // theta
  s = s.replace(/\u03b1/g, 'alpha');  // alpha
  s = s.replace(/\u03b2/g, 'beta');   // beta
  s = s.replace(/\u03b3/g, 'gamma');  // gamma
  s = s.replace(/\u03b4/g, 'delta');  // delta
  s = s.replace(/\u03b5/g, 'epsilon'); // epsilon
  s = s.replace(/\u03bb/g, 'lambda'); // lambda
  s = s.replace(/\u03bc/g, 'mu');     // mu
  s = s.replace(/\u03c3/g, 'sigma');  // sigma
  s = s.replace(/\u03c9/g, 'omega');  // omega
  s = s.replace(/\u03c1/g, 'rho');    // rho
  s = s.replace(/\u03c6/g, 'phi');    // phi
  s = s.replace(/\u03c8/g, 'psi');    // psi
  s = s.replace(/\u03b7/g, 'eta');    // eta
  s = s.replace(/\u03bd/g, 'nu');     // nu
  s = s.replace(/\u03c4/g, 'tau');    // tau
  s = s.replace(/\u03c0/g, 'pi');     // pi
  s = s.replace(/\u221e/g, 'infinity'); // infinity

  // Special math symbols
  s = s.replace(/\u221a/g, 'sqrt(');   // square root
  s = s.replace(/\u221b/g, 'cbrt(');   // cube root
  s = s.replace(/\u222b/g, 'integral of '); // integral
  s = s.replace(/\u2211/g, 'sum of ');     // sum
  s = s.replace(/\u220f/g, 'product of '); // product
  s = s.replace(/\u2202/g, 'd');         // partial
  s = s.replace(/\u2207/g, 'del ');       // nabla
  s = s.replace(/\u00b1/g, ' +/- ');     // plus-minus
  s = s.replace(/\u00b7/g, '*');          // middle dot

  // Chemistry arrows
  s = s.replace(/\u21cc/g, '<->').replace(/\u2192/g, '->');
  s = s.replace(/\u2191/g, '(g)').replace(/\u2193/g, '(s)');

  // Fancy quotes
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

  // Em dashes and ellipsis
  s = s.replace(/\u2014|\u2013/g, '-').replace(/\u2026/g, '...');

  // Invisible Unicode (zero-width chars)
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '');

  // Normalize whitespace
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}'''

content = content[:s_idx] + new_preprocess + content[e_idx:]
print('4. Upgraded preprocessProblem with full Unicode/Greek/symbol support')

with open(path, 'w') as f:
    f.write(content)

print('Phase 4 done')
