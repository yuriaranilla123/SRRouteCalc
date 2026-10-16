import { collectSnapshot, applySnapshot, cleanSnapshot } from '../core/storage.js';
import { updateNativeLanguageLock } from './traderPanel.js';

const KEY = 'srrc:loadouts:v1';
const MAX_LOADOUTS = 20;
const MAX_NAME = 40;
const MAX_IMPORT_BYTES = 50000;

let list = [];
let activeId = null;

const listEl = () => document.getElementById('loadout-list');
const statusEl = () => document.getElementById('loadout-status');

function setStatus(message) {
    statusEl().textContent = message;
}

function newId() {
    return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function cleanName(value, fallback) {
    const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '';
    return name || fallback;
}

function nextDefaultName() {
    let n = list.length + 1;
    while (list.some(item => item.name === `Loadout ${n}`)) n++;
    return `Loadout ${n}`;
}

function read() {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw || raw.length > 400000) return;
        const data = JSON.parse(raw);
        if (!data || data.v !== 1 || !Array.isArray(data.list)) return;
        const seen = new Set();
        for (const item of data.list.slice(0, MAX_LOADOUTS)) {
            if (!item || typeof item.id !== 'string' || !/^[a-z0-9]{1,24}$/.test(item.id) || seen.has(item.id)) continue;
            const s = cleanSnapshot(item.s);
            if (!s) continue;
            seen.add(item.id);
            list.push({ id: item.id, name: cleanName(item.name, 'Loadout'), s });
        }
        activeId = typeof data.active === 'string' && seen.has(data.active) ? data.active : null;
    } catch {
        list = [];
        activeId = null;
    }
}

function write() {
    try {
        window.localStorage.setItem(KEY, JSON.stringify({ v: 1, active: activeId, list }));
        return true;
    } catch {
        setStatus('Could not save loadouts. Browser storage is full or blocked.');
        return false;
    }
}

function makeButton(label, action, ariaLabel) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-action';
    b.dataset.action = action;
    b.textContent = label;
    if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
    return b;
}

function render() {
    const ul = listEl();
    ul.replaceChildren();
    if (list.length === 0) {
        const li = document.createElement('li');
        li.className = 'empty-state';
        li.textContent = 'No loadouts yet. Choose New loadout to save your current setup.';
        ul.appendChild(li);
    }
    list.forEach(item => {
        const li = document.createElement('li');
        li.className = 'loadout-row';
        li.dataset.id = item.id;
        if (item.id === activeId) li.classList.add('active');

        const name = document.createElement('input');
        name.type = 'text';
        name.className = 'loadout-name';
        name.maxLength = MAX_NAME;
        name.value = item.name;
        name.setAttribute('aria-label', 'Loadout name');

        const actions = document.createElement('div');
        actions.className = 'loadout-actions';
        actions.append(
            makeButton('Load', 'load', `Load ${item.name}`),
            makeButton('Update', 'update', `Overwrite ${item.name} with current settings`),
            makeButton('Export', 'export', `Export ${item.name}`),
            makeButton('\u2212', 'delete', `Delete ${item.name}`)
        );

        li.append(name, actions);
        ul.appendChild(li);
    });
    document.getElementById('loadout-add').disabled = list.length >= MAX_LOADOUTS;
}

function addLoadout(name, snapshot) {
    if (list.length >= MAX_LOADOUTS) {
        setStatus(`You can keep up to ${MAX_LOADOUTS} loadouts. Delete one first.`);
        return null;
    }
    const item = { id: newId(), name: cleanName(name, nextDefaultName()), s: snapshot };
    list.push(item);
    return item;
}

function applyLoadout(item) {
    const touched = applySnapshot(item.s, updateNativeLanguageLock);
    touched.forEach(el => el.dispatchEvent(new Event('change', { bubbles: true })));
    activeId = item.id;
    write();
    render();
    setStatus(`Loaded ${item.name}.`);
}

function fileName(name) {
    const base = name.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    return `srrc-${base || 'loadout'}.json`;
}

function exportLoadout(item) {
    const payload = { v: 1, kind: 'srrc-loadout', name: item.name, s: item.s };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(item.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Exported ${item.name}.`);
}

async function importFile(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
        setStatus('That file is too large to be a loadout.');
        return;
    }
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch {
        setStatus('That file is not valid JSON.');
        return;
    }
    const snapshot = data && data.v === 1 && data.kind === 'srrc-loadout' ? cleanSnapshot(data.s) : null;
    if (!snapshot) {
        setStatus('That file is not an SRRouteCalc loadout.');
        return;
    }
    const item = addLoadout(data.name, snapshot);
    if (!item) return;
    write();
    render();
    setStatus(`Imported ${item.name}. Choose Load to use it.`);
}

function onListClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('.loadout-row');
    const item = list.find(l => l.id === row.dataset.id);
    if (!item) return;
    const action = button.dataset.action;

    if (action === 'load') {
        applyLoadout(item);
    } else if (action === 'update') {
        if (!window.confirm(`Overwrite "${item.name}" with your current settings?`)) return;
        item.s = collectSnapshot();
        write();
        setStatus(`Updated ${item.name}.`);
    } else if (action === 'export') {
        exportLoadout(item);
    } else if (action === 'delete') {
        if (!window.confirm(`Delete "${item.name}"?`)) return;
        list = list.filter(l => l.id !== item.id);
        if (activeId === item.id) activeId = null;
        write();
        render();
        setStatus(`Deleted ${item.name}.`);
    }
}

function onListChange(e) {
    const input = e.target.closest('.loadout-name');
    if (!input) return;
    const item = list.find(l => l.id === input.closest('.loadout-row').dataset.id);
    if (!item) return;
    item.name = cleanName(input.value, item.name);
    input.value = item.name;
    write();
    setStatus(`Renamed to ${item.name}.`);
}

export function wireLoadouts() {
    read();
    render();
    listEl().addEventListener('click', onListClick);
    listEl().addEventListener('change', onListChange);

    document.getElementById('loadout-add').addEventListener('click', () => {
        const item = addLoadout(null, collectSnapshot());
        if (!item) return;
        activeId = item.id;
        write();
        render();
        setStatus(`Saved ${item.name} from your current settings.`);
        const input = listEl().querySelector(`[data-id="${item.id}"] .loadout-name`);
        if (input) input.select();
    });

    const fileInput = document.getElementById('loadout-file');
    document.getElementById('loadout-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        await importFile(fileInput.files[0]);
        fileInput.value = '';
    });
}