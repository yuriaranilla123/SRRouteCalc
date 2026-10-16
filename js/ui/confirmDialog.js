const CHECK = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M4.5 11.5l4.5 4.5 8.5-9.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M5.5 5.5l11 11M16.5 5.5l-11 11" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';

let open = false;

export function isQuickAction() {
    const el = document.getElementById('quick-action');
    return !!(el && el.checked);
}

function makeButton(className, label, icon) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `confirm-btn ${className}`;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = icon;
    return b;
}

export function confirmAction(message) {
    if (isQuickAction()) return Promise.resolve(true);
    if (open) return Promise.resolve(false);
    open = true;

    return new Promise(resolve => {
        const previous = document.activeElement;

        const backdrop = document.createElement('div');
        backdrop.className = 'confirm-backdrop';

        const box = document.createElement('div');
        box.className = 'confirm-box';
        box.setAttribute('role', 'alertdialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-describedby', 'confirm-message');

        const text = document.createElement('p');
        text.className = 'confirm-message';
        text.id = 'confirm-message';
        text.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'confirm-actions';
        const no = makeButton('confirm-no', 'Cancel', CROSS);
        const yes = makeButton('confirm-yes', 'Confirm', CHECK);
        actions.append(no, yes);

        box.append(text, actions);
        backdrop.appendChild(box);
        document.body.appendChild(backdrop);
        no.focus();

        function finish(result) {
            document.removeEventListener('keydown', onKey, true);
            backdrop.remove();
            open = false;
            if (previous && previous.focus) previous.focus();
            resolve(result);
        }

        function onKey(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                finish(false);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                (document.activeElement === no ? yes : no).focus();
            }
        }

        document.addEventListener('keydown', onKey, true);
        yes.addEventListener('click', () => finish(true));
        no.addEventListener('click', () => finish(false));
        backdrop.addEventListener('mousedown', e => {
            if (e.target === backdrop) finish(false);
        });
    });
}