import { getModifiersData } from '../core/state.js';

const perks = () => getModifiersData().guildPerks.perks;

export function populateGuildPerks() {
    document.getElementById('guild-perks').innerHTML = perks().map(p => `
    <label class="toggle-switch">
      <input type="checkbox" class="guild-perk-check" data-perk="${p.id}">
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
      <span class="toggle-text">${p.name} - ${p.description} ($${p.cost.toLocaleString('en-US')})</span>
    </label>`).join('');
}

export function getGuildPerks() {
    const owned = {};
    document.querySelectorAll('.guild-perk-check').forEach(c => { owned[c.dataset.perk] = c.checked; });
    return owned;
}

export function getGuildCargoBonus() {
    const owned = getGuildPerks();
    return perks().reduce((sum, p) => sum + (p.effect === 'cargoBonus' && owned[p.id] ? p.amount : 0), 0);
}

export function getGuildSpeedMultiplier() {
    const owned = getGuildPerks();
    return perks().reduce((m, p) => m + (p.effect === 'speedMultiplier' && owned[p.id] ? p.rate : 0), 1);
}

export function wireGuildControls(onCaravanChange) {
    document.querySelectorAll('.guild-perk-check').forEach(c => {
        const perk = perks().find(p => p.id === c.dataset.perk);
        if (perk.effect === 'cargoBonus' || perk.effect === 'speedMultiplier') c.addEventListener('change', onCaravanChange);
    });
}