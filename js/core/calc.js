import { computeHopCount, computeDistance } from './travelCalc.js';

function interpolateByBase(values, bases, base) {
    const last = bases.length - 1;
    if (base <= bases[0]) return values[0] * base / bases[0];
    if (base >= bases[last]) return values[last];
    let i = 0;
    while (bases[i + 1] < base) i++;
    const a = Math.log(bases[i]);
    const t = (Math.log(base) - a) / (Math.log(bases[i + 1]) - a);
    return values[i] + t * (values[i + 1] - values[i]);
}

function distanceBonus(hops, good, modifiersData) {
    if (!hops) return 0;
    const cfg = modifiersData.distanceBonus;
    if (good.requirement) return Math.round(cfg.exotic.rate * good.basePrice * hops);
    const cap = cfg.grid.length;
    const at = h => interpolateByBase(cfg.grid[h - 1], cfg.bases, good.basePrice);
    if (hops <= cap) return Math.round(at(hops));
    return Math.round(at(cap) + (hops - cap) * (at(cap) - at(cap - 1)));
}

function findGood(goodsData, goodId) {
    const good = goodsData.goods.find(g => g.id === goodId);
    if (!good) throw new Error(`Unknown good id: ${goodId}`);
    return good;
}

function findCity(citiesData, cityId) {
    const city = citiesData.cities.find(c => c.id === cityId);
    if (!city) throw new Error(`Unknown city id: ${cityId}`);
    return city;
}

export function isLocallyProduced(city, goodId, good = null) {
    return city.locallyProduced.includes(goodId) || !!(good && good.sources && good.sources.cities.includes(city.id));
}

function sourcedBuyPrice(good, cityId) {
    return good.sources && good.sources.cities.includes(cityId) ? good.sources.price : null;
}

function nearestProducerHops(good, cityId, citiesData, modifiersData) {
    const real = citiesData.cities.filter(c => c.id !== cityId && isLocallyProduced(c, good.id, good)).map(c => c.id);
    const virtual = modifiersData.distanceBonus.virtualProducers[good.id] || [];
    let min = null;
    for (const id of [...real, ...virtual]) {
        const h = computeHopCount(cityId, id);
        if (h !== null && (min === null || h < min)) min = h;
    }
    return min;
}

function supplyDemandDollar(base, city, good, cityId, modifiersData, citiesData) {
    if (isLocallyProduced(city, good.id, good)) {
        return 0;
    }
    const hops = nearestProducerHops(good, cityId, citiesData, modifiersData);
    if (hops !== null) {
        return distanceBonus(hops, good, modifiersData);
    }

    return Math.floor(modifiersData.supplyDemand.importedMarkup * base);
}

function faithLevel(context) {
    return context.faithLevel || 0;
}

function cityTraitApplies(rule, city, good, context) {
    switch (rule.appliesTo) {
        case 'all_goods':
            return true;
        case 'foreign_culture_trader':
            return !!(context.culture && context.culture !== city.culture);
        case `religion:${context.religion}`:
            return true;
        case 'none':
            return false;
        default:
            if (rule.appliesTo.startsWith('goods:')) {
                return rule.appliesTo.replace('goods:', '').split(',').includes(good.id);
            }
            if (rule.appliesTo.startsWith('category:')) {
                const cats = rule.appliesTo.replace('category:', '').split('_');
                return cats.includes(good.category);
            }
            return false;
    }
}

function cityTraitModifierList(city, good, context, modifiersData) {
    const mods = [];
    for (const traitName of city.traits) {
        const rule = modifiersData.cityTraits[traitName];
        if (!rule || rule.modifier === null) continue;
        if (cityTraitApplies(rule, city, good, context)) mods.push(rule.modifier);
    }
    return mods;
}

function amplifyForReligion(pct, city, context, modifiersData) {
    const rel = modifiersData.religionModifiers[context.religion];
    if (!rel) return pct;
    const level = faithLevel(context);

    if (context.religion === 'Judaism') {
        if (level >= 1 && pct < 0) pct *= rel.levels['1'].cityPenaltyMultiplier;
        if (level >= 3 && pct > 0) pct *= rel.levels['3'].cityTraitBonusMultiplier;
    }
    if (context.religion === 'Christianity') {
        if (level >= 3 && pct < 0) pct *= (1 - rel.levels['3'].cityPenaltyReduction);
    }
    if (context.religion === 'Zoroastrianism') {
        if (level >= 1 && city.culture === 'Byzantine' && pct < 0) pct *= rel.levels['1'].byzantineCityPenaltyMultiplier;
    }
    return pct;
}

function brothersInChristApplies(city) {
    return city.empire !== 'Sasanian Empire';
}

function religionOwnModifiersDollar(base, city, context, modifiersData) {
    const rel = modifiersData.religionModifiers[context.religion];
    if (!rel) return 0;
    const level = faithLevel(context);
    let total = 0;

    if (context.religion === 'Christianity') {
        if (level >= 1 && rel.buildingCities.includes(city.id)) {
            total += Math.floor(rel.levels['1'].capitalOrCosmopolitanBonus * base);
        }
        if (level >= 2 && brothersInChristApplies(city)) {
            total += Math.floor(rel.levels['2'].christianCityBonus * base);
        }
    }
    if (context.religion === 'Zoroastrianism') {
        if (level >= 2 && rel.buildingCities.includes(city.id)) {
            total += Math.floor(rel.levels['2'].fireTempleCityBonus * base);
        }
    }
    return total;
}

function languageDollarModifier(base, context, cityLanguage, modifiersData) {
    const proficiencyLevel = (context.languages && context.languages[cityLanguage]) || 'Broken';
    const entry = modifiersData.languageProficiency[proficiencyLevel];
    if (!entry) return 0;
    let pct = entry.modifier;

    if (context.religion === 'Judaism' && faithLevel(context) >= 2) {
        pct *= modifiersData.religionModifiers.Judaism.levels['2'].languageModifierMultiplier;
    }
    return Math.floor(pct * base);
}

function manichaeismGoodsDollar(base, good, city, context, modifiersData) {
    if (context.religion !== 'Manichaeism') return 0;
    const rel = modifiersData.religionModifiers.Manichaeism;
    if (!rel.buildingCities.includes(city.id)) return 0;

    const level = faithLevel(context);
    let total = 0;
    if (level >= 1) {
        const bonus = rel.levels['1'].goodsBonus;
        if (bonus.goods.includes(good.id)) total += Math.floor(bonus.modifier * base);
    }
    if (level >= 3) {
        const bonus = rel.levels['3'].goodsBonus;
        if (bonus.goods.includes(good.id)) total += Math.floor(bonus.modifier * base);
    }
    return total;
}

function buddhismGoodsDollar(base, good, context, modifiersData) {
    if (context.religion !== 'Mahayana Buddhism') return 0;
    if (faithLevel(context) < 3) return 0;

    const bonus = modifiersData.religionModifiers['Mahayana Buddhism'].levels['3'].goodsBonus;
    const matches = (bonus.goods && bonus.goods.includes(good.id)) ||
        (bonus.categories && bonus.categories.includes(good.category));
    return matches ? Math.floor(bonus.modifier * base) : 0;
}

function traderFavorabilityDollar(base, city, good, context, modifiersData) {
    let total = 0;
    for (const pct of cityTraitModifierList(city, good, context, modifiersData)) {
        total += Math.floor(amplifyForReligion(pct, city, context, modifiersData) * base);
    }
    total += religionOwnModifiersDollar(base, city, context, modifiersData);
    total += languageDollarModifier(base, context, city.language, modifiersData);
    total += manichaeismGoodsDollar(base, good, city, context, modifiersData);
    total += buddhismGoodsDollar(base, good, context, modifiersData);
    return total;
}

function zoroastrianismSellBonus(base, good, context, modifiersData) {
    if (context.religion !== 'Zoroastrianism' || faithLevel(context) < 3) return 0;
    if (!['metal', 'craft'].includes(good.category)) return 0;
    return Math.floor(modifiersData.religionModifiers.Zoroastrianism.levels['3'].metalCraftSellBonus * base);
}

function guildSellBonusLines(base, good, context, modifiersData) {
    const owned = context.guildPerks;
    if (!owned) return [];
    return modifiersData.guildPerks.perks
        .filter(p => p.effect === 'sellBonus' && owned[p.id] && (p.rarity === 'any' || p.rarity === good.rarity))
        .map(p => ({ label: p.name, amount: Math.floor(p.rate * base) }));
}

function nobilityBonus(base, context) {
    return context.hasNobility ? Math.floor(0.20 * base) : 0;
}

function reputationDiscountDollar(base, city, context, opts) {
    const cfg = opts.modifiersData.reputationDiscount;
    const ranks = context.playerRanks;
    if (!cfg || !ranks || !opts.reputationData) return 0;
    let total = 0;
    for (const f of opts.reputationData.factions) {
        if ((ranks[f.id] || 0) < cfg.minRank) continue;
        const inside = city.empire === f.name;
        if ((cfg.scope[f.id] === 'inside') === inside) total += Math.floor(cfg.rate * base);
    }
    return total;
}

function eventDollarModifier(base, good, eventType, eventLevel, modifiersData) {
    if (!eventType || !eventLevel) return 0;
    const typeInfo = modifiersData.events.types && modifiersData.events.types[eventType];
    if (!typeInfo) return 0;

    const affectsGood = (typeInfo.categories && typeInfo.categories.includes(good.category)) ||
        (typeInfo.goods && typeInfo.goods.includes(good.id));
    if (!affectsGood) return 0;

    const tier = modifiersData.events.tiers.find(t => t.level === eventLevel);
    if (!tier) return 0;

    const sign = typeInfo.direction === 'decrease' ? -1 : 1;
    return sign * (tier.flatBase + Math.floor(tier.multiplier * base));
}

export function computeBuyPrice(goodId, cityId, context, opts) {
    const { goodsData, citiesData, modifiersData, activeEvent = null } = opts;
    const good = findGood(goodsData, goodId);
    const city = findCity(citiesData, cityId);

    if (city.traits.includes('Ruined City')) return null;

    const base = good.basePrice;
    if (base === null) return null;
    if (good.originOnly && !isLocallyProduced(city, good.id)) return null;
    if (good.buyable === false) return sourcedBuyPrice(good, cityId);

    let total = base;
    total += supplyDemandDollar(base, city, good, cityId, modifiersData, citiesData);
    total -= traderFavorabilityDollar(base, city, good, context, modifiersData);
    total -= reputationDiscountDollar(base, city, context, opts);

    const eventHere = activeEvent && activeEvent.cityId === cityId;
    total += eventDollarModifier(base, good, eventHere ? activeEvent.type : null, eventHere ? activeEvent.level : null, modifiersData);

    return Math.round(total * 100) / 100;
}

export function computeSellPrice(goodId, cityId, context, opts) {
    const { goodsData, citiesData, modifiersData, activeEvent = null } = opts;
    const good = findGood(goodsData, goodId);
    const city = findCity(citiesData, cityId);

    if (city.traits.includes('Ruined City')) return null;

    const base = good.basePrice;
    if (base === null) return null;

    let total = base;
    total += supplyDemandDollar(base, city, good, cityId, modifiersData, citiesData);
    total += traderFavorabilityDollar(base, city, good, context, modifiersData);
    total += zoroastrianismSellBonus(base, good, context, modifiersData);
    total += nobilityBonus(base, context);
    total += guildSellBonusLines(base, good, context, modifiersData).reduce((sum, l) => sum + l.amount, 0);

    const eventHere = activeEvent && activeEvent.cityId === cityId;
    total += eventDollarModifier(base, good, eventHere ? activeEvent.type : null, eventHere ? activeEvent.level : null, modifiersData);

    return Math.round(total * 100) / 100;
}

export function computePriceBreakdown(goodId, cityId, context, opts, isSell) {
    const { goodsData, citiesData, modifiersData, activeEvent = null } = opts;
    const good = findGood(goodsData, goodId);
    const city = findCity(citiesData, cityId);
    if (city.traits.includes('Ruined City') || good.basePrice === null) return null;
    if (!isSell && good.originOnly && !isLocallyProduced(city, good.id)) return null;
    if (!isSell && good.buyable === false) {
        const price = sourcedBuyPrice(good, cityId);
        return price === null ? null : { base: price, lines: [], total: price };
    }

    const base = good.basePrice;
    const lines = [];
    let total = base;
    const favSign = isSell ? 1 : -1;

    if (!isLocallyProduced(city, good.id, good)) {
        const hops = nearestProducerHops(good, cityId, citiesData, modifiersData);
        const amt = hops !== null
            ? distanceBonus(hops, good, modifiersData)
            : Math.floor(modifiersData.supplyDemand.importedMarkup * base);
        lines.push({ label: 'Distance Bonus', amount: amt });
        total += amt;
    }

    for (const traitName of city.traits) {
        const rule = modifiersData.cityTraits[traitName];
        if (!rule || rule.modifier === null) continue;
        if (!cityTraitApplies(rule, city, good, context)) continue;
        const pct = amplifyForReligion(rule.modifier, city, context, modifiersData);
        const amt = favSign * Math.floor(pct * base);
        lines.push({ label: traitName, amount: amt });
        total += amt;
    }

    const rel = modifiersData.religionModifiers[context.religion];
    const level = faithLevel(context);
    if (rel && context.religion === 'Christianity') {
        if (level >= 1 && rel.buildingCities.includes(city.id)) {
            const amt = favSign * Math.floor(rel.levels['1'].capitalOrCosmopolitanBonus * base);
            lines.push({ label: 'Church Hospitality', amount: amt });
            total += amt;
        }
        if (level >= 2 && brothersInChristApplies(city)) {
            const amt = favSign * Math.floor(rel.levels['2'].christianCityBonus * base);
            lines.push({ label: 'Brothers in Christ', amount: amt });
            total += amt;
        }
    }
    if (rel && context.religion === 'Zoroastrianism' && level >= 2 && rel.buildingCities.includes(city.id)) {
        const amt = favSign * Math.floor(rel.levels['2'].fireTempleCityBonus * base);
        lines.push({ label: 'Sassanid State Religion', amount: amt });
        total += amt;
    }

    if (context.religion === 'Manichaeism' && rel && rel.buildingCities.includes(city.id)) {
        if (level >= 1 && rel.levels['1'].goodsBonus.goods.includes(good.id)) {
            const amt = favSign * Math.floor(rel.levels['1'].goodsBonus.modifier * base);
            lines.push({ label: rel.levels['1'].name, amount: amt });
            total += amt;
        }
        if (level >= 3 && rel.levels['3'].goodsBonus.goods.includes(good.id)) {
            const amt = favSign * Math.floor(rel.levels['3'].goodsBonus.modifier * base);
            lines.push({ label: rel.levels['3'].name, amount: amt });
            total += amt;
        }
    }
    if (context.religion === 'Mahayana Buddhism' && level >= 3) {
        const bonus = modifiersData.religionModifiers['Mahayana Buddhism'].levels['3'].goodsBonus;
        const matches = bonus.goods.includes(good.id) || bonus.categories.includes(good.category);
        if (matches) {
            const amt = favSign * Math.floor(bonus.modifier * base);
            lines.push({ label: 'Literature and Wisdom', amount: amt });
            total += amt;
        }
    }

    const proficiency = (context.languages && context.languages[city.language]) || 'Broken';
    const langEntry = modifiersData.languageProficiency[proficiency];
    if (langEntry) {
        let pct = langEntry.modifier;
        if (context.religion === 'Judaism' && level >= 2) {
            pct *= modifiersData.religionModifiers.Judaism.levels['2'].languageModifierMultiplier;
        }
        const amt = favSign * Math.floor(pct * base);
        if (amt !== 0) {
            lines.push({ label: `${proficiency} in ${city.language}`, amount: amt });
            total += amt;
        }
    }

    if (isSell) {
        if (context.religion === 'Zoroastrianism' && level >= 3 && ['metal', 'craft'].includes(good.category)) {
            const amt = Math.floor(modifiersData.religionModifiers.Zoroastrianism.levels['3'].metalCraftSellBonus * base);
            lines.push({ label: 'Persian Quality', amount: amt });
            total += amt;
        }
        if (context.hasNobility) {
            const amt = Math.floor(0.20 * base);
            lines.push({ label: 'Nobility', amount: amt });
            total += amt;
        }
        for (const l of guildSellBonusLines(base, good, context, modifiersData)) {
            lines.push(l);
            total += l.amount;
        }
    }

    if (!isSell) {
        const amt = reputationDiscountDollar(base, city, context, opts);
        if (amt) {
            lines.push({ label: 'Reputation Discount', amount: -amt });
            total -= amt;
        }
    }

    const eventHere = activeEvent && activeEvent.cityId === cityId;
    if (eventHere && modifiersData.events.types) {
        const typeInfo = modifiersData.events.types[activeEvent.type];
        const affectsGood = typeInfo && ((typeInfo.categories && typeInfo.categories.includes(good.category)) ||
            (typeInfo.goods && typeInfo.goods.includes(good.id)));
        if (affectsGood) {
            const tier = modifiersData.events.tiers.find(t => t.level === activeEvent.level);
            if (tier) {
                const sign = typeInfo.direction === 'decrease' ? -1 : 1;
                const amt = sign * (tier.flatBase + Math.floor(tier.multiplier * base));
                const label = (typeInfo.levelNames && typeInfo.levelNames[activeEvent.level - 1]) || activeEvent.type;
                lines.push({ label, amount: amt });
                total += amt;
            }
        }
    }

    return { base, lines, total: Math.round(total * 100) / 100 };
}

export function computeTripProfit(goodId, buyCityId, sellCityId, quantity, context, opts) {
    const buyPrice = computeBuyPrice(goodId, buyCityId, context, opts);
    const sellPrice = computeSellPrice(goodId, sellCityId, context, opts);

    if (buyPrice === null || sellPrice === null) {
        return { possible: false, reason: 'Good not tradeable in one of these cities.' };
    }

    const profitPerUnit = sellPrice - buyPrice;
    const totalCost = buyPrice * quantity;
    const totalRevenue = sellPrice * quantity;
    const totalProfit = totalRevenue - totalCost;

    return {
        possible: true,
        goodId,
        buyCityId,
        sellCityId,
        buyPrice,
        sellPrice,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        quantity,
        totalCost: Math.round(totalCost * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
    };
}

export function allTradesBetween(cityAId, cityBId, quantity, context, opts) {
    const { goodsData } = opts;
    const results = [];

    for (const good of goodsData.goods) {
        for (const [buyCity, sellCity] of [[cityAId, cityBId], [cityBId, cityAId]]) {
            const result = computeTripProfit(good.id, buyCity, sellCity, quantity, context, opts);
            if (result.possible && result.totalProfit > 0) {
                results.push(result);
            }
        }
    }
    return results.sort((a, b) => b.totalProfit - a.totalProfit);
}

export function bestRoutePerGood(quantity, context, opts, speed = 0) {
    const { goodsData, citiesData } = opts;
    const seconds = new Map();
    const minutes = (a, b) => {
        const key = `${a}|${b}`;
        if (!seconds.has(key)) {
            const d = computeDistance(a, b);
            seconds.set(key, d === null || !speed ? null : d / speed / 60);
        }
        return seconds.get(key);
    };
    const score = r => {
        const m = minutes(r.buyCityId, r.sellCityId);
        return m ? r.totalProfit / m : null;
    };
    const better = (a, b) => {
        if (!b) return true;
        const sa = a.rankScore;
        const sb = b.rankScore;
        if (sa !== null && sb !== null) return sa > sb;
        if (sa !== null || sb !== null) return sa !== null;
        return a.totalProfit > b.totalProfit;
    };
    const results = [];

    for (const good of goodsData.goods) {
        let best = null;
        for (const buyCity of citiesData.cities) {
            for (const sellCity of citiesData.cities) {
                if (buyCity.id === sellCity.id) continue;
                const result = computeTripProfit(good.id, buyCity.id, sellCity.id, quantity, context, opts);
                if (!result.possible || result.totalProfit <= 0) continue;
                result.rankScore = score(result);
                if (better(result, best)) best = result;
            }
        }
        if (best) results.push(best);
    }

    return results.sort((a, b) => (better(a, b) ? -1 : 1));
}

export function bestTradeForDirection(buyCityId, sellCityId, quantity, context, opts) {
    let best = null;
    for (const good of opts.goodsData.goods) {
        const result = computeTripProfit(good.id, buyCityId, sellCityId, quantity, context, opts);
        if (result.possible && (!best || result.totalProfit > best.totalProfit)) {
            best = result;
        }
    }
    return best;
}