/**
 * Asset Allocation Engine
 * Calculates optimal asset allocation based on risk profile, age, and other factors
 */

import { MARKET_DATA, ASSET_ALLOCATIONS } from '../data/marketData.js';

/**
 * Calculate base allocation from age-based rule
 * @param {number} age - Current age
 * @param {'conservative'|'moderate'|'aggressive'} riskProfile - Risk tolerance level
 * @returns {number} Percentage of equities (0-95)
 */
export function getBaseAllocation(age, riskProfile) {
    const baseRule = {
        conservative: 100,
        moderate: 110,
        aggressive: 120
    }[riskProfile];

    return Math.min(95, Math.max(20, baseRule - age));
}

/**
 * Calculate comprehensive allocation considering all factors
 */
export function calculateAllocation(params) {
    const {
        questionnaireScore = 25, // 8-40 range from 8 questions (1-5 each)
        age = 52,
        yearsToRetirement = 13,
        jobStability = 'stable', // 'very_stable', 'stable', 'variable', 'highly_variable'
        guaranteedIncome = 30000, // Annual SS + pension
        incomeGoal = 60000 // Desired retirement income
    } = params;

    // Base: 1-10 risk score mapped from questionnaire (8-40 → 1-10)
    const riskScore = Math.round((questionnaireScore - 8) / 32 * 9) + 1;

    // Map risk score to equity percentage (10-100%)
    let equityPct = 0.10 + (riskScore - 1) * 0.10;

    // Time horizon constraint
    const timeMultiplier = yearsToRetirement > 20 ? 1.0 :
        yearsToRetirement > 10 ? 0.90 :
            yearsToRetirement > 5 ? 0.75 : 0.50;
    equityPct *= timeMultiplier;

    // Human capital adjustment (job stability acts like a bond)
    const jobAdjustment = {
        very_stable: 0.10,
        stable: 0.05,
        variable: 0,
        highly_variable: -0.10
    }[jobStability] * Math.max(0, (65 - age) / 40);

    // Guaranteed income boost (pension/SS as bond-like asset)
    const giBoost = Math.min(0.15, (guaranteedIncome / incomeGoal) * 0.15);

    // Final equity allocation (clamped 10-95%)
    equityPct = Math.max(0.10, Math.min(0.95, equityPct + jobAdjustment + giBoost));

    return {
        riskScore,
        equityPercentage: equityPct,
        bondPercentage: 1 - equityPct,
        allocation: buildAllocationFromEquityPct(equityPct, riskScore),
        factors: {
            baseFromQuestionnaire: 0.10 + (riskScore - 1) * 0.10,
            timeMultiplier,
            jobAdjustment,
            guaranteedIncomeBoost: giBoost
        }
    };
}

/**
 * Build detailed allocation from equity percentage
 */
function buildAllocationFromEquityPct(equityPct, riskScore) {
    const bondPct = 1 - equityPct;

    // Equity split based on risk score
    let usLargeCap, usSmallCap, intlDeveloped, emergingMarkets;

    if (riskScore <= 3) {
        // Conservative: mostly US large cap
        usLargeCap = equityPct * 0.70;
        usSmallCap = equityPct * 0.05;
        intlDeveloped = equityPct * 0.20;
        emergingMarkets = equityPct * 0.05;
    } else if (riskScore <= 6) {
        // Moderate: balanced
        usLargeCap = equityPct * 0.55;
        usSmallCap = equityPct * 0.10;
        intlDeveloped = equityPct * 0.25;
        emergingMarkets = equityPct * 0.10;
    } else {
        // Aggressive: more international and small cap
        usLargeCap = equityPct * 0.45;
        usSmallCap = equityPct * 0.15;
        intlDeveloped = equityPct * 0.25;
        emergingMarkets = equityPct * 0.15;
    }

    // Bond split
    const usAggregateBonds = bondPct * 0.60;
    const tips = bondPct * 0.25;
    const cashMoneyMarket = bondPct * 0.15;

    return {
        usLargeCap,
        usSmallCap,
        intlDeveloped,
        emergingMarkets,
        usAggregateBonds,
        tips,
        cashMoneyMarket
    };
}

/**
 * Calculate glide path over time
 * Returns allocation for each year until end age
 */
export function calculateGlidePath(startAge, retirementAge, endAge, startAllocation) {
    const glidePath = [];
    let currentEquity = startAllocation.equityPercentage;

    for (let age = startAge; age <= endAge; age++) {
        // Before retirement: reduce by 1.5% per year in final 15 years
        if (age < retirementAge && retirementAge - age <= 15) {
            currentEquity = Math.max(0.20, currentEquity - 0.015);
        }
        // After retirement: continue reducing to floor
        else if (age >= retirementAge && age < retirementAge + 7) {
            currentEquity = Math.max(0.30, currentEquity - 0.03); // Faster reduction post-retirement
        }

        glidePath.push({
            age,
            equityPercentage: currentEquity,
            bondPercentage: 1 - currentEquity,
            phase: age < retirementAge ? 'accumulation' : 'distribution'
        });
    }

    return glidePath;
}

/**
 * Calculate bucket strategy allocation
 * Divides assets into 3 time-based pools
 */
export function calculateBucketStrategy(params) {
    const {
        totalPortfolio = 1000000,
        annualExpenses = 50000,
        yearsUntilNeeded = 0 // If 0, this is for retirement
    } = params;

    // Bucket 1: 2 years of expenses in cash
    const bucket1 = Math.min(annualExpenses * 2, totalPortfolio * 0.20);

    // Bucket 2: 8 years in bonds
    const bucket2 = Math.min(annualExpenses * 8, (totalPortfolio - bucket1) * 0.50);

    // Bucket 3: Remainder in equities
    const bucket3 = totalPortfolio - bucket1 - bucket2;

    return {
        bucket1: {
            name: 'Short-Term (Cash)',
            amount: bucket1,
            percentage: bucket1 / totalPortfolio,
            years: 2,
            purpose: 'Immediate expenses, emergency fund',
            suggestedFunds: ['Money market', 'Short-term Treasuries']
        },
        bucket2: {
            name: 'Medium-Term (Bonds)',
            amount: bucket2,
            percentage: bucket2 / totalPortfolio,
            years: 8,
            purpose: 'Bridge between cash and growth assets',
            suggestedFunds: ['BND', 'TIPS', 'Intermediate bonds']
        },
        bucket3: {
            name: 'Long-Term (Equities)',
            amount: bucket3,
            percentage: bucket3 / totalPortfolio,
            years: '10+',
            purpose: 'Growth to outpace inflation',
            suggestedFunds: ['VTI', 'VXUS', 'VBR']
        }
    };
}

/**
 * Get risk profile from questionnaire answers
 */
export function calculateRiskScore(answers) {
    // answers is array of 8 numbers (1-5 each)
    if (!answers || answers.length === 0) {
        return { score: 25, profile: 'moderate' };
    }

    const score = answers.reduce((sum, val) => sum + val, 0);

    let profile;
    if (score <= 16) profile = 'conservative';
    else if (score <= 24) profile = 'moderately_conservative';
    else if (score <= 32) profile = 'moderate';
    else if (score <= 36) profile = 'moderately_aggressive';
    else profile = 'aggressive';

    return { score, profile };
}

/**
 * Calculate expected portfolio return and volatility
 */
export function calculatePortfolioStats(allocation) {
    const { expectedReturns, volatility } = MARKET_DATA;

    let expectedReturn = 0;
    let portfolioVariance = 0;

    for (const [asset, weight] of Object.entries(allocation)) {
        if (weight > 0 && expectedReturns[asset]) {
            expectedReturn += weight * expectedReturns[asset];
            // Simplified variance (ignoring correlation for display purposes)
            portfolioVariance += Math.pow(weight * volatility[asset], 2);
        }
    }

    return {
        expectedReturn,
        volatility: Math.sqrt(portfolioVariance),
        expectedReturnFormatted: (expectedReturn * 100).toFixed(1) + '%',
        volatilityFormatted: (Math.sqrt(portfolioVariance) * 100).toFixed(1) + '%'
    };
}
