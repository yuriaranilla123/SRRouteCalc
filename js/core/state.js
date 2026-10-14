/**
 * state.js — the single source of truth for loaded data and display
 * settings. This is the ONLY module other panels are allowed to depend on
 * for shared data; panels never reach into each other directly.
 */

let goodsData, citiesData, modifiersData, cargoData, reputationData, distancesData;
let roundToInt = false;
let detailedMode = false;
let activeEvent = null; // { cityId, type, level } | null - only one active event at a time

export async function loadData() {
    const [goods, cities, modifiers, cargo, reputation, distances] = await Promise.all([
        fetch('./data/goods.json').then(r => r.json()),
        fetch('./data/cities.json').then(r => r.json()),
        fetch('./data/modifiers.json').then(r => r.json()),
        fetch('./data/cargo.json').then(r => r.json()),
        fetch('./data/reputation.json').then(r => r.json()),
        fetch('./data/distances.json').then(r => r.json()),
    ]);
    goodsData = goods;
    citiesData = cities;
    modifiersData = modifiers;
    cargoData = cargo;
    reputationData = reputation;
    distancesData = distances;
}

export function getGoodsData() { return goodsData; }
export function getCitiesData() { return citiesData; }
export function getModifiersData() { return modifiersData; }
export function getCargoData() { return cargoData; }
export function getReputationData() { return reputationData; }
export function getDistancesData() { return distancesData; }

/** Convenience bundle — this is the exact shape calc.js's functions expect. */
export function getCalcOpts() {
    return { goodsData, citiesData, modifiersData, reputationData, activeEvent };
}

export function isRoundToInt() { return roundToInt; }
export function setRoundToInt(value) { roundToInt = value; }

/** Whether the trades table should show the itemized per-modifier breakdown under each row. */
export function isDetailedMode() { return detailedMode; }
export function setDetailedMode(value) { detailedMode = value; }

export function getActiveEvent() { return activeEvent; }
export function setActiveEvent(event) { activeEvent = event; }