import { isRoundToInt } from './state.js';

export function money(n) {
    const sign = n < 0 ? '-' : '';
    const value = isRoundToInt() ? Math.round(Math.abs(n)).toString() : Math.abs(n).toFixed(2);
    return `${sign}$${value}`;
}