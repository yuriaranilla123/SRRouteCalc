import { moveStep, readOrder, storeOrder, clearOrder } from '../core/frameOrder.js';
import { spanFor } from './dynamicFrames.js';
import { el } from './domKit.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const EDGE = 70;
const SPEED = 18;
const COOLDOWN = 160;
const MOVE_MS = 280;
const running = new WeakMap();

export function setFrameDrag(on) {
    document.documentElement.dataset.frameDrag = on ? 'on' : 'off';
}

const enabled = () => document.documentElement.dataset.frameDrag === 'on';

function motion() {
    const root = document.documentElement;
    if (root.dataset.animations === 'off') return null;
    const style = getComputedStyle(root);
    const speed = parseFloat(style.getPropertyValue('--motion-speed')) || 1;
    return { duration: MOVE_MS / speed, easing: style.getPropertyValue('--ease').trim() || 'ease' };
}

function glide(node, dx, dy) {
    if (typeof node.animate !== 'function' || (Math.abs(dx) < 1 && Math.abs(dy) < 1)) return null;
    const options = motion();
    if (!options) return null;
    const animation = node.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], options);
    running.set(node, animation);
    animation.onfinish = () => {
        if (running.get(node) === animation) running.delete(node);
    };
    return animation;
}

function flash(node) {
    const options = motion();
    if (!options || typeof node.animate !== 'function') return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--saffron').trim() || '#d4a017';
    node.animate([{ boxShadow: `0 0 0 4px ${accent}` }, { boxShadow: `0 0 0 0 transparent` }], { duration: options.duration * 2, easing: options.easing });
}

function reflow(nodes, mutate) {
    const before = new Map(nodes.map(node => [node, node.getBoundingClientRect()]));
    nodes.forEach(node => {
        const animation = running.get(node);
        if (animation) {
            animation.cancel();
            running.delete(node);
        }
    });
    mutate();
    nodes.forEach(node => {
        const from = before.get(node);
        const to = node.getBoundingClientRect();
        glide(node, from.left - to.left, from.top - to.top);
    });
}

function dots() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 14 20');
    svg.setAttribute('aria-hidden', 'true');
    [3, 11].forEach(x => [4, 10, 16].forEach(y => {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', String(x));
        dot.setAttribute('cy', String(y));
        dot.setAttribute('r', '1.7');
        dot.setAttribute('fill', 'currentColor');
        svg.appendChild(dot);
    }));
    return svg;
}

export function wireFrameDrag() {
    const main = document.querySelector('main');
    const root = document.documentElement;
    const list = () => [...main.querySelectorAll(':scope > .panel')];
    const real = () => list().filter(panel => !panel.classList.contains('frame-slot'));
    const ids = () => real().map(panel => panel.id);
    const defaults = ids();
    const apply = (order, quiet = false) => {
        const byId = new Map(real().map(panel => [panel.id, panel]));
        if (!quiet) byId.forEach(panel => { panel.style.animation = 'none'; });
        order.forEach(id => main.appendChild(byId.get(id)));
    };
    const setStatus = message => {
        const status = document.getElementById('frame-status');
        if (status) status.textContent = message;
    };
    let drag = null;

    function follow() {
        const left = Math.min(Math.max(drag.x - drag.grabX, 0), Math.max(0, window.innerWidth - drag.rect.width));
        drag.panel.style.left = `${left}px`;
        drag.panel.style.top = `${drag.y - drag.grabY}px`;
    }

    function hit() {
        if (performance.now() - drag.moved < COOLDOWN) return;
        const under = document.elementFromPoint(drag.x, drag.y);
        const target = under && under.closest('.panel');
        if (!target || target === drag.panel || target === drag.slot || target.parentElement !== main) return;
        const forward = drag.slot.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING;
        reflow(list().filter(node => node !== drag.panel), () => main.insertBefore(drag.slot, forward ? target.nextSibling : target));
        drag.moved = performance.now();
    }

    function frame() {
        if (!drag) return;
        if (drag.y < EDGE) window.scrollBy(0, -SPEED);
        else if (drag.y > window.innerHeight - EDGE) window.scrollBy(0, SPEED);
        follow();
        hit();
        drag.raf = requestAnimationFrame(frame);
    }

    function onMove(e) {
        if (!drag) return;
        drag.x = e.clientX;
        drag.y = e.clientY;
        e.preventDefault();
    }

    function onKey(e) {
        if (e.key !== 'Escape' || !drag) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        end(false);
    }

    const onUp = () => end(true);
    const onCancel = () => end(false);

    function end(save) {
        if (!drag) return;
        cancelAnimationFrame(drag.raf);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onCancel);
        document.removeEventListener('keydown', onKey, true);
        const { panel, slot, title, before } = drag;
        drag = null;
        const from = panel.getBoundingClientRect();
        if (!save) reflow(list().filter(node => node !== panel), () => main.insertBefore(slot, panel));
        main.insertBefore(panel, slot);
        slot.remove();
        panel.classList.remove('frame-dragging');
        ['left', 'top', 'width', 'height'].forEach(property => panel.style.removeProperty(property));
        root.classList.remove('frame-dragging-active');
        const to = panel.getBoundingClientRect();
        panel.classList.add('frame-settling');
        const settle = glide(panel, from.left - to.left, from.top - to.top);
        if (settle) settle.addEventListener('finish', () => panel.classList.remove('frame-settling'));
        else panel.classList.remove('frame-settling');
        if (save && ids().join() !== before.join()) {
            flash(panel);
            storeOrder(ids());
            setStatus(`${title} moved to position ${ids().indexOf(panel.id) + 1}.`);
        }
    }

    function start(e, panel, title) {
        if (!enabled() || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        const animation = running.get(panel);
        if (animation) animation.cancel();
        const rect = panel.getBoundingClientRect();
        const slot = el('div', 'panel frame-slot');
        slot.style.height = `${rect.height}px`;
        slot.style.animation = 'none';
        if (root.dataset.dynamicFrames === 'on') {
            const gap = parseFloat(getComputedStyle(root).getPropertyValue('--frame-gap')) || 24;
            slot.style.gridRowEnd = `span ${spanFor(rect.height, gap)}`;
            slot.style.gridColumn = getComputedStyle(panel).gridColumn;
        }
        main.insertBefore(slot, panel);
        panel.style.animation = 'none';
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.width = `${rect.width}px`;
        panel.style.height = `${rect.height}px`;
        panel.classList.add('frame-dragging');
        root.classList.add('frame-dragging-active');
        drag = { panel, slot, title, rect, before: ids(), x: e.clientX, y: e.clientY, grabX: e.clientX - rect.left, grabY: e.clientY - rect.top, moved: 0, raf: 0 };
        document.addEventListener('pointermove', onMove, { passive: false });
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
        document.addEventListener('keydown', onKey, true);
        drag.raf = requestAnimationFrame(frame);
    }

    apply(readOrder(defaults), true);
    real().forEach(panel => {
        const heading = panel.querySelector('h2');
        if (!heading) return;
        const title = heading.textContent;
        const grip = el('button', 'panel-grip');
        grip.type = 'button';
        grip.title = 'Drag to move this frame. Arrow keys also work.';
        grip.setAttribute('aria-label', `Move ${title}`);
        grip.appendChild(dots());
        grip.addEventListener('pointerdown', e => start(e, panel, title));
        grip.addEventListener('keydown', e => {
            const step = ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : 0;
            if (!step || !enabled() || drag) return;
            e.preventDefault();
            e.stopPropagation();
            const next = moveStep(ids(), panel.id, step);
            reflow(list(), () => apply(next));
            storeOrder(next);
            grip.focus();
            setStatus(`${title} moved to position ${next.indexOf(panel.id) + 1} of ${next.length}.`);
        });
        heading.appendChild(grip);
    });

    const reset = document.getElementById('frame-order-reset');
    if (reset) {
        reset.addEventListener('click', () => {
            clearOrder();
            reflow(list(), () => apply(defaults));
            setStatus('Frame order reset.');
        });
    }
}