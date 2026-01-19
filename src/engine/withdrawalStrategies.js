/**
 * Withdrawal Strategies Module
 * Implements various retirement withdrawal approaches
 */

import { MARKET_DATA } from '../data/marketData.js';

/**
 * Calculate safe withdrawal rate based on portfolio and time horizon
 */
export function calculateSafeWithdrawalRate(params) {
    const { portfolioValue, yearsInRetirement = 30, successProbability = 0.90 } = params;

    let baseRate;
    if (yearsInRetirement <= 20) baseRate = 0.048;
    else if (yearsInRetirement <= 30) baseRate = 0.039;
    else baseRate = 0.035;

    if (successProbability > 0.95) baseRate -= 0.005;
    else if (successProbability < 0.85) baseRate += 0.005;

    return {
        rate: baseRate,
        rateFormatted: (baseRate * 100).toFixed(1) + '%',
        annualWithdrawal: portfolioValue * baseRate,
        monthlyWithdrawal: (portfolioValue * baseRate) / 12
    };
}

/**
 * Guardrails withdrawal strategy (modified Guyton-Klinger)
 */
export function applyGuardrailsStrategy(params) {
    const {
        currentPortfolio, priorWithdrawal, priorYearReturn, yearsRemaining,
        inflationRate = MARKET_DATA.inflation.expected
    } = params;

    const initialRate = 0.045;
    const currentRate = priorWithdrawal / currentPortfolio;
    let newWithdrawal = priorWithdrawal;
    let adjustment = 'none';
    let reason = '';

    if (currentRate < initialRate * 0.80) {
        newWithdrawal = priorWithdrawal * 1.10;
        adjustment = 'increase';
        reason = 'Portfolio performed well - increase spending by 10%';
    } else if (currentRate > initialRate * 1.20 && yearsRemaining > 15) {
        newWithdrawal = priorWithdrawal * 0.90;
        adjustment = 'decrease';
        reason = 'Portfolio needs recovery - reduce spending by 10%';
    } else if (priorYearReturn < 0) {
        adjustment = 'freeze';
        reason = 'Negative year - freeze at current level';
    } else {
        newWithdrawal = priorWithdrawal * (1 + inflationRate);
        adjustment = 'inflation';
        reason = 'Standard inflation adjustment';
    }

    return { newWithdrawal, adjustment, reason, currentRate, newRate: newWithdrawal / currentPortfolio };
}

/**
 * Compare withdrawal strategies
 */
export function compareStrategies(portfolioValue) {
    return {
        fixed: {
            name: 'Fixed Percentage', rate: 0.039,
            initialWithdrawal: portfolioValue * 0.039,
            pros: ['Simple', 'Predictable'], cons: ['No flexibility']
        },
        guardrails: {
            name: 'Guardrails', rate: 0.045,
            initialWithdrawal: portfolioValue * 0.045,
            pros: ['Higher initial', 'Adaptive'], cons: ['Variable income']
        },
        spendingSmile: {
            name: 'Spending Smile', rate: 0.050,
            initialWithdrawal: portfolioValue * 0.050,
            pros: ['Highest early income'], cons: ['Requires spending decline']
        }
    };
}
