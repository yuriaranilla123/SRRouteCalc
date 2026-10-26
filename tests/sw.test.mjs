import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://site.test/';
const sandbox = { URL };
vm.runInNewContext(await readFile(path.join(root, 'swDiscover.js'), 'utf8'), sandbox);
const discover = sandbox.srrcDiscover;

async function walk(dir) {
    const out = [];
    for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) out.push(...await walk(rel));
        else out.push(rel);
    }
    return out;
}

async function crawlDisk() {
    const reached = new Set();
    const missing = [];
    let level = [`${BASE}index.html`];
    while (level.length) {
        const next = [];
        for (const url of level) {
            if (reached.has(url)) continue;
            reached.add(url);
            const rel = url.slice(BASE.length);
            let text;
            try {
                text = await readFile(path.join(root, rel), 'utf8');
            } catch {
                missing.push(rel);
                continue;
            }
            const kind = rel === 'index.html' ? 'html' : /\.js$/.test(rel) ? 'js' : null;
            if (!kind) continue;
            for (const child of discover(text, kind, url, `${BASE}index.html`)) {
                if (!/\/(sw|swDiscover)\.js$/.test(child)) next.push(child);
            }
        }
        level = next;
    }
    return { reached, missing };
}

test('crawling from index.html reaches every page, script, style and data file', async () => {
    const { reached } = await crawlDisk();
    const files = ['index.html', ...await walk('js'), ...await walk('style'), ...await walk('data')];
    const orphans = ['js/ui/goodsField.js'];
    for (const file of files.filter(f => !orphans.includes(f))) assert.ok(reached.has(`${BASE}${file}`), `${file} is not reachable from index.html`);
});

test('the crawl finds no phantom files apart from assets and the optional intro files', async () => {
    const { missing } = await crawlDisk();
    for (const file of missing) assert.ok(/^assets\//.test(file) || /intro/i.test(file), `${file} is referenced but not in the repo`);
});

test('discovery resolves module imports from the importing file and strings from the page', () => {
    const found = discover("import { a } from './ui/x.js'; const css = 'style/y.css'; fetch('./data/z.json'); import('../w.js');", 'js', `${BASE}js/main.js`, `${BASE}index.html`);
    assert.deepEqual([...found].sort(), [`${BASE}data/z.json`, `${BASE}js/ui/x.js`, `${BASE}style/y.css`, `${BASE}w.js`].sort());
    assert.deepEqual([...discover('<link href="https://fonts.googleapis.com/a.css"><link href="style/a.css"><script src="js/m.js">', 'html', BASE, BASE)].sort(), [`${BASE}js/m.js`, `${BASE}style/a.css`]);
});
