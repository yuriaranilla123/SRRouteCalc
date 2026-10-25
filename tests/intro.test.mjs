import test from 'node:test';
import assert from 'node:assert/strict';
import { pauseAfter } from '../js/ui/introPause.js';
import { eggFor, EGGS } from '../js/ui/introEggs.js';
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

test('every easter egg code is six digits and unknown codes have none', () => {
    for (const code of Object.keys(EGGS)) assert.match(code, /^\d{6}$/, code);
    for (const code of ['694200', '420069', '314159', '271828', '161803', '800815', '800855', '133700', '001337', '676767', '696969', '291916', '111111']) {
        assert.ok(eggFor(code) && eggFor(code).lines.length > 0, code);
    }
    assert.equal(eggFor('676767').shake, true);
    assert.equal(eggFor('800815').flip, true);
    assert.equal(eggFor('800855').flip, true);
    assert.ok(!eggFor('694200').flip && !eggFor('694200').shake);
    assert.equal(eggFor('123456'), null);
    assert.equal(eggFor('constructor'), null);
});

test('typing pauses after commas and sentence dots only', () => {
    const at = (text, mark) => pauseAfter(text, text.indexOf(mark));
    assert.equal(at('ALL RIGHT, ALL RIGHT', ','), 500);
    assert.equal(at('STAND BACK, SON. ONE', '.'), 1000);
    assert.equal(at('NICE.', '.'), 1000);
    assert.equal(pauseAfter('GOT IT ...', 9), 1000);
    assert.equal(pauseAfter('GOT IT ...', 8), 0);
    assert.equal(at('3.14159', '.'), 0);
    assert.equal(at('data/goods.json', '.'), 0);
    assert.equal(pauseAfter('HANDSHAKE ........ OK', 16), 0);
    assert.equal(at('HELLO', 'L'), 0);
});
