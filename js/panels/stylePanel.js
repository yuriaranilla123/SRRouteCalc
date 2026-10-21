import { COLOR_VARS, FONT_SLOTS, FONTS, TEXT_SIZES, SIZE, SPEED, LAYOUT, EASINGS, EFFECTS, emptyStyle, cleanStyle, isDefaultStyle, readStoredStyle, storeStyle, clearStoredStyle, applyStyle } from '../ui/styleStore.js';
import { contrastRatio } from '../ui/contrast.js';
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
    TEXT_SIZES.forEach(t => {
        const value = style.sizes[t.id] || SIZE.default;
        document.getElementById(`style-size-${t.id}`).value = String(value);
        document.getElementById(`style-size-num-${t.id}`).value = String(value);
        document.getElementById(`style-reset-size-${t.id}`).classList.toggle('is-default', !style.sizes[t.id]);
    });
    const speed = style.motion.speed || SPEED.default;
    document.getElementById('style-speed').value = String(speed);
    document.getElementById('style-speed-num').value = String(speed);
    document.getElementById('style-reset-speed').classList.toggle('is-default', !style.motion.speed);
    LAYOUT.forEach(l => {
        const value = style.layout[l.id] || l.default;
        document.getElementById(`style-layout-${l.id}`).value = String(value);
        document.getElementById(`style-layout-${l.id}-num`).value = String(value);
        document.getElementById(`style-reset-layout-${l.id}`).classList.toggle('is-default', !style.layout[l.id]);
    });
    document.getElementById('style-easing').value = style.motion.easing || 'smooth';
    EFFECTS.forEach(fx => {
        document.getElementById(`style-fx-${fx.id}`).checked = style.motion[fx.id] !== false;
    });
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

function sizeRow(item) {
    const row = el('div', 'size-row');
    const label = el('label', 'color-label', item.label);
    label.htmlFor = `style-size-${item.id}`;

    const range = el('input', 'style-size');
    range.type = 'range';
    range.id = `style-size-${item.id}`;
    range.min = String(SIZE.min);
    range.max = String(SIZE.max);
    range.step = String(SIZE.step);

    const number = el('input', 'style-size-number');
    number.type = 'number';
    number.id = `style-size-num-${item.id}`;
    number.min = String(SIZE.min);
    number.max = String(SIZE.max);
    number.step = '1';
    number.setAttribute('aria-label', `${item.label} size in percent`);

    const unit = el('span', 'size-unit', '%');
    const reset = el('button', 'menu-action color-reset', '\u21BA');
    reset.type = 'button';
    reset.id = `style-reset-size-${item.id}`;
    reset.title = `Reset ${item.label} size to ${SIZE.default}%`;
    reset.setAttribute('aria-label', reset.title);

    function setSize(value) {
        if (value === SIZE.default) delete style.sizes[item.id];
        else style.sizes[item.id] = value;
        reset.classList.toggle('is-default', !style.sizes[item.id]);
        change();
    }

    range.addEventListener('input', () => {
        const value = Number(range.value);
        number.value = String(value);
        setSize(value);
    });
    number.addEventListener('input', () => {
        const value = Number(number.value);
        if (number.value.trim() !== '' && Number.isInteger(value) && value >= SIZE.min && value <= SIZE.max) {
            range.value = String(value);
            setSize(value);
        }
    });
    number.addEventListener('change', () => {
        const typed = number.value.trim() === '' ? NaN : Number(number.value);
        const value = Number.isFinite(typed)
            ? Math.min(SIZE.max, Math.max(SIZE.min, Math.round(typed)))
            : style.sizes[item.id] || SIZE.default;
        number.value = String(value);
        range.value = String(value);
        setSize(value);
    });
    reset.addEventListener('click', () => {
        number.value = String(SIZE.default);
        range.value = String(SIZE.default);
        setSize(SIZE.default);
    });

    row.append(label, range, number, unit, reset);
    return row;
}

function sliderRow({ id, label, min, max, step, def, unit, read, write }) {
    const row = el('div', 'size-row');
    const text = el('label', 'color-label', label);
    text.htmlFor = `style-${id}`;
    const range = el('input', 'style-size');
    range.type = 'range';
    range.id = `style-${id}`;
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    const number = el('input', 'style-size-number');
    number.type = 'number';
    number.id = `style-${id}-num`;
    number.min = String(min);
    number.max = String(max);
    number.step = '1';
    number.setAttribute('aria-label', `${label} in ${unit}`);
    const unitEl = el('span', 'size-unit', unit);
    const reset = el('button', 'menu-action color-reset', '\u21BA');
    reset.type = 'button';
    reset.id = `style-reset-${id}`;
    reset.title = `Reset ${label} to ${def}${unit}`;
    reset.setAttribute('aria-label', reset.title);

    function apply(value) {
        write(value === def ? undefined : value);
        reset.classList.toggle('is-default', value === def);
        change();
    }
    range.addEventListener('input', () => {
        number.value = range.value;
        apply(Number(range.value));
    });
    number.addEventListener('change', () => {
        const typed = number.value.trim() === '' ? NaN : Number(number.value);
        const value = Number.isFinite(typed) ? Math.min(max, Math.max(min, Math.round(typed))) : read() || def;
        number.value = String(value);
        range.value = String(value);
        apply(value);
    });
    reset.addEventListener('click', () => {
        number.value = String(def);
        range.value = String(def);
        apply(def);
    });
    row.append(text, range, number, unitEl, reset);
    return row;
}

const speedRow = () => sliderRow({
    id: 'speed', label: 'Animation speed', min: SPEED.min, max: SPEED.max, step: SPEED.step, def: SPEED.default, unit: '%',
    read: () => style.motion.speed,
    write: v => { if (v === undefined) delete style.motion.speed; else style.motion.speed = v; },
});

const layoutRow = l => sliderRow({
    id: `layout-${l.id}`, label: l.label, min: l.min, max: l.max, step: l.step, def: l.default, unit: l.unit,
    read: () => style.layout[l.id],
    write: v => { if (v === undefined) delete style.layout[l.id]; else style.layout[l.id] = v; },
});

function easingRow() {
    const row = el('div', 'font-row');
    const label = el('label', 'color-label', 'Animation style');
    label.htmlFor = 'style-easing';
    const select = el('select', 'style-font');
    select.id = 'style-easing';
    select.append(...EASINGS.map(e => new Option(e.label, e.id)));
    select.addEventListener('change', () => {
        if (select.value === 'smooth') delete style.motion.easing;
        else style.motion.easing = select.value;
        change();
    });
    row.append(label, select);
    return row;
}

function effectToggle(fx) {
    const label = el('label', 'toggle-switch style-fx');
    const input = el('input');
    input.type = 'checkbox';
    input.id = `style-fx-${fx.id}`;
    const track = el('span', 'toggle-track');
    track.appendChild(el('span', 'toggle-thumb'));
    label.append(input, track, el('span', 'toggle-text', fx.label));
    input.addEventListener('change', () => {
        if (input.checked) delete style.motion[fx.id];
        else style.motion[fx.id] = false;
        change();
    });
    return label;
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
    const payload = { v: 1, kind: 'srrc-style', colors: style.colors, fonts: style.fonts, sizes: style.sizes, motion: style.motion, layout: style.layout };
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
            ...TEXT_SIZES.map(sizeRow)
        ),
        section(
            'Controls',
            note('Buttons, toggles, tabs, focus rings and the dropdown arrow. This does not change the title or other text.'),
            ...colorRows('controls')
        ),
        section('Fonts', ...FONT_SLOTS.map(fontRow)),
        section(
            'Layout',
            note('Space between frames applies always. Minimum frame width only matters when Dynamic frames is on in Settings.'),
            ...LAYOUT.map(layoutRow)
        ),
        section(
            'Animations',
            note('Turn animations off completely with the Animations switch in Settings. These options only matter while it is on.'),
            speedRow(),
            easingRow(),
            el('h3', 'menu-subtitle', 'Effects'),
            ...EFFECTS.map(effectToggle)
        ),
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