import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanOrder, moveStep, readOrder, storeOrder, clearOrder } from '../js/core/frameOrder.js';

const ids = ['a', 'b', 'c', 'd'];

test('cleanOrder keeps known ids once and appends new ones', () => {
    assert.deepEqual(cleanOrder(['c', 'a', 'x', 'c'], ids), ['c', 'a', 'b', 'd']);
    assert.deepEqual(cleanOrder(null, ids), ids);
    assert.deepEqual(cleanOrder([1, {}, 'b'], ids), ['b', 'a', 'c', 'd']);
});

test('moveStep moves one place and stops at the ends', () => {
    assert.deepEqual(moveStep(ids, 'b', -1), ['b', 'a', 'c', 'd']);
    assert.deepEqual(moveStep(ids, 'b', 1), ['a', 'c', 'b', 'd']);
    assert.equal(moveStep(ids, 'a', -1), ids);
    assert.equal(moveStep(ids, 'd', 1), ids);
    assert.equal(moveStep(ids, 'zzz', 1), ids);
});

test('the saved order round trips and bad storage falls back', () => {
    const data = {};
    globalThis.localStorage = { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: k => { delete data[k]; } };
    assert.deepEqual(readOrder(ids), ids);
    assert.equal(storeOrder(['c', 'a', 'b', 'd']), true);
    assert.deepEqual(readOrder(ids), ['c', 'a', 'b', 'd']);
    data['srrc:frames:v1'] = '{nope';
    assert.deepEqual(readOrder(ids), ids);
    clearOrder();
    assert.deepEqual(readOrder(ids), ids);
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    assert.deepEqual(readOrder(ids), ids);
    assert.equal(storeOrder(ids), false);
    assert.doesNotThrow(clearOrder);
});
