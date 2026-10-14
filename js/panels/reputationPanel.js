import { getReputationData, getGoodsData } from '../core/state.js';
import { computeQuestMoney, isGoodUnlocked, listGatedGoods } from '../core/reputationCalc.js';
import { money } from '../core/money.js';

export function populateReputationFields() {
    const reputationData = getReputationData();
    const container = document.getElementById('reputation-fields');
    const questFactionSelect = document.getElementById('quest-faction');

    reputationData.factions.forEach(faction => {
        const label = document.createElement('label');
        label.className = 'form-field';
        label.innerHTML = `${faction.name}
      <select class="faction-rank-select" data-faction="${faction.id}">
        <option value="0">Unranked</option>
        ${faction.ranks.map(r => `<option value="${r.rank}">Rank ${r.rank}, ${r.title}</option>`).join('')}
      </select>`;
        container.appendChild(label);

        const opt = document.createElement('option');
        opt.value = faction.id;
        opt.textContent = faction.name;
        questFactionSelect.appendChild(opt);
    });
}

/** Every other panel that needs to know the player's ranks imports this. */
export function getPlayerRanks() {
    const ranks = {};
    document.querySelectorAll('.faction-rank-select').forEach(select => {
        ranks[select.dataset.faction] = parseInt(select.value, 10) || 0;
    });
    return ranks;
}

export function renderLockedGoodsHint() {
    const reputationData = getReputationData();
    const goodsData = getGoodsData();
    const playerRanks = getPlayerRanks();
    const gated = listGatedGoods(reputationData);
    const stillLocked = gated.filter(g => !isGoodUnlocked(g.goodId, playerRanks, reputationData));

    const hint = document.getElementById('locked-goods-hint');
    if (stillLocked.length === 0) {
        hint.textContent = 'All reputation-gated goods are unlocked at your current ranks.';
    } else {
        const names = stillLocked.map(g => {
            const good = goodsData.goods.find(x => x.id === g.goodId);
            return `${good ? good.name : g.goodId} (needs ${g.requiredTitle}, Rank ${g.requiredRank})`;
        });
        hint.textContent = `Excluded from trade results until unlocked: ${names.join(', ')}.`;
    }
}

export function renderQuestMoney() {
    const reputationData = getReputationData();
    const factionId = document.getElementById('quest-faction').value;
    const questType = document.getElementById('quest-type').value;
    const playerRanks = getPlayerRanks();
    const rank = playerRanks[factionId] || 0;
    const rewardAmount = computeQuestMoney(questType, rank, reputationData);
    document.getElementById('quest-money-value').textContent = money(rewardAmount);
}

export function wireReputationControls() {
    document.querySelectorAll('.faction-rank-select').forEach(select => {
        select.addEventListener('change', () => {
            renderLockedGoodsHint();
            renderQuestMoney();
        });
    });
    document.getElementById('quest-faction').addEventListener('change', renderQuestMoney);
    document.getElementById('quest-type').addEventListener('change', renderQuestMoney);
    document.getElementById('round-to-int').addEventListener('change', renderQuestMoney);
}