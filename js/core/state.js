let goodsData, citiesData, modifiersData, cargoData, reputationData, distancesData, questsData;
let roundToInt = false;
let detailedMode = false;
let activeEvent = null; // { cityId, type, level } | null - only one active event at a time

export async function loadData() {
    const [goods, cities, modifiers, cargo, reputation, distances, quests] = await Promise.all([
        fetch('./data/goods.json').then(r => r.json()),
        fetch('./data/cities.json').then(r => r.json()),
        fetch('./data/modifiers.json').then(r => r.json()),
        fetch('./data/cargo.json').then(r => r.json()),
        fetch('./data/reputation.json').then(r => r.json()),
        fetch('./data/distances.json').then(r => r.json()),
        fetch('./data/quests.json').then(r => r.json()),
    ]);
    goodsData = goods;
    citiesData = cities;
    modifiersData = modifiers;
    cargoData = cargo;
    reputationData = reputation;
    distancesData = distances;
    questsData = quests;
}

export function getGoodsData() { return goodsData; }
export function getCitiesData() { return citiesData; }
export function getModifiersData() { return modifiersData; }
export function getCargoData() { return cargoData; }
export function getReputationData() { return reputationData; }
export function getDistancesData() { return distancesData; }
export function getQuestsData() { return questsData; }

export function getCalcOpts() {
    return { goodsData, citiesData, modifiersData, reputationData, activeEvent };
}

export function isRoundToInt() { return roundToInt; }
export function setRoundToInt(value) { roundToInt = value; }

export function isDetailedMode() { return detailedMode; }
export function setDetailedMode(value) { detailedMode = value; }

export function getActiveEvent() { return activeEvent; }
export function setActiveEvent(event) { activeEvent = event; }