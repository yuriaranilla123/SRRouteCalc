import { COLOR_VARS, FONT_SLOTS, TEXT_SIZES, LAYOUT, EFFECTS, emptyStyle, cleanStyle, isDefaultStyle, readStoredStyle, storeStyle, clearStoredStyle, applyStyle } from '../ui/styleStore.js';
import { contrastRatio } from '../ui/contrast.js';
import { createFontKit } from './styleFonts.js';
import { createSliderKit } from './styleSliders.js';
import { el } from '../ui/domKit.js';
import { onThemeChange } from '../ui/themeStyle.js';
import { confirmAction } from '../ui/confirmDialog.js';

const MAX_IMPORT_BYTES = 10000;
const CONTRAST_CHECKS = [
    ['parchment', 'ink', 'Text on the page', 4.5],
    ['parchment', 'ink-surface', 'Text on panels', 4.5],
    ['parchment-dim', 'ink-surface', 'Secondary text on panels', 4.5],
    ['title', 'ink', 'Site title on the page', 3],
    ['accent-text', 'ink-surface', 'Highlighted text on panels', 3],
    ['saffron', 'ink-surface', 'Accent on panels', 3],
];
let sectionCount = 0;

const ctx = {
    style: emptyStyle(),
    change: () => change(),
    refresh: () => refreshControls(),
};
const fonts = createFontKit(ctx);
const sliders = createSliderKit(ctx);
let saveTimer = null;

function setStatus(message) {
    document.getElementById('style-status').textContent = message;
}

function themeColor(variable) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable.css).trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#000000';
}

function shownColor(variable) {
    return ctx.style.colors[variable.id] || themeColor(variable);
}

function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        if (!storeStyle(ctx.style)) setStatus('Could not save your style. Browser storage is full or blocked.');
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
        document.getElementById(`style-reset-${v.id}`).classList.toggle('is-default', !ctx.style.colors[v.id]);
    });
    fonts.refresh();
    sliders.refresh();
    refreshContrast();
}

function change() {
    applyStyle(ctx.style);
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
        ctx.style.colors[variable.id] = input.value.toLowerCase();
        reset.classList.remove('is-default');
        change();
    });
    reset.addEventListener('click', () => {
        delete ctx.style.colors[variable.id];
        applyStyle(ctx.style);
        input.value = themeColor(variable);
        reset.classList.add('is-default');
        change();
    });

    row.append(label, input, reset);
    return row;
}

function section(title, ...children) {
    sectionCount += 1;
    const wrap = el('div', 'style-section');
    const bodyId = `style-section-${sectionCount}`;
    const head = el('button', 'style-section-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('aria-controls', bodyId);
    head.append(el('span', 'style-section-title', title), el('span', 'style-section-chevron', '\u25BE'));
    const body = el('div', 'style-section-body');
    body.id = bodyId;
    const inner = el('div', 'style-section-inner');
    inner.append(...children);
    body.appendChild(inner);
    head.addEventListener('click', () => {
        head.setAttribute('aria-expanded', String(wrap.classList.toggle('open')));
    });
    wrap.append(head, body);
    return wrap;
}

async function resetStyle() {
    if (!(await confirmAction('Reset all style changes? Colors, fonts, text sizes, animation and layout options and the two style toggles go back to default.'))) return;
    ctx.style = emptyStyle();
    clearStoredStyle();
    applyStyle(ctx.style);
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
    const fontNames = {};
    FONT_SLOTS.forEach(slot => {
        const custom = fonts.getCustom().find(f => `custom:${f.id}` === ctx.style.fonts[slot.id]);
        if (custom) fontNames[slot.id] = custom.name;
    });
    const payload = { v: 1, kind: 'srrc-style', colors: ctx.style.colors, fonts: ctx.style.fonts, sizes: ctx.style.sizes, motion: ctx.style.motion, layout: ctx.style.layout, fontNames };
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
    ctx.style = imported;
    applyStyle(ctx.style);
    storeStyle(ctx.style);
    refreshControls();
    setStatus(isDefaultStyle(ctx.style) ? 'Imported a style with no changes.' : 'Imported the style.');
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

    const colorRows = group => COLOR_VARS.filter(v => v.group === group).map(colorRow);
    const note = text => el('p', 'field-hint', text);

    root.append(
        section('Surfaces', ...colorRows('surfaces')),
        section(
            'Text',
            el('h3', 'menu-subtitle', 'Colors'),
            ...colorRows('text'),
            el('h3', 'menu-subtitle', 'Sizes'),
            note('Only the text changes size. The layout and spacing stay the same.'),
            ...TEXT_SIZES.map(sliders.sizeRow)
        ),
        section(
            'Controls',
            note('Buttons, toggles, tabs, focus rings and the dropdown arrow. This does not change the title or other text.'),
            ...colorRows('controls')
        ),
        section('Fonts', ...fonts.rows()),
        section(
            'Layout',
            note('Space between frames and border thickness apply always. Minimum frame width only matters when Dynamic frames is on, and icon size when Show icons is on, both in Settings.'),
            ...LAYOUT.map(sliders.layoutRow)
        ),
        section(
            'Animations',
            note('Turn animations off completely with the Animations switch in Settings. These options only matter while it is on.'),
            sliders.speedRow(),
            sliders.easingRow(),
            el('h3', 'menu-subtitle', 'Effects'),
            ...EFFECTS.map(sliders.effectToggle)
        ),
        contrast,
        toolbar,
        status
    );
}

export function applySavedStyle() {
    ctx.style = readStoredStyle();
    applyStyle(ctx.style);
}

export function wireStylePanel() {
    buildUI();
    refreshControls();
    onThemeChange(refreshControls);
    fonts.load();
}