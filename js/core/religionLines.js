export function faithLevel(context) {
    return context.faithLevel || 0;
}

export function amplifyForReligion(pct, city, context, modifiersData) {
    const rel = modifiersData.religionModifiers[context.religion];
    if (!rel) return pct;
    const level = faithLevel(context);

    if (context.religion === 'Judaism') {
        if (level >= 1 && pct < 0) pct *= rel.levels['1'].cityPenaltyMultiplier;
        if (level >= 3 && pct > 0) pct *= rel.levels['3'].cityTraitBonusMultiplier;
    }
    if (context.religion === 'Christianity') {
        if (level >= 3 && pct < 0) pct *= (1 - rel.levels['3'].cityPenaltyReduction);
    }
    if (context.religion === 'Zoroastrianism') {
        if (level >= 1 && city.culture === 'Byzantine' && pct < 0) pct *= rel.levels['1'].byzantineCityPenaltyMultiplier;
    }
    return pct;
}

function brothersInChristApplies(city, entry) {
    return !(entry.excludedEmpires || []).includes(city.empire);
}

export function religionLines(base, good, city, context, modifiersData, sign) {
    const lines = [];
    const rel = modifiersData.religionModifiers[context.religion];
    if (!rel) return lines;
    const level = faithLevel(context);
    const add = (label, rate) => lines.push({ label, amount: sign * Math.floor(rate * base) });
    const inBuildingCity = rel.buildingCities && rel.buildingCities.includes(city.id);

    if (context.religion === 'Christianity') {
        if (level >= 1 && inBuildingCity) add('Church Hospitality', rel.levels['1'].capitalOrCosmopolitanBonus);
        if (level >= 2 && brothersInChristApplies(city, rel.levels['2'])) add('Brothers in Christ', rel.levels['2'].christianCityBonus);
    } else if (context.religion === 'Zoroastrianism') {
        if (level >= 2 && inBuildingCity) add('Sassanid State Religion', rel.levels['2'].fireTempleCityBonus);
    } else if (context.religion === 'Manichaeism') {
        if (inBuildingCity) {
            for (const lvl of ['1', '3']) {
                const entry = rel.levels[lvl];
                if (level >= Number(lvl) && entry.goodsBonus.goods.includes(good.id)) add(entry.name, entry.goodsBonus.modifier);
            }
        }
    } else if (context.religion === 'Islam') {
        const knowledge = rel.levels['3'];
        if (level >= 2 && sign > 0 && inBuildingCity) add(rel.levels['2'].name, rel.levels['2'].sellBonus);
        if (level >= 3 && inBuildingCity && knowledge.goodsBonus.goods.includes(good.id)) add(knowledge.name, knowledge.goodsBonus.modifier);
    } else if (context.religion === 'Mahayana Buddhism') {
        const bonus = rel.levels['3'].goodsBonus;
        const matches = bonus.goods.includes(good.id) || bonus.categories.includes(good.category);
        if (level >= 3 && matches) add('Literature and Wisdom', bonus.modifier);
    }
    return lines;
}