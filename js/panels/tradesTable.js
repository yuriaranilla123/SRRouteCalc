import { getGoodsData, getCitiesData, isDetailedMode } from '../core/state.js';
import { computePriceBreakdown } from '../core/calc.js';
import { money } from '../core/money.js';

let lastTrades = [];
let lastContext = null;
let lastOpts = null;
let emptyMessage = 'No profitable trades found.';
let sortKey = null;
let sortDir = null; // 'asc' | 'desc' | null (null = the view's own natural order)

function getSortValue(trade, key) {
    switch (key) {
        case 'buyPrice': return trade.buyPrice;
        case 'sellPrice': return trade.sellPrice;
        case 'profitPerUnit': return trade.profitPerUnit;
        case 'totalProfit': return trade.totalProfit;
        case 'travelTime': return trade.travelTimeSeconds;
        case 'profitPerMin': return trade.profitPerMin;
        case 'returnCargo': return trade.returnCargo ? trade.returnCargo.profitPerUnit : null;
        default: return null;
    }
}

function compareTrades(a, b) {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === 'asc' ? av - bv : bv - av;
}

function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        indicator.textContent = th.dataset.sortKey === sortKey ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
    });
}

function formatBreakdown(breakdown) {
    if (!breakdown) return '<span class="empty-state">—</span>';
    return breakdown.lines
        .map(l => `<span class="breakdown-line ${l.amount < 0 ? 'breakdown-negative' : ''}">${l.amount >= 0 ? '+' : ''}${money(l.amount)} ${l.label}</span>`)
        .join('');
}

function appendBreakdownRow(tbody, trade) {
    if (!lastContext || !lastOpts) return;
    const buyBreakdown = computePriceBreakdown(trade.goodId, trade.buyCityId, lastContext, lastOpts, false);
    const sellBreakdown = computePriceBreakdown(trade.goodId, trade.sellCityId, lastContext, lastOpts, true);

    const tr = document.createElement('tr');
    tr.className = 'breakdown-row';
    tr.innerHTML = `
      <td colspan="10">
        <div class="breakdown-cols">
          <div class="breakdown-col">
            <span class="breakdown-col-title">Buy breakdown (base ${money(buyBreakdown ? buyBreakdown.base : 0)})</span>
            ${formatBreakdown(buyBreakdown)}
          </div>
          <div class="breakdown-col">
            <span class="breakdown-col-title">Sell breakdown (base ${money(sellBreakdown ? sellBreakdown.base : 0)})</span>
            ${formatBreakdown(sellBreakdown)}
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
}

function renderRows() {
    const tbody = document.getElementById('trades-tbody');
    tbody.innerHTML = '';

    const trades = sortKey ? [...lastTrades].sort(compareTrades) : lastTrades;

    if (trades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">${emptyMessage}</td></tr>`;
        return;
    }

    const goodsData = getGoodsData();
    const citiesData = getCitiesData();
    const detailed = isDetailedMode();

    for (const trade of trades) {
        const good = goodsData.goods.find(g => g.id === trade.goodId);
        const buyCity = citiesData.cities.find(c => c.id === trade.buyCityId);
        const sellCity = citiesData.cities.find(c => c.id === trade.sellCityId);

        const returnCargoHtml = trade.returnCargo
            ? `${trade.returnCargo.name} <span class="return-cargo-profit">Profit/unit: ${money(trade.returnCargo.profitPerUnit)}</span>`
            : '<span class="empty-state">None profitable</span>';

        const travelTimeHtml = trade.travelTimeLabel || '—';
        const profitPerMinHtml = trade.profitPerMin != null ? money(trade.profitPerMin) : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${good.name}</td>
      <td>${trade.buyLabel || buyCity.name}</td>
      <td>${sellCity.name}</td>
      <td class="num">${money(trade.buyPrice)}</td>
      <td class="num">${money(trade.sellPrice)}</td>
      <td class="num profit">${money(trade.profitPerUnit)}</td>
      <td class="num profit">${money(trade.totalProfit)}</td>
      <td class="num ${trade.travelTimeLabel ? '' : 'placeholder-col'}">${travelTimeHtml}</td>
      <td class="num profit ${trade.profitPerMin != null ? '' : 'placeholder-col'}">${profitPerMinHtml}</td>
      <td class="return-cargo-cell">${returnCargoHtml}</td>
    `;
        tbody.appendChild(tr);

        if (detailed) appendBreakdownRow(tbody, trade);
    }
}

export function renderTable(trades, context = null, opts = null) {
    lastTrades = trades;
    lastContext = context;
    lastOpts = opts;
    emptyMessage = 'No profitable trades found.';
    renderRows();
}

export function clearTable(message) {
    lastTrades = [];
    emptyMessage = message;
    renderRows();
}

export function refreshTable() {
    renderRows();
}

export function wireSortControls() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sortKey;
            if (sortKey !== key) {
                sortKey = key;
                sortDir = 'asc';
            } else if (sortDir === 'asc') {
                sortDir = 'desc';
            } else {
                sortKey = null;
                sortDir = null;
            }
            updateSortIndicators();
            renderRows();
        });
    });
}