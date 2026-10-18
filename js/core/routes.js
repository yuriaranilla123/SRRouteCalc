import { computeDistance } from './travelCalc.js';
import { computeBuyPrice, computeSellPrice } from './pricing.js';
import { isLocallyProduced } from './lookup.js';

function canBuy(good, cityId, context, opts) {
    if (context.allowImports) return true;
    const city = opts.citiesData.cities.find(c => c.id === cityId);
    return !!city && isLocallyProduced(city, good.id, good);
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
            if (!canBuy(good, buyCity, context, opts)) continue;
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
            if (!canBuy(good, buyCity.id, context, opts)) continue;
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
        if (!canBuy(good, buyCityId, context, opts)) continue;
        const result = computeTripProfit(good.id, buyCityId, sellCityId, quantity, context, opts);
        if (result.possible && (!best || result.totalProfit > best.totalProfit)) {
            best = result;
        }
    }
    return best;
}