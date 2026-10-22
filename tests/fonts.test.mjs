import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat, cleanFontName, checkFont, MAX_BYTES, MAX_FONTS, pack, unpack } from '../js/ui/fontStore.js';
import { cleanStyle, fontStack } from '../js/ui/styleStore.js';

const bytes = (...b) => new Uint8Array(b);

test('detectFormat reads the file signature', () => {
    assert.equal(detectFormat(bytes(0, 1, 0, 0)), 'ttf');
    assert.equal(detectFormat(bytes(0x74, 0x72, 0x75, 0x65)), 'ttf');
    assert.equal(detectFormat(bytes(0x4f, 0x54, 0x54, 0x4f)), 'otf');
    assert.equal(detectFormat(bytes(0x77, 0x4f, 0x46, 0x46)), 'woff');
    assert.equal(detectFormat(bytes(0x77, 0x4f, 0x46, 0x32)), 'woff2');
    assert.equal(detectFormat(bytes(1, 2, 3, 4)), null);
    assert.equal(detectFormat(bytes(0)), null);
});

test('cleanFontName strips paths, symbols and extra spaces', () => {
    assert.equal(cleanFontName('My Font--Bold.ttf'), 'My Font--Bold');
    assert.equal(cleanFontName('<b>x</b>.otf'), 'b x b');
    assert.equal(cleanFontName('.ttf'), 'Custom font');
    assert.equal(cleanFontName('a'.repeat(100) + '.woff').length, 40);
});

test('checkFont enforces count, extension, size and signature', () => {
    const ttf = bytes(0, 1, 0, 0);
    assert.equal(checkFont('a.ttf', 1000, ttf, 0).ok, true);
    assert.equal(checkFont('a.ttf', 1000, ttf, MAX_FONTS).ok, false);
    assert.equal(checkFont('a.exe', 1000, ttf, 0).ok, false);
    assert.equal(checkFont('a.ttf', MAX_BYTES + 1, ttf, 0).ok, false);
    assert.equal(checkFont('a.ttf', MAX_BYTES, ttf, 0).ok, true);
    assert.equal(checkFont('a.ttf', 1000, bytes(9, 9, 9, 9), 0).ok, false);
});

test('pack and unpack round trip when compression is available', async () => {
    const original = new Uint8Array(5000).fill(7).buffer;
    const packed = await pack(original);
    const back = await unpack({ gz: packed.gz, data: packed.data });
    assert.deepEqual(new Uint8Array(back), new Uint8Array(original));
    if (typeof CompressionStream !== 'undefined') assert.ok(packed.gz && packed.data.byteLength < original.byteLength);
});

test('custom font ids pass the style cleaner and build a font stack', () => {
    const style = cleanStyle({ fonts: { heading: 'custom:fabc123', body: 'custom:../x' } });
    assert.deepEqual(style.fonts, { heading: 'custom:fabc123' });
    assert.ok(fontStack('custom:fabc123', 'heading').startsWith("'srrc-custom-fabc123', Georgia"));
    assert.ok(fontStack('custom:fabc123', 'body').endsWith('sans-serif'));
    assert.equal(fontStack('nope', 'body'), null);
});
