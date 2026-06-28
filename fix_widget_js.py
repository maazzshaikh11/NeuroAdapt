import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # In createActionRow, add the appropriate class based on actionKey
    # It was: row.className = 'neuroadapt-row';
    # Replace with logic
    content = re.sub(
        r"row\.className = 'neuroadapt-row';",
        "row.className = actionKey === 'simplify' ? 'neuroadapt-row primary-card' : 'neuroadapt-row secondary-card';",
        content
    )

    # In buildWidgetTree, change the calls to createActionRow to match the new spec.
    # The new spec removes the "color chips", so we don't need 'cyan', 'indigo', etc.
    # Just pass '' for the bgClass parameter.
    content = re.sub(
        r"createActionRow\('Simplify Selection', 'simplify', sparkleIcon, 'cyan', 'Simplify Selection'\)",
        "createActionRow('Simplify Selection', 'simplify', sparkleIcon, '', 'Simplify Selection')",
        content
    )
    content = re.sub(
        r"createActionRow\('Bionic Mode', 'bionic', bookIcon, 'indigo', 'Bionic Mode'\)",
        "createActionRow('Bionic Mode', 'bionic', bookIcon, '', 'Bionic Mode')",
        content
    )
    content = re.sub(
        r"createActionRow\('Focus Mode', 'focus', targetIcon, 'emerald', 'Focus Mode'\)",
        "createActionRow('Focus Mode', 'focus', targetIcon, '', 'Focus Mode')",
        content
    )
    content = re.sub(
        r"createActionRow\('OpenDyslexic Font', 'openDyslexic', 'Aa', 'orange', 'OpenDyslexic Font'\)",
        "createActionRow('OpenDyslexic Font', 'openDyslexic', 'Aa', '', 'OpenDyslexic Font')",
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)

process_file('extension/src/content/widget.js')
