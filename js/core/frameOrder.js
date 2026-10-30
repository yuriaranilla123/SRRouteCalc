const KEY = 'srrc:frames:v1';

export function cleanOrder(saved, ids) {
    const known = new Set(ids);
    const out = [];
    if (Array.isArray(saved)) {
        for (const id of saved) {
            if (typeof id === 'string' && known.has(id) && !out.includes(id)) out.push(id);
        }
    }
    for (const id of ids) {
        if (!out.includes(id)) out.push(id);
    }
    return out;
}

export function moveStep(order, id, step) {
    const from = order.indexOf(id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= order.length) return order;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    return next;
}

export function readOrder(ids) {
    try {
        const raw = globalThis.localStorage.getItem(KEY);
        if (!raw || raw.length > 2000) return ids;
        const data = JSON.parse(raw);
        return data && data.v === 1 ? cleanOrder(data.order, ids) : ids;
    } catch {
        return ids;
    }
}

export function storeOrder(order) {
    try {
        globalThis.localStorage.setItem(KEY, JSON.stringify({ v: 1, order }));
        return true;
    } catch {
        return false;
    }
}

export function clearOrder() {
    try {
        globalThis.localStorage.removeItem(KEY);
    } catch {
        return;
    }
}