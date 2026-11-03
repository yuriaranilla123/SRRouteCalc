import { setActiveEvents } from '../core/state.js';
import { createStore, bindStore, syncBlocks, eventsFor } from '../ui/eventBlocks.js';

const store = createStore();
let signature = '';

function routeCities() {
    const ids = ['city-a', 'city-b'].map(id => document.getElementById(id).value).filter(Boolean);
    return [...new Set(ids)];
}

function commit() {
    const events = eventsFor(store, routeCities());
    setActiveEvents(events);
    signature = JSON.stringify(events);
}

export function wireEventControls() {
    const container = document.getElementById('global-events');
    bindStore(container, store);
    container.addEventListener('change', commit);
    const onCities = () => {
        const before = signature;
        syncBlocks(container, store, routeCities());
        commit();
        if (signature !== before) container.dispatchEvent(new Event('change', { bubbles: true }));
    };
    ['city-a', 'city-b'].forEach(id => document.getElementById(id).addEventListener('change', onCities));
    syncBlocks(container, store, routeCities());
    commit();
}