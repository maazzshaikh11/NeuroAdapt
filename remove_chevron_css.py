import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove chevron related CSS
    content = re.sub(
        r'\.neuroadapt-trigger-chevron\s*\{[^}]+\}',
        '',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'\.neuroadapt-trigger--active\s*\.neuroadapt-trigger-chevron\s*\{[^}]+\}',
        '',
        content,
        flags=re.DOTALL
    )

    with open(filepath, 'w') as f:
        f.write(content)

process_file('extension/src/styles/widget.css')
