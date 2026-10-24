import { getBindings, comboFromEvent, isTypingTarget } from '../core/keybinds.js';

const state = { capturing: false };

export function setCapturing(value) {
    state.capturing = value;
}

function toggle(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function click(selector) {
    const node = document.querySelector(selector);
    if (node) node.click();
}

function cycleTabs(selector) {
    const tabs = [...document.querySelectorAll(selector)];
    if (!tabs.length) return;
    const index = tabs.findIndex(tab => tab.classList.contains('active'));
    tabs[(index + 1) % tabs.length].click();
}

const HANDLERS = {
    'toggle-menu': () => click('#menu-btn'),
    'find-trade': () => click('#find-best-trade-btn'),
    'next-route-mode': () => cycleTabs('#route-finder .tab-btn'),
    'next-trades-tab': () => cycleTabs('#all-trades .tab-btn'),
    'toggle-detailed': () => toggle('detailed-mode'),
    'toggle-round': () => toggle('round-to-int'),
    'toggle-icons': () => toggle('show-icons'),
    'toggle-animations': () => toggle('animations'),
    'toggle-frames': () => toggle('dynamic-frames'),
};

export function shortcutsEnabled() {
    const input = document.getElementById('keybinds-enabled');
    return !input || input.checked;
}

export function wireShortcuts() {
    document.addEventListener('keydown', e => {
        if (state.capturing || e.defaultPrevented || e.repeat || !shortcutsEnabled()) return;
        if (document.querySelector('.confirm-backdrop')) return;
        const combo = comboFromEvent(e);
        if (!combo) return;
        if (isTypingTarget(e.target) && !e.altKey) return;
        const map = getBindings();
        const action = Object.keys(map).find(id => map[id] === combo);
        if (!action || !HANDLERS[action]) return;
        e.preventDefault();
        HANDLERS[action]();
    });
}