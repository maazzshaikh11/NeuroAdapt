/**
 * NeuroAdapt - Floating Widget
 *
 * Renders the quick-actions widget inside a Shadow DOM so page CSS cannot
 * restyle or break it. The widget stays isolated from page content and
 * exposes a small API for syncing button state from the content script.
 */

import tokensCss from '../styles/tokens.css?raw';
import widgetCss from '../styles/widget.css?raw';

const WIDGET_ROOT_ID = 'neuroadapt-widget-root';
const PANEL_OPEN_CLASS = 'neuroadapt-panel--open';
const TRIGGER_ACTIVE_CLASS = 'neuroadapt-trigger--active';

const ACTION_EVENTS = {
  simplify: 'neuroadapt:simplify-click',
  bionic: 'neuroadapt:bionic-click',
  focus: 'neuroadapt:focus-click',
  openDyslexic: 'neuroadapt:opendyslexic-click',
};

const BUTTON_SELECTORS = {
  simplify: '[data-neuroadapt-action="simplify"]',
  bionic: '[data-neuroadapt-action="bionic"]',
  focus: '[data-neuroadapt-action="focus"]',
  openDyslexic: '[data-neuroadapt-action="openDyslexic"]',
};

let widgetHost = null;
let widgetShadowRoot = null;
let panelElement = null;
let triggerElement = null;
let widgetStyleSheet = null;
let bodyObserver = null;
let globalListenersAttached = false;

function dispatchAction(eventName) {
  window.dispatchEvent(new CustomEvent(eventName));
}

function supportsAdoptedStyleSheets(root) {
  return (
    Boolean(root?.adoptedStyleSheets)
    && typeof CSSStyleSheet !== 'undefined'
    && typeof CSSStyleSheet.prototype.replaceSync === 'function'
  );
}

function injectStyles(root) {
  if (!root) {
    return;
  }

  if (supportsAdoptedStyleSheets(root)) {
    if (!widgetStyleSheet) {
      widgetStyleSheet = new CSSStyleSheet();
      widgetStyleSheet.replaceSync(tokensCss + '\n' + widgetCss);
    }

    if (!root.adoptedStyleSheets.includes(widgetStyleSheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, widgetStyleSheet];
    }

    return;
  }

  if (root.querySelector('[data-neuroadapt-styles="widget"]')) {
    return;
  }

  const style = document.createElement('style');
  style.dataset.neuroadaptStyles = 'widget';
  style.textContent = tokensCss + '\n' + widgetCss;
  root.appendChild(style);
}

function setPanelOpen(isOpen) {
  if (!panelElement || !triggerElement) {
    return;
  }

  panelElement.classList.toggle(PANEL_OPEN_CLASS, isOpen);
  panelElement.setAttribute('aria-hidden', String(!isOpen));
  triggerElement.classList.toggle(TRIGGER_ACTIVE_CLASS, isOpen);
  triggerElement.setAttribute('aria-expanded', String(isOpen));
}

function queryWidget(selector) {
  return widgetShadowRoot?.querySelector(selector) ?? null;
}

function createActionRow(label, actionKey, icon, description) {
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
}

function buildWidgetTree() {
  const widget = document.createElement('div');
  widget.className = 'neuroadapt-widget';

  const container = document.createElement('div');
  container.className = 'neuroadapt-widget__container';

  const panel = document.createElement('section');
  panel.className = 'neuroadapt-panel';
  panel.id = 'neuroadapt-panel';
  panel.setAttribute('role', 'menu');
  panel.setAttribute('aria-label', 'NeuroAdapt quick actions');
  panel.setAttribute('aria-hidden', 'true');

  const sparkleIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>`;
  const bookIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>`;
  const targetIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;

    panel.appendChild(createActionRow('Simplify selection', 'simplify', sparkleIcon, null));
  panel.appendChild(createActionRow('Bionic Mode', 'bionic', bookIcon, 'Speed up reading'));
  panel.appendChild(createActionRow('Focus Mode', 'focus', targetIcon, 'Remove distractions'));
  panel.appendChild(createActionRow('OpenDyslexic Font', 'openDyslexic', 'Aa', 'Dyslexia friendly font'));

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'neuroadapt-trigger';
  trigger.setAttribute('aria-label', 'Open NeuroAdapt widget');
  trigger.setAttribute('aria-controls', 'neuroadapt-panel');
  trigger.setAttribute('aria-expanded', 'false');

  const logoUrl = chrome.runtime.getURL('logo.jpeg');
  const triggerIcon = document.createElement('span');
  triggerIcon.className = 'neuroadapt-trigger__label';
  triggerIcon.innerHTML = `<img src="${logoUrl}" alt="NeuroAdapt Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: contain; display: block;" />`;
  
  const chevron = document.createElement('span');
  chevron.className = 'neuroadapt-trigger-chevron';
  chevron.textContent = '‹';

  trigger.appendChild(triggerIcon);

  trigger.addEventListener('click', () => {
    const isOpen = panel.classList.contains(PANEL_OPEN_CLASS);
    setPanelOpen(!isOpen);
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const isOpen = panel.classList.contains(PANEL_OPEN_CLASS);
      setPanelOpen(!isOpen);
    }
  });

  container.appendChild(panel);
  container.appendChild(trigger);
  widget.appendChild(container);

  panelElement = panel;
  triggerElement = trigger;

  return widget;
}

function syncWidgetReferences() {
  widgetHost = document.getElementById(WIDGET_ROOT_ID);
  widgetShadowRoot = widgetHost?.shadowRoot ?? null;
  panelElement = widgetShadowRoot?.querySelector('.neuroadapt-panel') ?? null;
  triggerElement = widgetShadowRoot?.querySelector('.neuroadapt-trigger') ?? null;
}

function handleDocumentPointerDown(event) {
  syncWidgetReferences();

  if (!widgetHost || !panelElement?.classList.contains(PANEL_OPEN_CLASS)) {
    return;
  }

  const eventPath = typeof event.composedPath === 'function'
    ? event.composedPath()
    : [];

  if (eventPath.includes(widgetHost) || eventPath.includes(widgetShadowRoot)) {
    return;
  }

  setPanelOpen(false);
}

function handleDocumentKeyDown(event) {
  if (event.key !== 'Escape') {
    return;
  }

  syncWidgetReferences();

  if (!panelElement?.classList.contains(PANEL_OPEN_CLASS)) {
    return;
  }

  setPanelOpen(false);
  triggerElement?.focus();
}

function attachGlobalListeners() {
  if (globalListenersAttached) {
    return;
  }

  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeyDown, true);
  globalListenersAttached = true;
}

function getPageBgColor() {
  let el = document.body;
  while (el) {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    el = el.parentElement;
  }
  return 'rgb(255, 255, 255)';
}

function isBgDark(colorString) {
  if (!colorString) return false;
  const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
    if (a < 0.1) return false;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  if (colorString.startsWith('#')) {
    let c = colorString.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  return false;
}

function syncWidgetTheme(prefs) {
  const appearance = prefs?.appearance || 'auto';
  let resolvedTheme = 'light';

  if (appearance === 'dark') {
    resolvedTheme = 'dark';
  } else if (appearance === 'light') {
    resolvedTheme = 'light';
  } else {
    // Auto Mode: check page background contrast
    const bg = getPageBgColor();
    const isDark = isBgDark(bg);
    // If background is dark -> widget is light. If background is light -> widget is dark.
    resolvedTheme = isDark ? 'light' : 'dark';
  }

  syncWidgetReferences();
  if (widgetShadowRoot) {
    const container = widgetShadowRoot.querySelector('.neuroadapt-widget');
    if (container) {
      container.setAttribute('data-theme', resolvedTheme);
    }
  }
}

function syncStateFromStorage() {
  chrome.storage.local.get(['neuroadapt_prefs'], (result) => {
    const prefs = result.neuroadapt_prefs || { appearance: 'auto' };
    setWidgetButtonState('bionic', { active: prefs.bionicModeEnabled || false });
    setWidgetButtonState('focus', { active: prefs.focusModeEnabled || false });
    setWidgetButtonState('openDyslexic', { active: prefs.fontFamily === 'openDyslexic' });
    syncWidgetTheme(prefs);
  });
}

function setupStateSync() {
  // Sync preferences for toggles
  syncStateFromStorage();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.neuroadapt_prefs) {
      syncStateFromStorage();
    }
  });

  // Listen for system color preference changes
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      syncStateFromStorage();
    });
  } catch (_) {}

  // Observe page theme/style shifts on body or html
  const bodyObs = new MutationObserver(() => {
    syncStateFromStorage();
  });
  if (document.body) {
    bodyObs.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
  }
  if (document.documentElement) {
    bodyObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  }


  // Create dummy button for simplify loading state to intercept content script updates
  let dummySimplify = document.getElementById('neuroadapt-simplify-btn');
  if (!dummySimplify) {
    dummySimplify = document.createElement('button');
    dummySimplify.id = 'neuroadapt-simplify-btn';
    dummySimplify.style.display = 'none';
    document.body.appendChild(dummySimplify);

    const observer = new MutationObserver(() => {
      const loading = dummySimplify.classList.contains('neuroadapt-button--loading');
      const disabled = dummySimplify.disabled;
      const text = dummySimplify.textContent;
      
      setWidgetButtonState('simplify', {
        loading,
        disabled,
        label: text
      });
    });
    observer.observe(dummySimplify, { attributes: true, childList: true, characterData: true, subtree: true });
  }
}

function buildShadowWidget() {
  syncWidgetReferences();

  if (widgetHost) {
    return widgetHost;
  }

  const host = document.createElement('div');
  host.id = WIDGET_ROOT_ID;
  host.dataset.neuroadaptWidget = 'true';

  const shadow = host.attachShadow({ mode: 'open' });
  injectStyles(shadow);
  shadow.replaceChildren(buildWidgetTree());

  document.body.appendChild(host);

  widgetHost = host;
  widgetShadowRoot = shadow;
  attachGlobalListeners();
  setupStateSync();

  return host;
}

export function injectWidget() {
  if (window.location.protocol === 'chrome:') {
    return;
  }

  if (document.body) {
    buildShadowWidget();
    return;
  }

  if (bodyObserver) {
    return;
  }

  bodyObserver = new MutationObserver(() => {
    if (!document.body) {
      return;
    }

    buildShadowWidget();
    bodyObserver.disconnect();
    bodyObserver = null;
  });

  bodyObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function isWidgetInjected() {
  return Boolean(document.getElementById(WIDGET_ROOT_ID));
}

export function isWidgetNode(node) {
  if (!node) {
    return false;
  }

  syncWidgetReferences();

  if (!widgetHost || !widgetShadowRoot) {
    return false;
  }

  if (node === widgetHost || node === widgetShadowRoot) {
    return true;
  }

  if (typeof node.getRootNode === 'function' && node.getRootNode() === widgetShadowRoot) {
    return true;
  }

  let current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;

  while (current) {
    if (current === widgetHost) {
      return true;
    }

    current = current.parentNode || current.host || null;
  }

  return false;
}

export function setWidgetButtonState(
  buttonKey,
  {
    label,
    active,
    disabled,
    loading,
  } = {},
) {
  const selector = BUTTON_SELECTORS[buttonKey];
  if (!selector) {
    return;
  }

  syncWidgetReferences();

  const button = queryWidget(selector);
  if (!button) {
    return;
  }

  const labelEl = button.querySelector('.neuroadapt-row-label');
  const statusEl = button.querySelector('.neuroadapt-row-status');

  if (typeof label === 'string' && labelEl) {
    labelEl.textContent = label;
    button.setAttribute('aria-label', label);
  }

  if (typeof disabled === 'boolean') {
    button.style.opacity = disabled ? '0.5' : '1';
    button.style.pointerEvents = disabled ? 'none' : 'auto';
  }

  if (typeof active === 'boolean') {
    button.classList.toggle('active', active);
    if (buttonKey !== 'simplify') {
      button.setAttribute('aria-checked', String(active));
      if (statusEl) {
        const featureName = buttonKey === 'bionic' ? 'Bionic Mode' : buttonKey === 'focus' ? 'Focus Mode' : 'OpenDyslexic Font';
        statusEl.textContent = active ? `Disable ${featureName}` : `Enable ${featureName}`;
      }
    }
  }

  if (typeof loading === 'boolean') {
    button.classList.toggle('neuroadapt-button--loading', loading);
    button.setAttribute('aria-busy', String(loading));
  }
}
