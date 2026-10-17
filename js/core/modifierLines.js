import { amplifyForReligion, faithLevel } from './religionLines.js';

function cityTraitApplies(rule, city, good, context) {
    switch (rule.appliesTo) {
        case 'all_goods':
            return true;
        case 'foreign_culture_trader':
            return !!(context.culture && context.culture !== city.culture);
        case `religion:${context.religion}`:
            return true;
        case 'luxury':
            return good.originOnly === true || good.category === 'luxury';
        case 'none':
            return false;
        default:
            if (rule.appliesTo.startsWith('goods:')) {
                return rule.appliesTo.replace('goods:', '').split(',').includes(good.id);
            }
            if (rule.appliesTo.startsWith('category:')) {
                return rule.appliesTo.replace('category:', '').split('_').includes(good.category);
            }
            return false;
    }
}

export function traitLines(base, good, city, context, modifiersData, sign) {
    const lines = [];
    for (const traitName of city.traits) {
        const rule = modifiersData.cityTraits[traitName];
        if (!rule || rule.modifier === null) continue;
        if (!cityTraitApplies(rule, city, good, context)) continue;
        const pct = amplifyForReligion(rule.modifier, city, context, modifiersData);
        lines.push({ label: traitName, amount: sign * Math.floor(pct * base) });
    }
    return lines;
}

export function languageLines(base, city, context, modifiersData, sign) {
    const proficiency = (context.languages && context.languages[city.language]) || 'Broken';
    const entry = modifiersData.languageProficiency[proficiency];
    if (!entry) return [];
    let pct = entry.modifier;
    if (context.religion === 'Judaism' && faithLevel(context) >= 2) {
        pct *= modifiersData.religionModifiers.Judaism.levels['2'].languageModifierMultiplier;
    }
    const amount = sign * Math.floor(pct * base);
    return amount !== 0 ? [{ label: `${proficiency} in ${city.language}`, amount }] : [];
}

export function sellBonusLines(base, good, context, modifiersData) {
    const lines = [];
    if (context.religion === 'Zoroastrianism' && faithLevel(context) >= 3 && ['metal', 'craft'].includes(good.category)) {
        lines.push({
            label: 'Persian Quality',
            amount: Math.floor(modifiersData.religionModifiers.Zoroastrianism.levels['3'].metalCraftSellBonus * base),
        });
    }
    if (context.hasNobility) lines.push({ label: 'Nobility', amount: Math.floor(0.20 * base) });
    const owned = context.guildPerks;
    if (owned) {
        modifiersData.guildPerks.perks
            .filter(p => p.effect === 'sellBonus' && owned[p.id] && (p.rarity === 'any' || p.rarity === good.rarity ||
                (context.matchGameBugs && (p.bugRarities || []).includes(good.rarity))))
            .forEach(p => lines.push({ label: p.name, amount: Math.floor(p.rate * base) }));
    }
    return lines;
}

export function reputationDiscountLines(base, city, context, opts) {
    const cfg = opts.modifiersData.reputationDiscount;
    const ranks = context.playerRanks;
    if (!cfg || !ranks || !opts.reputationData) return [];
    let total = 0;
    for (const f of opts.reputationData.factions) {
        if ((ranks[f.id] || 0) < cfg.minRank) continue;
        const inside = city.empire === f.name;
        if ((cfg.scope[f.id] === 'inside') === inside) total += Math.floor(cfg.rate * base);
    }
    return total ? [{ label: 'Reputation Discount', amount: -total }] : [];
}

export function eventLines(base, good, city, opts) {
    const { modifiersData, activeEvent = null } = opts;
    if (!activeEvent || activeEvent.cityId !== city.id || !modifiersData.events.types) return [];
    const typeInfo = modifiersData.events.types[activeEvent.type];
    const affectsGood = typeInfo && ((typeInfo.categories && typeInfo.categories.includes(good.category)) ||
        (typeInfo.goods && typeInfo.goods.includes(good.id)));
    if (!affectsGood) return [];
    const tier = modifiersData.events.tiers.find(t => t.level === activeEvent.level);
    if (!tier) return [];
    const sign = typeInfo.direction === 'decrease' ? -1 : 1;
    const label = (typeInfo.levelNames && typeInfo.levelNames[activeEvent.level - 1]) || activeEvent.type;
    return [{ label, amount: sign * (tier.flatBase + Math.floor(tier.multiplier * base)) }];
}