import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ICONS, goodIconPathByName, lineIconPath, iconUrl, selectIconPath } from '../js/ui/icons.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async f => JSON.parse(await readFile(path.join(root, 'data', f), 'utf8'));

test('every animal, trait, culture and event has an icon mapping', async () => {
    const cargo = await json('cargo.json');
    const mods = await json('modifiers.json');
    for (const a of cargo.animals) assert.ok(ICONS.animal[a.id], a.id);
    for (const b of cargo.bags.types) if (b.id !== 'base') assert.ok(ICONS.bag[b.id], b.id);
    for (const t of Object.keys(mods.cityTraits)) assert.ok(ICONS.trait[t], t);
    for (const c of Object.keys(mods.nativeLanguageByCulture)) assert.ok(ICONS.culture[c], c);
    for (const r of Object.keys(mods.religionModifiers).filter(k => !k.startsWith('_') && k !== 'note')) {
        if (mods.religionModifiers[r].levels) assert.ok(ICONS.religion[r], r);
    }
    for (const e of Object.keys(mods.events.types)) assert.ok(ICONS.event[e], e);
});

test('every good has an icon mapping and names resolve', async () => {
    const goods = await json('goods.json');
    for (const g of goods.goods) {
        assert.ok(ICONS.good[g.id], g.id);
        assert.equal(goodIconPathByName(g.name), ICONS.good[g.id], g.name);
    }
    assert.equal(ICONS.good.myrrh, 'Goods/Spices/Myrrh.png');
    assert.equal(ICONS.good.sancai_dragon_ware, 'Goods/Household/Sancai Dragon Ware.png');
});

test('breakdown labels map to icons', () => {
    assert.equal(lineIconPath('Capital City'), 'City Trait/Capital City.png');
    assert.equal(lineIconPath('Fluent in Greek'), 'City Trait/Language.png');
    assert.equal(lineIconPath('Church Hospitality'), 'Religious Building/Church.png');
    assert.equal(lineIconPath('Severe Drought'), 'Event/Drought.png');
    assert.equal(lineIconPath('Junk Hoarding'), null);
});

test('icon urls are encoded and select lookups ignore other selects', () => {
    assert.equal(iconUrl('Culture/Han Chinese.png'), 'assets/icons/Culture/Han%20Chinese.png');
    assert.equal(iconUrl(null), null);
    assert.equal(selectIconPath({ id: 'culture' }, 'Arab'), 'Culture/Arabic.png');
    assert.equal(selectIconPath({ id: 'other' }, 'Arab'), null);
});

test('the site icon is mapped for the title', () => {
    assert.equal(ICONS.site, 'SRRouteCalcIcon.png');
    assert.equal(iconUrl(ICONS.site), 'assets/icons/SRRouteCalcIcon.png');
});
