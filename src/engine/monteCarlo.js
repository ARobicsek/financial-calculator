/**
 * Monte Carlo Simulation Engine
 * Runs 1,000 iterations with monthly time steps for retirement projections
 */

import { MARKET_DATA } from '../data/marketData.js';

/**
 * Generate a standard normal random number using Box-Muller transform
 */
function generateStandardNormal() {
    let u1, u2;
    do {
        u1 = Math.random();
        u2 = Math.random();
    } while (u1 === 0);

    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generate a monthly return for a given asset class
 * Uses lognormal distribution for equities, normal for bonds
 */
function generateMonthlyReturn(annualMean, annualStdDev, isEquity = true) {
    const monthlyMean = annualMean / 12;
    const monthlyStdDev = annualStdDev / Math.sqrt(12);
    const z = generateStandardNormal();

    if (isEquity) {
        // Lognormal for equities (prevents negative prices)
        const logReturn = monthlyMean - (monthlyStdDev * monthlyStdDev) / 2 + monthlyStdDev * z;
        return Math.exp(logReturn) - 1;
    } else {
        // Normal for bonds
        return monthlyMean + monthlyStdDev * z;
    }
}

/**
 * Generate correlated returns for a multi-asset portfolio
 * Using simplified correlation structure
 */
function generatePortfolioReturn(allocation, returns, volatility) {
    // Simplified: generate weighted average return with some correlation
    // In production, would use Cholesky decomposition for proper correlation

    let portfolioReturn = 0;
    const equityClasses = ['usLargeCap', 'usSmallCap', 'intlDeveloped', 'emergingMarkets', 'reits'];

    // Generate a common equity factor
    const equityFactor = generateStandardNormal();
    const bondFactor = generateStandardNormal();

    for (const [asset, weight] of Object.entries(allocation)) {
        if (weight === 0) continue;

        const annualReturn = returns[asset] || 0.03;
        const annualVol = volatility[asset] || 0.05;
        const monthlyMean = annualReturn / 12;
        const monthlyVol = annualVol / Math.sqrt(12);

        // Mix common factor with idiosyncratic noise (roughly 70% common, 30% specific)
        const isEquity = equityClasses.includes(asset);
        const commonFactor = isEquity ? equityFactor : bondFactor;
        const specificFactor = generateStandardNormal();
        const combinedZ = 0.7 * commonFactor + 0.3 * specificFactor;

        let assetReturn;
        if (isEquity) {
            const logReturn = monthlyMean - (monthlyVol * monthlyVol) / 2 + monthlyVol * combinedZ;
            assetReturn = Math.exp(logReturn) - 1;
        } else {
            assetReturn = monthlyMean + monthlyVol * combinedZ;
        }

        portfolioReturn += weight * assetReturn;
    }

    return portfolioReturn;
}

/**
 * Run a single simulation path
 */
function runSingleSimulation(params) {
    const {
        currentAge,
        retirementAge,
        endAge,
        initialPortfolio,
        monthlyContribution,
        annualWithdrawal,
        withdrawalStrategy,
        allocation,
        glidePathEnabled,
        inflationRate
    } = params;

    const { expectedReturns, volatility } = MARKET_DATA;
    const monthsToRetirement = (retirementAge - currentAge) * 12;
    const totalMonths = (endAge - currentAge) * 12;

    let portfolio = initialPortfolio;
    let currentAllocation = { ...allocation };
    let currentWithdrawal = annualWithdrawal;
    let lastYearReturn = 0;

    const trajectory = [{
        age: currentAge,
        portfolio: portfolio,
        phase: 'accumulation'
    }];

    for (let month = 1; month <= totalMonths; month++) {
        const currentAgeInMonths = currentAge * 12 + month;
        const age = currentAgeInMonths / 12;
        const isRetired = month > monthsToRetirement;

        // Apply glide path (reduce equities by 1.5% per year in accumulation phase)
        if (glidePathEnabled && month % 12 === 0 && !isRetired) {
            const equityReduction = 0.015;
            // Reduce equity allocations proportionally
            let totalEquity = (currentAllocation.usLargeCap || 0) +
                (currentAllocation.usSmallCap || 0) +
                (currentAllocation.intlDeveloped || 0) +
                (currentAllocation.emergingMarkets || 0);

            if (totalEquity > 0.20) { // Don't go below 20% equities
                const reductionFactor = (totalEquity - equityReduction) / totalEquity;
                const bondIncrease = equityReduction;

                if (currentAllocation.usLargeCap) currentAllocation.usLargeCap *= reductionFactor;
                if (currentAllocation.usSmallCap) currentAllocation.usSmallCap *= reductionFactor;
                if (currentAllocation.intlDeveloped) currentAllocation.intlDeveloped *= reductionFactor;
                if (currentAllocation.emergingMarkets) currentAllocation.emergingMarkets *= reductionFactor;
                currentAllocation.usAggregateBonds = (currentAllocation.usAggregateBonds || 0) + bondIncrease;
            }
        }

        // Generate monthly return
        const monthlyReturn = generatePortfolioReturn(currentAllocation, expectedReturns, volatility);

        // Apply return
        portfolio *= (1 + monthlyReturn);

        // Apply contribution or withdrawal
        if (!isRetired) {
            // Accumulation phase: add contributions
            portfolio += monthlyContribution;
        } else {
            // Distribution phase: apply withdrawal strategy
            const monthlyWithdrawal = currentWithdrawal / 12;

            if (withdrawalStrategy === 'guardrails' && month % 12 === 0) {
                // Annual adjustment based on guardrails
                currentWithdrawal = applyGuardrails(
                    portfolio,
                    currentWithdrawal,
                    inflationRate,
                    lastYearReturn,
                    endAge - age
                );
            } else if (withdrawalStrategy === 'fixed' && month % 12 === 0) {
                // Fixed: just adjust for inflation
                currentWithdrawal *= (1 + inflationRate);
            }

            portfolio -= monthlyWithdrawal;
        }

        // Track annual return for guardrails
        if (month % 12 === 0) {
            lastYearReturn = monthlyReturn * 12; // Approximation
        }

        // Record trajectory at year boundaries
        if (month % 12 === 0) {
            trajectory.push({
                age: Math.round(age),
                portfolio: Math.max(0, portfolio),
                phase: isRetired ? 'distribution' : 'accumulation'
            });
        }

        // Check for portfolio depletion
        if (portfolio <= 0) {
            portfolio = 0;
            // Fill remaining trajectory with zeros
            const remainingYears = Math.ceil((totalMonths - month) / 12);
            for (let y = 0; y < remainingYears; y++) {
                trajectory.push({
                    age: Math.round(age + y + 1),
                    portfolio: 0,
                    phase: 'depleted'
                });
            }
            break;
        }
    }

    return {
        trajectory,
        finalPortfolio: portfolio,
        depleted: portfolio <= 0,
        depletedAge: portfolio <= 0 ? trajectory.find(t => t.portfolio === 0)?.age : null
    };
}

/**
 * Apply Guardrails withdrawal strategy (modified Guyton-Klinger)
 */
function applyGuardrails(portfolio, priorWithdrawal, inflation, priorReturn, yearsRemaining) {
    const currentRate = priorWithdrawal / portfolio;
    const initialRate = 0.045; // 4.5% initial rate

    // Upper guardrail: if rate falls 20% below initial, increase 10%
    if (currentRate < initialRate * 0.80) {
        return priorWithdrawal * 1.10;
    }

    // Lower guardrail: if rate rises 20% above initial, decrease 10%
    if (currentRate > initialRate * 1.20 && yearsRemaining > 15) {
        return priorWithdrawal * 0.90;
    }

    // Skip inflation adjustment after negative return year
    if (priorReturn < 0) {
        return priorWithdrawal;
    }

    // Normal case: adjust for inflation
    return priorWithdrawal * (1 + inflation);
}

/**
 * Calculate percentile value from sorted array
 */
function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

/**
 * Main Monte Carlo simulation runner
 * @param {Object} params - Simulation parameters
 * @param {number} iterations - Number of simulations (default 1000)
 * @returns {Object} Simulation results with statistics and trajectories
 */
export function runMonteCarloSimulation(params, iterations = 1000) {
    const {
        currentAge = 52,
        retirementAge = 65,
        endAge = 95,
        currentSavings = 500000,
        windfall = 200000,
        monthlyContribution = 2000,
        desiredIncome = 60000,
        withdrawalRate = 0.04,
        withdrawalStrategy = 'guardrails', // 'fixed' or 'guardrails'
        allocation = {},
        glidePathEnabled = true
    } = params;

    const initialPortfolio = currentSavings + windfall;
    const inflationRate = MARKET_DATA.inflation.expected;

    // Calculate initial withdrawal at retirement
    // Project portfolio to retirement first for planning
    const yearsToRetirement = retirementAge - currentAge;
    const projectedAtRetirement = initialPortfolio * Math.pow(1.055, yearsToRetirement) +
        (monthlyContribution * 12) * ((Math.pow(1.055, yearsToRetirement) - 1) / 0.055);
    const plannedWithdrawal = desiredIncome || projectedAtRetirement * withdrawalRate;

    const simParams = {
        currentAge,
        retirementAge,
        endAge,
        initialPortfolio,
        monthlyContribution,
        annualWithdrawal: plannedWithdrawal,
        withdrawalStrategy,
        allocation: normalizeAllocation(allocation),
        glidePathEnabled,
        inflationRate
    };

    // Run simulations
    const results = [];
    for (let i = 0; i < iterations; i++) {
        results.push(runSingleSimulation(simParams));
    }

    // Analyze results
    const finalPortfolios = results.map(r => r.finalPortfolio);
    const successCount = results.filter(r => !r.depleted).length;
    const successRate = successCount / iterations;

    // Calculate "funded through" age
    const fundedAges = results.map(r => {
        if (!r.depleted) return endAge;
        return r.depletedAge || endAge;
    });

    // Get percentile trajectories for fan chart
    const trajectoryByAge = {};
    for (let age = currentAge; age <= endAge; age++) {
        const portfoliosAtAge = results
            .map(r => r.trajectory.find(t => t.age === age)?.portfolio || 0)
            .filter(p => p !== undefined);

        trajectoryByAge[age] = {
            p10: percentile(portfoliosAtAge, 10),
            p25: percentile(portfoliosAtAge, 25),
            p50: percentile(portfoliosAtAge, 50),
            p75: percentile(portfoliosAtAge, 75),
            p90: percentile(portfoliosAtAge, 90)
        };
    }

    return {
        // Summary statistics
        successRate,
        successCount,
        totalSimulations: iterations,

        // Age-based framing
        fundedThroughAge: Math.round(percentile(fundedAges, 10)), // Conservative: 10th percentile
        medianFundedAge: Math.round(percentile(fundedAges, 50)),

        // Portfolio projections at retirement
        portfolioAtRetirement: {
            p10: percentile(
                results.map(r => r.trajectory.find(t => t.age === retirementAge)?.portfolio || 0),
                10
            ),
            p50: percentile(
                results.map(r => r.trajectory.find(t => t.age === retirementAge)?.portfolio || 0),
                50
            ),
            p90: percentile(
                results.map(r => r.trajectory.find(t => t.age === retirementAge)?.portfolio || 0),
                90
            )
        },

        // Final portfolio statistics
        finalPortfolio: {
            p10: percentile(finalPortfolios, 10),
            p25: percentile(finalPortfolios, 25),
            p50: percentile(finalPortfolios, 50),
            p75: percentile(finalPortfolios, 75),
            p90: percentile(finalPortfolios, 90)
        },

        // Trajectory data for fan chart
        trajectoryByAge,

        // Withdrawal info
        initialWithdrawal: plannedWithdrawal,
        withdrawalRate: plannedWithdrawal / projectedAtRetirement,

        // Inputs echoed back
        inputs: {
            currentAge,
            retirementAge,
            endAge,
            initialPortfolio,
            monthlyContribution,
            allocation: simParams.allocation,
            inflationRate
        }
    };
}

/**
 * Normalize allocation to ensure it sums to 1
 */
function normalizeAllocation(allocation) {
    const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    if (total === 0) {
        // Default moderate allocation
        return {
            usLargeCap: 0.35,
            intlDeveloped: 0.15,
            usSmallCap: 0.05,
            usAggregateBonds: 0.30,
            tips: 0.10,
            cashMoneyMarket: 0.05
        };
    }

    const normalized = {};
    for (const [key, value] of Object.entries(allocation)) {
        normalized[key] = value / total;
    }
    return normalized;
}

/**
 * Quick projection using deterministic returns (for real-time UI feedback)
 */
export function quickProjection(params) {
    const {
        currentAge = 52,
        retirementAge = 65,
        currentSavings = 500000,
        windfall = 0,
        monthlyContribution = 2000,
        expectedReturn = 0.055
    } = params;

    const initialPortfolio = currentSavings + windfall;
    const yearsToRetirement = retirementAge - currentAge;
    const monthlyReturn = expectedReturn / 12;
    const months = yearsToRetirement * 12;

    // Future value calculation
    const portfolioGrowth = initialPortfolio * Math.pow(1 + monthlyReturn, months);
    const contributionGrowth = monthlyContribution * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);

    return {
        projectedAtRetirement: portfolioGrowth + contributionGrowth,
        yearsToRetirement,
        totalContributions: monthlyContribution * months,
        totalGrowth: (portfolioGrowth + contributionGrowth) - initialPortfolio - (monthlyContribution * months)
    };
}
