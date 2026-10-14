function maxAnimalsFor(cargoData, maxAnimals) {
    return maxAnimals ?? cargoData._mechanics.maxAnimalsEquipped;
}

export function computeTotalCargo(bagId, equippedAnimals, cargoData, hasExtraCargoSlot = false, maxAnimals = null, guildCargo = 0, perAnimalBonus = 0) {
    const bag = cargoData.bags.types.find(b => b.id === bagId);
    if (!bag) throw new Error(`Unknown bag id: ${bagId}`);
    const cap = maxAnimalsFor(cargoData, maxAnimals);

    let total = bag.cargo;
    const breakdown = [{ source: bag.name, cargo: bag.cargo }];

    for (const entry of equippedAnimals.slice(0, cap)) {
        const animal = cargoData.animals.find(a => a.id === entry.animalId);
        if (!animal) continue;

        let cargo = animal.cargo;
        if (entry.saddlebag && animal.cargoWithSaddlebag !== null) {
            cargo = animal.cargoWithSaddlebag;
        }
        cargo += perAnimalBonus;
        total += cargo;
        breakdown.push({ source: animal.name + (entry.saddlebag ? ' (+ saddlebag)' : ''), cargo });
    }

    if (hasExtraCargoSlot) {
        total += 1;
        breakdown.push({ source: 'Extra Cargo Slot gamepass', cargo: 1 });
    }

    if (guildCargo) {
        total += guildCargo;
        breakdown.push({ source: 'Guild: Better Packing', cargo: guildCargo });
    }

    return { total, breakdown };
}

export function computeAverageSpeedBonus(equippedAnimals, cargoData, maxAnimals = null) {
    const cap = maxAnimalsFor(cargoData, maxAnimals);
    const relevant = equippedAnimals.slice(0, cap);
    if (relevant.length === 0) return 0;

    const sum = relevant.reduce((acc, entry) => {
        const animal = cargoData.animals.find(a => a.id === entry.animalId);
        return acc + (animal ? animal.speedBonus : 0);
    }, 0);

    return sum / relevant.length;
}

export function computeAutoWalkSpeed(equippedAnimals, cargoData, hasSpeedBoostGamepass = false, maxAnimals = null, speedMultiplier = 1) {
    const baseSpeed = cargoData._mechanics.baseWalkSpeed + (hasSpeedBoostGamepass ? 4 : 0);
    return (baseSpeed + computeAverageSpeedBonus(equippedAnimals, cargoData, maxAnimals)) * speedMultiplier;
}