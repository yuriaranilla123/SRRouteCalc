import test from 'node:test';
import assert from 'node:assert/strict';
import { isHalloweenWindow, shouldPlayIntro, markSeen, readMode, SEEN_KEY, SESSION_KEY } from '../js/ui/introGate.js';

const day = (m, d) => new Date(2026, m - 1, d, 12);
const bag = (init = {}) => {
    const data = { ...init };
    return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};
const withMode = (mode, extra = {}) => bag({ 'srrc:settings:v1': JSON.stringify({ v: 1, s: { '#intro-mode': mode } }), ...extra });

test('the Halloween window runs October 24 to November 1', () => {
    assert.equal(isHalloweenWindow(day(10, 23)), false);
    for (const [m, d] of [[10, 24], [10, 31], [11, 1]]) assert.equal(isHalloweenWindow(day(m, d)), true, `${m}/${d}`);
    assert.equal(isHalloweenWindow(day(11, 2)), false);
    assert.equal(isHalloweenWindow(day(7, 4)), false);
});

test('first visit mode plays once inside the window only', () => {
    assert.equal(shouldPlayIntro(day(10, 31), bag()), true);
    assert.equal(shouldPlayIntro(day(10, 31), bag({ [SEEN_KEY]: '1' })), false);
    assert.equal(shouldPlayIntro(day(12, 1), bag()), false);
    const local = bag();
    markSeen(local, bag());
    assert.equal(shouldPlayIntro(day(10, 31), local), false);
});

test('session mode plays once per session on any date', () => {
    const session = bag();
    assert.equal(shouldPlayIntro(day(7, 4), withMode('session'), '', session), true);
    markSeen(bag(), session);
    assert.equal(session.getItem(SESSION_KEY), '1');
    assert.equal(shouldPlayIntro(day(7, 4), withMode('session'), '', session), false);
});

test('always and never modes, and the replay query', () => {
    assert.equal(shouldPlayIntro(day(7, 4), withMode('always', { [SEEN_KEY]: '1' })), true);
    assert.equal(shouldPlayIntro(day(10, 31), withMode('never')), false);
    assert.equal(shouldPlayIntro(day(10, 31), withMode('never'), '?intro'), true);
    assert.equal(shouldPlayIntro(day(7, 4), bag(), '?x=1&intro=1'), true);
    assert.equal(shouldPlayIntro(day(7, 4), bag(), '?introduction=1'), false);
});

test('bad settings and broken storage fall back safely', () => {
    assert.equal(readMode(withMode('bogus')), 'first');
    assert.equal(readMode(bag({ 'srrc:settings:v1': '{not json' })), 'first');
    const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    assert.equal(shouldPlayIntro(day(10, 31), broken), false);
    assert.doesNotThrow(() => markSeen(broken, broken));
});
