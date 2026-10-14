import { getCalcOpts, getReputationData } from '../core/state.js';
import { bestRoutePerGood, allTradesBetween } from '../core/calc.js';
import { isGoodUnlocked } from '../core/reputationCalc.js';
import { getContext } from './traderPanel.js';
import { getPlayerRanks } from './reputationPanel.js';
import { renderTable, clearTable } from './tradesTable.js';
import { getProcessLegOptions } from './legChainPanel.js';
import { attachReturnCargo } from '../core/returnCargo.js';
import { attachTravelStats } from '../core/travelCalc.js';
import { getCurrentSpeed } from './caravanPanel.js';

export function getActiveTab() {
  return document.querySelector('#all-trades .tab-btn.active').dataset.tab;
}

export function renderGeneralBest() {
  const context = getContext();
  const opts = getCalcOpts();
  const reputationData = getReputationData();
  const playerRanks = getPlayerRanks();
  const quantity = parseInt(document.getElementById('quantity').value, 10) || 1;

  const results = bestRoutePerGood(quantity, context, opts)
    .filter(r => isGoodUnlocked(r.goodId, playerRanks, reputationData));

  attachReturnCargo(results, context, opts, playerRanks, reputationData);
  attachTravelStats(results, getCurrentSpeed());
  renderTable(results, context, opts);
}

export function populatePerLegSelectors() {
  const processSelect = document.getElementById('per-leg-process-select');
  const legSelect = document.getElementById('per-leg-leg-select');
  const processes = getProcessLegOptions();

  processSelect.innerHTML = processes.map(p => `<option value="${p.index}">Process ${p.index + 1}</option>`).join('');

  function refreshLegOptions() {
    const pIdx = parseInt(processSelect.value, 10) || 0;
    const process = processes[pIdx];
    legSelect.innerHTML = process ? process.legs.map(l =>
      `<option value="${l.index}">Leg ${l.index + 1}${l.cityAName && l.cityBName ? `: ${l.cityAName} to ${l.cityBName}` : ''}</option>`
    ).join('') : '';
  }

  refreshLegOptions();
  processSelect.onchange = () => { refreshLegOptions(); renderPerLeg(); };
  legSelect.onchange = renderPerLeg;
}

export function renderPerLeg() {
  const processes = getProcessLegOptions();
  const pIdx = parseInt(document.getElementById('per-leg-process-select').value, 10) || 0;
  const lIdx = parseInt(document.getElementById('per-leg-leg-select').value, 10) || 0;
  const leg = processes[pIdx] && processes[pIdx].legs[lIdx];

  if (!leg || !leg.cityA || !leg.cityB || leg.cityA === leg.cityB) {
    clearTable('Pick both cities for this leg in Find a Route → Specific first.');
    return;
  }

  const context = getContext();
  const opts = getCalcOpts();
  const reputationData = getReputationData();
  const playerRanks = getPlayerRanks();
  const quantity = parseInt(document.getElementById('quantity').value, 10) || 1;

  const trades = allTradesBetween(leg.cityA, leg.cityB, quantity, context, opts)
    .filter(t => isGoodUnlocked(t.goodId, playerRanks, reputationData));

  attachReturnCargo(trades, context, opts, playerRanks, reputationData);
  attachTravelStats(trades, getCurrentSpeed());
  renderTable(trades, context, opts);
}

function refreshIfGeneralBestActive() {
  if (getActiveTab() === 'general-best') renderGeneralBest();
}

function refreshIfPerLegActive() {
  if (getActiveTab() === 'per-leg') renderPerLeg();
}

export function wireTabControls() {
  document.querySelectorAll('#all-trades .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#all-trades .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('general-best-hint').style.display =
        btn.dataset.tab === 'general-best' ? 'block' : 'none';
      document.getElementById('per-leg-mode').style.display =
        btn.dataset.tab === 'per-leg' ? 'block' : 'none';

      if (btn.dataset.tab === 'general-best') renderGeneralBest();
      if (btn.dataset.tab === 'per-leg') {
        populatePerLegSelectors();
        renderPerLeg();
      }

    });
  });

  document.getElementById('quantity').addEventListener('input', () => {
    refreshIfGeneralBestActive();
    refreshIfPerLegActive();
  });
  document.querySelectorAll('.faction-rank-select').forEach(select => {
    select.addEventListener('change', () => {
      refreshIfGeneralBestActive();
      refreshIfPerLegActive();
    });
  });
  document.getElementById('round-to-int').addEventListener('change', () => {
    refreshIfGeneralBestActive();
    refreshIfPerLegActive();
  });

  ['religion', 'faith-level', 'culture', 'event-city', 'event-type', 'event-level', 'gamepass-nobility'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      refreshIfGeneralBestActive();
      refreshIfPerLegActive();
    });
  });
  document.querySelectorAll('.language-select, .guild-perk-check').forEach(select => {
    select.addEventListener('change', () => {
      refreshIfGeneralBestActive();
      refreshIfPerLegActive();
    });
  });
}