// The one dropdown setting: 'native' (Style 1) or 'themed' (Style 2). A future Settings menu only needs to call setDropdownStyle().
let style = 'themed';
const listeners = [];

document.documentElement.dataset.dropdownStyle = style;

export function getDropdownStyle() { return style; }

export function onDropdownStyleChange(fn) { listeners.push(fn); }

export function setDropdownStyle(value) {
    if (value !== 'native' && value !== 'themed') return;
    style = value;
    document.documentElement.dataset.dropdownStyle = value;
    listeners.forEach(fn => fn(value));
}