/**
 * SRRouteCalc — Reputation Calculator
 *
 * IMPORTANT SCOPE NOTE: the "+50% Money" reward is confirmed (via the Framer
 * info hub's live card text) to read "+50% Money from Reputation Quests" —
 * it applies to quest payouts only. It must NOT be applied anywhere in the
 * trade route profit calculator (calc.js). These are kept as fully separate
 * systems on purpose.
 */

export function getFaction(factionId, reputationData) {
    const faction = reputationData.factions.find(f => f.id === factionId);
    if (!faction) throw new Error(`Unknown faction id: ${factionId}`);
    return faction;
}

/** Returns the highest rank object the player has reached, or null if below rank 1. */
export function getCurrentRank(factionId, reputationPoints, reputationData) {
    const faction = getFaction(factionId, reputationData);
    let current = null;
    for (const rankInfo of faction.ranks) {
        if (reputationPoints >= rankInfo.reputation) {
            current = rankInfo;
        }
    }
    return current;
}

/** Quest money reward at a given rank, using the confirmed stacking formula. */
export function computeQuestMoney(questType, rank, reputationData) {
    const base = reputationData.baseQuestRewards[questType];
    if (!base) throw new Error(`Unknown quest type: ${questType}`);
    if (rank < 1) return base.baseMoney;
    return Math.floor(base.baseMoney * Math.pow(1.5, rank));
}

/**
 * Checks whether a reputation-gated good is unlocked at the player's current rank(s).
 * playerRanks: { byzantine: 4, sasanian: 0, sogdia: 4, tang: 0, ... } (rank per faction, 0 = unranked)
 */
export function isGoodUnlocked(goodId, playerRanks, reputationData) {
    for (const faction of reputationData.factions) {
        for (const rankInfo of faction.ranks) {
            if (rankInfo.unlocks.includes(goodId)) {
                const playerRank = playerRanks[faction.id] || 0;
                return playerRank >= rankInfo.rank;
            }
        }
    }
    // not a reputation-gated good at all — always unlocked
    return true;
}

/** Returns { goodId, factionId, requiredRank } for every reputation-gated good, for building UI hints. */
export function listGatedGoods(reputationData) {
    const gated = [];
    for (const faction of reputationData.factions) {
        for (const rankInfo of faction.ranks) {
            for (const unlock of rankInfo.unlocks) {
                // only goods (lowercase_snake_case ids matching goods.json), not cosmetic/perk strings
                if (/^[a-z_]+$/.test(unlock)) {
                    gated.push({ goodId: unlock, factionId: faction.id, requiredRank: rankInfo.rank, requiredTitle: rankInfo.title });
                }
            }
        }
    }
    return gated;
}