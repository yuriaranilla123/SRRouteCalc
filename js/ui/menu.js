const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([type="file"]), [href], select:not([disabled])';

export function setMenuSticky(value) {
    document.documentElement.dataset.menuSticky = value ? 'on' : 'off';
}

export function wireMenu() {
    const button = document.getElementById('menu-btn');
    const panel = document.getElementById('menu-panel');
    const backdrop = document.getElementById('menu-backdrop');
    const closeButton = document.getElementById('menu-close');
    const tabs = panel.querySelectorAll('[data-menu-tab]');
    const sections = panel.querySelectorAll('[data-menu-section]');

    function isOpen() {
        return panel.classList.contains('open');
    }

    function open() {
        panel.classList.add('open');
        backdrop.classList.add('open');
        document.documentElement.classList.add('menu-open');
        button.setAttribute('aria-expanded', 'true');
        closeButton.focus();
    }

    function close() {
        if (!isOpen()) return;
        panel.classList.remove('open');
        backdrop.classList.remove('open');
        document.documentElement.classList.remove('menu-open');
        button.setAttribute('aria-expanded', 'false');
        button.focus();
    }

    function showTab(name) {
        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.menuTab === name));
        sections.forEach(section => { section.hidden = section.dataset.menuSection !== name; });
    }

    button.addEventListener('click', () => (isOpen() ? close() : open()));
    closeButton.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.menuTab)));

    document.addEventListener('keydown', e => {
        if (!isOpen()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
            return;
        }
        if (e.key !== 'Tab') return;
        const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

    showTab('settings');
}