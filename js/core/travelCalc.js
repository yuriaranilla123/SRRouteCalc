import { getDistancesData } from './state.js';

const adjacencyCache = new WeakMap();
const distanceCache = new WeakMap();
const hopCache = new WeakMap();

function buildAdjacency(distancesData) {
    if (adjacencyCache.has(distancesData)) return adjacencyCache.get(distancesData);
    const adj = {};
    distancesData.edges.forEach(e => {
        (adj[e.from] ??= []).push({ to: e.to, dist: e.distance });
        (adj[e.to] ??= []).push({ to: e.from, dist: e.distance });
    });
    adjacencyCache.set(distancesData, adj);
    return adj;
}

function memoFor(store, key) {
    if (!store.has(key)) store.set(key, new Map());
    return store.get(key);
}

function searchDistance(cityAId, cityBId, distancesData) {
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

function searchHops(cityAId, cityBId, distancesData) {
    const adj = buildAdjacency(distancesData);
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

function cached(store, cityAId, cityBId, search) {
    const data = getDistancesData();
    const memo = memoFor(store, data);
    const key = `${cityAId}|${cityBId}`;
    if (!memo.has(key)) memo.set(key, search(cityAId, cityBId, data));
    return memo.get(key);
}

export function computeDistance(cityAId, cityBId) {
    if (cityAId === cityBId) return 0;
    return cached(distanceCache, cityAId, cityBId, searchDistance);
}

export function computeHopCount(cityAId, cityBId) {
    if (cityAId === cityBId) return 0;
    return cached(hopCache, cityAId, cityBId, searchHops);
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `~${minutes}m ${seconds}s`;
}

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