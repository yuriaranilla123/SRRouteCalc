import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanStyle, emptyStyle, isDefaultStyle, COLOR_VARS, TEXT_SIZES, SIZE, SPEED, LAYOUT } from '../js/ui/styleStore.js';
import { contrastRatio } from '../js/ui/contrast.js';

test('contrast ratio of black on white is 21', () => {
    assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
    assert.equal(contrastRatio('#123456', '#123456'), 1);
});

test('cleanStyle keeps only valid colors, fonts and sizes', () => {
    const style = cleanStyle({
        colors: { ink: '#ABCDEF', saffron: 'red', parchment: '#12345', __proto__: '#000000', bogus: '#000000', title: '#102030' },
        fonts: { heading: 'caudex', body: 'comic-sans' },
        sizes: { title: 117, heading: 100, body: 999, small: 'big', table: 70.4, control: 150 },
    });
    assert.deepEqual(style.colors, { ink: '#abcdef', title: '#102030' });
    assert.deepEqual(style.fonts, { heading: 'caudex' });
    assert.deepEqual(style.sizes, { title: 117, table: 70, control: 150 });
    assert.equal(Object.keys(style.colors).every(k => COLOR_VARS.some(v => v.id === k)), true);
    assert.equal(Object.keys(style.sizes).every(k => TEXT_SIZES.some(t => t.id === k)), true);
});

test('title and highlighted text are separate from the accent', () => {
    const ids = COLOR_VARS.map(v => v.id);
    assert.ok(ids.includes('title') && ids.includes('accent-text') && ids.includes('saffron'));
    assert.equal(COLOR_VARS.find(v => v.id === 'saffron').group, 'controls');
});

test('cleanStyle rejects junk and ignores the old single text size', () => {
    assert.equal(cleanStyle(null), null);
    assert.equal(cleanStyle([]), null);
    assert.ok(isDefaultStyle(cleanStyle({ size: 130, sizes: { title: 500 } })));
    assert.ok(isDefaultStyle(emptyStyle()));
    assert.equal(SIZE.default, 100);
});

test('cleanStyle keeps only valid motion options', () => {
    const style = cleanStyle({ motion: { speed: 150, easing: 'bouncy', panels: false, hover: true, popups: 'no', bogus: false } });
    assert.deepEqual(style.motion, { speed: 150, easing: 'bouncy', panels: false });
    assert.ok(isDefaultStyle(cleanStyle({ motion: { speed: 100, easing: 'smooth', results: true } })));
    assert.ok(isDefaultStyle(cleanStyle({ motion: { speed: 9999, easing: 'wobble' } })));
    assert.equal(SPEED.default, 100);
});

test('cleanStyle keeps only valid layout options', () => {
    const style = cleanStyle({ layout: { gap: 40, minWidth: 100, bogus: 30 } });
    assert.deepEqual(style.layout, { gap: 40 });
    assert.ok(isDefaultStyle(cleanStyle({ layout: { gap: 24, minWidth: 380 } })));
    assert.equal(LAYOUT.length, 2);
});
