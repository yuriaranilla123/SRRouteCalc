export function spanFor(height, gap) {
    return Math.max(1, Math.ceil(height + gap));
}

function frameGap() {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-gap'));
    return Number.isFinite(value) ? value : 24;
}

export function wireDynamicFrames() {
    const main = document.querySelector('main');
    const root = document.documentElement;
    let queued = false;

    function layout() {
        queued = false;
        const panels = main.querySelectorAll(':scope > .panel');
        if (root.dataset.dynamicFrames !== 'on') {
            panels.forEach(p => { p.style.gridRowEnd = ''; });
            return;
        }
        const gap = frameGap();
        panels.forEach(p => { p.style.gridRowEnd = `span ${spanFor(p.getBoundingClientRect().height, gap)}`; });
    }

    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(layout);
    }

    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(schedule);
        main.querySelectorAll(':scope > .panel').forEach(p => observer.observe(p));
        observer.observe(main);
    }
    new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['style', 'data-dynamic-frames'] });
    window.addEventListener('resize', schedule);
    schedule();
}