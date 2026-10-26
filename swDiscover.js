(function (root) {
    const SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
    const HTML_REF = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    const MODULE_REF = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;
    const FILE_REF = /["']((?:\.{0,2}\/)?[\w\-.]+(?:\/[\w\-.]+)*\/[\w\-.]+\.(?:css|json|js|mjs))["']/g;

    function resolve(spec, base) {
        if (SCHEME.test(spec)) return null;
        try {
            return new URL(spec, base).href.split('#')[0].split('?')[0];
        } catch {
            return null;
        }
    }

    function discover(text, kind, fromUrl, pageUrl) {
        const found = new Set();
        const add = (spec, base) => {
            const url = resolve(spec, base);
            if (url) found.add(url);
        };
        if (kind === 'html') {
            for (const m of text.matchAll(HTML_REF)) add(m[1], pageUrl);
        } else if (kind === 'js') {
            const modules = new Set();
            for (const m of text.matchAll(MODULE_REF)) {
                modules.add(m[1]);
                add(m[1], fromUrl);
            }
            for (const m of text.matchAll(FILE_REF)) {
                if (!modules.has(m[1])) add(m[1], pageUrl);
            }
        }
        return [...found];
    }

    root.srrcDiscover = discover;
})(typeof self !== 'undefined' ? self : globalThis);