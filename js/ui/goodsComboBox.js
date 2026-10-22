import { iconsOn, iconUrl, goodIconPathByName, makeIcon } from './icons.js';
// Themed replacement for the native <datalist> popup. #goods-datalist stays as the data source.
const INPUT = 'input.specific-item-search';
let menu = null;
let input = null;
let items = [];
let index = -1;
let selecting = false;

function ensureMenu() {
    if (menu) return;
    menu = document.createElement('ul');
    menu.className = 'combo-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');
    document.body.appendChild(menu);
    // mousedown (not click) so the input keeps focus and doesn't blur first
    menu.addEventListener('mousedown', e => {
        const li = e.target.closest('li[data-value]');
        if (!li) return;
        e.preventDefault();
        choose(li.dataset.value);
    });
}

function close() {
    if (menu) menu.hidden = true;
    index = -1;
}

function choose(value) {
    selecting = true;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    selecting = false;
    close();
}

function highlight(i) {
    const lis = menu.querySelectorAll('li[data-value]');
    if (!lis.length) return;
    index = (i + lis.length) % lis.length;
    lis.forEach((li, n) => li.classList.toggle('active', n === index));
    lis[index].scrollIntoView?.({ block: 'nearest' });
}

function open() {
    ensureMenu();
    const q = input.value.trim().toLowerCase();
    items = [...document.querySelectorAll('#goods-datalist option')]
        .map(o => o.value)
        .filter(n => n.toLowerCase().includes(q));
    menu.replaceChildren(...(items.length ? items.map(n => {
        const li = document.createElement('li');
        li.dataset.value = n;
        const iconPath = iconsOn() ? goodIconPathByName(n) : null;
        if (iconPath) {
            const text = document.createElement('span');
            text.textContent = n;
            li.classList.add('with-icon');
            li.append(makeIcon(iconUrl(iconPath)), text);
        } else {
            li.textContent = n;
        }
        li.setAttribute('role', 'option');
        return li;
    }) : [Object.assign(document.createElement('li'), { className: 'combo-empty', textContent: 'No match' })]));
    const r = input.getBoundingClientRect();
    Object.assign(menu.style, {
        left: `${r.left + window.scrollX}px`,
        top: `${r.bottom + window.scrollY + 4}px`,
        width: `${r.width}px`,
    });
    index = -1;
    menu.hidden = false;
}

export function wireGoodsCombobox() {
    document.addEventListener('focusin', e => {
        if (!e.target.matches(INPUT)) return;
        input = e.target;
        open();
    });
    document.addEventListener('input', e => {
        if (e.target.matches(INPUT) && !selecting) { input = e.target; open(); }
    });
    document.addEventListener('focusout', e => {
        if (e.target.matches(INPUT)) close();
    });
    document.addEventListener('keydown', e => {
        if (!menu || menu.hidden || !e.target.matches(INPUT)) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); highlight(index + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(index - 1); }
        else if (e.key === 'Enter' && index >= 0) { e.preventDefault(); choose(items[index]); }
        else if (e.key === 'Escape') close();
    });
    window.addEventListener('resize', close);
}