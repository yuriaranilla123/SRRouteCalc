import { getGoodsData } from './state.js';
import { bestTradeForDirection } from './calc.js';
import { isGoodUnlocked } from './reputationCalc.js';

/**
 * Same as calc.js's bestTradeForDirection, but excludes goods the player
 * hasn't unlocked yet. Powers both the "Return Cargo (Best)" trades-table
 * column and Specific mode's Best Loop toggle.
 */
export function bestUnlockedTradeForDirection(buyCityId, sellCityId, quantity, context, opts, playerRanks, reputationData) {
    const unlockedGoods = opts.goodsData.goods.filter(g => isGoodUnlocked(g.id, playerRanks, reputationData));
    const filteredOpts = { ...opts, goodsData: { ...opts.goodsData, goods: unlockedGoods } };
    return bestTradeForDirection(buyCityId, sellCityId, quantity, context, filteredOpts);
}

/**
 * Mutates each trade in `trades`, attaching a `.returnCargo` field
 * ({name, profitPerUnit} or null) for the reverse direction (sell city
 * back to buy city), sized by that trade's own quantity.
 */
export function attachReturnCargo(trades, context, opts, playerRanks, reputationData) {
    const goodsData = getGoodsData();
    trades.forEach(trade => {
        const best = bestUnlockedTradeForDirection(trade.sellCityId, trade.buyCityId, trade.quantity, context, opts, playerRanks, reputationData);
        trade.returnCargo = best
            ? { name: goodsData.goods.find(g => g.id === best.goodId).name, profitPerUnit: best.profitPerUnit }
            : null;
    });
}