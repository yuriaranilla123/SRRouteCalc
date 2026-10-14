// Goods picker: a plain <select> in Style 1, the text input + themed menu (goodsCombobox.js) in Style 2.
import { getDropdownStyle, onDropdownStyleChange } from './dropDownStyle.js';

let onChange = () => { };

export function setGoodsChangeHandler(fn) { onChange = fn; }

/** #goods-datalist is the single list of unlocked goods (see goodsDatalist.js). */
const goodNames = () => [...document.querySelectorAll('#goods-datalist option')].map(o => o.value);

function fillSelect(sel, value) {
    const names = goodNames();
    if (value && !names.includes(value)) names.push(value); // keep a now-locked pick so the row can say so
    sel.replaceChildren(new Option('Select a good...', ''), ...names.map(n => new Option(n, n)));
    sel.value = value;
}

function build(value = '') {
    let el;
    if (getDropdownStyle() === 'native') {
        el = document.createElement('select');
        fillSelect(el, value);
        el.addEventListener('change', () => onChange());
    } else {
        el = document.createElement('input');
        el.type = 'text';
        el.placeholder = 'Search a good...';
        el.value = value;
        el.addEventListener('input', () => onChange());
    }
    el.className = 'specific-item-search';
    return el;
}

export function createGoodsControl() { return build(); }

/** Call after the unlocked-goods list changes. */
export function refreshGoodsControls() {
    document.querySelectorAll('select.specific-item-search').forEach(s => fillSelect(s, s.value));
}

onDropdownStyleChange(() => {
    const tag = getDropdownStyle() === 'native' ? 'SELECT' : 'INPUT';
    document.querySelectorAll('.specific-item-search').forEach(old => {
        if (old.tagName !== tag) old.replaceWith(build(old.value));
    });
});