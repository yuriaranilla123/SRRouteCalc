import { getModifiersData, setActiveEvent } from '../core/state.js';

function readSelection() {
    return {
        cityId: document.getElementById('event-city').value,
        type: document.getElementById('event-type').value,
        level: parseInt(document.getElementById('event-level').value, 10) || 1,
    };
}

export function renderEventHint() {
    const { cityId, type, level } = readSelection();
    const hint = document.getElementById('event-hint');

    if (!cityId || !type) {
        hint.textContent = 'No active event - prices are unaffected.';
        return;
    }

    const typeInfo = getModifiersData().events.types[type];
    if (!typeInfo) { hint.textContent = ''; return; }

    const levelName = typeInfo.levelNames[level - 1];
    const categories = typeInfo.categories.join(' and ');
    const direction = typeInfo.direction === 'decrease' ? 'cheaper' : 'more expensive';
    hint.textContent = `${levelName}: ${categories} goods are ${direction} in this city.`;
}

function updateActiveEvent() {
    const { cityId, type, level } = readSelection();
    setActiveEvent(cityId && type ? { cityId, type, level } : null);
    renderEventHint();
}

export function wireEventControls() {
    document.getElementById('event-city').addEventListener('change', updateActiveEvent);
    document.getElementById('event-type').addEventListener('change', updateActiveEvent);
    document.getElementById('event-level').addEventListener('change', updateActiveEvent);
}