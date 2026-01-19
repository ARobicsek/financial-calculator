export function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toFixed(0);
}

export function formatAssetName(key) {
    const names = {
        usLargeCap: 'US Large Cap',
        usSmallCap: 'US Small Cap',
        intlDeveloped: 'Intl Developed',
        emergingMarkets: 'Emerging Markets',
        usAggregateBonds: 'US Bonds',
        tips: 'TIPS',
        highYieldBonds: 'High Yield',
        reits: 'REITs',
        cashMoneyMarket: 'Cash/MM'
    };
    return names[key] || key;
}

export function formatRiskProfile(profile) {
    const labels = {
        very_conservative: 'Very Conservative',
        conservative: 'Conservative',
        moderate: 'Moderate',
        moderately_aggressive: 'Moderately Aggressive',
        aggressive: 'Aggressive'
    };
    return labels[profile] || profile;
}
