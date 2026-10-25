import { sfx, prepareSfx, unlockSfx, resumeSfx, stopAllSfx } from './sfx.js';
import { markSeen } from './introGate.js';
import { el } from './domKit.js';
import { eggFor } from './introEggs.js';
import { pauseAfter } from './introPause.js';

const CSS_HREF = 'style/intro.css';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
const GREENS = [
    { fg: '#7dff9a', bg: '#06220f', glow: '#2cff6a' },
    { fg: '#3fbf68', bg: '#04180a', glow: '#1f9a48' },
    { fg: '#2a8f4d', bg: '#031207', glow: '#17703a' },
];
const REDS = [
    { fg: '#ff5a4d', bg: '#2a0705', glow: '#ff2a1a' },
    { fg: '#c4281d', bg: '#1d0403', glow: '#9a150c' },
];
const GLYPHS = '#%&@$?/\\|<>[]{}0123456789';
const CLI = [
    '> init session --site srroutecalc',
    '> mount data/goods.json ......... OK',
    '> mount data/cities.json ........ OK',
    '> mount data/distances.json ..... OK',
    '> calibrate caravan --auto',
    '> restore display --normal',
    '> exit',
];

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const pick = list => list[Math.floor(Math.random() * list.length)];

function addLink(href) {
    return new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve(true);
        link.onerror = () => resolve(false);
        document.head.appendChild(link);
    });
}

function build() {
    const root = el('div', 'intro-root');
    root.id = 'intro';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Intro');
    const crt = el('div', 'intro-crt standby');
    const screen = el('div', 'intro-screen');
    const split = el('div', 'intro-split');
    const term = el('div', 'intro-term');
    const out = el('div', 'intro-console');
    out.hidden = true;
    split.append(term, out);
    screen.appendChild(split);
    crt.append(screen, el('div', 'intro-lines'), el('div', 'intro-noise'), el('div', 'intro-vignette'), el('div', 'intro-glass'));
    root.appendChild(crt);
    root.addEventListener('pointerdown', unlockSfx);
    root.addEventListener('click', e => {
        if (!e.target.closest('button')) sfx.click();
    });
    return { root, crt, screen, split, term, out, keys: null };
}

function setTone(ui, palette) {
    ui.root.style.setProperty('--fg', palette.fg);
    ui.root.style.setProperty('--bg', palette.bg);
    ui.root.style.setProperty('--glow', palette.glow);
}

function button(label, className = 'intro-btn') {
    const b = el('button', className, label);
    b.type = 'button';
    b.addEventListener('pointerenter', e => {
        if (e.pointerType === 'mouse') sfx.hover();
    });
    b.addEventListener('click', () => sfx.click());
    return b;
}

async function typeLine(ui, text, speed = 24, target = ui.term) {
    ui.screen.querySelectorAll('.intro-cursor').forEach(n => n.classList.remove('intro-cursor'));
    const line = el('div', 'intro-line intro-cursor');
    line.classList.add('typing');
    target.appendChild(line);
    target.scrollTop = target.scrollHeight;
    for (let i = 0; i < text.length; i++) {
        line.textContent += text[i];
        if (i % 2 === 0) sfx.type();
        await wait(speed + pauseAfter(text, i));
    }
    line.classList.remove('typing');
    target.scrollTop = target.scrollHeight;
    return line;
}

async function powerPhase(ui) {
    const prompt = button('CLICK TO POWER ON', 'intro-power');
    ui.root.appendChild(prompt);
    prompt.focus();
    await new Promise(resolve => ui.root.addEventListener('click', resolve, { once: true }));
    prompt.remove();
    await resumeSfx();
    ui.crt.classList.remove('standby');
    ui.crt.classList.add('powering');
    sfx.powerOn();
    await wait(1000);
}

async function bootPhase(ui) {
    await typeLine(ui, 'SRROUTECALC // TERMINAL 0.1');
    await typeLine(ui, 'SECURE CHANNEL ........ READY');
    await typeLine(ui, 'PRESS ENTER TO CONTINUE');
    const enter = button('[ ENTER ]');
    ui.term.appendChild(enter);
    enter.focus();
    await new Promise(resolve => enter.addEventListener('click', resolve, { once: true }));
    enter.remove();
}

async function lockPhase(ui) {
    await typeLine(ui, '> AUTH REQUIRED');
    await typeLine(ui, 'ENTER 6 DIGIT NUMBER:');
    const slots = el('div', 'intro-slots');
    for (let i = 0; i < 6; i++) slots.appendChild(el('span', 'intro-slot'));
    const pad = el('div', 'intro-keys');
    ui.term.append(slots, pad);
    const lock = { code: '', waiting: null };
    const render = () => [...slots.children].forEach((slot, i) => { slot.textContent = lock.code[i] ? '*' : ''; });
    const add = digit => {
        if (!lock.waiting || lock.code.length >= 6) return;
        lock.code += digit;
        sfx.key();
        render();
        if (lock.code.length === 6) {
            const done = lock.waiting;
            lock.waiting = null;
            done(lock.code);
        }
    };
    const back = () => {
        if (!lock.waiting) return;
        lock.code = lock.code.slice(0, -1);
        render();
    };
    const clear = () => {
        if (!lock.waiting) return;
        lock.code = '';
        render();
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'CLR'].forEach(label => {
        const key = button(label, 'intro-btn intro-key');
        key.addEventListener('click', () => {
            if (label === 'DEL') back();
            else if (label === 'CLR') clear();
            else add(label);
        });
        pad.appendChild(key);
    });
    ui.keys = e => {
        if (/^[0-9]$/.test(e.key)) add(e.key);
        else if (e.key === 'Backspace') back();
        else return false;
        return true;
    };
    lock.read = () => new Promise(resolve => {
        lock.code = '';
        render();
        lock.waiting = resolve;
    });
    return lock;
}

function scramble(ui) {
    const lines = [...ui.screen.querySelectorAll('.intro-line')];
    for (let n = 0; n < 3 && lines.length; n++) {
        const line = pick(lines);
        line.dataset.orig ??= line.textContent;
        line.textContent = [...line.dataset.orig].map(c => (c !== ' ' && Math.random() < 0.25 ? pick(GLYPHS) : c)).join('');
    }
}

function bars(ui) {
    ui.crt.querySelectorAll('.intro-bar').forEach(b => b.remove());
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
        const bar = el('div', 'intro-bar');
        bar.style.top = `${Math.random() * 95}%`;
        bar.style.height = `${1 + Math.random() * 9}%`;
        bar.style.left = `${Math.random() * 60}%`;
        bar.style.width = `${20 + Math.random() * 80}%`;
        bar.style.opacity = String(0.15 + Math.random() * 0.4);
        bar.style.background = pick(['var(--fg)', '#ffffff', '#ff2a4a', '#00e5ff']);
        ui.crt.appendChild(bar);
    }
}

function slices(ui) {
    ui.crt.querySelectorAll('.intro-slice').forEach(n => n.remove());
    const anchor = ui.crt.querySelector('.intro-lines');
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
        const slice = el('div', 'intro-screen intro-slice');
        slice.appendChild(ui.split.cloneNode(true));
        const top = Math.random() * 90;
        const height = 3 + Math.random() * 18;
        slice.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
        slice.style.transform = `translateX(${(Math.random() - 0.5) * 16}%)`;
        ui.crt.insertBefore(slice, anchor);
    }
}

function clearGlitch(ui, restore = true) {
    ui.crt.classList.remove('blink');
    ui.crt.style.filter = '';
    ui.split.style.transform = '';
    ui.crt.querySelectorAll('.intro-bar, .intro-slice').forEach(n => n.remove());
    if (restore) {
        ui.screen.querySelectorAll('.intro-line').forEach(line => {
            if (line.dataset.orig !== undefined) line.textContent = line.dataset.orig;
        });
    }
}

function glitchFrame(ui, progress) {
    setTone(ui, Math.random() < progress * 1.1 ? pick(REDS) : pick(GREENS));
    scramble(ui);
    bars(ui);
    slices(ui);
    const roll = Math.random();
    ui.crt.style.filter = roll < 0.12
        ? 'invert(1) contrast(1.6)'
        : roll < 0.3 ? `hue-rotate(${Math.floor(Math.random() * 360)}deg) saturate(3) contrast(1.4)` : '';
    const x = (Math.random() - 0.5) * 8;
    const y = Math.random() < 0.15 ? (Math.random() - 0.5) * 20 : 0;
    const scaleY = Math.random() < 0.15 ? 1 + Math.random() * 0.5 : 1;
    ui.split.style.transform = `translate(${x}%, ${y}%) scaleY(${scaleY})`;
    ui.crt.classList.toggle('blink', Math.random() < 0.07);
}

async function burst(ui, frames, { shake = false, unflip = false } = {}) {
    ui.crt.classList.add('glitching');
    if (shake) ui.crt.classList.add('shake');
    for (let i = 0; i < frames; i++) {
        glitchFrame(ui, 0.2);
        sfx.glitchTick();
        if (unflip && i === 3) ui.crt.classList.remove('flip');
        await wait(60);
    }
    clearGlitch(ui);
    setTone(ui, GREENS[0]);
    ui.crt.classList.remove('glitching', 'shake', 'flip');
    await wait(400);
}

async function consolePhase(ui, code, isEgg) {
    if (ui.out.hidden) {
        ui.out.hidden = false;
        sfx.blink();
        await wait(350);
        await typeLine(ui, '> console open', 18, ui.out);
    }
    await typeLine(ui, `> auth --code ${code}`, 18, ui.out);
    await typeLine(ui, 'HANDSHAKE ........ OK', 14, ui.out);
    await typeLine(ui, isEgg ? 'KEY FOUND IN REGISTRY' : 'KEY NOT IN REGISTRY', 18, ui.out);
    if (isEgg) return;
    await typeLine(ui, 'CONTINUING ANYWAY ...', 18, ui.out);
    await typeLine(ui, '!! INTEGRITY FAULT !!', 18, ui.out);
    await wait(500);
}

async function eggPhase(ui, egg) {
    for (const line of egg.lines) await typeLine(ui, line, 20, ui.out);
    sfx.ok();
    if (egg.flip) {
        ui.crt.classList.add('flip');
        await wait(2000);
        await burst(ui, 10, { unflip: true });
    } else if (egg.shake) {
        await burst(ui, 10, { shake: true });
    } else {
        await wait(900);
    }
    await typeLine(ui, '> hold --await-input', 18, ui.out);
    await typeLine(ui, 'STILL LISTENING ...', 18, ui.out);
}

async function glitchPhase(ui) {
    ui.crt.classList.add('glitching');
    sfx.glitch();
    const steps = 45;
    for (let i = 0; i < steps; i++) {
        if (Math.random() < 0.1) {
            await wait(140);
            continue;
        }
        glitchFrame(ui, i / steps);
        if (Math.random() < 0.4) sfx.glitchTick();
        await wait(40 + Math.random() * 90);
    }
    clearGlitch(ui, false);
    setTone(ui, REDS[0]);
    sfx.glitchTick();
    await wait(500);
    ui.crt.classList.remove('glitching');
}

async function blackoutPhase(ui) {
    ui.crt.classList.remove('powering');
    ui.crt.classList.add('off');
    sfx.powerOff();
    await wait(5000);
}

async function blinkPhase(ui) {
    ui.term.replaceChildren();
    ui.out.replaceChildren();
    ui.out.hidden = true;
    setTone(ui, GREENS[0]);
    ui.crt.classList.remove('off');
    ui.crt.classList.add('powering');
    sfx.powerOn();
    await wait(350);
    for (let i = 0; i < 2; i++) {
        ui.crt.classList.add('blink');
        sfx.blink();
        await wait(90);
        ui.crt.classList.remove('blink');
        await wait(130);
    }
}

async function cliPhase(ui) {
    for (const text of CLI) {
        await typeLine(ui, text, 18);
        await wait(160);
    }
    sfx.ok();
    await wait(600);
}

async function leave(ui) {
    ui.root.classList.add('leaving');
    sfx.powerOff();
    await wait(900);
}

function cleanup(ui) {
    stopAllSfx();
    ui.root.remove();
    const app = document.getElementById('app');
    if (app) app.inert = false;
    delete document.documentElement.dataset.intro;
}

async function run(ui, onKey) {
    try {
        await powerPhase(ui);
        await bootPhase(ui);
        const lock = await lockPhase(ui);
        let code = await lock.read();
        for (; ;) {
            await wait(250);
            const egg = eggFor(code);
            await consolePhase(ui, code, !!egg);
            if (!egg) break;
            await eggPhase(ui, egg);
            code = await lock.read();
        }
        ui.keys = null;
        await glitchPhase(ui);
        await blackoutPhase(ui);
        await blinkPhase(ui);
        await cliPhase(ui);
        await leave(ui);
        markSeen(window.localStorage, window.sessionStorage);
    } finally {
        document.removeEventListener('keydown', onKey, true);
        cleanup(ui);
    }
}

export async function mountIntro() {
    prepareSfx();
    ['pointerdown', 'keydown', 'touchend'].forEach(type => document.addEventListener(type, unlockSfx, { capture: true, once: true }));
    await Promise.race([Promise.all([addLink(CSS_HREF), addLink(FONT_HREF)]), wait(2500)]);
    const ui = build();
    setTone(ui, GREENS[0]);
    const onKey = e => {
        if (ui.keys && ui.keys(e)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        if (['Tab', 'Enter', ' '].includes(e.key)) return;
        e.stopImmediatePropagation();
    };
    document.addEventListener('keydown', onKey, true);
    const app = document.getElementById('app');
    if (app) app.inert = true;
    document.documentElement.dataset.intro = 'on';
    document.body.appendChild(ui.root);
    const done = run(ui, onKey);
    return { done };
}