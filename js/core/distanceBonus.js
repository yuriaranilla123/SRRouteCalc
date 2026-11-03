import { computeHopCount } from './travelCalc.js';
import { isLocallyProduced } from './lookup.js';

const producerMemo = new WeakMap();

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

function bonusForHops(hops, good, modifiersData) {
    if (!hops) return 0;
    const cfg = modifiersData.distanceBonus;
    if (good.requirement) return Math.round(cfg.exotic.rate * good.basePrice * hops);
    const cap = cfg.grid.length;
    const at = h => interpolateByBase(cfg.grid[h - 1], cfg.bases, good.basePrice);
    if (hops <= cap) return Math.round(at(hops));
    return Math.round(at(cap) + (hops - cap) * (at(cap) - at(cap - 1)));
}

function searchProducerHops(good, cityId, citiesData, modifiersData) {
    const real = citiesData.cities.filter(c => c.id !== cityId && isLocallyProduced(c, good.id, good)).map(c => c.id);
    const virtual = modifiersData.distanceBonus.virtualProducers[good.id] || [];
    let min = null;
    for (const id of [...real, ...virtual]) {
        const h = computeHopCount(cityId, id);
        if (h !== null && (min === null || h < min)) min = h;
    }
    return min;
}

function nearestProducerHops(good, cityId, citiesData, modifiersData) {
    let memo = producerMemo.get(modifiersData);
    if (!memo || memo.cities !== citiesData) {
        memo = { cities: citiesData, map: new Map() };
        producerMemo.set(modifiersData, memo);
    }
    const key = `${good.id}|${cityId}`;
    if (!memo.map.has(key)) memo.map.set(key, searchProducerHops(good, cityId, citiesData, modifiersData));
    return memo.map.get(key);
}

export function supplyDemandAmount(base, city, good, modifiersData, citiesData) {
    if (isLocallyProduced(city, good.id, good)) return null;
    const hops = nearestProducerHops(good, city.id, citiesData, modifiersData);
    return hops !== null
        ? bonusForHops(hops, good, modifiersData)
        : Math.floor(modifiersData.supplyDemand.importedMarkup * base);
}