import os
import re

dir_path = 'dashboard/src'

replacements = [
    # Backgrounds
    (r'bg-slate-900(?:/\d+)?', 'bg-bg'),
    (r'bg-slate-800(?:/\d+)?', 'bg-surface'),
    (r'bg-slate-700(?:/\d+)?', 'bg-surface'),
    # Borders
    (r'border-slate-700(?:/\d+)?', 'border-strong'),
    (r'border-slate-800(?:/\d+)?', 'border'),
    # Text colors
    (r'text-slate-100', 'text-primary'),
    (r'text-slate-200', 'text-primary'),
    (r'text-white', 'text-primary'),
    (r'text-slate-300', 'text-secondary'),
    (r'text-slate-400', 'text-secondary'),
    (r'text-slate-500', 'text-muted'),
    # Indigos
    (r'text-indigo-\d+', 'text-brand'),
    (r'bg-indigo-\d+(?:/\d+)?', 'bg-brand'),
    (r'shadow-indigo-\d+/\d+', ''),
    # Teals
    (r'text-teal-\d+', 'text-brand'),
    (r'bg-teal-\d+(?:/\d+)?', 'bg-brand-soft'),
    # Gradients
    (r'gradient-indigo-teal', ''),
    (r'from-indigo-\d+', ''),
    (r'to-teal-\d+', ''),
    (r'bg-gradient-to-r', ''),
    (r'bg-clip-text', ''),
    (r'text-transparent', 'text-brand'),
]

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))

print("Done")
