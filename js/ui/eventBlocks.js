import { getCitiesData, getModifiersData } from '../core/state.js';
import { ICONS, iconUrl, makeIcon } from './icons.js';
import { el } from './domKit.js';

export const EVENT_TYPES = [
    { id: 'drought', label: 'Drought' },
    { id: 'harvest', label: 'Harvest' },
    { id: 'conflict', label: 'Conflict' },
    { id: 'festival', label: 'Festival' },
];

export function createStore() {
    return new Map();
}

export function setLevel(store, cityId, type, level) {
    const entry = store.get(cityId) || {};
    if (level > 0) entry[type] = level;
    else delete entry[type];
    store.set(cityId, entry);
}

export function eventsFor(store, cityIds) {
    const out = [];
    for (const cityId of cityIds) {
        const entry = store.get(cityId) || {};
        for (const { id } of EVENT_TYPES) {
            if (entry[id] > 0) out.push({ cityId, type: id, level: entry[id] });
        }
    }
    return out;
}

function levelRow(store, cityId, type) {
    const row = el('label', 'event-row');
    const name = el('span', 'with-icon');
    const url = iconUrl(ICONS.event[type.id]);
    if (url) name.appendChild(makeIcon(url));
    name.appendChild(el('span', 'icon-text', type.label));
    const select = el('select', 'event-level-select');
    select.dataset.type = type.id;
    select.setAttribute('aria-label', `${type.label} level`);
    const names = (getModifiersData().events.types[type.id] || {}).levelNames || [];
    select.appendChild(new Option('None', '0'));
    [1, 2, 3].forEach(level => {
        const option = new Option(`Level ${level}`, String(level));
        if (names[level - 1]) option.title = names[level - 1];
        select.appendChild(option);
    });
    select.value = String((store.get(cityId) || {})[type.id] || 0);
    row.append(name, select);
    return row;
}

function buildBlock(cityId, cityName, store) {
    const block = el('fieldset', 'event-city-block');
    block.dataset.city = cityId;
    block.appendChild(el('legend', '', `Events in ${cityName}`));
    EVENT_TYPES.forEach(type => block.appendChild(levelRow(store, cityId, type)));
    return block;
}

export function syncBlocks(container, store, cityIds) {
    const names = new Map(getCitiesData().cities.map(c => [c.id, c.name]));
    const wanted = cityIds.filter(id => names.has(id));
    const existing = new Map([...container.querySelectorAll(':scope > .event-city-block')].map(block => [block.dataset.city, block]));
    existing.forEach((block, id) => {
        if (!wanted.includes(id)) block.remove();
    });
    wanted.forEach((id, index) => {
        const block = existing.get(id) || buildBlock(id, names.get(id), store);
        if (container.children[index] !== block) container.insertBefore(block, container.children[index] || null);
    });
    return wanted.length;
}

export function bindStore(container, store) {
    container.addEventListener('change', e => {
        const select = e.target.closest('.event-level-select');
        const block = select && select.closest('.event-city-block');
        if (block) setLevel(store, block.dataset.city, select.dataset.type, Number(select.value) || 0);
    });
}