export function findGood(goodsData, goodId) {
    const good = goodsData.goods.find(g => g.id === goodId);
    if (!good) throw new Error(`Unknown good id: ${goodId}`);
    return good;
}

export function findCity(citiesData, cityId) {
    const city = citiesData.cities.find(c => c.id === cityId);
    if (!city) throw new Error(`Unknown city id: ${cityId}`);
    return city;
}

export function isLocallyProduced(city, goodId, good = null) {
    return city.locallyProduced.includes(goodId) || !!(good && good.sources && good.sources.cities.includes(city.id));
}

export function sourcedBuyPrice(good, cityId) {
    return good.sources && good.sources.cities.includes(cityId) ? good.sources.price : null;
}