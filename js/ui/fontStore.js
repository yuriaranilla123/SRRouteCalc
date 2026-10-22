const DB_NAME = 'srrc-fonts';
const STORE = 'fonts';
const EXT = /\.(ttf|otf|woff2?)$/i;

export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_FONTS = 5;
export const CUSTOM_FONT = /^custom:[a-z0-9]{1,24}$/;

const faces = new Map();

export function familyFor(id) {
    return `srrc-custom-${id}`;
}

export function detectFormat(bytes) {
    if (!bytes || bytes.length < 4) return null;
    const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (tag === 'wOF2') return 'woff2';
    if (tag === 'wOFF') return 'woff';
    if (tag === 'OTTO') return 'otf';
    if (tag === 'true' || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return 'ttf';
    return null;
}

export function cleanFontName(filename) {
    const base = String(filename).replace(/\.[^.]*$/, '').replace(/[^\p{L}\p{N} _-]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    return base || 'Custom font';
}

export function checkFont(filename, size, bytes, count) {
    if (count >= MAX_FONTS) return { ok: false, reason: `You can keep up to ${MAX_FONTS} fonts. Delete one first.` };
    if (!EXT.test(filename)) return { ok: false, reason: 'Use a .ttf, .otf, .woff or .woff2 file.' };
    if (size > MAX_BYTES) return { ok: false, reason: 'That font is larger than 2 MB.' };
    const format = detectFormat(bytes);
    if (!format) return { ok: false, reason: 'That file does not look like a font.' };
    return { ok: true, format };
}

async function pipe(buffer, transform) {
    return new Response(new Blob([buffer]).stream().pipeThrough(transform)).arrayBuffer();
}

export async function pack(buffer) {
    if (typeof CompressionStream === 'undefined') return { gz: false, data: buffer };
    try {
        const out = await pipe(buffer, new CompressionStream('gzip'));
        return out.byteLength < buffer.byteLength ? { gz: true, data: out } : { gz: false, data: buffer };
    } catch {
        return { gz: false, data: buffer };
    }
}

export async function unpack(record) {
    return record.gz ? pipe(record.data, new DecompressionStream('gzip')) : record.data;
}

function openDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function run(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => { db.close(); resolve(request.result); };
        tx.onerror = () => { db.close(); reject(tx.error); };
        tx.onabort = () => { db.close(); reject(tx.error); };
    });
}

function meta(record) {
    return { id: record.id, name: record.name, format: record.format, size: record.size, stored: record.data.byteLength };
}

async function register(id, buffer) {
    const face = new FontFace(familyFor(id), buffer);
    await face.load();
    document.fonts.add(face);
    faces.set(id, face);
}

export async function loadCustomFonts() {
    const records = await run('readonly', store => store.getAll());
    const loaded = [];
    for (const record of records) {
        if (!CUSTOM_FONT.test(`custom:${record.id}`)) continue;
        try {
            await register(record.id, await unpack(record));
            loaded.push(meta(record));
        } catch {
            continue;
        }
    }
    return loaded;
}

export async function addCustomFont(file, count) {
    const buffer = await file.arrayBuffer();
    const check = checkFont(file.name, file.size, new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)), count);
    if (!check.ok) return check;
    const id = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    try {
        await register(id, buffer);
    } catch {
        return { ok: false, reason: 'The browser could not read that font file.' };
    }
    const packed = await pack(buffer);
    const record = { id, name: cleanFontName(file.name), format: check.format, size: file.size, gz: packed.gz, data: packed.data };
    try {
        await run('readwrite', store => store.put(record));
    } catch {
        document.fonts.delete(faces.get(id));
        faces.delete(id);
        return { ok: false, reason: 'Could not save the font. Browser storage is full or blocked.' };
    }
    return { ok: true, font: meta(record) };
}

export async function removeCustomFont(id) {
    await run('readwrite', store => store.delete(id));
    const face = faces.get(id);
    if (face) document.fonts.delete(face);
    faces.delete(id);
}