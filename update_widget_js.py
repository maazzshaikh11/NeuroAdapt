import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Change createActionRow signature and internals to include description
    new_create_action_row = """function createActionRow(label, actionKey, icon, description) {
  const row = document.createElement('div');
  row.className = actionKey === 'simplify' ? 'neuroadapt-row primary-card' : 'neuroadapt-row secondary-card';
  row.dataset.neuroadaptAction = actionKey;
  row.id = `neuroadapt-${actionKey}-btn`;
  row.setAttribute('role', actionKey === 'simplify' ? 'button' : 'switch');
  row.setAttribute('aria-label', label);
  if (actionKey !== 'simplify') {
    row.setAttribute('aria-checked', 'false');
  }

  const left = document.createElement('div');
  left.className = 'neuroadapt-row-left';

  const iconBox = document.createElement('div');
  iconBox.className = 'neuroadapt-icon-box';
  iconBox.innerHTML = icon;

  const labelCol = document.createElement('div');
  labelCol.className = 'neuroadapt-label-col';
  
  const title = document.createElement('span');
  title.className = 'neuroadapt-row-label';
  title.textContent = label;

  labelCol.appendChild(title);
  
  if (actionKey !== 'simplify' && description) {
    const status = document.createElement('span');
    status.className = 'neuroadapt-row-status';
    status.textContent = description;
    labelCol.appendChild(status);
  }

  left.appendChild(iconBox);
  left.appendChild(labelCol);
  row.appendChild(left);

  if (actionKey !== 'simplify') {
    const toggle = document.createElement('div');
    toggle.className = 'neuroadapt-toggle';
    row.appendChild(toggle);
  }

  row.addEventListener('mousedown', (e) => {
    // Prevent widget click from clearing the text selection on the page
    e.preventDefault();
  });

  row.addEventListener('click', () => {
    dispatchAction(ACTION_EVENTS[actionKey]);
  });

  return row;
}"""

    # Replace old createActionRow
    content = re.sub(
        r"function createActionRow\(label, actionKey, icon, bgClass, name\) \{.*?\n\}\n" + r"(?=\nfunction buildWidgetTree)",
        new_create_action_row + "\n",
        content,
        flags=re.DOTALL
    )

    # Replace buildWidgetTree row creations
    # Old ones:
    # panel.appendChild(createActionRow('Simplify Selection', 'simplify', sparkleIcon, '', 'Simplify Selection'));
    # panel.appendChild(createActionRow('Bionic Mode', 'bionic', bookIcon, '', 'Bionic Mode'));
    # panel.appendChild(createActionRow('Focus Mode', 'focus', targetIcon, '', 'Focus Mode'));
    # panel.appendChild(createActionRow('OpenDyslexic Font', 'openDyslexic', 'Aa', '', 'OpenDyslexic Font'));
    
    new_rows = """  panel.appendChild(createActionRow('Simplify selection', 'simplify', sparkleIcon, null));
  panel.appendChild(createActionRow('Bionic Mode', 'bionic', bookIcon, 'Speed up reading'));
  panel.appendChild(createActionRow('Focus Mode', 'focus', targetIcon, 'Remove distractions'));
  panel.appendChild(createActionRow('OpenDyslexic Font', 'openDyslexic', 'Aa', 'Dyslexia friendly font'));"""

    content = re.sub(
        r"panel\.appendChild\(createActionRow\('Simplify Selection',.*?'OpenDyslexic Font'\)\);",
        new_rows,
        content,
        flags=re.DOTALL
    )

    # In setWidgetButtonState, remove the part that updates the statusEl with "Enable Bionic Mode"
    content = re.sub(
        r"if \(statusEl\) \{\s+const featureName = [^\}]+\}\s+\}",
        "}",
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)

process_file('extension/src/content/widget.js')
