import { getCitiesData, getGoodsData, getCalcOpts, getReputationData } from '../core/state.js';
import { computeTripProfit, allTradesBetween, bestTradeForDirection } from '../core/calc.js';
import { isGoodUnlocked } from '../core/reputationCalc.js';
import { getContext } from './traderPanel.js';
import { getPlayerRanks } from './reputationPanel.js';
import { resolveGoodSelection } from '../ui/goodsDatalist.js';
import { money } from '../core/money.js';
import { bestUnlockedTradeForDirection } from '../core/returnCargo.js';
import { withGoodIcon } from '../ui/icons.js';

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function processListEl() {
    return document.getElementById('process-list');
}

export function initLegChain() {
    processListEl().innerHTML = '';
    addProcess();
}

function populateCitySelect(select) {
    const citiesData = getCitiesData();
    select.innerHTML = '<option value="">Select a city</option>' +
        citiesData.cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function addProcess() {
    const card = document.createElement('div');
    card.className = 'process-card';
    card.innerHTML = `
    <div class="process-header">
      <span class="process-label"></span>
      <button type="button" class="remove-process-btn" aria-label="Remove this process">×</button>
    </div>
    <div class="leg-list"></div>
    <button type="button" class="add-process-btn">+ New process</button>
    <div class="process-total-row">
      <span>Complete total</span>
      <strong class="process-total-value">—</strong>
    </div>
  `;
    processListEl().appendChild(card);

    card.querySelector('.add-process-btn').addEventListener('click', addProcess);
    card.querySelector('.remove-process-btn').addEventListener('click', () => {
        card.remove();
        renumberProcesses();
        recomputeAll();
    });

    addLeg(card, true, '');
    renumberProcesses();
    recomputeAll();
}

function addLeg(card, independent, autoCityA) {
    const legList = card.querySelector('.leg-list');
    const row = document.createElement('div');
    row.className = 'leg-row';
    row.dataset.independent = independent ? 'true' : 'false';
    row.innerHTML = `
    <div class="leg-cities">
      <select class="leg-city-a"></select>
      <i class="leg-arrow" aria-hidden="true">&rarr;</i>
      <select class="leg-city-b"></select>
      <button type="button" class="chain-btn" aria-label="Chain next leg">&gt;</button>
      ${independent ? '' : '<button type="button" class="remove-leg-btn" aria-label="Remove this leg">×</button>'}
    </div>
    <div class="leg-items"></div>
    <button type="button" class="add-item-btn">+ Add item</button>
    ${independent ? `
      <label class="toggle-switch loop-toggle">
        <input type="checkbox" class="loop-check">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span class="toggle-text">Best Loop back to the start</span>
      </label>
      <button type="button" class="browse-btn">Browse prices for this pair</button>
      <div class="browse-results" style="display:none"></div>
    ` : ''}
    <div class="leg-results"></div>
    <div class="leg-total-row">
      <span>Leg total</span>
      <strong class="leg-total-value">—</strong>
    </div>
  `;
    legList.appendChild(row);

    const cityASelect = row.querySelector('.leg-city-a');
    const cityBSelect = row.querySelector('.leg-city-b');
    populateCitySelect(cityASelect);
    populateCitySelect(cityBSelect);
    if (autoCityA) {
        cityASelect.value = autoCityA;
        cityASelect.disabled = true;
    }

    cityASelect.addEventListener('change', recomputeAll);
    cityBSelect.addEventListener('change', recomputeAll);

    row.querySelector('.chain-btn').addEventListener('click', () => {
        addLeg(card, false, cityBSelect.value);
        recomputeAll();
    });

    const removeLegBtn = row.querySelector('.remove-leg-btn');
    if (removeLegBtn) {
        removeLegBtn.addEventListener('click', () => {
            row.remove();
            recomputeAll();
        });
    }

    row.querySelector('.add-item-btn').addEventListener('click', () => {
        addItemRow(row.querySelector('.leg-items'));
        recomputeAll();
    });

    const loopCheck = row.querySelector('.loop-check');
    if (loopCheck) loopCheck.addEventListener('change', recomputeAll);

    const browseBtn = row.querySelector('.browse-btn');
    if (browseBtn) browseBtn.addEventListener('click', () => toggleBrowse(row));

    addItemRow(row.querySelector('.leg-items'));
}

function addItemRow(container) {
    const item = document.createElement('div');
    item.className = 'specific-item-row';
    item.innerHTML = `
    <label class="form-field item-search-field">
      Good
      <input type="text" class="specific-item-search" placeholder="Search a good...">
    </label>
    <div class="stepper-field">
      <span class="field-label">Quantity</span>
      <div class="stepper">
        <button type="button" class="stepper-btn specific-qty-btn" data-action="decrement">−</button>
        <input type="number" class="specific-item-qty" value="1" min="1" max="999">
        <button type="button" class="stepper-btn specific-qty-btn" data-action="increment">+</button>
      </div>
    </div>
    <button type="button" class="remove-item-btn" aria-label="Remove item">×</button>
  `;
    container.appendChild(item);

    item.querySelector('.specific-item-search').addEventListener('input', recomputeAll);
    item.querySelector('.specific-item-qty').addEventListener('input', recomputeAll);
    item.querySelectorAll('.specific-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = item.querySelector('.specific-item-qty');
            let val = parseInt(input.value, 10) || 1;
            val += btn.dataset.action === 'increment' ? 1 : -1;
            input.value = Math.max(1, val);
            recomputeAll();
        });
    });
    item.querySelector('.remove-item-btn').addEventListener('click', () => {
        item.remove();
        recomputeAll();
    });
}

function toggleBrowse(legRow) {
    const results = legRow.querySelector('.browse-results');
    if (results.style.display !== 'none') {
        results.style.display = 'none';
        return;
    }

    const cityA = legRow.querySelector('.leg-city-a').value;
    const cityB = legRow.querySelector('.leg-city-b').value;
    if (!cityA || !cityB || cityA === cityB) {
        results.innerHTML = '<p class="empty-state">Pick both cities on this leg first.</p>';
        results.style.display = 'block';
        return;
    }

    const context = getContext();
    const opts = getCalcOpts();
    const reputationData = getReputationData();
    const playerRanks = getPlayerRanks();
    const goodsData = getGoodsData();

    const trades = allTradesBetween(cityA, cityB, 1, context, opts)
        .filter(t => isGoodUnlocked(t.goodId, playerRanks, reputationData));

    if (trades.length === 0) {
        results.innerHTML = '<p class="empty-state">No profitable trades between these cities.</p>';
    } else {
        results.innerHTML = trades.slice(0, 10).map(t => {
            const good = goodsData.goods.find(g => g.id === t.goodId);
            return `<div class="specific-item-line"><span class="item-name">${withGoodIcon(good.id, good.name)}</span><span class="profit">${money(t.profitPerUnit)} / unit</span></div>`;
        }).join('');
    }
    results.style.display = 'block';
}

function computeItemsTotal(cityA, cityB, itemRows, context, opts, reputationData, playerRanks, goodsData) {
    let total = 0;
    let anyRow = false;
    const lines = [];

    itemRows.forEach(row => {
        const searchValue = row.querySelector('.specific-item-search').value;
        const quantity = parseInt(row.querySelector('.specific-item-qty').value, 10) || 1;
        if (!searchValue.trim()) return;
        anyRow = true;

        const goodId = resolveGoodSelection(searchValue);
        if (!goodId) {
            lines.push(`<div class="specific-item-line"><span>${escapeHtml(searchValue)}</span><span class="locked-msg">No match</span></div>`);
            return;
        }
        if (!isGoodUnlocked(goodId, playerRanks, reputationData)) {
            const good = goodsData.goods.find(g => g.id === goodId);
            lines.push(`<div class="specific-item-line"><span class="item-name">${withGoodIcon(good.id, good.name)}</span><span class="locked-msg">Not unlocked at your rank</span></div>`);
            return;
        }
        const result = computeTripProfit(goodId, cityA, cityB, quantity, context, opts);
        const good = goodsData.goods.find(g => g.id === goodId);
        if (!result.possible) {
            lines.push(`<div class="specific-item-line"><span class="item-name">${withGoodIcon(good.id, good.name)}</span><span class="empty-state">Not tradeable on this route</span></div>`);
            return;
        }
        total += result.totalProfit;
        lines.push(`
      <div class="specific-item-line">
        <span class="item-name">${withGoodIcon(good.id, good.name)} ×${quantity}</span>
        <span>${money(result.buyPrice)} → ${money(result.sellPrice)}, <span class="profit">${money(result.totalProfit)}</span></span>
      </div>`);
    });

    return { html: lines.join(''), total, anyRow };
}

function sumItemQuantities(itemRows) {
    let total = 0;
    itemRows.forEach(row => {
        const searchValue = row.querySelector('.specific-item-search').value;
        if (!searchValue.trim()) return;
        total += parseInt(row.querySelector('.specific-item-qty').value, 10) || 1;
    });
    return total;
}

function renumberProcesses() {
    const cards = document.querySelectorAll('.process-card');
    cards.forEach((card, i) => {
        card.querySelector('.process-label').textContent = `Process ${i + 1}`;
        card.querySelector('.remove-process-btn').style.display = cards.length > 1 ? 'inline-flex' : 'none';
    });
}

export function recomputeAll() {
    const context = getContext();
    const opts = getCalcOpts();
    const goodsData = getGoodsData();
    const reputationData = getReputationData();
    const playerRanks = getPlayerRanks();

    let allTotal = 0;

    document.querySelectorAll('.process-card').forEach(card => {
        let processTotal = 0;
        const legRows = card.querySelectorAll('.leg-row');

        legRows.forEach((row, idx) => {
            const cityA = row.querySelector('.leg-city-a').value;
            const cityB = row.querySelector('.leg-city-b').value;
            const itemRows = row.querySelectorAll('.specific-item-row');
            const resultsEl = row.querySelector('.leg-results');
            const validPair = cityA && cityB && cityA !== cityB;

            let legTotal = 0;
            let html;

            if (validPair) {
                const outbound = computeItemsTotal(cityA, cityB, itemRows, context, opts, reputationData, playerRanks, goodsData);
                legTotal += outbound.total;
                html = outbound.anyRow ? outbound.html : '<p class="empty-state">Add an item above.</p>';

                if (row.dataset.independent === 'true') {
                    const loopCheck = row.querySelector('.loop-check');
                    if (loopCheck && loopCheck.checked) {
                        const loopQty = sumItemQuantities(itemRows);
                        if (loopQty === 0) {
                            html += `<div class="specific-item-line"><span class="item-name">Best Loop</span><span class="empty-state">Add items above first to size the loop</span></div>`;
                        } else {
                            const best = bestUnlockedTradeForDirection(cityB, cityA, loopQty, context, opts, playerRanks, reputationData);
                            if (best) {
                                legTotal += best.totalProfit;
                                const bestGood = goodsData.goods.find(g => g.id === best.goodId);
                                html += `
                  <div class="specific-item-line">
                    <span class="item-name">Best Loop: ${withGoodIcon(bestGood.id, bestGood.name)} ×${loopQty}</span>
                    <span>${money(best.buyPrice)} → ${money(best.sellPrice)}, <span class="profit">${money(best.totalProfit)}</span></span>
                  </div>`;
                            } else {
                                const cityAName = getCitiesData().cities.find(c => c.id === cityA)?.name || cityA;
                                html += `<div class="specific-item-line"><span class="item-name">Best Loop</span><span class="empty-state">No profitable trade back to ${cityAName}</span></div>`;
                            }
                        }
                    }
                }
            } else {
                html = '<p class="empty-state">Pick both cities for this leg first.</p>';
            }

            resultsEl.innerHTML = html;
            row.querySelector('.leg-total-value').textContent = money(legTotal);

            const isLast = idx === legRows.length - 1;
            row.querySelector('.chain-btn').style.display = isLast && validPair ? 'inline-flex' : 'none';
            const removeLegBtn = row.querySelector('.remove-leg-btn');
            if (removeLegBtn) removeLegBtn.style.display = isLast ? 'inline-flex' : 'none';

            processTotal += legTotal;
        });

        card.querySelector('.process-total-value').textContent = money(processTotal);
        allTotal += processTotal;
    });

    const allTotalEl = document.getElementById('all-complete-total-value');
    if (allTotalEl) allTotalEl.textContent = money(allTotal);
}

export function wireLegChainReactivity() {
    document.querySelectorAll('.faction-rank-select').forEach(select => {
        select.addEventListener('change', recomputeAll);
    });
    document.getElementById('round-to-int').addEventListener('change', recomputeAll);

    ['religion', 'faith-level', 'culture', 'event-city', 'event-type', 'event-level', 'gamepass-nobility', 'match-game-bugs', 'allow-imports'].forEach(id => {
        document.getElementById(id).addEventListener('change', recomputeAll);
    });
    document.querySelectorAll('.language-select, .guild-perk-check').forEach(select => {
        select.addEventListener('change', recomputeAll);
    });
}

export function getProcessLegOptions() {
    const citiesData = getCitiesData();
    const cityName = id => {
        const city = citiesData.cities.find(c => c.id === id);
        return city ? city.name : '';
    };

    const processes = [];
    document.querySelectorAll('.process-card').forEach((card, pIdx) => {
        const legs = [];
        card.querySelectorAll('.leg-row').forEach((row, lIdx) => {
            const cityA = row.querySelector('.leg-city-a').value;
            const cityB = row.querySelector('.leg-city-b').value;
            legs.push({ index: lIdx, cityA, cityB, cityAName: cityName(cityA), cityBName: cityName(cityB) });
        });
        processes.push({ index: pIdx, legs });
    });
    return processes;
}