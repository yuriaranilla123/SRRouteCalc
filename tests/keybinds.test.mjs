import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, comboFromEvent, isAllowedCombo, isTypingTarget, cleanBindings, resolveBindings, findConflict } from '../js/core/keybinds.js';

const ev = (code, extra = {}) => ({ code, key: extra.key || '', altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, ...extra });

test('default shortcuts are unique and allowed', () => {
    const combos = ACTIONS.map(a => a.combo);
    assert.equal(new Set(combos).size, combos.length);
    assert.equal(new Set(ACTIONS.map(a => a.id)).size, ACTIONS.length);
    combos.forEach(c => assert.ok(isAllowedCombo(c), c));
});

test('comboFromEvent uses the physical key and ignores Ctrl and Cmd', () => {
    assert.equal(comboFromEvent(ev('KeyM')), 'M');
    assert.equal(comboFromEvent(ev('KeyM', { altKey: true, key: 'µ' })), 'Alt+M');
    assert.equal(comboFromEvent(ev('KeyM', { shiftKey: true })), 'Shift+M');
    assert.equal(comboFromEvent(ev('Digit5')), '5');
    assert.equal(comboFromEvent(ev('Slash', { shiftKey: true, key: '?' })), 'Shift+/');
    assert.equal(comboFromEvent(ev('ArrowUp', { key: 'ArrowUp' })), 'ArrowUp');
    assert.equal(comboFromEvent(ev('KeyM', { ctrlKey: true })), null);
    assert.equal(comboFromEvent(ev('KeyM', { metaKey: true })), null);
    assert.equal(comboFromEvent(ev('ShiftLeft', { key: 'Shift' })), null);
    assert.equal(comboFromEvent(ev('Enter', { key: 'Enter' })), null);
});

test('isAllowedCombo blocks reserved and browser keys', () => {
    for (const bad of ['Escape', 'Tab', 'Enter', 'Space', 'Backspace', 'Ctrl+M', 'Meta+M', 'F5', 'Alt+Alt', '', null, 5, 'MM', 'Shift+Alt+M']) {
        assert.equal(isAllowedCombo(bad), false, String(bad));
    }
    for (const ok of ['M', 'Alt+M', 'Shift+M', 'Alt+Shift+M', '1', ',', 'ArrowLeft', 'PageDown']) {
        assert.equal(isAllowedCombo(ok), true, ok);
    }
});

test('isTypingTarget recognises text entry only', () => {
    const node = (tagName, type, extra = {}) => ({ tagName, getAttribute: () => type, ...extra });
    assert.equal(isTypingTarget(node('INPUT', 'text')), true);
    assert.equal(isTypingTarget(node('INPUT', 'number')), true);
    assert.equal(isTypingTarget(node('INPUT', null)), true);
    assert.equal(isTypingTarget(node('SELECT', null)), true);
    assert.equal(isTypingTarget(node('TEXTAREA', null)), true);
    assert.equal(isTypingTarget(node('DIV', null, { isContentEditable: true })), true);
    assert.equal(isTypingTarget(node('INPUT', 'checkbox')), false);
    assert.equal(isTypingTarget(node('BUTTON', null)), false);
    assert.equal(isTypingTarget(null), false);
});

test('cleanBindings keeps valid overrides, unbinds and drops junk and duplicates', () => {
    const out = cleanBindings({ 'toggle-menu': 'Alt+M', 'find-trade': null, 'toggle-icons': 'Escape', bogus: 'X', 'toggle-round': 'Alt+M', 'toggle-detailed': 7 });
    assert.deepEqual(out, { 'toggle-menu': 'Alt+M', 'find-trade': null });
    assert.deepEqual(cleanBindings(null), {});
    assert.deepEqual(cleanBindings([]), {});
});

test('resolveBindings and findConflict combine defaults with overrides', () => {
    const map = resolveBindings({ 'toggle-menu': 'Alt+M', 'find-trade': null });
    assert.equal(map['toggle-menu'], 'Alt+M');
    assert.equal(map['find-trade'], null);
    assert.equal(map['toggle-round'], 'R');
    assert.equal(findConflict(map, 'R', 'toggle-menu'), 'toggle-round');
    assert.equal(findConflict(map, 'R', 'toggle-round'), null);
    assert.equal(findConflict(map, 'M', 'toggle-menu'), null);
});
