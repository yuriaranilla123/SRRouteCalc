const KEY = 'srrc:style:v1';
const HEX = /^#[0-9a-fA-F]{6}$/;

export const COLOR_VARS = [
    { id: 'ink', css: '--ink', label: 'Page background' },
    { id: 'ink-surface', css: '--ink-surface', label: 'Panels' },
    { id: 'ink-surface-raised', css: '--ink-surface-raised', label: 'Inputs and cards' },
    { id: 'parchment', css: '--parchment', label: 'Text' },
    { id: 'parchment-dim', css: '--parchment-dim', label: 'Secondary text' },
    { id: 'saffron', css: '--saffron', label: 'Accent' },
    { id: 'saffron-dim', css: '--saffron-dim', label: 'Accent (dim)' },
    { id: 'sage', css: '--sage', label: 'Profit' },
    { id: 'clay', css: '--clay', label: 'Loss and delete' },
    { id: 'hairline', css: '--hairline', label: 'Borders' },
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

export const SIZE = { min: 85, max: 130, step: 5, default: 100 };

export function emptyStyle() {
    return { colors: {}, fonts: {}, size: SIZE.default };
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
    const size = Number(raw.size);
    if (Number.isFinite(size) && size >= SIZE.min && size <= SIZE.max) {
        style.size = Math.round(size / SIZE.step) * SIZE.step;
    }
    return style;
}

export function isDefaultStyle(style) {
    return Object.keys(style.colors).length === 0 && Object.keys(style.fonts).length === 0 && style.size === SIZE.default;
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
    root.style.fontSize = style.size === SIZE.default ? '' : `${style.size}%`;
}