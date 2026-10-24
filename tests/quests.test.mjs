import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { computeQuestMoney } from '../js/core/reputationCalc.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async f => JSON.parse(await readFile(path.join(root, 'data', f), 'utf8'));

test('quest givers have rewards, an NPC, a location and ordered tasks', async () => {
    const { quests } = await json('quests.json');
    assert.equal(quests.length, 4);
    assert.deepEqual(quests.map(q => q.reward.money), [200, 350, 50, 200]);
    assert.equal(quests.find(q => q.id === 'rid_us_of_them').reward.reputation, 60);
    for (const q of quests) {
        assert.ok(q.name && q.npc && q.location && q.tasks.length > 0, q.id);
    }
});

test('courier money matches the Info Hub rank tables', async () => {
    const rep = await json('reputation.json');
    const short = [45, 67, 101, 151, 227, 341, 512, 768];
    const long = [150, 225, 337, 506, 759, 1139, 1708, 2562];
    for (let rank = 1; rank <= 8; rank++) {
        assert.equal(computeQuestMoney('short_distance_delivery', rank, rep), short[rank - 1], `short ${rank}`);
        assert.equal(computeQuestMoney('long_distance_delivery', rank, rep), long[rank - 1], `long ${rank}`);
    }
});
