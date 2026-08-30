import * as fs from 'fs';

const css = fs.readFileSync('/home/z/my-project/src/app/globals.css', 'utf8');

// Revert all font sizes to original (pre-increase) values
const replacements: [RegExp, string][] = [
  [/font-size: clamp\(16px, 1\.2vw \+ 0\.6rem, 19px\)/, 'font-size: clamp(15px, 1.1vw + 0.5rem, 18px)'],
  [/font-size: clamp\(1\.2rem, 1\.5vw, 1\.5rem\); font-weight: 800/, 'font-size: clamp(1.1rem, 1.4vw, 1.35rem); font-weight: 800'],
  // sel-label
  [/(\.sel-label \{[^}]*?)font-size: clamp\(0\.75rem, 0\.8vw, 0\.85rem\)/, '$1font-size: clamp(0.65rem, 0.7vw, 0.75rem)'],
  // sel-btn
  [/(\.sel-btn \{[^}]*?)font-size: clamp\(0\.85rem, 0\.9vw, 0\.95rem\)/, '$1font-size: clamp(0.75rem, 0.8vw, 0.85rem)'],
  // selector-label
  [/(\.selector-label \{[^}]*?)font-size: clamp\(0\.8rem, 0\.9vw, 0\.9rem\)/, '$1font-size: clamp(0.7rem, 0.8vw, 0.8rem)'],
  // subj-name
  [/(\.subj-name \{[^}]*?)font-size: clamp\(1\.05rem, 1\.2vw, 1\.2rem\)/, '$1font-size: clamp(0.95rem, 1.1vw, 1.1rem)'],
  // subj-desc
  [/(\.subj-desc \{[^}]*?)font-size: clamp\(0\.8rem, 0\.85vw, 0\.9rem\)/, '$1font-size: clamp(0.7rem, 0.75vw, 0.8rem)'],
  // panel-header h2
  [/(\.panel-header h2 \{[^}]*?)font-size: clamp\(0\.95rem, 1vw, 1\.1rem\)/, '$1font-size: clamp(0.85rem, 0.9vw, 0.95rem)'],
  // input-label
  [/(\.input-label \{[^}]*?)font-size: clamp\(0\.9rem, 0\.95vw, 0\.95rem\)/, '$1font-size: clamp(0.8rem, 0.85vw, 0.85rem)'],
  // input-textarea
  [/(\.input-textarea \{[^}]*?)font-size: clamp\(1rem, 1\.1vw, 1\.1rem\)/, '$1font-size: clamp(0.9rem, 1vw, 1rem)'],
  // input-textarea placeholder
  [/(\.input-textarea::placeholder \{[^}]*?)font-size: clamp\(0\.9rem, 0\.95vw, 1rem\)/, '$1font-size: clamp(0.8rem, 0.85vw, 0.9rem)'],
  // pill
  [/(\.pill \{[^}]*?)font-size: clamp\(0\.85rem, 0\.9vw, 0\.95rem\)/, '$1font-size: clamp(0.75rem, 0.8vw, 0.85rem)'],
  // btn-solve
  [/(\.btn-solve \{[^}]*?)font-size: clamp\(1\.05rem, 1\.1vw, 1\.15rem\)/, '$1font-size: clamp(0.95rem, 1vw, 1.05rem)'],
  // btn-clear
  [/(\.btn-clear \{[^}]*?)font-size: clamp\(0\.95rem, 1vw, 1\.05rem\)/, '$1font-size: clamp(0.85rem, 0.9vw, 0.95rem)'],
  // output-empty h3
  [/(\.output-empty h3 \{[^}]*?)font-size: clamp\(1\.4rem, 1\.7vw, 1\.8rem\)/, '$1font-size: clamp(1.3rem, 1.6vw, 1.6rem)'],
  // output-empty p
  [/(\.output-empty p \{[^}]*?)font-size: clamp\(1\.05rem, 1\.15vw, 1\.2rem\)/, '$1font-size: clamp(0.95rem, 1.05vw, 1.1rem)'],
  // loading-text
  [/(\.loading-text \{[^}]*?)font-size: clamp\(1\.25rem, 1\.3vw, 1\.4rem\)/, '$1font-size: clamp(1.15rem, 1.2vw, 1.25rem)'],
  // section-label
  [/(\.section-label \{[^}]*?)font-size: clamp\(0\.9rem, 1vw, 1\.05rem\)/, '$1font-size: clamp(0.8rem, 0.9vw, 0.95rem)'],
  // final-answer-box
  [/(\.final-answer-box \{[^}]*?)font-size: clamp\(1\.6rem, 2\.2vw, 2\.5rem\)/, '$1font-size: clamp(1.4rem, 2vw, 2.2rem)'],
  // final-answer-box .katex
  [/(\.final-answer-box \.katex \{[^}]*?)font-size: clamp\(1\.5rem, 2vw, 2\.3rem\)/, '$1font-size: clamp(1.3rem, 1.8vw, 2rem)'],
  // step-item::before
  [/(\.step-item::before \{[^}]*?)font-size: clamp\(0\.7rem, 0\.75vw, 0\.8rem\)/, '$1font-size: clamp(0.6rem, 0.65vw, 0.7rem)'],
  // step-desc
  [/(\.step-desc \{[^}]*?)font-size: clamp\(1\.05rem, 1\.15vw, 1\.2rem\)/, '$1font-size: clamp(0.95rem, 1.05vw, 1.1rem)'],
  // step-formula
  [/(\.step-formula \{[^}]*?)font-size: clamp\(1\.1rem, 1\.2vw, 1\.3rem\)/, '$1font-size: clamp(1rem, 1.1vw, 1.2rem)'],
  // similar-item
  [/(\.similar-item \{[^}]*?)font-size: clamp\(0\.9rem, 0\.95vw, 1rem\)/, '$1font-size: clamp(0.8rem, 0.85vw, 0.9rem)'],
  // mistakes-list li
  [/(\.mistakes-list li \{[^}]*?)font-size: clamp\(0\.9rem, 0\.95vw, 1rem\)/, '$1font-size: clamp(0.8rem, 0.85vw, 0.9rem)'],
  // exam-tip-item
  [/(\.exam-tip-item \{[^}]*?)font-size: clamp\(0\.9rem, 0\.95vw, 1rem\)/, '$1font-size: clamp(0.8rem, 0.85vw, 0.9rem)'],
  // footer
  [/(\.footer \{[^}]*?)font-size: clamp\(0\.8rem, 0\.85vw, 0\.9rem\)/, '$1font-size: clamp(0.7rem, 0.75vw, 0.8rem)'],
  // responsive: brand-text
  [/(\.brand-text \{ font-size: 1\.1rem\})/, '.brand-text { font-size: 1rem}'],
  // responsive: final-answer-box
  [/(\.final-answer-box \{[^}]*?)font-size: 1\.2rem/, '$1font-size: 1.1rem'],
  // responsive: final-answer-box .katex
  [/(\.final-answer-box \.katex \{ font-size: 1\.15rem\})/, '.final-answer-box .katex { font-size: 1rem}'],
  // responsive: step-formula
  [/(\.step-formula \{ font-size: 0\.95rem)/, '$1font-size: 0.85rem'],
  // responsive: mistakes-list li
  [/(\.mistakes-list li \{ font-size: 0\.9rem)/, '$1font-size: 0.8rem'],
  // responsive: similar-item
  [/(\.similar-item \{ font-size: 0\.9rem)/, '$1font-size: 0.8rem'],
  // responsive: pill
  [/(\.pill \{ font-size: 0\.8rem)/, '$1font-size: 0.7rem'],
];

let result = css;
for (const [regex, replacement] of replacements) {
  result = result.replace(regex, replacement);
}

fs.writeFileSync('/home/z/my-project/src/app/globals.css', result);
console.log('Font sizes reverted successfully');