export const SEEN_KEY = 'srrc:intro:halloween';
export const SESSION_KEY = 'srrc:intro:session';
export const MODES = ['first', 'session', 'always', 'never'];

export function isHalloweenWindow(date) {
    const month = date.getMonth();
    const day = date.getDate();
    return (month === 9 && day >= 24) || (month === 10 && day <= 1);
}

export function readMode(storage) {
    try {
        const data = JSON.parse(storage.getItem('srrc:settings:v1'));
        const value = data && data.s && data.s['#intro-mode'];
        return MODES.includes(value) ? value : 'first';
    } catch {
        return 'first';
    }
}

export function shouldPlayIntro(date, storage, search = '', session = null) {
    if (/[?&]intro(=|&|$)/.test(search)) return true;
    const mode = readMode(storage);
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    try {
        if (mode === 'session') return !(session && session.getItem(SESSION_KEY));
        return isHalloweenWindow(date) && !storage.getItem(SEEN_KEY);
    } catch {
        return false;
    }
}

export function markSeen(storage, session = null) {
    try {
        storage.setItem(SEEN_KEY, '1');
    } catch {
        return;
    }
    try {
        if (session) session.setItem(SESSION_KEY, '1');
    } catch {
        return;
    }
}