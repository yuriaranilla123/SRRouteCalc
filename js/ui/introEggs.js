const NICE = { lines: ['NICE.'] };
const LEET = { lines: ['1337 DETECTED.', 'WELCOME, L33T H4X0R.'] };

export const EGGS = {
    694200: NICE,
    420069: NICE,
    314159: { lines: ['PI DETECTED.', '3.14159265358979 ...'] },
    271828: { lines: ['EULER\'S NUMBER DETECTED.', '2.71828182845904 ...'] },
    161803: { lines: ['GOLDEN RATIO DETECTED.', '1.61803398874989 ...'] },
    800815: { lines: ['NOW TURN YOUR CALCULATOR UPSIDE DOWN.', 'BOOBIES.'], flip: true },
    800855: { lines: ['NOW TURN YOUR CALCULATOR UPSIDE DOWN.', 'BOOBS.'], flip: true },
    133700: LEET,
    '001337': LEET,
    676767: { lines: ['DO NOT.'], shake: true },
    111111: { lines: ['ALL RIGHT, ALL RIGHT, I GOT IT ...', 'STAND BACK, SON. ONE, ONE, ONE, UHMMM ... ONE!'] },
    696969: { lines: ['69S.', 'NICE.'] },
    291916: { lines: ['I\'LL HAVE TWO NUMBER 9S, A NUMBER 9 LARGE, A NUMBER 6 WITH EXTRA DIP, A NUMBER 7, TWO NUMBER 45S, ONE WITH CHEESE, AND A LARGE SODA.'] },
};

export function eggFor(code) {
    return Object.prototype.hasOwnProperty.call(EGGS, code) ? EGGS[code] : null;
}