#!/usr/bin/env python3
"""Increase all font sizes in globals.css by ~0.05-0.06rem each.
Replacements ordered largest-to-smallest to prevent cascading."""

path = '/home/z/my-project/src/app/globals.css'
with open(path, 'r') as f:
    css = f.read()

# Font size bump map: old -> new (ordered largest to smallest)
replacements = [
    ('font-size: 1.5rem;',  'font-size: 1.55rem;'),
    ('font-size: 1.25rem;', 'font-size: 1.3rem;'),
    ('font-size: 1.2rem;',  'font-size: 1.25rem;'),
    ('font-size: 1.1rem;',  'font-size: 1.15rem;'),
    ('font-size: 1.05rem;', 'font-size: 1.1rem;'),
    ('font-size: 1rem;',    'font-size: 1.05rem;'),
    ('font-size: 0.95rem;', 'font-size: 1rem;'),
    ('font-size: 0.9rem;',  'font-size: 0.96rem;'),
    ('font-size: 0.88rem;', 'font-size: 0.94rem;'),
    ('font-size: 0.85rem;', 'font-size: 0.9rem;'),
    ('font-size: 0.82rem;', 'font-size: 0.88rem;'),
    ('font-size: 0.8rem;',  'font-size: 0.86rem;'),
    ('font-size: 0.78rem;', 'font-size: 0.84rem;'),
    ('font-size: 0.76rem;', 'font-size: 0.82rem;'),
    ('font-size: 0.75rem;', 'font-size: 0.8rem;'),
    ('font-size: 0.72rem;', 'font-size: 0.78rem;'),
    ('font-size: 0.7rem;',  'font-size: 0.76rem;'),
    ('font-size: 0.65rem;', 'font-size: 0.7rem;'),
    ('font-size: 0.62rem;', 'font-size: 0.68rem;'),
    ('font-size: 0.6rem;',  'font-size: 0.65rem;'),
    ('font-size: 0.55rem;', 'font-size: 0.6rem;'),
    ('font-size: 0.5rem;',  'font-size: 0.55rem;'),
    ('font-size: 0.45rem;', 'font-size: 0.5rem;'),
]

count = 0
for old, new in replacements:
    n = css.count(old)
    if n > 0:
        css = css.replace(old, new)
        count += n

with open(path, 'w') as f:
    f.write(css)

print(f"Updated {count} font-size declarations in globals.css")