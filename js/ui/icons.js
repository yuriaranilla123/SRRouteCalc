const LOCAL_ICON_BASE = 'assets/icons/';
const REMOTE_ICON_BASE = '';

let base = LOCAL_ICON_BASE;

const T = 'City Trait/';
const R = 'Religious Building/';
const AN = 'Animal/Non-Robux/';
const AR = 'Animal/Robux/';

export const ICONS = {
    culture: {
        Byzantine: 'Culture/Byzantine.png',
        Syriac: 'Culture/Syriac.png',
        Persian: 'Culture/Persian.png',
        Sogdian: 'Culture/Sogdian.png',
        'Han Chinese': 'Culture/Han Chinese.png',
        Arab: 'Culture/Arabic.png',
    },
    religion: {
        Christianity: `${R}Church.png`,
        Judaism: `${R}Synagogue.png`,
        Zoroastrianism: `${R}Fire Temple.png`,
        Manichaeism: `${R}Temple of Light.png`,
        'Mahayana Buddhism': `${R}Mahayana Monastery.png`,
        Islam: `${R}Mosque.png`,
    },
    event: {
        drought: 'Event/Drought.png',
        harvest: 'Event/Harvest.png',
        conflict: 'Event/Conflict.png',
        festival: 'Event/Festival.png',
    },
    bag: {
        small_satchel: 'Bag/Small Satchel.png',
        large_satchel: 'Bag/Large Satchel.png',
        frame_pack: 'Bag/Frame Pack.png',
        basket_backpack: 'Bag/Basket Backpack.png',
        concealed_storage: 'Bag/Concealed Storage.png',
    },
    animal: {
        dromedary_camel: `${AN}Dromedary Camel.png`,
        maroon_bactrian_camel: `${AN}Maroon Bactrian Camel.png`,
        bactrian_camel: `${AN}Tan Bactrian Camel.png`,
        pack_mule: `${AN}Pack Mule.png`,
        dzungarian_horse: `${AN}Dzungarian Horse.png`,
        indian_elephant: `${AN}Indian Elephant.png`,
        majaheem_camel: `${AR}Majaheem Camel.png`,
        black_bactrian_camel: `${AR}Black Bactrian Camel.png`,
        royal_bactrian_camel: `${AR}Royal Bactrian Camel.png`,
        saddle_mule: `${AR}Saddle Mule.png`,
        white_nisean_horse: `${AR}White Nisean Horse.png`,
        red_chestnut_nisean_horse: `${AR}Red Chestnut Nisean Horse.png`,
        black_nisean_horse: `${AR}Black Nisean Horse.png`,
        storm_grey_nisean_horse: `${AR}Storm Grey Nisean Horse.png`,
        han_heavenly_horse: `${AR}Heavenly Horse.png`,
        royal_indian_elephant: `${AR}Royal Indian Elephant.png`,
        sasanian_elephant: `${AR}Sasanian Elephant.png`,
    },
    trait: {
        'Capital City': `${T}Capital City.png`,
        'Cosmopolitan City': `${T}Cosmopolitan City.png`,
        'Desert City': `${T}Desert City.png`,
        'Earthquake Prone City': `${T}Earthquake-Prone City.png`,
        'Fertile City': `${T}Fertile City.png`,
        'Fine Tapestry City': `${T}Fine Tapestry City.png`,
        'Frontier City': `${T}Frontier City.png`,
        'Homogenous City': `${T}Homogenous City.png`,
        'Oasis City': `${T}Oasis City.png`,
        'Pentarchy City': `${T}Pentarchy City.png`,
        'Port City': `${T}Port City.png`,
        'Ruined City': `${T}Ruined City.png`,
    },
    good: {},
    language: `${T}Language.png`,
    quest: 'Quest Money.png',
    site: 'SRRouteCalcIcon.png',
};

const GOOD_FOLDERS = {
    Agriculture: ['barley', 'beeswax', 'dried_fish', 'honey', 'milled_grain', 'olive_oil', 'picked_olives', 'unhulled_barley', 'unhulled_wheat', 'wheat'],
    Craft: ['marble_statues', 'tools', 'weapons'],
    Household: ['books', 'candles', 'clay', 'earthenware', 'glassware', 'minakari_ware', 'paper', 'sancai_dragon_ware', 'sogdian_ewer'],
    Metal: ['copper_ingot', 'copper_ore', 'iron_ingot', 'iron_ore'],
    Spices: ['coriander', 'frankincense', 'myrrh', 'saffron', 'sea_salt', 'sesame'],
    Textile: ['byzantine_silk', 'cotton_yarn', 'cotton', 'hides', 'leather', 'linen', 'persian_carpets', 'wool'],
};

for (const [folder, ids] of Object.entries(GOOD_FOLDERS)) {
    for (const id of ids) {
        const name = id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
        ICONS.good[id] = `Goods/${folder}/${name}.png`;
    }
}

const RELIGION_LINES = {
    'Church Hospitality': 'Christianity',
    'Brothers in Christ': 'Christianity',
    'Brothers In Christ': 'Christianity',
    'Sassanid State Religion': 'Zoroastrianism',
    'Spark of Light': 'Manichaeism',
    'Illuminated Doctrine': 'Manichaeism',
    'Trusted Caravan': 'Islam',
    'House of Knowledge': 'Islam',
    'Literature and Wisdom': 'Mahayana Buddhism',
};

const EVENT_WORDS = [['Drought', 'drought'], ['Harvest', 'harvest'], ['Conflict', 'conflict'], ['Festival', 'festival']];

export function iconUrl(path) {
    return path ? encodeURI(base + path) : null;
}

export function iconsOn() {
    return document.documentElement.dataset.icons === 'on';
}

export function lineIconPath(label) {
    if (ICONS.trait[label]) return ICONS.trait[label];
    if (/^(Broken|Proficient|Fluent|Native) in /.test(label)) return ICONS.language;
    if (RELIGION_LINES[label]) return ICONS.religion[RELIGION_LINES[label]];
    const event = EVENT_WORDS.find(([word]) => label.includes(word));
    return event ? ICONS.event[event[1]] : null;
}

export function goodIconPathByName(name) {
    return ICONS.good[String(name).toLowerCase().replace(/ /g, '_')] || null;
}

export function withGoodIcon(goodId, text) {
    if (!iconsOn()) return text;
    const url = iconUrl(ICONS.good[goodId]);
    return url ? `<span class="with-icon"><img class="icon" src="${url}" alt="" loading="lazy"><span class="icon-text">${text}</span></span>` : text;
}

export function lineIconHtml(label) {
    if (!iconsOn()) return '';
    const url = iconUrl(lineIconPath(label));
    return url ? `<img class="icon" src="${url}" alt="" loading="lazy">` : '';
}

export function selectIconPath(select, value) {
    if (!select || !value) return null;
    if (select.id === 'culture') return ICONS.culture[value] || null;
    if (select.id === 'religion') return ICONS.religion[value] || null;
    if (select.id === 'event-type') return ICONS.event[value] || null;
    if (select.id === 'bag-select') return ICONS.bag[value] || null;
    if (select.classList && select.classList.contains('animal-select')) return ICONS.animal[value] || null;
    return null;
}

export function makeIcon(url) {
    const img = document.createElement('img');
    img.className = 'icon';
    img.alt = '';
    img.loading = 'lazy';
    img.src = url;
    return img;
}

function labelFor(select) {
    if (select.id === 'bag-select' || select.classList.contains('animal-select')) {
        const slot = select.closest('.caravan-slot');
        return slot ? slot.querySelector('.field-label') : null;
    }
    return select.closest('label');
}

function hostFor(label) {
    if (label.iconHost) return label.iconHost;
    const wrap = document.createElement('span');
    wrap.className = 'with-icon';
    const img = document.createElement('img');
    img.className = 'icon';
    img.alt = '';
    img.hidden = true;
    const text = document.createElement('span');
    text.className = 'icon-text';
    const lead = [];
    for (const node of label.childNodes) {
        if (node.nodeType !== 3 && node.tagName !== 'STRONG') break;
        lead.push(node);
    }
    if (label.classList.contains('field-label')) lead.splice(0, lead.length, ...label.childNodes);
    text.append(...lead);
    wrap.append(img, text);
    label.prepend(wrap);
    label.iconHost = img;
    return img;
}

function paintLabel(label, path) {
    if (!label) return;
    const img = hostFor(label);
    const url = iconsOn() ? iconUrl(path) : null;
    if (url) {
        if (img.getAttribute('src') !== url) img.src = url;
        img.hidden = false;
    } else {
        img.hidden = true;
    }
}

export function refreshLabelIcons() {
    ['culture', 'religion', 'event-type', 'bag-select'].forEach(id => {
        const select = document.getElementById(id);
        if (select) paintLabel(labelFor(select), selectIconPath(select, select.value));
    });
    document.querySelectorAll('.animal-select').forEach(select => paintLabel(labelFor(select), selectIconPath(select, select.value)));
    paintLabel(document.querySelector('.quest-money-result'), ICONS.quest);
    paintLabel(document.querySelector('.site-header h1'), ICONS.site);
}

export function applyIcons() {
    const root = document.documentElement;
    const toggle = document.getElementById('show-icons');
    const position = document.getElementById('icon-position');
    root.dataset.icons = toggle && toggle.checked ? 'on' : 'off';
    root.dataset.iconPos = position && ['left', 'right', 'top', 'bottom'].includes(position.value) ? position.value : 'left';
    refreshLabelIcons();
}

function swapExtension(img) {
    const src = img.getAttribute('src') || '';
    if (img.dataset.alt || !/\.(png|webp)$/.test(src)) return false;
    img.dataset.alt = '1';
    img.src = src.endsWith('.png') ? src.replace(/\.png$/, '.webp') : src.replace(/\.webp$/, '.png');
    return true;
}

function useRemote(img) {
    const src = img.getAttribute('src') || '';
    if (!REMOTE_ICON_BASE || img.dataset.retried || !src.startsWith(LOCAL_ICON_BASE)) return false;
    img.dataset.retried = '1';
    base = REMOTE_ICON_BASE;
    img.src = REMOTE_ICON_BASE + src.slice(LOCAL_ICON_BASE.length);
    return true;
}

export function wireIcons() {
    document.addEventListener('error', e => {
        const img = e.target;
        if (!img || !img.classList || !img.classList.contains('icon')) return;
        if (swapExtension(img) || useRemote(img)) return;
        img.hidden = true;
    }, true);
    document.addEventListener('change', applyIcons);
    applyIcons();
}