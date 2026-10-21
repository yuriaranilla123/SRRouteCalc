import test from 'node:test';
import assert from 'node:assert/strict';
import { spanFor } from '../js/ui/dynamicFrames.js';

test('a frame spans its height plus the gap, rounded up, never less than one row', () => {
    assert.equal(spanFor(300.2, 24), 325);
    assert.equal(spanFor(0, 0), 1);
    assert.equal(spanFor(100, 24), 124);
});
