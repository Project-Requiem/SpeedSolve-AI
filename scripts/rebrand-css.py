#!/usr/bin/env python3
"""Rebrand CSS: SpeedSolve AI palette + blue-shade aesthetic overhaul."""

path = '/home/z/my-project/src/app/globals.css'
with open(path, 'r') as f:
    css = f.read()

# ── 1. Design tokens ──
css = css.replace(
    """/* ===========================
   KRYSO DESIGN TOKENS
   =========================== */
:root {
  --bg-primary: #080c18;
  --bg-secondary: #0c1025;
  --bg-card: #11162a;
  --bg-card-hover: #171e38;
  --bg-elevated: #191f3e;
  --bg-input: #0a0e20;
  --bg-base: rgba(37,99,235,0.04);
  --border-color: #1d254a;
  --border-subtle: #151b3a;
  --text-primary: #f0f4ff;
  --text-secondary: #b0b8d0;
  --text-muted: #6a7a9a;
  --accent-start: #2563eb;
  --accent-end: #3b82f6;
  --accent-glow: rgba(37, 99, 235, 0.2);
  --math: #6366f1;
  --physics: #ea580c;
  --chemistry: #059669;
  --success: #059669;
  --warning: #d97706;
  --error: #dc2626;
  --grd-math: linear-gradient(135deg, #6366f1, #8b5cf7);
  --grd-physics: linear-gradient(135deg, #ea580c, #dc2626);
  --grd-chemistry: linear-gradient(135deg, #059669, #0d9488);
  --font: 'Inter', var(--font-sans), sans-serif;
  --mono: 'JetBrains Mono', var(--font-mono), monospace;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 22px;
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.15);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.2);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.25);
  --shadow-glow: 0 0 20px rgba(37,99,235,0.15);
}""",
    """/* ===========================
   SPEEDSOLVE AI — DESIGN TOKENS
   =========================== */
:root {
  /* Surface shades — deep blue-black spectrum */
  --bg-primary: #04060e;
  --bg-secondary: #080d1c;
  --bg-card: rgba(10, 18, 42, 0.65);
  --bg-card-hover: rgba(14, 24, 54, 0.75);
  --bg-elevated: rgba(12, 21, 48, 0.55);
  --bg-input: rgba(6, 12, 28, 0.8);
  --bg-base: rgba(79, 106, 255, 0.03);
  /* Border shades — blue-tinted */
  --border-color: rgba(79, 106, 255, 0.14);
  --border-subtle: rgba(79, 106, 255, 0.07);
  /* Text shades — blue-undertone whites */
  --text-primary: #e0e7ff;
  --text-secondary: #8b9cc7;
  --text-muted: #4a5a8a;
  /* Accent — vivid blue spectrum */
  --accent-start: #4F6AFF;
  --accent-end: #7B93FF;
  --accent-glow: rgba(79, 106, 255, 0.18);
  --accent-muted: rgba(79, 106, 255, 0.08);
  /* Subject colours */
  --math: #818cf8;
  --physics: #fb923c;
  --chemistry: #34d399;
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
  --grd-math: linear-gradient(135deg, #818cf8, #a78bfa);
  --grd-physics: linear-gradient(135deg, #fb923c, #f87171);
  --grd-chemistry: linear-gradient(135deg, #34d399, #2dd4bf);
  /* Typography */
  --font: 'Inter', var(--font-sans), sans-serif;
  --mono: 'JetBrains Mono', var(--font-mono), monospace;
  /* Shape */
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* Shadows — blue-tinted depth */
  --shadow-sm: 0 2px 12px rgba(0,0,0,0.25);
  --shadow-md: 0 6px 24px rgba(0,0,0,0.3);
  --shadow-lg: 0 12px 48px rgba(0,0,0,0.35);
  --shadow-glow: 0 0 24px rgba(79, 106, 255, 0.12);
}"""
)

# ── 2. Light theme ──
css = css.replace(
    """[data-theme="light"] {
  --bg-primary: #f0f4ff;
  --bg-secondary: #e8edf8;
  --bg-card: #ffffff;
  --bg-card-hover: #f4f7ff;
  --bg-elevated: #eef2fa;
  --bg-input: #ffffff;
  --bg-base: rgba(37,99,235,0.03);
  --border-color: #d0d8e8;
  --border-subtle: #e8edf6;
  --text-primary: #0f172a;
  --text-secondary: #1e293b;
  --text-muted: #475569;
  --accent-glow: rgba(37, 99, 235, 0.1);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.1);
  --shadow-glow: 0 0 20px rgba(37,99,235,0.08);
}""",
    """[data-theme="light"] {
  --bg-primary: #eef1fb;
  --bg-secondary: #e2e8f8;
  --bg-card: rgba(255, 255, 255, 0.75);
  --bg-card-hover: rgba(255, 255, 255, 0.85);
  --bg-elevated: rgba(230, 238, 255, 0.7);
  --bg-input: rgba(255, 255, 255, 0.85);
  --bg-base: rgba(79, 106, 255, 0.03);
  --border-color: rgba(79, 106, 255, 0.18);
  --border-subtle: rgba(79, 106, 255, 0.08);
  --text-primary: #0f1a3c;
  --text-secondary: #2d3a66;
  --text-muted: #5a6a9e;
  --accent-glow: rgba(79, 106, 255, 0.1);
  --shadow-sm: 0 2px 12px rgba(79, 106, 255, 0.06);
  --shadow-md: 0 6px 24px rgba(79, 106, 255, 0.08);
  --shadow-lg: 0 12px 48px rgba(79, 106, 255, 0.1);
  --shadow-glow: 0 0 24px rgba(79, 106, 255, 0.08);
}"""
)

# ── 3. Navbar ──
css = css.replace(
    "background: rgba(8,12,24,0.5);\n  backdrop-filter: blur(20px);\n  -webkit-backdrop-filter: blur(20px);\n  border-bottom: 1px solid var(--border-color);\n  transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);\n}\n[data-theme=\"light\"] .navbar { background: rgba(240,244,255,0.6); }",
    "background: rgba(4, 6, 14, 0.65);\n  backdrop-filter: blur(28px);\n  -webkit-backdrop-filter: blur(28px);\n  border-bottom: 1px solid var(--border-subtle);\n  transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);\n}\n[data-theme=\"light\"] .navbar { background: rgba(238, 241, 251, 0.7); }"
)

# ── 4. Brand text + AI gradient ──
css = css.replace(
    ".brand-text { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.5px; color: var(--text-primary); }\n.brand-accent { color: #f59e0b; }",
    ".brand-text { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.5px; color: var(--text-primary); display: flex; align-items: baseline; gap: 6px; }\n.brand-ai { background: linear-gradient(135deg, #4F6AFF, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 900; }"
)

# ── 5. Formula ticker ──
css = css.replace(
    "background: rgba(8,12,24,0.5);\n  backdrop-filter: blur(12px);\n  -webkit-backdrop-filter: blur(12px);\n  border-bottom: 1px solid var(--border-subtle);\n  overflow: hidden; height: 32px;\n  display: flex; align-items: center;\n}\n[data-theme=\"light\"] .formula-ticker { background: rgba(240,244,255,0.5); }",
    "background: rgba(4, 6, 14, 0.6);\n  backdrop-filter: blur(16px);\n  -webkit-backdrop-filter: blur(16px);\n  border-bottom: 1px solid var(--border-subtle);\n  overflow: hidden; height: 32px;\n  display: flex; align-items: center;\n}\n[data-theme=\"light\"] .formula-ticker { background: rgba(238, 241, 251, 0.6); }"
)

# ── 6. Panel glass ──
css = css.replace(
    """.panel {
  background: rgba(17, 22, 42, 0.55); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg); overflow: hidden;
  transition: all var(--transition); box-shadow: var(--shadow-md);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
[data-theme="light"] .panel { background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(0, 0, 0, 0.06); }
.panel:hover { border-color: rgba(37, 99, 235, 0.15); box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(37, 99, 235, 0.05); }""",
    """.panel {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg); overflow: hidden;
  transition: all var(--transition); box-shadow: var(--shadow-md);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
}
[data-theme="light"] .panel { background: var(--bg-card); border: 1px solid var(--border-subtle); }
.panel:hover { border-color: var(--border-color); box-shadow: var(--shadow-lg), 0 0 0 1px var(--accent-muted); }"""
)

# ── 7. Subject card ::before gradients ──
css = css.replace(
    ".subject-card[data-subject=\"mathematics\"]::before { background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,247,0.08)); }",
    ".subject-card[data-subject=\"mathematics\"]::before { background: linear-gradient(135deg, rgba(129,140,248,0.12), rgba(167,139,250,0.12)); }"
)
css = css.replace(
    ".subject-card[data-subject=\"physics\"]::before { background: linear-gradient(135deg, rgba(234,88,12,0.08), rgba(220,38,38,0.08)); }",
    ".subject-card[data-subject=\"physics\"]::before { background: linear-gradient(135deg, rgba(251,146,60,0.12), rgba(248,113,113,0.12)); }"
)
css = css.replace(
    ".subject-card[data-subject=\"chemistry\"]::before { background: linear-gradient(135deg, rgba(5,150,105,0.08), rgba(13,148,136,0.08)); }",
    ".subject-card[data-subject=\"chemistry\"]::before { background: linear-gradient(135deg, rgba(52,211,153,0.12), rgba(45,212,191,0.12)); }"
)

# ── 8. Subject card active shadows ──
css = css.replace(
    ".subject-card[data-subject=\"mathematics\"].active { border-color: var(--math); box-shadow: 0 8px 30px rgba(99,102,241,0.2); }",
    ".subject-card[data-subject=\"mathematics\"].active { border-color: var(--math); box-shadow: 0 8px 30px rgba(129,140,248,0.25); }"
)
css = css.replace(
    ".subject-card[data-subject=\"physics\"].active { border-color: var(--physics); box-shadow: 0 8px 30px rgba(234,88,12,0.2); }",
    ".subject-card[data-subject=\"physics\"].active { border-color: var(--physics); box-shadow: 0 8px 30px rgba(251,146,60,0.25); }"
)
css = css.replace(
    ".subject-card[data-subject=\"chemistry\"].active { border-color: var(--chemistry); box-shadow: 0 8px 30px rgba(5,150,105,0.2); }",
    ".subject-card[data-subject=\"chemistry\"].active { border-color: var(--chemistry); box-shadow: 0 8px 30px rgba(52,211,153,0.25); }"
)

# ── 9. Subject icon backgrounds ──
css = css.replace(
    ".subject-card[data-subject=\"mathematics\"] .subj-icon { background: rgba(99,102,241,0.12); color: var(--math); }",
    ".subject-card[data-subject=\"mathematics\"] .subj-icon { background: rgba(129,140,248,0.15); color: var(--math); }"
)
css = css.replace(
    ".subject-card[data-subject=\"physics\"] .subj-icon { background: rgba(234,88,12,0.12); color: var(--physics); }",
    ".subject-card[data-subject=\"physics\"] .subj-icon { background: rgba(251,146,60,0.15); color: var(--physics); }"
)
css = css.replace(
    ".subject-card[data-subject=\"chemistry\"] .subj-icon { background: rgba(5,150,105,0.12); color: var(--chemistry); }",
    ".subject-card[data-subject=\"chemistry\"] .subj-icon { background: rgba(52,211,153,0.15); color: var(--chemistry); }"
)

# ── 10. answerFlash keyframe ──
css = css.replace(
    """@keyframes answerFlash {
  0% { box-shadow: 0 0 0 rgba(99,102,241,0); border-color: rgba(99,102,241,0.3); }
  20% { box-shadow: 0 0 60px rgba(99,102,241,0.4), 0 0 120px rgba(99,102,241,0.2); border-color: rgba(255,255,255,0.6); }
  100% { box-shadow: 0 0 30px rgba(99,102,241,0.1), inset 0 0 30px rgba(99,102,241,0.05); border-color: rgba(99,102,241,0.3); }
}""",
    """@keyframes answerFlash {
  0% { box-shadow: 0 0 0 rgba(79,106,255,0); border-color: rgba(79,106,255,0.3); }
  20% { box-shadow: 0 0 60px rgba(79,106,255,0.45), 0 0 120px rgba(79,106,255,0.18); border-color: rgba(79,106,255,0.6); }
  100% { box-shadow: 0 0 30px rgba(79,106,255,0.12), inset 0 0 30px rgba(79,106,255,0.05); border-color: rgba(79,106,255,0.3); }
}"""
)

# ── 11. Final answer section ──
css = css.replace(
    ".final-answer-section {\n  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,247,0.08));\n  border-color: rgba(99,102,241,0.25); position: relative; overflow: hidden;\n}",
    ".final-answer-section {\n  background: linear-gradient(135deg, rgba(79,106,255,0.09), rgba(123,147,255,0.06));\n  border-color: rgba(79,106,255,0.2); position: relative; overflow: hidden;\n}"
)
css = css.replace(
    "border: 2px solid rgba(99,102,241,0.3);\n  text-align: center; font-size: 1.55rem; font-weight: 800;\n  color: #ffffff; font-family: var(--mono);\n  position: relative; z-index: 1;\n  overflow-wrap: break-word; word-break: break-word;\n  line-height: 1.6; text-shadow: 0 0 20px rgba(99,102,241,0.3);\n  box-shadow: 0 0 30px rgba(99,102,241,0.1), inset 0 0 30px rgba(99,102,241,0.05);",
    "border: 2px solid rgba(79,106,255,0.3);\n  text-align: center; font-size: 1.55rem; font-weight: 800;\n  color: #ffffff; font-family: var(--mono);\n  position: relative; z-index: 1;\n  overflow-wrap: break-word; word-break: break-word;\n  line-height: 1.6; text-shadow: 0 0 24px rgba(79,106,255,0.35);\n  box-shadow: 0 0 40px rgba(79,106,255,0.12), inset 0 0 40px rgba(79,106,255,0.05);"
)
css = css.replace(
    "[data-theme=\"light\"] .final-answer-box { color: #1e1b4b; border-color: rgba(99,102,241,0.4); text-shadow: none; }",
    "[data-theme=\"light\"] .final-answer-box { color: #1e1b4b; border-color: rgba(79,106,255,0.35); text-shadow: none; }"
)

# ── 12. Steps line ──
css = css.replace(
    "width: 2px; background: linear-gradient(to bottom, var(--accent-start), rgba(99,102,241,0.15));",
    "width: 2px; background: linear-gradient(to bottom, var(--accent-start), rgba(79,106,255,0.08));"
)

# ── 13. Step last child + hover ──
css = css.replace(
    ".step-item:last-child::before { background: var(--grd-math); color: white; border-color: transparent; }\n.step-item:hover::before { transform: scale(1.15); box-shadow: 0 0 15px rgba(99,102,241,0.3); }",
    ".step-item:last-child::before { background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: white; border-color: transparent; }\n.step-item:hover::before { transform: scale(1.15); box-shadow: 0 0 15px rgba(79,106,255,0.35); }"
)

# ── 14. Text color overrides → use var ──
css = css.replace(
    "[data-theme=\"dark\"] .step-desc { color: #e8eef5; }\n[data-theme=\"light\"] .step-desc { color: #0f172a; }",
    "[data-theme=\"dark\"] .step-desc { color: var(--text-primary); }\n[data-theme=\"light\"] .step-desc { color: var(--text-primary); }"
)
css = css.replace(
    "[data-theme=\"dark\"] .mistakes-list li { color: #d0d8e8; }\n[data-theme=\"light\"] .mistakes-list li { color: #0f172a; }",
    "[data-theme=\"dark\"] .mistakes-list li { color: var(--text-primary); }\n[data-theme=\"light\"] .mistakes-list li { color: var(--text-primary); }"
)
css = css.replace(
    "[data-theme=\"dark\"] .similar-item { color: #d0d8e8; }\n[data-theme=\"light\"] .similar-item { color: #0f172a; }",
    "[data-theme=\"dark\"] .similar-item { color: var(--text-primary); }\n[data-theme=\"light\"] .similar-item { color: var(--text-primary); }"
)

# ── 15. Exam tips ──
css = css.replace(
    "background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.15);\n  border-radius: var(--radius-sm); font-size: 0.88rem; line-height: 1.6;\n}\n[data-theme=\"dark\"] .exam-tip-item { color: #d0d8e8; }\n[data-theme=\"light\"] .exam-tip-item { color: #0f172a; }",
    "background: rgba(79,106,255,0.06); border: 1px solid rgba(79,106,255,0.12);\n  border-radius: var(--radius-sm); font-size: 0.88rem; line-height: 1.6;\n}\n[data-theme=\"dark\"] .exam-tip-item { color: var(--text-primary); }\n[data-theme=\"light\"] .exam-tip-item { color: var(--text-primary); }"
)

# ── 16. Source badges ──
css = css.replace(
    """.source-badge.local {
  background: rgba(5, 150, 105, 0.12); color: #34d399;
  border: 1px solid rgba(5, 150, 105, 0.25);
}
.source-badge.ai {
  background: rgba(245, 158, 11, 0.12); color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.25);
}""",
    """.source-badge.local {
  background: rgba(79, 106, 255, 0.1); color: var(--accent-end);
  border: 1px solid rgba(79, 106, 255, 0.2);
}
.source-badge.ai {
  background: linear-gradient(135deg, rgba(79,106,255,0.12), rgba(6,182,212,0.12)); color: #7dd3fc;
  border: 1px solid rgba(79, 106, 255, 0.2);
}"""
)

# ── 17. Try with AI button ──
css = css.replace(
    """.btn-retry-ai {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 14px; border-radius: 100px;
  background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24; font-size: 0.76rem; font-weight: 600;
  font-family: var(--font); cursor: pointer;
  transition: all var(--transition); white-space: nowrap;
}
.btn-retry-ai:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5);
  transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}""",
    """.btn-retry-ai {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 14px; border-radius: 100px;
  background: rgba(79, 106, 255, 0.1); border: 1px solid rgba(79, 106, 255, 0.25);
  color: var(--accent-end); font-size: 0.76rem; font-weight: 600;
  font-family: var(--font); cursor: pointer;
  transition: all var(--transition); white-space: nowrap;
}
.btn-retry-ai:hover:not(:disabled) {
  background: rgba(79, 106, 255, 0.18); border-color: rgba(79, 106, 255, 0.4);
  transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79, 106, 255, 0.2);
}"""
)

# ── 18. Spinner ──
css = css.replace(
    "border: 2px solid rgba(255, 255, 255, 0.06);\n  border-top-color: var(--accent-start);",
    "border: 2px solid var(--border-subtle);\n  border-top-color: var(--accent-start);"
)
css = css.replace(
    "[data-theme=\"light\"] .spinner { border-color: rgba(0, 0, 0, 0.06); border-top-color: var(--accent-start); }\n.loading-progress { width: 100%; max-width: 200px; height: 2px; background: rgba(255, 255, 255, 0.06); border-radius: 2px; margin-top: 20px; overflow: hidden; }\n[data-theme=\"light\"] .loading-progress { background: rgba(0, 0, 0, 0.06); }",
    "[data-theme=\"light\"] .spinner { border-color: var(--border-subtle); border-top-color: var(--accent-start); }\n.loading-progress { width: 100%; max-width: 200px; height: 2px; background: var(--border-subtle); border-radius: 2px; margin-top: 20px; overflow: hidden; }\n[data-theme=\"light\"] .loading-progress { background: var(--border-subtle); }"
)

# ── 19. Dark scrollbar ──
css = css.replace(
    """[data-theme="dark"] ::-webkit-scrollbar { width: 6px; height: 6px; }
[data-theme="dark"] ::-webkit-scrollbar-track { background: transparent; }
[data-theme="dark"] ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
[data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }""",
    """[data-theme="dark"] ::-webkit-scrollbar { width: 6px; height: 6px; }
[data-theme="dark"] ::-webkit-scrollbar-track { background: transparent; }
[data-theme="dark"] ::-webkit-scrollbar-thumb { background: rgba(79, 106, 255, 0.15); border-radius: 3px; }
[data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: rgba(79, 106, 255, 0.3); }"""
)

# ── 20. Background ──
css = css.replace(
    "background: radial-gradient(ellipse 100% 80% at 50% 0%, var(--bg-base) 0%, transparent 100%);",
    "background: radial-gradient(ellipse 100% 80% at 50% 0%, rgba(79,106,255,0.04) 0%, transparent 100%);"
)
css = css.replace(
    "background-image: radial-gradient(circle, var(--text-muted) 0.5px, transparent 0.5px);\n  background-size: 48px 48px; opacity: 0.04;",
    "background-image: radial-gradient(circle, rgba(79,106,255,0.25) 0.5px, transparent 0.5px);\n  background-size: 48px 48px; opacity: 0.03;"
)

# ── 21. Pill hover colours (subject-tinted) ──
css = css.replace(
    "[data-active-subject=\"mathematics\"] .pill:hover, [data-active-subject=\"mathematics\"] .pill.active { background: var(--grd-math); border-color: transparent; color: white; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }",
    "[data-active-subject=\"mathematics\"] .pill:hover, [data-active-subject=\"mathematics\"] .pill.active { background: var(--grd-math); border-color: transparent; color: white; box-shadow: 0 4px 15px rgba(129,140,248,0.35); }"
)
css = css.replace(
    "[data-active-subject=\"physics\"] .pill:hover, [data-active-subject=\"physics\"] .pill.active { background: var(--grd-physics); border-color: transparent; color: white; box-shadow: 0 4px 15px rgba(234,88,12,0.3); }",
    "[data-active-subject=\"physics\"] .pill:hover, [data-active-subject=\"physics\"] .pill.active { background: var(--grd-physics); border-color: transparent; color: white; box-shadow: 0 4px 15px rgba(251,146,60,0.35); }"
)
css = css.replace(
    "[data-active-subject=\"chemistry\"] .pill:hover, [data-active-subject=\"chemistry\"] .pill.active { background: var(--grd-chemistry); border-color: transparent; color: white; box-shadow: 0 4px 15px rgba(5,150,105,0.3); }",
    "[data-active-subject=\"chemistry\"] .pill:hover, [data-active-subject=\"chemistry\"] .pill.active { background: var(--grd-chemistry); border-color: transparent; color: white; box-shadow: 0 4px 15px rgba(52,211,153,0.35); }"
)

# ── 22. Sel-btn active ──
css = css.replace(
    ".sel-btn.active {\n  background: var(--grd-math); border-color: transparent;\n  color: white; box-shadow: 0 4px 15px rgba(99,102,241,0.3);\n}",
    ".sel-btn.active {\n  background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); border-color: transparent;\n  color: white; box-shadow: 0 4px 15px rgba(79,106,255,0.3);\n}"
)

# ── 23. Pulse glow keyframe ──
css = css.replace(
    "0%, 100% { box-shadow: 0 0 10px var(--accent-glow); }\n  50% { box-shadow: 0 0 30px var(--accent-glow), 0 0 60px rgba(37,99,235,0.1); }",
    "0%, 100% { box-shadow: 0 0 10px var(--accent-glow); }\n  50% { box-shadow: 0 0 30px var(--accent-glow), 0 0 60px rgba(79,106,255,0.08); }"
)

# ── 24. Similar num gradient ──
css = css.replace(
    "background: var(--grd-math); color: white;",
    "background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: white;"
)

# ── 25. Step formula color theme-aware ──
css = css.replace(
    "[data-theme=\"dark\"] .step-formula { color: #a5b4fc; }\n[data-theme=\"light\"] .step-formula { color: #4338ca; }",
    "[data-theme=\"dark\"] .step-formula { color: #a5b4fc; }\n[data-theme=\"light\"] .step-formula { color: #4338ca; }\n.step-formula .katex { color: inherit; }"
)

# ── 26. Print styles ──
css = css.replace(
    "  .final-answer-box { border: 2px solid #2563eb; background: #f0f4ff; color: #1e1b4b !important; text-shadow: none !important; }\n  .step-formula { border: 1px solid #ddd; background: #f5f5f5; color: #4338ca !important; }\n  .section-label { color: #2563eb; }",
    "  .final-answer-box { border: 2px solid #4F6AFF; background: #eef1ff; color: #1e1b4b !important; text-shadow: none !important; }\n  .step-formula { border: 1px solid #ddd; background: #f5f5f5; color: #4338ca !important; }\n  .section-label { color: #4F6AFF; }"
)

# ── 27. Navbar scrolled shadow ──
css = css.replace(
    ".navbar.scrolled { box-shadow: 0 4px 30px rgba(0,0,0,0.2); }",
    ".navbar.scrolled { box-shadow: 0 4px 30px rgba(0,0,0,0.3), 0 0 1px var(--border-color); }"
)

# ── 28. Shape opacity for new darker bg ──
css = css.replace(
    "opacity: 0.15; animation: shapeDrift 24s ease-in-out infinite alternate;",
    "opacity: 0.12; animation: shapeDrift 24s ease-in-out infinite alternate;"
)
css = css.replace(
    "[data-theme=\"light\"] .bg-shape { opacity: 0.1; }",
    "[data-theme=\"light\"] .bg-shape { opacity: 0.08; }"
)

with open(path, 'w') as f:
    f.write(css)

print("CSS rebrand complete")