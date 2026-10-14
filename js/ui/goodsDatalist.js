import { getGoodsData, getReputationData } from '../core/state.js';
import { isGoodUnlocked } from '../core/reputationCalc.js';
import { getPlayerRanks } from '../panels/reputationPanel.js';

/**
 * Resolves a typed search string to a good id, or null (meaning "no match"
 * / "auto" depending on context - callers interpret the null case themselves).
 */
export function resolveGoodSelection(inputValue) {
  const trimmed = inputValue.trim();
  if (!trimmed) return null;
  const goodsData = getGoodsData();
  const match = goodsData.goods.find(g => g.name.toLowerCase() === trimmed.toLowerCase());
  return match ? match.id : null;
}

/**
 * Populates the single shared <datalist id="goods-datalist">. This lives
 * here (not in any one panel) because Route Finder's Specific mode, Good
 * Explorer, and Loop Planner all reference the same physical datalist.
 */
export function populateGoodsDatalist() {
  const playerRanks = getPlayerRanks();
  const reputationData = getReputationData();
  const goodsData = getGoodsData();
  const datalist = document.getElementById('goods-datalist');
  datalist.innerHTML = '';
  goodsData.goods.forEach(good => {
    if (!isGoodUnlocked(good.id, playerRanks, reputationData)) return; // don't offer locked goods
    if (good.basePrice === null) return; // no confirmed price, can't compute
    const opt = document.createElement('option');
    opt.value = good.name;
    datalist.appendChild(opt);
  });
}

/** Keeps the datalist in sync with reputation rank changes, wherever those selects live. */
export function wireGoodsDatalistReactivity() {
  document.querySelectorAll('.faction-rank-select').forEach(select => {
    select.addEventListener('change', populateGoodsDatalist);
  });
}