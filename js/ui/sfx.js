const SAMPLE_PATH = 'assets/sfx/';
const DEFAULT_EXT = ['mp3', 'ogg', 'wav', 'wave', 'm4a'];
const ONCE = new Set(['glitch']);

let ctx = null;
let master = null;
let loaded = false;
const samples = {};
const fired = new Set();
const report = {};
const debug = /[?&]sfxdebug/.test(globalThis.location ? globalThis.location.search : '');

async function fetchBytes(url) {
    try {
        const response = await fetch(url);
        if (!response.ok || (response.headers.get('content-type') || '').includes('text/html')) return null;
        return response;
    } catch {
        return null;
    }
}

async function readManifest() {
    const response = await fetchBytes(`${SAMPLE_PATH}sfx.json`);
    if (!response) return {};
    try {
        const data = await response.json();
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch {
        return {};
    }
}

async function decode(url) {
    const response = await fetchBytes(url);
    if (!response) return null;
    try {
        return await ctx.decodeAudioData(await response.arrayBuffer());
    } catch {
        return null;
    }
}

async function loadSamples() {
    const manifest = await readManifest();
    await Promise.all(Object.keys(synth).map(async name => {
        const listed = manifest[name];
        const files = typeof listed === 'string' && /^[^\\/]{1,100}$/.test(listed) ? [listed] : DEFAULT_EXT.map(ext => `${name}.${ext}`);
        for (const file of files) {
            const buffer = await decode(`${SAMPLE_PATH}${encodeURIComponent(file)}`);
            if (buffer) {
                samples[name] = buffer;
                report[name] = `${file} (${buffer.duration.toFixed(1)}s)`;
                return;
            }
        }
        report[name] = 'synth';
    }));
    loaded = true;
    console.info('[sfx] sources', report);
}

export function prepareSfx() {
    fired.clear();
    if (ctx) return;
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return;
    try {
        ctx = new AudioCtx();
    } catch {
        return;
    }
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    loadSamples();
}

export async function resumeSfx() {
    prepareSfx();
    if (ctx && ctx.state === 'suspended') await ctx.resume().catch(() => { });
}

export function unlockSfx() {
    prepareSfx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { });
}

const ready = () => !!ctx && ctx.state === 'running';

function tone(freq, dur, type, vol, delay = 0) {
    if (!ready()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

function noise(dur, vol, freq, type = 'lowpass', delay = 0, q = 0.7) {
    if (!ready()) return;
    const t = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t);
}

export const MAX_SECONDS = { glitch: 5, powerOn: 5, powerOff: 5, ok: 2, blink: 1, key: 1, click: 1, hover: 0.5, type: 0.3 };
const FADE = 0.1;
const playing = new Map();

export function stopAllSfx() {
    playing.forEach(source => {
        try {
            source.stop();
        } catch {
            return;
        }
    });
    playing.clear();
}

function sample(name) {
    if (playing.has(name)) return;
    const buffer = samples[name];
    const limit = MAX_SECONDS[name] || 5;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.9, t);
    if (buffer.duration > limit) {
        gain.gain.setValueAtTime(0.9, t + limit - FADE);
        gain.gain.linearRampToValueAtTime(0, t + limit);
    }
    source.buffer = buffer;
    source.onended = () => playing.delete(name);
    source.connect(gain);
    gain.connect(master);
    playing.set(name, source);
    source.start(t);
    if (buffer.duration > limit) source.stop(t + limit);
}

const synth = {
    hover: () => noise(0.012, 0.05, 7000, 'highpass'),
    click: () => { noise(0.014, 0.18, 2500, 'highpass'); tone(300, 0.05, 'sine', 0.22); },
    key: () => { noise(0.01, 0.1, 4000, 'highpass'); tone(520, 0.05, 'triangle', 0.1); },
    type: () => noise(0.008, 0.06, 5000, 'bandpass', 0, 2),
    glitch: () => {
        noise(0.3, 0.3, 1500, 'highpass');
        for (let i = 0; i < 6; i++) tone(120 + Math.random() * 1800, 0.025, 'square', 0.08, i * 0.045);
        tone(55, 0.25, 'sawtooth', 0.12);
    },
    powerOn: () => { tone(55, 0.9, 'sine', 0.3); noise(0.7, 0.1, 500); noise(0.05, 0.2, 3000, 'highpass'); },
    powerOff: () => { tone(60, 0.45, 'sine', 0.3); noise(0.25, 0.14, 1200); noise(0.04, 0.2, 5000, 'highpass'); },
    blink: () => { noise(0.05, 0.22, 3000, 'bandpass', 0, 3); tone(70, 0.08, 'sine', 0.2); },
    ok: () => { tone(660, 0.08, 'sine', 0.12); tone(990, 0.12, 'sine', 0.1, 0.08); },
};

export const sfx = {
    ...Object.fromEntries(Object.keys(synth).map(name => [
        name,
        () => {
            if (!ready()) return;
            if (ONCE.has(name)) {
                if (fired.has(name)) return;
                fired.add(name);
            }
            if (debug) console.info('[sfx] play', name, samples[name] ? 'sample' : 'synth');
            if (samples[name]) sample(name);
            else synth[name]();
        },
    ])),
    glitchTick: () => {
        if (!ready() || !loaded || samples.glitch) return;
        noise(0.035, 0.22, 2000 + Math.random() * 3000, 'highpass');
        tone(80 + Math.random() * 1400, 0.02, 'square', 0.06);
    },
};