// Colour/font theme: 'default' or 'infohub' (SR:TS Information Hub Style). A future Settings menu only needs setTheme().
let theme = 'default';
const listeners = [];

export function getTheme() { return theme; }

export function onThemeChange(fn) { listeners.push(fn); }

export function setTheme(value) {
    if (value !== 'default' && value !== 'infohub') return;
    theme = value;
    document.documentElement.dataset.theme = value;
    listeners.forEach(fn => fn(value));
}