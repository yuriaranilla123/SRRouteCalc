const KEY = 'srrc:keybinds:v1';

export const ACTIONS = [
    { id: 'toggle-menu', label: 'Open or close the menu', combo: 'M' },
    { id: 'find-trade', label: 'Find best trade', combo: 'B' },
    { id: 'next-route-mode', label: 'Switch Find a route mode (Global or Specific)', combo: 'G' },
    { id: 'next-trades-tab', label: 'Next All profitable trades tab', combo: 'T' },
    { id: 'toggle-detailed', label: 'Show detailed breakdown', combo: 'D' },
    { id: 'toggle-round', label: 'Round to whole numbers', combo: 'R' },
    { id: 'toggle-icons', label: 'Show icons', combo: 'I' },
    { id: 'toggle-animations', label: 'Animations', combo: 'A' },
    { id: 'toggle-frames', label: 'Dynamic frames', combo: 'F' },
];

const SYMBOLS = {
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
    Minus: '-', Equal: '=', Backquote: '`', Backslash: '\\',
};
const NAMED = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
const ALLOWED = /^(Alt\+)?(Shift\+)?([A-Z0-9]|[,./;'\[\]\-=`\\]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End|PageUp|PageDown)$/;
const TYPING_INPUT = ['text', 'number', 'search', 'email', 'url', 'password', 'tel', ''];

let bindings = null;
const listeners = [];

export function comboFromEvent(e) {
    if (e.ctrlKey || e.metaKey) return null;
    let key = null;
    const code = e.code || '';
    if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
    else if (/^Digit[0-9]$/.test(code)) key = code.slice(5);
    else if (SYMBOLS[code]) key = SYMBOLS[code];
    else if (NAMED.includes(e.key)) key = e.key;
    if (!key) return null;
    return `${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${key}`;
}

export function isAllowedCombo(combo) {
    return typeof combo === 'string' && ALLOWED.test(combo);
}

export function isTypingTarget(target) {
    if (!target || !target.tagName) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return tag === 'INPUT' && TYPING_INPUT.includes((target.getAttribute('type') || '').toLowerCase());
}

export function cleanBindings(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    const used = new Set();
    for (const action of ACTIONS) {
        if (!Object.prototype.hasOwnProperty.call(raw, action.id)) continue;
        const value = raw[action.id];
        if (value === null) {
            out[action.id] = null;
        } else if (isAllowedCombo(value) && !used.has(value)) {
            out[action.id] = value;
            used.add(value);
        }
    }
    return out;
}

export function resolveBindings(overrides) {
    const map = {};
    for (const action of ACTIONS) {
        map[action.id] = Object.prototype.hasOwnProperty.call(overrides, action.id) ? overrides[action.id] : action.combo;
    }
    return map;
}

export function findConflict(map, combo, exceptId) {
    const hit = ACTIONS.find(a => a.id !== exceptId && map[a.id] === combo);
    return hit ? hit.id : null;
}

function load() {
    if (bindings) return;
    bindings = {};
    try {
        const raw = globalThis.localStorage && globalThis.localStorage.getItem(KEY);
        if (!raw || raw.length > 5000) return;
        const data = JSON.parse(raw);
        if (data && data.v === 1) bindings = cleanBindings(data.map);
    } catch {
        bindings = {};
    }
}

function save() {
    try {
        globalThis.localStorage.setItem(KEY, JSON.stringify({ v: 1, map: bindings }));
        return true;
    } catch {
        return false;
    }
}

export function getBindings() {
    load();
    return resolveBindings(bindings);
}

export function setBinding(id, combo) {
    load();
    const next = { ...bindings };
    if (combo === undefined) delete next[id];
    else next[id] = combo;
    bindings = cleanBindings(next);
    const saved = save();
    listeners.forEach(fn => fn());
    return saved;
}

export function resetBindings() {
    load();
    bindings = {};
    try {
        globalThis.localStorage.removeItem(KEY);
    } catch {
        bindings = {};
    }
    listeners.forEach(fn => fn());
}

export function onBindingsChange(fn) {
    listeners.push(fn);
}