export const COMMA_PAUSE = 500;
export const DOT_PAUSE = 1000;

export function pauseAfter(text, index) {
    const char = text[index];
    const next = text[index + 1];
    if (next !== undefined && next !== ' ') return 0;
    if (char === ',') return COMMA_PAUSE;
    if (char !== '.') return 0;
    let run = 1;
    while (text[index - run] === '.') run++;
    return run <= 3 ? DOT_PAUSE : 0;
}