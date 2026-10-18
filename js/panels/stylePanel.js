import { COLOR_VARS, FONT_SLOTS, FONTS, SIZE, emptyStyle, cleanStyle, isDefaultStyle, readStoredStyle, storeStyle, clearStoredStyle, applyStyle } from '../ui/styleStore.js';
import { contrastRatio } from '../ui/contrast.js';
import { onThemeChange } from '../ui/themeStyle.js';
import { confirmAction } from '../ui/confirmDialog.js';

const MAX_IMPORT_BYTES = 10000;
const CONTRAST_CHECKS = [
    ['parchment', 'ink', 'Text on the page', 4.5],
    ['parchment', 'ink-surface', 'Text on panels', 4.5],
    ['parchment-dim', 'ink-surface', 'Secondary text on panels', 4.5],
    ['saffron', 'ink-surface', 'Accent on panels', 3],
];

let style = emptyStyle();
let saveTimer = null;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function setStatus(message) {
    document.getElementById('style-status').textContent = message;
}

function themeColor(variable) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable.css).trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#000000';
}

function shownColor(variable) {
    return style.colors[variable.id] || themeColor(variable);
}

function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        if (!storeStyle(style)) setStatus('Could not save your style. Browser storage is full or blocked.');
    }, 150);
}

function refreshContrast() {
    const colors = Object.fromEntries(COLOR_VARS.map(v => [v.id, shownColor(v)]));
    const low = CONTRAST_CHECKS
        .map(([a, b, label, min]) => ({ label, ratio: contrastRatio(colors[a], colors[b]), min }))
        .filter(c => c.ratio < c.min)
        .map(c => `${c.label} (${c.ratio.toFixed(1)}:1)`);
    const out = document.getElementById('style-contrast');
    out.textContent = low.length ? `Low contrast: ${low.join(', ')}. This may be hard to read.` : '';
}

function refreshControls() {
    COLOR_VARS.forEach(v => {
        document.getElementById(`style-color-${v.id}`).value = shownColor(v);
        document.getElementById(`style-reset-${v.id}`).classList.toggle('is-default', !style.colors[v.id]);
    });
    FONT_SLOTS.forEach(slot => {
        document.getElementById(`style-font-${slot.id}`).value = style.fonts[slot.id] || '';
    });
    document.getElementById('style-size').value = String(style.size);
    document.getElementById('style-size-value').textContent = `${style.size}%`;
    refreshContrast();
}

function change() {
    applyStyle(style);
    saveSoon();
    refreshContrast();
}

function colorRow(variable) {
    const row = el('div', 'color-row');
    const label = el('label', 'color-label', variable.label);
    label.htmlFor = `style-color-${variable.id}`;
    const input = el('input', 'color-input');
    input.type = 'color';
    input.id = `style-color-${variable.id}`;
    const reset = el('button', 'menu-action color-reset', '\u21BA');
    reset.type = 'button';
    reset.id = `style-reset-${variable.id}`;
    reset.title = `Reset ${variable.label} to the theme default`;
    reset.setAttribute('aria-label', reset.title);

    input.addEventListener('input', () => {
        style.colors[variable.id] = input.value.toLowerCase();
        reset.classList.remove('is-default');
        change();
    });
    reset.addEventListener('click', () => {
        delete style.colors[variable.id];
        applyStyle(style);
        input.value = themeColor(variable);
        reset.classList.add('is-default');
        change();
    });

    row.append(label, input, reset);
    return row;
}

function fontRow(slot) {
    const row = el('div', 'font-row');
    const label = el('label', 'color-label', slot.label);
    label.htmlFor = `style-font-${slot.id}`;
    const select = el('select', 'style-font');
    select.id = `style-font-${slot.id}`;
    select.append(new Option('Theme default', ''), ...FONTS.map(f => new Option(f.label, f.id)));
    select.addEventListener('change', () => {
        if (select.value) style.fonts[slot.id] = select.value;
        else delete style.fonts[slot.id];
        change();
    });
    row.append(label, select);
    return row;
}

function sizeRow() {
    const row = el('div', 'size-row');
    const label = el('label', 'color-label', 'Text size');
    label.htmlFor = 'style-size';
    const input = el('input', 'style-size');
    input.type = 'range';
    input.id = 'style-size';
    input.min = String(SIZE.min);
    input.max = String(SIZE.max);
    input.step = String(SIZE.step);
    const value = el('span', 'size-value');
    value.id = 'style-size-value';
    input.addEventListener('input', () => {
        style.size = Number(input.value);
        value.textContent = `${style.size}%`;
        change();
    });
    row.append(label, input, value);
    return row;
}

async function resetStyle() {
    if (!(await confirmAction('Reset all style changes? Colors, fonts, text size and the two style toggles go back to default.'))) return;
    style = emptyStyle();
    clearStoredStyle();
    applyStyle(style);
    for (const [id, on] of [['dropdown-style', true], ['infohub-style', false]]) {
        const toggle = document.getElementById(id);
        if (toggle.checked !== on) {
            toggle.checked = on;
            toggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    refreshControls();
    setStatus('Style reset to default.');
}

function exportStyle() {
    const payload = { v: 1, kind: 'srrc-style', ...style };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'srrc-style.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Exported your style.');
}

async function importStyle(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
        setStatus('That file is too large to be a style.');
        return;
    }
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch {
        setStatus('That file is not valid JSON.');
        return;
    }
    const imported = data && data.v === 1 && data.kind === 'srrc-style' ? cleanStyle(data) : null;
    if (!imported) {
        setStatus('That file is not an SRRouteCalc style.');
        return;
    }
    style = imported;
    applyStyle(style);
    storeStyle(style);
    refreshControls();
    setStatus(isDefaultStyle(style) ? 'Imported a style with no changes.' : 'Imported the style.');
}

function buildUI() {
    const root = document.getElementById('style-editor');
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.id = 'style-file';
    fileInput.accept = 'application/json,.json';
    fileInput.hidden = true;

    const reset = el('button', 'menu-action', 'Reset style');
    const exportButton = el('button', 'menu-action', 'Export style');
    const importButton = el('button', 'menu-action', 'Import style');
    [reset, exportButton, importButton].forEach(b => { b.type = 'button'; });
    reset.addEventListener('click', resetStyle);
    exportButton.addEventListener('click', exportStyle);
    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        await importStyle(fileInput.files[0]);
        fileInput.value = '';
    });

    const toolbar = el('div', 'loadout-toolbar');
    toolbar.append(reset, exportButton, importButton, fileInput);

    const contrast = el('p', 'field-hint style-contrast');
    contrast.id = 'style-contrast';
    contrast.setAttribute('role', 'status');
    const status = el('p', 'field-hint');
    status.id = 'style-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    root.append(
        el('h3', 'menu-subtitle', 'Colors'),
        ...COLOR_VARS.map(colorRow),
        el('h3', 'menu-subtitle', 'Fonts'),
        ...FONT_SLOTS.map(fontRow),
        el('h3', 'menu-subtitle', 'Text'),
        sizeRow(),
        contrast,
        toolbar,
        status
    );
}

export function applySavedStyle() {
    style = readStoredStyle();
    applyStyle(style);
}

export function wireStylePanel() {
    buildUI();
    refreshControls();
    onThemeChange(refreshControls);
}