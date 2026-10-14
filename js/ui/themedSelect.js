// Style 2 popup for every <select>. The select stays in place, keeps its value, events and look; only its popup is replaced.
// Touch devices keep the native picker, which is better on phones.
import { getDropdownStyle, onDropdownStyleChange } from './dropDownStyle.js';

let menu = null;
let select = null;
let options = [];
let index = -1;

const touchDevice = () => !!window.matchMedia?.('(pointer: coarse)').matches;
const active = () => getDropdownStyle() === 'themed' && !touchDevice();

function ensureMenu() {
    if (menu) return;
    menu = document.createElement('ul');
    menu.className = 'combo-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');
    document.body.appendChild(menu);
    menu.addEventListener('mousedown', e => {
        const li = e.target.closest('li[data-i]');
        if (!li) return;
        e.preventDefault();
        choose(Number(li.dataset.i));
    });
}

function close() {
    if (menu) menu.hidden = true;
    select = null;
    index = -1;
}

function choose(i) {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    const target = select;
    const changed = target.value !== opt.value;
    target.value = opt.value;
    close();
    if (changed) target.dispatchEvent(new Event('change', { bubbles: true }));
}

function highlight(i) {
    const lis = menu.querySelectorAll('li');
    if (!lis.length) return;
    index = (i + lis.length) % lis.length;
    lis.forEach((li, n) => li.classList.toggle('active', n === index));
    lis[index].scrollIntoView?.({ block: 'nearest' });
}

function place(r) {
    Object.assign(menu.style, { minWidth: `${r.width}px`, width: 'max-content', maxWidth: 'calc(100vw - 16px)', left: `${r.left + window.scrollX}px` });
    menu.hidden = false;
    const overflow = r.left + menu.offsetWidth - (window.innerWidth - 8);
    if (overflow > 0) menu.style.left = `${Math.max(8, r.left + window.scrollX - overflow)}px`;
    const flip = r.bottom + menu.offsetHeight + 8 > window.innerHeight && r.top > menu.offsetHeight + 8;
    menu.style.top = `${(flip ? r.top - menu.offsetHeight - 4 : r.bottom + 4) + window.scrollY}px`;
}

function open(sel) {
    ensureMenu();
    select = sel;
    options = [...sel.options].filter(o => !o.hidden);
    menu.replaceChildren(...options.map((o, i) => {
        const li = document.createElement('li');
        li.dataset.i = i;
        li.textContent = o.textContent.trim();
        li.setAttribute('role', 'option');
        li.classList.toggle('selected', o.value === sel.value);
        li.classList.toggle('disabled', o.disabled);
        return li;
    }));
    place(sel.getBoundingClientRect());
    highlight(Math.max(0, options.findIndex(o => o.value === sel.value)));
}

export function wireThemedSelects() {
    document.addEventListener('mousedown', e => {
        const sel = e.target.closest?.('select');
        if (sel && active() && !sel.disabled && e.button === 0) {
            e.preventDefault();
            sel.focus();
            if (select === sel) close(); else open(sel);
            return;
        }
        if (menu && !menu.hidden && !menu.contains(e.target)) close();
    }, true);

    document.addEventListener('keydown', e => {
        const sel = e.target.closest?.('select');
        if (!sel || !active()) return;
        if (select === sel) {
            if (e.key === 'ArrowDown') { e.preventDefault(); highlight(index + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(index - 1); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(index); }
            else if (e.key === 'Escape' || e.key === 'Tab') close();
        } else if (!sel.disabled && (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown'))) {
            e.preventDefault();
            open(sel);
        }
    }, true);

    document.addEventListener('focusout', e => { if (e.target === select) close(); });
    window.addEventListener('resize', close);
    onDropdownStyleChange(close);
}