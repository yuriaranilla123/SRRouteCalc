import { ACTIONS, getBindings, setBinding, resetBindings, onBindingsChange, comboFromEvent, isAllowedCombo, findConflict } from '../core/keybinds.js';
import { setCapturing } from '../ui/shortcuts.js';
import { confirmAction } from '../ui/confirmDialog.js';
import { el } from '../ui/domKit.js';

const BLOCKED_HINT = 'That key cannot be used. Use a letter, number, symbol or arrow key, optionally with Alt or Shift.';
let capturingId = null;

const statusEl = () => document.getElementById('keybind-status');

function setStatus(message) {
    statusEl().textContent = message;
}

function labelOf(id) {
    return ACTIONS.find(a => a.id === id).label;
}

function build() {
    const list = document.getElementById('keybind-list');
    ACTIONS.forEach(action => {
        const row = el('li', 'keybind-row');
        row.dataset.action = action.id;
        const key = el('button', 'menu-action keybind-key');
        key.type = 'button';
        key.dataset.role = 'key';
        const reset = el('button', 'menu-action color-reset', '\u21BA');
        reset.type = 'button';
        reset.dataset.role = 'reset';
        reset.title = `Reset ${action.label} to ${action.combo}`;
        reset.setAttribute('aria-label', reset.title);
        row.append(el('span', 'keybind-label', action.label), key, reset);
        list.appendChild(row);
    });
}

function render() {
    const map = getBindings();
    ACTIONS.forEach(action => {
        const row = document.querySelector(`.keybind-row[data-action="${action.id}"]`);
        const key = row.querySelector('[data-role="key"]');
        const capturing = capturingId === action.id;
        key.textContent = capturing ? 'Press a key...' : (map[action.id] || 'Unbound');
        key.classList.toggle('capturing', capturing);
        key.classList.toggle('unbound', !map[action.id]);
        key.setAttribute('aria-label', `Change the key for ${action.label}. Currently ${map[action.id] || 'unbound'}`);
        row.querySelector('[data-role="reset"]').classList.toggle('is-default', map[action.id] === action.combo);
    });
}

function stopCapture() {
    capturingId = null;
    setCapturing(false);
    document.removeEventListener('keydown', onCaptureKey, true);
    render();
}

function onCaptureKey(e) {
    if (!capturingId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
        stopCapture();
        setStatus('Cancelled.');
        return;
    }
    const id = capturingId;
    if (e.key === 'Backspace' || e.key === 'Delete') {
        setBinding(id, null);
        stopCapture();
        setStatus(`${labelOf(id)} is now unbound.`);
        return;
    }
    const combo = comboFromEvent(e);
    if (!combo) {
        if (!['Shift', 'Alt', 'Control', 'Meta'].includes(e.key)) setStatus(BLOCKED_HINT);
        return;
    }
    if (!isAllowedCombo(combo)) {
        setStatus(BLOCKED_HINT);
        return;
    }
    const other = findConflict(getBindings(), combo, id);
    if (other) {
        setStatus(`${combo} is already used by "${labelOf(other)}". Pick another key, or unbind that one first.`);
        return;
    }
    const saved = setBinding(id, combo);
    stopCapture();
    setStatus(saved ? `${labelOf(id)} is now ${combo}.` : 'Could not save your keys. Browser storage is full or blocked.');
}

function startCapture(id) {
    if (capturingId) stopCapture();
    capturingId = id;
    setCapturing(true);
    document.addEventListener('keydown', onCaptureKey, true);
    setStatus('Press the new key. Backspace unbinds, Escape cancels.');
    render();
    const key = document.querySelector(`.keybind-row[data-action="${id}"] .keybind-key`);
    if (key) key.focus();
}

async function resetAll() {
    if (!(await confirmAction('Reset every keyboard shortcut to its default?'))) return;
    if (capturingId) stopCapture();
    resetBindings();
    setStatus('All shortcuts reset to default.');
}

export function wireKeybindPanel() {
    build();
    render();
    onBindingsChange(render);
    const list = document.getElementById('keybind-list');
    list.addEventListener('click', e => {
        const button = e.target.closest('button[data-role]');
        if (!button) return;
        const id = button.closest('.keybind-row').dataset.action;
        if (button.dataset.role === 'key') {
            startCapture(id);
        } else {
            if (capturingId) stopCapture();
            setBinding(id, undefined);
            setStatus(`${labelOf(id)} reset to ${ACTIONS.find(a => a.id === id).combo}.`);
        }
    });
    list.addEventListener('focusout', e => {
        if (capturingId && e.target.dataset && e.target.dataset.role === 'key' && !list.contains(e.relatedTarget)) stopCapture();
    });
    document.getElementById('keybind-reset-all').addEventListener('click', resetAll);
}