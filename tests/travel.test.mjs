import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async f => JSON.parse(await readFile(path.join(root, f), 'utf8'));
let override = null;
globalThis.fetch = async url => ({ json: async () => (override && url.endsWith('distances.json') ? override : load(url)) });

const state = await import('../js/core/state.js');
const travel = await import('../js/core/travelCalc.js');
await state.loadData();

function floyd(edges, ids) {
    const d = Object.fromEntries(ids.map(a => [a, Object.fromEntries(ids.map(b => [b, a === b ? 0 : Infinity]))]));
    edges.forEach(e => {
        d[e.from][e.to] = Math.min(d[e.from][e.to], e.distance);
        d[e.to][e.from] = Math.min(d[e.to][e.from], e.distance);
    });
    for (const k of ids) for (const i of ids) for (const j of ids) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
    return d;
}

test('cached distances match an independent shortest path search for every pair', () => {
    const { edges } = state.getDistancesData();
    const ids = [...new Set(edges.flatMap(e => [e.from, e.to]))];
    const d = floyd(edges, ids);
    for (const a of ids) for (const b of ids) {
        const expected = d[a][b] === Infinity ? null : d[a][b];
        assert.equal(travel.computeDistance(a, b), expected, `${a} ${b}`);
        assert.equal(travel.computeDistance(a, b), expected, `${a} ${b} again`);
    }
});

test('cached hop counts match an independent hop search for every pair', () => {
    const { edges } = state.getDistancesData();
    const ids = [...new Set(edges.flatMap(e => [e.from, e.to]))];
    const d = floyd(edges.map(e => ({ ...e, distance: 1 })), ids);
    for (const a of ids) for (const b of ids) {
        assert.equal(travel.computeHopCount(a, b), d[a][b] === Infinity ? null : d[a][b], `${a} ${b}`);
    }
});

test('reloading different distance data is not served from the old cache', async () => {
    const before = travel.computeDistance('damascus', 'bosra');
    const edited = await load('data/distances.json');
    edited.edges.find(e => e.from === 'damascus' && e.to === 'bosra').distance = 1234;
    override = edited;
    await state.loadData();
    assert.equal(travel.computeDistance('damascus', 'bosra'), 1234);
    assert.notEqual(before, 1234);
    override = null;
    await state.loadData();
    assert.equal(travel.computeDistance('damascus', 'bosra'), before);
});
