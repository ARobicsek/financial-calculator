/**
 * Tax Optimizer Module
 * Asset location and Roth conversion strategies
 */

import { TAX_BRACKETS_2026, STANDARD_DEDUCTION_2026, IRMAA_THRESHOLDS } from '../data/marketData.js';

/**
 * Calculate optimal Roth conversion amount
 */
export function calculateOptimalConversion(params) {
    const {
        currentIncome = 50000,
        filingStatus = 'married',
        iraBalance = 500000,
        age = 52
    } = params;

    const standardDeduction = STANDARD_DEDUCTION_2026[filingStatus];
    const taxableIncome = Math.max(0, currentIncome - standardDeduction);
    const bracket22Top = filingStatus === 'married' ? 213300 : 106650;
    const bracketRoom = Math.max(0, bracket22Top - taxableIncome);

    // Consider IRMAA thresholds for ages 63+ (impacts Medicare premiums)
    const irmaaThreshold = IRMAA_THRESHOLDS[filingStatus];
    const irmaaRoom = Math.max(0, irmaaThreshold - currentIncome);

    const optimalConversion = Math.min(bracketRoom, irmaaRoom, iraBalance);

    return {
        optimalConversion,
        bracketRoom,
        irmaaRoom: age >= 63 ? irmaaRoom : null,
        taxableIncome,
        effectiveBracket: '22%',
        note: age >= 63
            ? 'Limited by IRMAA threshold to avoid Medicare premium increase'
            : 'Fill 22% bracket before retirement to reduce future RMD tax burden'
    };
}

/**
 * Get asset location recommendations
 */
export function getAssetLocationRecommendations() {
    return {
        taxDeferred: {
            name: 'Tax-Deferred (401k, Traditional IRA)',
            assets: ['Taxable bonds', 'REITs', 'High-turnover funds', 'TIPS'],
            reason: 'Income taxed as ordinary income anyway'
        },
        roth: {
            name: 'Roth Accounts',
            assets: ['Small-cap value', 'Emerging markets', 'High-growth stocks'],
            reason: 'Maximize tax-free compounding on highest-return assets'
        },
        taxable: {
            name: 'Taxable Brokerage',
            assets: ['US index funds/ETFs', 'International stocks', 'Municipal bonds (24%+ bracket)'],
            reason: 'Tax-efficient, foreign tax credit, favorable capital gains rates'
        }
    };
}
