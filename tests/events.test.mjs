import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.fetch = async url => ({ json: async () => JSON.parse(await readFile(path.join(root, url), 'utf8')) });

const state = await import('../js/core/state.js');
const calc = await import('../js/core/calc.js');
const { createStore, setLevel, eventsFor, EVENT_TYPES } = await import('../js/ui/eventBlocks.js');
await state.loadData();

const plain = { culture: 'Byzantine', religion: 'Mahayana Buddhism', faithLevel: 0, playerRanks: {}, hasNobility: false, languages: {} };
const lines = (opts, good, city) => calc.computePriceBreakdown(good, city, plain, opts, true).lines.filter(l => /Drought|Harvest|Conflict|Festival/.test(l.label));

test('several events in one city each add their own line', () => {
    const none = state.getCalcOpts();
    const both = { ...none, activeEvents: [{ cityId: 'damascus', type: 'drought', level: 1 }, { cityId: 'damascus', type: 'harvest', level: 2 }] };
    assert.equal(lines(none, 'barley', 'damascus').length, 0);
    const found = lines(both, 'barley', 'damascus');
    assert.deepEqual(found.map(l => l.label), ['Small Drought', 'Plentiful Harvest']);
    assert.deepEqual(found.map(l => l.amount), [3 + Math.floor(0.05 * 10), -(5 + Math.floor(0.1 * 10))]);
});

test('events only touch their own city and the goods of their category', () => {
    const o = { ...state.getCalcOpts(), activeEvents: [{ cityId: 'damascus', type: 'conflict', level: 3 }, { cityId: 'tyre', type: 'festival', level: 1 }] };
    assert.equal(lines(o, 'barley', 'damascus').length, 0);
    assert.equal(lines(o, 'weapons', 'damascus').length, 1);
    assert.equal(lines(o, 'weapons', 'tyre').length, 0);
    assert.equal(lines(o, 'candles', 'tyre').length, 1);
});

test('the older single activeEvent option still works alongside the list', () => {
    const o = { ...state.getCalcOpts(), activeEvents: [{ cityId: 'dunhuang', type: 'festival', level: 2 }], activeEvent: { cityId: 'dunhuang', type: 'conflict', level: 1 } };
    assert.equal(lines(o, 'weapons', 'dunhuang').length, 1);
    assert.equal(lines(o, 'sancai_dragon_ware', 'dunhuang').length, 1);
});

test('the event store keeps levels per city and lists only the cities asked for', () => {
    const store = createStore();
    setLevel(store, 'tyre', 'festival', 2);
    setLevel(store, 'tyre', 'drought', 1);
    setLevel(store, 'damascus', 'conflict', 3);
    assert.deepEqual(eventsFor(store, ['tyre', 'damascus']).map(e => `${e.cityId}:${e.type}:${e.level}`), ['tyre:drought:1', 'tyre:festival:2', 'damascus:conflict:3']);
    assert.deepEqual(eventsFor(store, ['damascus']), [{ cityId: 'damascus', type: 'conflict', level: 3 }]);
    setLevel(store, 'tyre', 'festival', 0);
    assert.deepEqual(eventsFor(store, ['tyre']).map(e => e.type), ['drought']);
    assert.deepEqual(eventsFor(store, ['antioch']), []);
    assert.equal(EVENT_TYPES.length, 4);
});
