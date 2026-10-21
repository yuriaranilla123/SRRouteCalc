import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.fetch = async url => ({ json: async () => JSON.parse(await readFile(path.join(root, url), 'utf8')) });

const state = await import('../js/core/state.js');
const calc = await import('../js/core/calc.js');
await state.loadData();

const opts = () => state.getCalcOpts();
const tester = {
    culture: 'Syriac', religion: 'Christianity', faithLevel: 3, hasNobility: false,
    languages: { Aramaic: 'Native', 'Middle Chinese': 'Fluent', Sogdian: 'Fluent', Persian: 'Fluent', Arabic: 'Fluent', Greek: 'Fluent' },
    guildPerks: { junk_hoarding: true, merchant_favors: true, better_packing: true, caravan_haste: true, supply_chains: true, artisan_connections: true },
    playerRanks: { sasanian: 8, byzantine: 5, sogdia: 5, tang: 5 },
};

test('Petra local purchases match the screenshots', () => {
    assert.equal(calc.computeBuyPrice('wheat', 'petra', tester, opts()), 9);
    assert.equal(calc.computeBuyPrice('copper_ingot', 'petra', tester, opts()), 31);
    assert.equal(calc.computeBuyPrice('clay', 'petra', tester, opts()), 9);
});

test('Bosra Earthenware and Books match the screenshots', () => {
    assert.equal(calc.computeBuyPrice('earthenware', 'bosra', tester, opts()), 14);
    assert.equal(calc.computeBuyPrice('books', 'bosra', tester, opts()), 396);
});

test('Petra imported Barley matches the screenshot', () => {
    assert.equal(calc.computeBuyPrice('barley', 'petra', tester, opts()), 26);
});

test('Brothers in Christ does not fire in Petra', () => {
    const lines = calc.computePriceBreakdown('earthenware', 'petra', tester, opts(), true).lines;
    assert.ok(!lines.some(l => l.label === 'Brothers in Christ'));
    assert.ok(!lines.some(l => l.label === 'Church Hospitality'));
});

test('Petra Iron Ingot import (screenshot: 100)', { todo: 'game shows a 4-hop bonus; the road graph gives 2 hops via Damascus' }, () => {
    assert.equal(calc.computeBuyPrice('iron_ingot', 'petra', tester, opts()), 100);
});

test('Petra Books import (screenshot: 597)', { todo: 'game bonus matches about 5 hops; the road graph gives 3 hops via Antioch' }, () => {
    assert.equal(calc.computeBuyPrice('books', 'petra', tester, opts()), 597);
});

test('Earthenware sold in Petra (screenshot: 32)', { todo: 'game shows a +6 Distance Bonus from Mephaat; the grid gives +9 for 1 hop at base 20' }, () => {
    assert.equal(calc.computeSellPrice('earthenware', 'petra', tester, opts()), 32);
});

test('Islam Trusted Caravan is sell-only in Petra', () => {
    const muslim = { ...tester, culture: 'Arab', religion: 'Islam', faithLevel: 2 };
    const sell = calc.computePriceBreakdown('wheat', 'petra', muslim, opts(), true).lines;
    const buy = calc.computePriceBreakdown('wheat', 'petra', muslim, opts(), false).lines;
    assert.ok(sell.some(l => l.label === 'Trusted Caravan'));
    assert.ok(!buy.some(l => l.label === 'Trusted Caravan'));
    assert.ok(!calc.computePriceBreakdown('wheat', 'bosra', muslim, opts(), true).lines.some(l => l.label === 'Trusted Caravan'));
});
