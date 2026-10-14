import { getCargoData } from '../core/state.js';
import { computeTotalCargo, computeAutoWalkSpeed } from '../core/cargoCalc.js';
import { getGuildCargoBonus, getGuildSpeedMultiplier } from './guildPanel.js';
import { getPlayerRanks } from './reputationPanel.js';

export function populateCaravanSelects() {
    const cargoData = getCargoData();
    const bagSelect = document.getElementById('bag-select');
    cargoData.bags.types.forEach(bag => {
        const opt = document.createElement('option');
        opt.value = bag.id;
        opt.textContent = `${bag.name} (${bag.cargo} cargo)`;
        bagSelect.appendChild(opt);
    });

    document.querySelectorAll('.animal-select').forEach(select => {
        cargoData.animals.forEach(animal => {
            const opt = document.createElement('option');
            const gamepassTag = animal.isGamepass ? ' (Gamepass)' : '';
            opt.value = animal.id;
            opt.textContent = `${animal.name} (${animal.cargo} Cargo, +${animal.speedBonus} Speed)${gamepassTag}`;
            select.appendChild(opt);
        });
    });
}

function getEquippedAnimals() {
    const equipped = [];
    document.querySelectorAll('.animal-select').forEach(select => {
        const slot = select.dataset.slot;
        if (select.closest('.caravan-slot').style.display === 'none') return;
        if (!select.value) return;
        const saddlebagCheck = document.querySelector(`.saddlebag-check[data-slot="${slot}"]`);
        equipped.push({ animalId: select.value, saddlebag: saddlebagCheck.checked });
    });
    return equipped;
}

function getMaxAnimals() {
    const ranks = getPlayerRanks();
    const gamepass = document.getElementById('gamepass-extra-caravan-slot').checked ? 1 : 0;
    const rank = (ranks.byzantine || 0) >= 8 || (ranks.sasanian || 0) >= 8 ? 1 : 0;
    return 3 + gamepass + rank;
}

function getRankCargoPerAnimal() {
    return (getPlayerRanks().sogdia || 0) >= 5 ? 1 : 0;
}

function updateSlotVisibility() {
    const max = getMaxAnimals();
    [4, 5].forEach(n => {
        const slot = document.getElementById(`animal-slot-${n}`);
        if (slot) slot.style.display = max >= n ? '' : 'none';
    });
}

export function recomputeCaravan() {
    const cargoData = getCargoData();
    const bagId = document.getElementById('bag-select').value;
    const maxAnimals = getMaxAnimals();
    updateSlotVisibility();
    const equipped = getEquippedAnimals();
    const hasExtraCargoSlot = document.getElementById('gamepass-extra-cargo').checked;
    const hasSpeedBoost = document.getElementById('gamepass-speed-boost').checked;

    const { total } = computeTotalCargo(bagId, equipped, cargoData, hasExtraCargoSlot, maxAnimals, getGuildCargoBonus(), getRankCargoPerAnimal());
    document.getElementById('cargo-total').textContent = `${total}`;

    const speed = computeAutoWalkSpeed(equipped, cargoData, hasSpeedBoost, maxAnimals, getGuildSpeedMultiplier());
    document.getElementById('walk-speed').textContent = `${speed}`;

    const quantityInput = document.getElementById('quantity');
    quantityInput.value = total;

    quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
}

export function getCurrentSpeed() {
    const cargoData = getCargoData();
    const hasSpeedBoost = document.getElementById('gamepass-speed-boost').checked;
    return computeAutoWalkSpeed(getEquippedAnimals(), cargoData, hasSpeedBoost, getMaxAnimals(), getGuildSpeedMultiplier());
}

export function wireCaravanControls() {
    document.getElementById('bag-select').addEventListener('change', recomputeCaravan);
    document.querySelectorAll('.animal-select, .saddlebag-check').forEach(el => {
        el.addEventListener('change', recomputeCaravan);
    });
    document.getElementById('gamepass-extra-cargo').addEventListener('change', recomputeCaravan);
    document.getElementById('gamepass-speed-boost').addEventListener('change', recomputeCaravan);
    document.getElementById('gamepass-extra-caravan-slot').addEventListener('change', recomputeCaravan);
    document.querySelectorAll('.faction-rank-select').forEach(select => select.addEventListener('change', recomputeCaravan));
}