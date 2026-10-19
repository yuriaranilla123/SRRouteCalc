const KEY = 'srrc:style:v1';
const HEX = /^#[0-9a-fA-F]{6}$/;

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

export function emptyStyle() {
    return { colors: {}, fonts: {}, sizes: {} };
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
            if (typeof value === 'string' && FONTS.some(f => f.id === value)) style.fonts[slot.id] = value;
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
    return style;
}

export function isDefaultStyle(style) {
    return Object.keys(style.colors).length === 0 && Object.keys(style.fonts).length === 0 && Object.keys(style.sizes).length === 0;
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
        const font = FONTS.find(f => f.id === style.fonts[slot.id]);
        if (font) root.style.setProperty(slot.css, font.stack);
        else root.style.removeProperty(slot.css);
    }
    root.style.fontSize = '';
    for (const t of TEXT_SIZES) {
        if (style.sizes[t.id]) root.style.setProperty(t.css, String(style.sizes[t.id] / 100));
        else root.style.removeProperty(t.css);
    }
}