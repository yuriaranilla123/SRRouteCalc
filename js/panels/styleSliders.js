import { TEXT_SIZES, SIZE, SPEED, LAYOUT, EASINGS, EFFECTS } from '../ui/styleStore.js';
import { el } from '../ui/domKit.js';

export function createSliderKit(ctx) {
    function sizeRow(item) {
        const row = el('div', 'size-row');
        const label = el('label', 'color-label', item.label);
        label.htmlFor = `style-size-${item.id}`;

        const range = el('input', 'style-size');
        range.type = 'range';
        range.id = `style-size-${item.id}`;
        range.min = String(SIZE.min);
        range.max = String(SIZE.max);
        range.step = String(SIZE.step);

        const number = el('input', 'style-size-number');
        number.type = 'number';
        number.id = `style-size-num-${item.id}`;
        number.min = String(SIZE.min);
        number.max = String(SIZE.max);
        number.step = '1';
        number.setAttribute('aria-label', `${item.label} size in percent`);

        const unit = el('span', 'size-unit', '%');
        const reset = el('button', 'menu-action color-reset', '\u21BA');
        reset.type = 'button';
        reset.id = `style-reset-size-${item.id}`;
        reset.title = `Reset ${item.label} size to ${SIZE.default}%`;
        reset.setAttribute('aria-label', reset.title);

        function setSize(value) {
            if (value === SIZE.default) delete ctx.style.sizes[item.id];
            else ctx.style.sizes[item.id] = value;
            reset.classList.toggle('is-default', !ctx.style.sizes[item.id]);
            ctx.change();
        }

        range.addEventListener('input', () => {
            const value = Number(range.value);
            number.value = String(value);
            setSize(value);
        });
        number.addEventListener('input', () => {
            const value = Number(number.value);
            if (number.value.trim() !== '' && Number.isInteger(value) && value >= SIZE.min && value <= SIZE.max) {
                range.value = String(value);
                setSize(value);
            }
        });
        number.addEventListener('change', () => {
            const typed = number.value.trim() === '' ? NaN : Number(number.value);
            const value = Number.isFinite(typed)
                ? Math.min(SIZE.max, Math.max(SIZE.min, Math.round(typed)))
                : ctx.style.sizes[item.id] || SIZE.default;
            number.value = String(value);
            range.value = String(value);
            setSize(value);
        });
        reset.addEventListener('click', () => {
            number.value = String(SIZE.default);
            range.value = String(SIZE.default);
            setSize(SIZE.default);
        });

        row.append(label, range, number, unit, reset);
        return row;
    }

    function sliderRow({ id, label, min, max, step, def, unit, read, write }) {
        const row = el('div', 'size-row');
        const text = el('label', 'color-label', label);
        text.htmlFor = `style-${id}`;
        const range = el('input', 'style-size');
        range.type = 'range';
        range.id = `style-${id}`;
        range.min = String(min);
        range.max = String(max);
        range.step = String(step);
        const number = el('input', 'style-size-number');
        number.type = 'number';
        number.id = `style-${id}-num`;
        number.min = String(min);
        number.max = String(max);
        number.step = '1';
        number.setAttribute('aria-label', `${label} in ${unit}`);
        const unitEl = el('span', 'size-unit', unit);
        const reset = el('button', 'menu-action color-reset', '\u21BA');
        reset.type = 'button';
        reset.id = `style-reset-${id}`;
        reset.title = `Reset ${label} to ${def}${unit}`;
        reset.setAttribute('aria-label', reset.title);

        function apply(value) {
            write(value === def ? undefined : value);
            reset.classList.toggle('is-default', value === def);
            ctx.change();
        }
        range.addEventListener('input', () => {
            number.value = range.value;
            apply(Number(range.value));
        });
        number.addEventListener('change', () => {
            const typed = number.value.trim() === '' ? NaN : Number(number.value);
            const value = Number.isFinite(typed) ? Math.min(max, Math.max(min, Math.round(typed))) : read() ?? def;
            number.value = String(value);
            range.value = String(value);
            apply(value);
        });
        reset.addEventListener('click', () => {
            number.value = String(def);
            range.value = String(def);
            apply(def);
        });
        row.append(text, range, number, unitEl, reset);
        return row;
    }

    const speedRow = () => sliderRow({
        id: 'speed', label: 'Animation speed', min: SPEED.min, max: SPEED.max, step: SPEED.step, def: SPEED.default, unit: '%',
        read: () => ctx.style.motion.speed,
        write: v => { if (v === undefined) delete ctx.style.motion.speed; else ctx.style.motion.speed = v; },
    });

    const layoutRow = l => sliderRow({
        id: `layout-${l.id}`, label: l.label, min: l.min, max: l.max, step: l.step, def: l.default, unit: l.unit,
        read: () => ctx.style.layout[l.id],
        write: v => { if (v === undefined) delete ctx.style.layout[l.id]; else ctx.style.layout[l.id] = v; },
    });

    function easingRow() {
        const row = el('div', 'font-row');
        const label = el('label', 'color-label', 'Animation style');
        label.htmlFor = 'style-easing';
        const select = el('select', 'style-font');
        select.id = 'style-easing';
        select.append(...EASINGS.map(e => new Option(e.label, e.id)));
        select.addEventListener('change', () => {
            if (select.value === 'smooth') delete ctx.style.motion.easing;
            else ctx.style.motion.easing = select.value;
            ctx.change();
        });
        row.append(label, select);
        return row;
    }

    function effectToggle(fx) {
        const label = el('label', 'toggle-switch style-fx');
        const input = el('input');
        input.type = 'checkbox';
        input.id = `style-fx-${fx.id}`;
        const track = el('span', 'toggle-track');
        track.appendChild(el('span', 'toggle-thumb'));
        label.append(input, track, el('span', 'toggle-text', fx.label));
        input.addEventListener('change', () => {
            if (input.checked) delete ctx.style.motion[fx.id];
            else ctx.style.motion[fx.id] = false;
            ctx.change();
        });
        return label;
    }

    function refresh() {
        TEXT_SIZES.forEach(t => {
            const value = ctx.style.sizes[t.id] || SIZE.default;
            document.getElementById(`style-size-${t.id}`).value = String(value);
            document.getElementById(`style-size-num-${t.id}`).value = String(value);
            document.getElementById(`style-reset-size-${t.id}`).classList.toggle('is-default', !ctx.style.sizes[t.id]);
        });
        const speed = ctx.style.motion.speed || SPEED.default;
        document.getElementById('style-speed').value = String(speed);
        document.getElementById('style-speed-num').value = String(speed);
        document.getElementById('style-reset-speed').classList.toggle('is-default', !ctx.style.motion.speed);
        LAYOUT.forEach(l => {
            const value = ctx.style.layout[l.id] ?? l.default;
            document.getElementById(`style-layout-${l.id}`).value = String(value);
            document.getElementById(`style-layout-${l.id}-num`).value = String(value);
            document.getElementById(`style-reset-layout-${l.id}`).classList.toggle('is-default', ctx.style.layout[l.id] === undefined);
        });
        document.getElementById('style-easing').value = ctx.style.motion.easing || 'smooth';
        EFFECTS.forEach(fx => {
            document.getElementById(`style-fx-${fx.id}`).checked = ctx.style.motion[fx.id] !== false;
        });
    }

    return { sizeRow, speedRow, layoutRow, easingRow, effectToggle, refresh };
}