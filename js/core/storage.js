const KEY = 'srrc:settings:v1';
const HEADER_TOGGLES = ['round-to-int', 'detailed-mode', 'dropdown-style', 'infohub-style'];
const IDS = [
    'round-to-int', 'detailed-mode', 'dropdown-style', 'infohub-style',
    'culture', 'religion', 'faith-level',
    'gamepass-extra-cargo', 'gamepass-speed-boost', 'gamepass-extra-caravan-slot', 'gamepass-nobility',
    'gamepass-royal-indian-elephant', 'gamepass-royal-white-nisean', 'gamepass-starter-mule', 'gamepass-starter-backpack',
    'bag-select', 'quest-faction', 'quest-type', 'city-a', 'city-b',
];
const GROUPS = [
    ['.language-select', 'language'],
    ['.faction-rank-select', 'faction'],
    ['.animal-select', 'slot'],
    ['.saddlebag-check', 'slot'],
    ['.guild-perk-check', 'perk'],
];

function controls(pass) {
    const map = new Map();
    if (pass === 'ids') {
        IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) map.set(`#${id}`, el);
        });
    } else {
        GROUPS.forEach(([selector, attr]) => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.dataset[attr] !== undefined) map.set(`${selector}:${el.dataset[attr]}`, el);
            });
        });
    }
    return map;
}

function readValue(el) {
    return el.type === 'checkbox' ? el.checked : el.value;
}

function applyValue(el, value) {
    if (el.type === 'checkbox') {
        if (typeof value === 'boolean') el.checked = value;
        return;
    }
    if (typeof value !== 'string' || value.length > 64) return;
    if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === value && !o.hidden)) return;
    el.value = value;
}

function readStore() {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw || raw.length > 20000) return null;
        const data = JSON.parse(raw);
        return data && data.v === 1 && data.s && typeof data.s === 'object' ? data.s : null;
    } catch {
        return null;
    }
}

export function saveSettings() {
    try {
        const snapshot = {};
        for (const pass of ['ids', 'groups']) {
            controls(pass).forEach((el, key) => {
                if (!el.disabled) snapshot[key] = readValue(el);
            });
        }
        window.localStorage.setItem(KEY, JSON.stringify({ v: 1, s: snapshot }));
    } catch {
        return;
    }
}

export function clearSettings() {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        return;
    }
}

export function restoreSettings(afterCulture) {
    const stored = readStore();
    if (!stored) return;
    controls('ids').forEach((el, key) => {
        if (Object.prototype.hasOwnProperty.call(stored, key)) applyValue(el, stored[key]);
    });
    afterCulture();
    controls('groups').forEach((el, key) => {
        if (!el.disabled && Object.prototype.hasOwnProperty.call(stored, key)) applyValue(el, stored[key]);
    });
    HEADER_TOGGLES.forEach(id => {
        document.getElementById(id).dispatchEvent(new Event('change', { bubbles: true }));
    });
}

export function wireAutoSave() {
    let timer = null;
    document.addEventListener('change', () => {
        clearTimeout(timer);
        timer = setTimeout(saveSettings, 200);
    });
}