import { getDistancesData } from './state.js';

function buildAdjacency(distancesData) {
    const adj = {};
    distancesData.edges.forEach(e => {
        (adj[e.from] ??= []).push({ to: e.to, dist: e.distance });
        (adj[e.to] ??= []).push({ to: e.from, dist: e.distance });
    });
    return adj;
}

/**
 * Shortest known-road distance (studs) between two cities, summed through
 * intermediate cities when there's no direct leg. Returns null if the two
 * cities aren't connected anywhere in data/distances.json's known graph -
 * that graph only covers what's actually been measured, not a guess at
 * every possible pair.
 */
export function computeDistance(cityAId, cityBId) {
    if (cityAId === cityBId) return 0;
    const distancesData = getDistancesData();
    const adj = buildAdjacency(distancesData);

    const visited = new Set([cityAId]);
    const queue = [{ city: cityAId, dist: 0 }];
    while (queue.length) {
        queue.sort((a, b) => a.dist - b.dist);
        const current = queue.shift();
        if (current.city === cityBId) return current.dist;
        (adj[current.city] || []).forEach(neighbor => {
            if (!visited.has(neighbor.to)) {
                visited.add(neighbor.to);
                queue.push({ city: neighbor.to, dist: current.dist + neighbor.dist });
            }
        });
    }
    return null;
}

/** Number of cities crossed on the known road graph (edges, not studs), or null if unconnected. */
export function computeHopCount(cityAId, cityBId) {
    if (cityAId === cityBId) return 0;
    const adj = buildAdjacency(getDistancesData());
    const visited = new Set([cityAId]);
    const queue = [{ city: cityAId, hops: 0 }];
    while (queue.length) {
        const cur = queue.shift();
        if (cur.city === cityBId) return cur.hops;
        (adj[cur.city] || []).forEach(n => {
            if (!visited.has(n.to)) {
                visited.add(n.to);
                queue.push({ city: n.to, hops: cur.hops + 1 });
            }
        });
    }
    return null;
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `~${minutes}m ${seconds}s`;
}

/**
 * Mutates each trade in `trades`, attaching `.travelTimeLabel` (a display
 * string like "~6m 7s") and `.profitPerMin`. Both stay null if the distance
 * between that trade's cities isn't in the known graph, or if speed is 0.
 */
export function attachTravelStats(trades, speed) {
    trades.forEach(trade => {
        const distance = computeDistance(trade.buyCityId, trade.sellCityId);
        if (distance === null || !speed) {
            trade.travelTimeLabel = null;
            trade.travelTimeSeconds = null;
            trade.profitPerMin = null;
            return;
        }
        const seconds = distance / speed;
        trade.travelTimeLabel = formatTime(seconds);
        trade.travelTimeSeconds = seconds;
        trade.profitPerMin = trade.totalProfit / (seconds / 60);
    });
}