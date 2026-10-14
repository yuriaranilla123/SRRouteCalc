// AGPLv3 section 13 expects the site to offer its source code, so the GitHub url should be set when known.
const CREDITS = {
    project: { name: 'SRRouteCalc', license: 'AGPLv3 or later', author: 'Yuri123_YT (yuriaranilla_123)' },
    links: [
        { label: 'Source code (GitHub)', url: 'https://github.com/yuriaranilla123/SRRouteCalc' },
        { label: 'Ko-fi', url: 'https://ko-fi.com/yuriaranilla123' },
    ],
    sources: [
        { label: 'SR:TS Information Hub', url: 'https://srts-infohub.framer.wiki/' },
        { label: 'SR:TS Fandom wiki', url: 'https://srtsimulator.fandom.com/wiki/Silk_Road_Trading_Simulator_Wiki' },
    ],
    people: [
        { name: 'Mushikachi (@Shadow_EXE1928alt)', role: 'Owner of the SR:TS Information Hub and the SR:TS Fandom wiki; credited for both and for more accurate info than the Fandom wiki. Gave permission to use the Information Hub\'s colors and Caudex Serif font for the SR:TS Information Hub Style.' },
        { name: 'Regret (@Rainingstream)', role: 'Contributor, for giving info.' },
    ],
};

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = ({ label, url }) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : esc(label);

export function renderCredits() {
    const el = document.getElementById('credits');
    if (!el) return;
    const [hub, fandom] = CREDITS.sources.map(link);
    const people = CREDITS.people
        .map(p => `<li><strong>${esc(p.name)}</strong> - ${esc(p.role)}</li>`)
        .join('');
    el.innerHTML = `
      <summary>Credits &amp; About</summary>
      <p>${esc(CREDITS.project.name)} by ${esc(CREDITS.project.author)}. License: ${esc(CREDITS.project.license)}.</p>
      <p>${CREDITS.links.map(link).join(' · ')}</p>
      <p>Data comes from the ${hub} (primary) and the ${fandom}. The game's official support team confirmed the developers don't partner with calculators but don't discourage fan-made ones. Some values are unconfirmed placeholders pending community verification.</p>
      <ul>${people}</ul>`;
}