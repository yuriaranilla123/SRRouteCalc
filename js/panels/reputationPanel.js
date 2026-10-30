import { getReputationData, getGoodsData, getQuestsData, getCargoData } from '../core/state.js';
import { computeQuestMoney, isGoodUnlocked, listGatedGoods, questReputation } from '../core/reputationCalc.js';
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

export function renderQuestGivers() {
    const list = document.getElementById('quest-giver-list');
    const quests = getQuestsData().quests;
    const nobility = document.getElementById('gamepass-nobility').checked;
    list.replaceChildren();
    quests.forEach(quest => {
        const li = document.createElement('li');
        li.className = 'quest-giver';
        const head = document.createElement('div');
        head.className = 'quest-giver-head';
        const name = document.createElement('span');
        name.className = 'quest-giver-name';
        name.textContent = quest.name;
        const reward = document.createElement('span');
        reward.className = 'quest-giver-reward';
        const reputation = questReputation(quest.reward.reputation, nobility, getCargoData());
        reward.textContent = reputation ? `${money(quest.reward.money)} + ${reputation} reputation` : money(quest.reward.money);
        head.append(name, reward);
        const meta = document.createElement('p');
        meta.className = 'field-hint';
        meta.textContent = `${quest.npc}, ${quest.location}`;
        const tasks = document.createElement('ol');
        tasks.className = 'quest-giver-tasks';
        quest.tasks.forEach(task => {
            const item = document.createElement('li');
            item.textContent = task;
            tasks.appendChild(item);
        });
        li.append(head, meta, tasks);
        list.appendChild(li);
    });
    const total = quests.reduce((sum, q) => sum + q.reward.money, 0);
    document.getElementById('quest-giver-total').textContent = `All four quests together: ${money(total)}.`;
}

export function wireReputationControls() {
    document.querySelectorAll('.faction-rank-select').forEach(select => {
        select.addEventListener('change', () => {
            renderLockedGoodsHint();
            renderQuestMoney();
        });
    });
    document.getElementById('gamepass-nobility').addEventListener('change', renderQuestGivers);
    document.getElementById('quest-faction').addEventListener('change', renderQuestMoney);
    document.getElementById('quest-type').addEventListener('change', renderQuestMoney);
    document.getElementById('round-to-int').addEventListener('change', () => {
        renderQuestMoney();
        renderQuestGivers();
    });
}