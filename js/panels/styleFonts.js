import { FONT_SLOTS, FONTS } from '../ui/styleStore.js';
import { loadCustomFonts, addCustomFont, removeCustomFont, MAX_FONTS, MAX_BYTES } from '../ui/fontStore.js';
import { confirmAction } from '../ui/confirmDialog.js';
import { el } from '../ui/domKit.js';

export function createFontKit(ctx) {
    let customFonts = [];

    function fillFontOptions(select) {
        const current = select.value;
        select.replaceChildren(new Option('Theme default', ''), ...FONTS.map(f => new Option(f.label, f.id)));
        if (customFonts.length) {
            const group = document.createElement('optgroup');
            group.label = 'Your fonts';
            customFonts.forEach(f => group.appendChild(new Option(f.name, `custom:${f.id}`)));
            select.appendChild(group);
        }
        select.value = current;
    }

    function formatSize(bytes) {
        return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    function setFontStatus(message) {
        document.getElementById('style-font-status').textContent = message;
    }

    function renderFontList() {
        const list = document.getElementById('style-font-list');
        list.replaceChildren();
        customFonts.forEach(font => {
            const li = el('li', 'font-item');
            const name = el('span', 'font-item-name', font.name);
            const info = el('span', 'font-item-size', `${font.format.toUpperCase()}, ${formatSize(font.size)}${font.stored < font.size ? `, stored as ${formatSize(font.stored)}` : ''}`);
            const remove = el('button', 'menu-action', '\u2212');
            remove.type = 'button';
            remove.dataset.action = 'delete';
            remove.setAttribute('aria-label', `Delete ${font.name}`);
            remove.addEventListener('click', () => removeFont(font));
            li.append(name, info, remove);
            list.appendChild(li);
        });
        document.getElementById('style-font-upload').disabled = customFonts.length >= MAX_FONTS;
    }

    function syncFontSelects() {
        FONT_SLOTS.forEach(slot => {
            const select = document.getElementById(`style-font-${slot.id}`);
            fillFontOptions(select);
            select.value = ctx.style.fonts[slot.id] || '';
        });
    }

    async function removeFont(font) {
        if (!(await confirmAction(`Delete the font "${font.name}"?`))) return;
        try {
            await removeCustomFont(font.id);
        } catch {
            setFontStatus('Could not delete that font.');
            return;
        }
        customFonts = customFonts.filter(f => f.id !== font.id);
        FONT_SLOTS.forEach(slot => {
            if (ctx.style.fonts[slot.id] === `custom:${font.id}`) delete ctx.style.fonts[slot.id];
        });
        syncFontSelects();
        renderFontList();
        ctx.change();
        setFontStatus(`Deleted ${font.name}.`);
    }

    async function uploadFont(file) {
        let result;
        try {
            result = await addCustomFont(file, customFonts.length);
        } catch {
            result = { ok: false, reason: 'Fonts cannot be saved in this browser.' };
        }
        if (!result.ok) return `${file.name}: ${result.reason}`;
        customFonts.push(result.font);
        syncFontSelects();
        renderFontList();
        return `Added ${result.font.name}.`;
    }

    async function uploadFonts(files) {
        const list = [...files];
        if (!list.length) return;
        setFontStatus('Adding font...');
        const messages = [];
        for (const file of list) messages.push(await uploadFont(file));
        setFontStatus(messages.some(m => m.startsWith('Added')) ? `${messages.join(' ')} Pick it in the dropdowns above.` : messages.join(' '));
    }

    function wireDrop(zone) {
        const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
        const over = e => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            zone.classList.add('dragging');
        };
        zone.addEventListener('dragenter', over);
        zone.addEventListener('dragover', over);
        zone.addEventListener('dragleave', e => {
            if (!zone.contains(e.relatedTarget)) zone.classList.remove('dragging');
        });
        zone.addEventListener('drop', async e => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            zone.classList.remove('dragging');
            await uploadFonts(e.dataTransfer.files);
        });
    }

    function fontManager() {
        const fileInput = el('input');
        fileInput.type = 'file';
        fileInput.id = 'style-font-file';
        fileInput.accept = '.ttf,.otf,.woff,.woff2';
        fileInput.multiple = true;
        fileInput.hidden = true;
        const upload = el('button', 'menu-action', 'Upload font');
        upload.type = 'button';
        upload.id = 'style-font-upload';
        upload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            await uploadFonts(fileInput.files);
            fileInput.value = '';
        });
        const zone = el('div', 'font-drop');
        zone.append(el('span', 'font-drop-text', 'Drop font files here, or'), upload, fileInput);
        wireDrop(zone);
        const toolbar = zone;
        const status = el('p', 'field-hint');
        status.id = 'style-font-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        const list = el('ul', 'font-list');
        list.id = 'style-font-list';
        return [
            el('h3', 'menu-subtitle', 'Your fonts'),
            el('p', 'field-hint', `Upload a .ttf, .otf, .woff or .woff2 file up to ${MAX_BYTES / 1048576} MB, ${MAX_FONTS} fonts at most. Fonts stay in this browser only and are compressed when stored. A style export keeps only the font name, so anyone importing it needs to upload the font too.`),
            toolbar,
            status,
            list,
        ];
    }

    function fontRow(slot) {
        const row = el('div', 'font-row');
        const label = el('label', 'color-label', slot.label);
        label.htmlFor = `style-font-${slot.id}`;
        const select = el('select', 'style-font');
        select.id = `style-font-${slot.id}`;
        fillFontOptions(select);
        select.addEventListener('change', () => {
            if (select.value) ctx.style.fonts[slot.id] = select.value;
            else delete ctx.style.fonts[slot.id];
            ctx.change();
        });
        row.append(label, select);
        return row;
    }

    function refresh() {
        FONT_SLOTS.forEach(slot => {
            const select = document.getElementById(`style-font-${slot.id}`);
            select.value = ctx.style.fonts[slot.id] || '';
            if (select.selectedIndex < 0) select.value = '';
        });
    }

    function load() {
        loadCustomFonts().then(fonts => {
            customFonts = fonts;
            syncFontSelects();
            renderFontList();
            ctx.refresh();
        }).catch(() => {
            setFontStatus('Custom fonts are not available in this browser.');
            document.getElementById('style-font-upload').disabled = true;
        });
    }

    return {
        rows: () => [...FONT_SLOTS.map(fontRow), ...fontManager()],
        refresh,
        load,
        getCustom: () => customFonts,
    };
}