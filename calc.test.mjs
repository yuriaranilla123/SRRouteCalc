import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async url => ({ json: async () => JSON.parse(await readFile(path.join(root, url), 'utf8')) });

const state = await import('./js/core/state.js');
const calc = await import('./js/core/calc.js');
const travel = await import('./js/core/travelCalc.js');
await state.loadData();

const opts = () => state.getCalcOpts();
const syriac = {
    culture: 'Syriac', religion: 'Christianity', faithLevel: 3, playerRanks: {}, hasNobility: false,
    languages: { Greek: 'Broken', Aramaic: 'Native', Persian: 'Fluent', Sogdian: 'Fluent', 'Middle Chinese': 'Fluent' },
    guildPerks: { junk_hoarding: true },
};
const plain = { culture: 'Byzantine', religion: 'Mahayana Buddhism', faithLevel: 0, playerRanks: {}, hasNobility: false, languages: {} };

test('every good and city prices and breakdown totals match', () => {
    for (const g of state.getGoodsData().goods) for (const c of state.getCitiesData().cities) {
        for (const sell of [false, true]) {
            const price = sell ? calc.computeSellPrice(g.id, c.id, syriac, opts()) : calc.computeBuyPrice(g.id, c.id, syriac, opts());
            const bd = calc.computePriceBreakdown(g.id, c.id, syriac, opts(), sell);
            if (price === null) { assert.equal(bd, null); continue; }
            assert.equal(bd.total, price, `${g.id} ${c.id} ${sell}`);
        }
    }
});

test('no Distance Bonus line for locally produced goods', () => {
    const bd = calc.computePriceBreakdown('sogdian_ewer', 'samarkand', syriac, opts(), false);
    assert.ok(!bd.lines.some(l => l.label === 'Distance Bonus'));
});

test('event math', () => {
    const o = { ...opts(), activeEvent: { cityId: 'dunhuang', type: 'festival', level: 2 } };
    const a = calc.computeSellPrice('sancai_dragon_ware', 'dunhuang', plain, opts());
    assert.equal(calc.computeSellPrice('sancai_dragon_ware', 'dunhuang', plain, o) - a, 155);
    const o2 = { ...opts(), activeEvent: { cityId: 'isfahan', type: 'festival', level: 1 } };
    const b = calc.computeSellPrice('minakari_ware', 'isfahan', plain, opts());
    assert.equal(calc.computeSellPrice('minakari_ware', 'isfahan', plain, o2) - b, 18);
});

test('Frontier tool bonus on weapons in Palmyra', () => {
    const bd = calc.computePriceBreakdown('weapons', 'palmyra', plain, opts(), true);
    assert.equal(bd.lines.find(l => l.label === 'Frontier City').amount, 13);
});

test('reputation discount is buy only and scoped by empire', () => {
    const sasanian = { ...plain, playerRanks: { sasanian: 6 } };
    const inside = calc.computePriceBreakdown('wheat', 'ctesiphon', sasanian, opts(), false);
    const outside = calc.computePriceBreakdown('wheat', 'tyre', sasanian, opts(), false);
    assert.ok(inside.lines.some(l => l.label === 'Reputation Discount'));
    assert.ok(!outside.lines.some(l => l.label === 'Reputation Discount'));
    assert.ok(!calc.computePriceBreakdown('wheat', 'ctesiphon', sasanian, opts(), true).lines.some(l => l.label === 'Reputation Discount'));
    const sogdia = { ...plain, playerRanks: { sogdia: 6 } };
    assert.ok(calc.computePriceBreakdown('wheat', 'tyre', sogdia, opts(), false).lines.some(l => l.label === 'Reputation Discount'));
    assert.ok(!calc.computePriceBreakdown('wheat', 'samarkand', sogdia, opts(), false).lines.some(l => l.label === 'Reputation Discount'));
});

test('Brothers in Christ fires everywhere except Sasanian cities', () => {
    for (const c of state.getCitiesData().cities) {
        if (c.traits.includes('Ruined City')) continue;
        const has = calc.computePriceBreakdown('wheat', c.id, syriac, opts(), false).lines.some(l => l.label === 'Brothers in Christ');
        assert.equal(has, c.empire !== 'Sasanian Empire', c.id);
    }
});

test('hops and distances on the road graph', () => {
    assert.equal(travel.computeHopCount('antioch', 'bosra'), 2);
    assert.equal(travel.computeHopCount('damascus', 'bosra'), 1);
    assert.equal(travel.computeDistance('damascus', 'bosra'), 5120);
    assert.equal(travel.computeHopCount('hyrcania', 'susa'), 2);
    assert.equal(travel.computeDistance('tyre', 'jiayuguan'), 4352 + 5940 + 5740 + 3920 + 6280 + 4840 + 5180 + 7600 + 7080 + 6460 + 3760);
});

const pdf = {
    wheat: { dunhuang: { jiayuguan: 7, samarkand: 7, merv: 17, isfahan: 31 }, ctesiphon: { ecbatana: 7, susa: 17 } },
    dried_fish: { tyre: { damascus: 9, antioch: 9, palmyra: 21, bosra: 21, ctesiphon: 36 }, hyrcania: { susa: 21, ecbatana: 36, isfahan: 56, merv: 81, samarkand: 115, dunhuang: 158, jiayuguan: 215 } },
    sea_salt: { hyrcania: { susa: 25, ecbatana: 40, isfahan: 56, merv: 73, samarkand: 93, dunhuang: 114, jiayuguan: 137 }, tyre: { damascus: 12, palmyra: 25, ctesiphon: 40 } },
    saffron: { ecbatana: { ctesiphon: 22, palmyra: 46, damascus: 72, tyre: 98, antioch: 98, bosra: 98 } },
    olive_oil: { isfahan: { merv: 11, samarkand: 24, dunhuang: 39, jiayuguan: 56 } },
    glassware: { isfahan: { merv: 21, samarkand: 43, dunhuang: 68, jiayuguan: 93 } },
    candles: { dunhuang: { samarkand: 36 }, isfahan: { merv: 36 } },
    books: { samarkand: { dunhuang: 30, jiayuguan: 61 } },
};

test('Distance Bonus reproduces Buy_Data_v2', () => {
    const base = { ...plain, culture: 'Byzantine', religion: 'Mahayana Buddhism', languages: {} };
    const noMods = JSON.parse(JSON.stringify(opts()));
    for (const k of Object.keys(noMods.modifiersData.cityTraits)) noMods.modifiersData.cityTraits[k].modifier = 0;
    noMods.modifiersData.languageProficiency.Broken.modifier = 0;
    let checked = 0;
    for (const [good, groups] of Object.entries(pdf)) for (const cities of Object.values(groups)) for (const [city, v] of Object.entries(cities)) {
        const bd = calc.computePriceBreakdown(good, city, base, noMods, false);
        const line = bd.lines.find(l => l.label === 'Distance Bonus');
        assert.equal(line && line.amount, v, `${good} ${city}`);
        checked++;
    }
    assert.ok(checked >= 45);
});

test('exotic luxury goods get 2% per hop', () => {
    assert.equal(calc.computePriceBreakdown('sogdian_ewer', 'dunhuang', syriac, opts(), true).lines.find(l => l.label === 'Distance Bonus').amount, 30);
    assert.equal(calc.computePriceBreakdown('sancai_dragon_ware', 'samarkand', syriac, opts(), true).lines.find(l => l.label === 'Distance Bonus').amount, 30);
});

test('tester screenshots: buys and sells match the game', () => {
    assert.equal(calc.computeBuyPrice('sogdian_ewer', 'samarkand', syriac, opts()), 855);
    assert.equal(calc.computeBuyPrice('sancai_dragon_ware', 'dunhuang', syriac, opts()), 1005);
    assert.equal(calc.computeSellPrice('sogdian_ewer', 'dunhuang', syriac, opts()), 2325);
    assert.equal(calc.computeSellPrice('sancai_dragon_ware', 'samarkand', syriac, opts()), 2475);
    const noGuild = { ...syriac, guildPerks: {} };
    assert.equal(calc.computeSellPrice('sogdian_ewer', 'dunhuang', noGuild, opts()), 2025);
});

test('guild perks are sell only and rarity perks need a rarity', () => {
    assert.equal(calc.computeBuyPrice('sogdian_ewer', 'samarkand', { ...syriac, guildPerks: {} }, opts()), 855);
    const rare = { ...syriac, guildPerks: { artisan_connections: true } };
    assert.equal(calc.computeSellPrice('sogdian_ewer', 'dunhuang', rare, opts()), 2025);
    const o = JSON.parse(JSON.stringify(opts()));
    o.goodsData.goods.find(g => g.id === 'sogdian_ewer').rarity = 'exotic';
    assert.equal(calc.computeSellPrice('sogdian_ewer', 'dunhuang', rare, o), 2025 + 75);
});

test('extrapolated grid is increasing in hops', () => {
    const { grid } = opts().modifiersData.distanceBonus;
    for (let k = 0; k < grid[0].length; k++) for (let h = 1; h < grid.length; h++) assert.ok(grid[h][k] > grid[h - 1][k]);
});

test('origin-only goods can only be bought at their origin but sell anywhere', () => {
    assert.equal(calc.computeBuyPrice('sancai_dragon_ware', 'samarkand', syriac, opts()), null);
    assert.equal(calc.computePriceBreakdown('sancai_dragon_ware', 'samarkand', syriac, opts(), false), null);
    assert.equal(calc.computeBuyPrice('sancai_dragon_ware', 'dunhuang', syriac, opts()), 1005);
    assert.equal(calc.computeSellPrice('sancai_dragon_ware', 'samarkand', syriac, opts()), 2475);
    assert.equal(calc.computeTripProfit('sancai_dragon_ware', 'samarkand', 'dunhuang', 1, syriac, opts()).possible, false);
    assert.ok(calc.computeBuyPrice('dried_fish', 'samarkand', syriac, opts()) > 0);
});

test('rank cargo bonus adds one slot per animal', async () => {
    const { computeTotalCargo } = await import('./js/core/cargoCalc.js');
    const animals = [{ animalId: 'dromedary_camel', saddlebag: false }, { animalId: 'pack_mule', saddlebag: true }];
    const base = computeTotalCargo('base', animals, state.getCargoData(), false, 3, 0, 0).total;
    assert.equal(computeTotalCargo('base', animals, state.getCargoData(), false, 3, 0, 1).total, base + 2);
    assert.equal(computeTotalCargo('base', animals, state.getCargoData(), false, 3, 1, 0).total, base + 1);
});
