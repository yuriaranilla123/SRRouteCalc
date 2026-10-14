const FUNDING_CONFIG = {
    month: 'October',
    current: 0,
    goal: 0,
};

export function renderFundingBar() {
    const { current, goal } = FUNDING_CONFIG;
    const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 100; // no goal set = shown as full
    document.getElementById('funding-month').textContent = FUNDING_CONFIG.month;
    document.getElementById('funding-percent').textContent = `${pct}% of $${goal} goal`;
    document.getElementById('funding-fill').style.width = `${pct}%`;
}