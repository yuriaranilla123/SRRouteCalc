const KEY = 'srrc:style:v1';
const HEX = /^#[0-9a-fA-F]{6}$/;
const CUSTOM_FONT = /^custom:[a-z0-9]{1,24}$/;

export const COLOR_VARS = [
    { id: 'ink', css: '--ink', label: 'Page background', group: 'surfaces' },
    { id: 'ink-surface', css: '--ink-surface', label: 'Panels', group: 'surfaces' },
    { id: 'ink-surface-raised', css: '--ink-surface-raised', label: 'Inputs and cards', group: 'surfaces' },
    { id: 'hairline', css: '--hairline', label: 'Borders', group: 'surfaces' },
    { id: 'parchment', css: '--parchment', label: 'Text', group: 'text' },
    { id: 'parchment-dim', css: '--parchment-dim', label: 'Secondary text', group: 'text' },
    { id: 'title', css: '--title-color', label: 'Site title', group: 'text' },
    { id: 'accent-text', css: '--accent-text', label: 'Highlighted text', group: 'text' },
    { id: 'sage', css: '--sage', label: 'Profit', group: 'text' },
    { id: 'clay', css: '--clay', label: 'Loss and delete', group: 'text' },
    { id: 'saffron', css: '--saffron', label: 'Accent', group: 'controls' },
    { id: 'saffron-dim', css: '--saffron-dim', label: 'Accent (dim)', group: 'controls' },
];

export const TEXT_SIZES = [
    { id: 'title', css: '--ts-title', label: 'Site title' },
    { id: 'heading', css: '--ts-heading', label: 'Headings' },
    { id: 'body', css: '--ts-body', label: 'Body text' },
    { id: 'small', css: '--ts-small', label: 'Small text and hints' },
    { id: 'table', css: '--ts-table', label: 'Results and tables' },
    { id: 'control', css: '--ts-control', label: 'Buttons and inputs' },
];

export const FONT_SLOTS = [
    { id: 'heading', css: '--font-serif', label: 'Headings' },
    { id: 'body', css: '--font-sans', label: 'Body text' },
];

export const FONTS = [
    { id: 'caudex', label: 'Caudex', stack: "'Caudex', Georgia, serif" },
    { id: 'source-serif', label: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif" },
    { id: 'inter', label: 'Inter', stack: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
    { id: 'georgia', label: 'Georgia (system serif)', stack: "Georgia, 'Times New Roman', serif" },
    { id: 'system-sans', label: 'System sans', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
    { id: 'monospace', label: 'Monospace', stack: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace" },
];

export const SIZE = { min: 70, max: 150, step: 5, default: 100 };

export const SPEED = { min: 25, max: 300, step: 25, default: 100 };

export const LAYOUT = [
    { id: 'gap', css: '--frame-gap', label: 'Space between frames', unit: 'px', min: 8, max: 64, step: 4, default: 24 },
    { id: 'minWidth', css: '--frame-min', label: 'Minimum frame width (Dynamic frames)', unit: 'px', min: 280, max: 560, step: 20, default: 380 },
    { id: 'borderWidth', css: '--frame-border', label: 'Frame border thickness', unit: 'px', min: 0, max: 6, step: 1, default: 1 },
    { id: 'iconSize', css: '--icon-size', label: 'Icon size', unit: 'px', min: 16, max: 64, step: 4, default: 24 },
];

export const EASINGS = [
    { id: 'smooth', label: 'Smooth', css: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    { id: 'snappy', label: 'Snappy', css: 'cubic-bezier(0.2, 0.9, 0.3, 1)' },
    { id: 'bouncy', label: 'Bouncy', css: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { id: 'gentle', label: 'Gentle', css: 'ease-in-out' },
    { id: 'linear', label: 'Linear', css: 'linear' },
];

export const EFFECTS = [
    { id: 'panels', label: 'Panels slide in on load' },
    { id: 'results', label: 'Results fade in' },
    { id: 'hover', label: 'Button hover and press effects' },
    { id: 'popups', label: 'Dropdowns, dialogs and menu tabs' },
];

export function fontStack(id, slotId) {
    const builtin = FONTS.find(f => f.id === id);
    if (builtin) return builtin.stack;
    if (typeof id === 'string' && CUSTOM_FONT.test(id)) {
        return `'srrc-custom-${id.slice(7)}', ${slotId === 'heading' ? "Georgia, serif" : "system-ui, sans-serif"}`;
    }
    return null;
}

export function emptyStyle() {
    return { colors: {}, fonts: {}, sizes: {}, motion: {}, layout: {} };
}

export function cleanStyle(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const style = emptyStyle();
    if (raw.colors && typeof raw.colors === 'object') {
        for (const v of COLOR_VARS) {
            const value = raw.colors[v.id];
            if (typeof value === 'string' && HEX.test(value)) style.colors[v.id] = value.toLowerCase();
        }
    }
    if (raw.fonts && typeof raw.fonts === 'object') {
        for (const slot of FONT_SLOTS) {
            const value = raw.fonts[slot.id];
            if (typeof value === 'string' && (FONTS.some(f => f.id === value) || CUSTOM_FONT.test(value))) style.fonts[slot.id] = value;
        }
    }
    if (raw.sizes && typeof raw.sizes === 'object') {
        for (const t of TEXT_SIZES) {
            const value = Number(raw.sizes[t.id]);
            if (Number.isFinite(value) && value >= SIZE.min && value <= SIZE.max && Math.round(value) !== SIZE.default) {
                style.sizes[t.id] = Math.round(value);
            }
        }
    }
    if (raw.motion && typeof raw.motion === 'object') {
        const speed = Number(raw.motion.speed);
        if (Number.isFinite(speed) && speed >= SPEED.min && speed <= SPEED.max && Math.round(speed) !== SPEED.default) {
            style.motion.speed = Math.round(speed);
        }
        const easing = raw.motion.easing;
        if (typeof easing === 'string' && easing !== 'smooth' && EASINGS.some(e => e.id === easing)) style.motion.easing = easing;
        for (const fx of EFFECTS) {
            if (raw.motion[fx.id] === false) style.motion[fx.id] = false;
        }
    }
    if (raw.layout && typeof raw.layout === 'object') {
        for (const l of LAYOUT) {
            const value = Number(raw.layout[l.id]);
            if (Number.isFinite(value) && value >= l.min && value <= l.max && Math.round(value) !== l.default) style.layout[l.id] = Math.round(value);
        }
    }
    return style;
}

export function isDefaultStyle(style) {
    return Object.keys(style.colors).length === 0 && Object.keys(style.fonts).length === 0 && Object.keys(style.sizes).length === 0 && Object.keys(style.motion).length === 0 && Object.keys(style.layout).length === 0;
}

export function readStoredStyle() {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw || raw.length > 5000) return emptyStyle();
        const data = JSON.parse(raw);
        return (data && data.v === 1 && cleanStyle(data.style)) || emptyStyle();
    } catch {
        return emptyStyle();
    }
}

export function storeStyle(style) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify({ v: 1, style }));
        return true;
    } catch {
        return false;
    }
}

export function clearStoredStyle() {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        return;
    }
}

export function applyStyle(style) {
    const root = document.documentElement;
    for (const v of COLOR_VARS) {
        if (style.colors[v.id]) root.style.setProperty(v.css, style.colors[v.id]);
        else root.style.removeProperty(v.css);
    }
    for (const slot of FONT_SLOTS) {
        const stack = fontStack(style.fonts[slot.id], slot.id);
        if (stack) root.style.setProperty(slot.css, stack);
        else root.style.removeProperty(slot.css);
    }
    root.style.fontSize = '';
    for (const t of TEXT_SIZES) {
        if (style.sizes[t.id]) root.style.setProperty(t.css, String(style.sizes[t.id] / 100));
        else root.style.removeProperty(t.css);
    }
    for (const l of LAYOUT) {
        if (style.layout[l.id] !== undefined) root.style.setProperty(l.css, `${style.layout[l.id]}px`);
        else root.style.removeProperty(l.css);
    }
    if (style.motion.speed) root.style.setProperty('--motion-speed', String(style.motion.speed / 100));
    else root.style.removeProperty('--motion-speed');
    const easing = EASINGS.find(e => e.id === style.motion.easing);
    if (easing) root.style.setProperty('--ease', easing.css);
    else root.style.removeProperty('--ease');
    for (const fx of EFFECTS) {
        if (style.motion[fx.id] === false) root.dataset[`fx${fx.id[0].toUpperCase()}${fx.id.slice(1)}`] = 'off';
        else delete root.dataset[`fx${fx.id[0].toUpperCase()}${fx.id.slice(1)}`];
    }
}

export function setDynamicFrames(on) {
    document.documentElement.dataset.dynamicFrames = on ? 'on' : 'off';
}

export function setClickHighlight(on) {
    document.documentElement.dataset.clickHighlight = on ? 'on' : 'off';
}

export function setAnimations(on) {
    document.documentElement.dataset.animations = on ? 'on' : 'off';
}