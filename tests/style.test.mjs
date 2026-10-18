import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanStyle, emptyStyle, isDefaultStyle, COLOR_VARS, SIZE } from './js/ui/styleStore.js';
import { contrastRatio } from './js/ui/contrast.js';

test('contrast ratio of black on white is 21', () => {
    assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
    assert.equal(contrastRatio('#123456', '#123456'), 1);
});

test('cleanStyle keeps only valid colors, fonts and sizes', () => {
    const style = cleanStyle({
        colors: { ink: '#ABCDEF', saffron: 'red', parchment: '#12345', __proto__: '#000000', bogus: '#000000' },
        fonts: { heading: 'caudex', body: 'comic-sans' },
        size: 117,
    });
    assert.deepEqual(style.colors, { ink: '#abcdef' });
    assert.deepEqual(style.fonts, { heading: 'caudex' });
    assert.equal(style.size, 115);
    assert.equal(Object.keys(style.colors).every(k => COLOR_VARS.some(v => v.id === k)), true);
});

test('cleanStyle rejects junk and out of range sizes', () => {
    assert.equal(cleanStyle(null), null);
    assert.equal(cleanStyle([]), null);
    assert.equal(cleanStyle({ size: 500 }).size, SIZE.default);
    assert.ok(isDefaultStyle(cleanStyle({ size: 'x' })));
    assert.ok(isDefaultStyle(emptyStyle()));
});
