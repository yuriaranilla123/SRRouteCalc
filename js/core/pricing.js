import { findGood, findCity, isLocallyProduced, sourcedBuyPrice } from './lookup.js';
import { supplyDemandAmount } from './distanceBonus.js';
import { religionLines } from './religionLines.js';
import { traitLines, languageLines, sellBonusLines, reputationDiscountLines, eventLines } from './modifierLines.js';

export function computePriceBreakdown(goodId, cityId, context, opts, isSell) {
    const { goodsData, citiesData, modifiersData } = opts;
    const good = findGood(goodsData, goodId);
    const city = findCity(citiesData, cityId);
    if (city.traits.includes('Ruined City') || good.basePrice === null) return null;
    if (!isSell && good.originOnly && !isLocallyProduced(city, good.id)) return null;
    if (!isSell && good.buyable === false) {
        const price = sourcedBuyPrice(good, cityId);
        return price === null ? null : { base: price, lines: [], total: price };
    }

    const base = good.basePrice;
    const sign = isSell ? 1 : -1;
    const lines = [];

    const distance = supplyDemandAmount(base, city, good, modifiersData, citiesData);
    if (distance !== null) lines.push({ label: 'Distance Bonus', amount: distance });

    lines.push(
        ...traitLines(base, good, city, context, modifiersData, sign),
        ...religionLines(base, good, city, context, modifiersData, sign),
        ...languageLines(base, city, context, modifiersData, sign),
        ...(isSell ? sellBonusLines(base, good, context, modifiersData) : reputationDiscountLines(base, city, context, opts)),
        ...eventLines(base, good, city, opts)
    );

    const total = lines.reduce((sum, l) => sum + l.amount, base);
    return { base, lines, total: Math.round(total * 100) / 100 };
}

export function computeBuyPrice(goodId, cityId, context, opts) {
    const breakdown = computePriceBreakdown(goodId, cityId, context, opts, false);
    return breakdown ? breakdown.total : null;
}

export function computeSellPrice(goodId, cityId, context, opts) {
    const breakdown = computePriceBreakdown(goodId, cityId, context, opts, true);
    return breakdown ? breakdown.total : null;
}