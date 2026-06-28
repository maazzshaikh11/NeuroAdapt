import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Change brain icon width/height to 22
    content = re.sub(
        r'<svg width="24" height="24"',
        '<svg width="22" height="22"',
        content
    )

    # Remove chevron logic
    # trigger.appendChild(chevron); -> remove
    content = re.sub(r'trigger\.appendChild\(chevron\);\n\s*', '', content)

    with open(filepath, 'w') as f:
        f.write(content)

process_file('extension/src/content/widget.js')
