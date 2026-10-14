import { getCitiesData, getGoodsData, getCalcOpts, getReputationData } from '../core/state.js';
import { allTradesBetween } from '../core/calc.js';
import { isGoodUnlocked } from '../core/reputationCalc.js';
import { getContext } from './traderPanel.js';
import { getPlayerRanks } from './reputationPanel.js';
import { renderTable, clearTable } from './tradesTable.js';
import { money } from '../core/money.js';
import { attachReturnCargo } from '../core/returnCargo.js';
import { attachTravelStats } from '../core/travelCalc.js';
import { getCurrentSpeed } from './caravanPanel.js';

function renderResultCard(best) {
  const el = document.getElementById('result-card');
  if (!best) {
    el.innerHTML = `<p class="empty-state">No profitable trade found between these cities with the current trader profile.</p>`;
    return;
  }
  const goodsData = getGoodsData();
  const citiesData = getCitiesData();
  const good = goodsData.goods.find(g => g.id === best.goodId);
  const buyCity = citiesData.cities.find(c => c.id === best.buyCityId);
  const sellCity = citiesData.cities.find(c => c.id === best.sellCityId);

  el.innerHTML = `
    <div class="result-good">${good.name}</div>
    <div class="result-route">
      <span class="route-city">${buyCity.name}</span>
      <span class="route-arrow">buy → sell</span>
      <span class="route-city">${sellCity.name}</span>
    </div>
    <div class="result-figures">
      <div><span class="figure-label">Buy price</span><span class="figure-value">${money(best.buyPrice)}</span></div>
      <div><span class="figure-label">Sell price</span><span class="figure-value">${money(best.sellPrice)}</span></div>
      <div><span class="figure-label">Profit / unit</span><span class="figure-value profit">${money(best.profitPerUnit)}</span></div>
      <div><span class="figure-label">Total profit (×${best.quantity})</span><span class="figure-value profit">${money(best.totalProfit)}</span></div>
    </div>
  `;
}

export function runCalculation() {
  const cityA = document.getElementById('city-a').value;
  const cityB = document.getElementById('city-b').value;
  const quantity = parseInt(document.getElementById('quantity').value, 10) || 1;

  if (!cityA || !cityB || cityA === cityB) {
    document.getElementById('result-card').innerHTML =
      `<p class="empty-state">Pick two different cities to compare.</p>`;
    clearTable('Pick two different cities to compare.');
    return;
  }

  const context = getContext();
  const opts = getCalcOpts();
  const reputationData = getReputationData();
  const playerRanks = getPlayerRanks();

  const allTrades = allTradesBetween(cityA, cityB, quantity, context, opts);
  const trades = allTrades.filter(t => isGoodUnlocked(t.goodId, playerRanks, reputationData));

  attachReturnCargo(trades, context, opts, playerRanks, reputationData);
  attachTravelStats(trades, getCurrentSpeed());
  renderResultCard(trades[0] || null);
  renderTable(trades, context, opts);
}

export function wireRouteModeTabs() {
  document.querySelectorAll('#route-finder .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#route-finder .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById('global-mode').style.display = mode === 'global' ? 'block' : 'none';
      document.getElementById('specific-mode').style.display = mode === 'specific' ? 'block' : 'none';
    });
  });
}

export function wireQuantityStepper() {
  const input = document.getElementById('quantity');
  document.querySelectorAll('.stepper-btn').forEach(btn => {

    if (btn.classList.contains('specific-qty-btn')) return;
    btn.addEventListener('click', () => {
      const min = parseInt(input.min, 10) || 1;
      const max = parseInt(input.max, 10) || 999;
      let val = parseInt(input.value, 10) || min;
      val += btn.dataset.action === 'increment' ? 1 : -1;
      input.value = Math.min(max, Math.max(min, val));

      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

function isGlobalModeActive() {
  const activeTab = document.querySelector('#all-trades .tab-btn.active');
  return activeTab && activeTab.dataset.tab === 'global';
}

function recalculateIfGlobalActive() {
  const cityA = document.getElementById('city-a').value;
  const cityB = document.getElementById('city-b').value;
  if (isGlobalModeActive() && cityA && cityB && cityA !== cityB) {
    runCalculation();
  }
}

export function wireRouteFinderReactivity() {
  document.getElementById('find-best-trade-btn').addEventListener('click', runCalculation);

  document.querySelectorAll('.tab-btn[data-tab="global"]').forEach(btn => {
    btn.addEventListener('click', runCalculation);
  });

  document.querySelectorAll('.faction-rank-select').forEach(select => {
    select.addEventListener('change', recalculateIfGlobalActive);
  });

  document.getElementById('round-to-int').addEventListener('change', recalculateIfGlobalActive);

  ['religion', 'faith-level', 'culture', 'event-city', 'event-type', 'event-level', 'gamepass-nobility'].forEach(id => {
    document.getElementById(id).addEventListener('change', recalculateIfGlobalActive);
  });
  document.querySelectorAll('.language-select, .guild-perk-check').forEach(select => {
    select.addEventListener('change', recalculateIfGlobalActive);
  });
}