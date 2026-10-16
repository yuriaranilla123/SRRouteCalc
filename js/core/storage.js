const KEY = 'srrc:settings:v1';
const HEADER_TOGGLES = ['round-to-int', 'detailed-mode', 'menu-sticky', 'dropdown-style', 'infohub-style'];
const IDS = [
    'round-to-int', 'detailed-mode', 'menu-sticky', 'quick-action', 'dropdown-style', 'infohub-style',
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
const SNAPSHOT_KEY = /^[#.A-Za-z0-9_:\- ]{1,64}$/;

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

export function cleanSnapshot(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const keys = Object.keys(raw);
    if (keys.length === 0 || keys.length > 200) return null;
    const out = {};
    for (const k of keys) {
        if (k === '__proto__' || !SNAPSHOT_KEY.test(k)) continue;
        const v = raw[k];
        if (typeof v === 'boolean' || (typeof v === 'string' && v.length <= 64)) out[k] = v;
    }
    return Object.keys(out).length ? out : null;
}

export function collectSnapshot() {
    const snapshot = {};
    for (const pass of ['ids', 'groups']) {
        controls(pass).forEach((el, key) => {
            if (!el.disabled) snapshot[key] = readValue(el);
        });
    }
    return snapshot;
}

export function applySnapshot(stored, afterCulture) {
    const touched = [];
    if (!stored) return touched;
    controls('ids').forEach((el, key) => {
        if (Object.prototype.hasOwnProperty.call(stored, key)) {
            applyValue(el, stored[key]);
            touched.push(el);
        }
    });
    afterCulture();
    controls('groups').forEach((el, key) => {
        if (!el.disabled && Object.prototype.hasOwnProperty.call(stored, key)) {
            applyValue(el, stored[key]);
            touched.push(el);
        }
    });
    return touched;
}

export function saveSettings() {
    try {
        window.localStorage.setItem(KEY, JSON.stringify({ v: 1, s: collectSnapshot() }));
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
    applySnapshot(stored, afterCulture);
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