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
 * Now handles home ownership as an asset class with sale after holding period
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
        inflationRate,
        // Housing params (optional)
        housingParams = null,
        // Near-term crash probability (0-60%)
        nearTermCrashProbability = 20
    } = params;

    const { expectedReturns, volatility } = MARKET_DATA;
    const monthsToRetirement = (retirementAge - currentAge) * 12;
    const totalMonths = (endAge - currentAge) * 12;

    // Check if we have home ownership in the allocation
    const homeAllocationPct = allocation.residentialRealEstate || 0;
    const hasHome = homeAllocationPct > 0 && housingParams;

    // Split portfolio between liquid assets and home
    let homeValue = hasHome ? initialPortfolio * homeAllocationPct : 0;
    let portfolio = initialPortfolio - homeValue;

    // Create liquid allocation (excluding home from the liquid portion)
    let liquidAllocation = { ...allocation };
    if (hasHome) {
        delete liquidAllocation.residentialRealEstate;
        // Renormalize liquid allocation to sum to 1
        const liquidTotal = Object.values(liquidAllocation).reduce((s, v) => s + v, 0);
        if (liquidTotal > 0) {
            for (const key of Object.keys(liquidAllocation)) {
                liquidAllocation[key] = liquidAllocation[key] / liquidTotal;
            }
        }
    }
    let currentAllocation = { ...liquidAllocation };

    // Housing state
    const holdingPeriodMonths = hasHome ? (housingParams.holdingPeriodYears || 13) * 12 : 0;
    const monthlyRent = hasHome ? (housingParams.monthlyRent || 0) : 0;
    let currentMonthlyOwnershipCosts = hasHome ? (housingParams.monthlyOwnershipCosts || 0) : 0;
    let hasSoldHome = false;
    let currentMonthlyRent = 0; // Only applies after selling home

    let currentWithdrawal = annualWithdrawal;
    let lastYearReturn = 0;
    let minWithdrawalRatio = 1;
    let maxWithdrawalRatio = 1;
    let annualReturnAccumulator = 0;
    let guardrailsIncreaseCount = 0;
    let guardrailsDecreaseCount = 0;
    let guardrailsFreezeCount = 0;
    let yearsIntoRetirement = 0;
    const initialRetirementWithdrawal = annualWithdrawal;

    // Near-term crash injection logic
    // Decide if this simulation experiences an early crash based on user probability
    const crashWindow = 36; // 3 years in months
    const crashProbDecimal = nearTermCrashProbability / 100;
    const hasCrash = Math.random() < crashProbDecimal;
    // If crash occurs, it will be a ~25% drawdown spread over 6-18 months
    const crashMagnitude = 0.25; // 25% total drawdown
    const crashDuration = 6 + Math.floor(Math.random() * 12); // 6-18 months
    const crashStartMonth = 1 + Math.floor(Math.random() * (crashWindow - crashDuration)); // Random start within crash window
    const monthlyDrawdown = crashMagnitude / crashDuration;

    const trajectory = [{
        age: currentAge,
        portfolio: portfolio,
        homeValue: homeValue,
        netWorth: portfolio + homeValue,
        phase: 'accumulation'
    }];

    for (let month = 1; month <= totalMonths; month++) {
        const currentAgeInMonths = currentAge * 12 + month;
        const age = currentAgeInMonths / 12;
        const isRetired = month > monthsToRetirement;

        // Apply glide path (reduce equities by 1.5% per year in accumulation phase)
        if (glidePathEnabled && month % 12 === 0 && !isRetired) {
            const equityReduction = 0.015;
            let totalEquity = (currentAllocation.usLargeCap || 0) +
                (currentAllocation.usSmallCap || 0) +
                (currentAllocation.intlDeveloped || 0) +
                (currentAllocation.emergingMarkets || 0);

            if (totalEquity > 0.20) {
                const reductionFactor = (totalEquity - equityReduction) / totalEquity;
                const bondIncrease = equityReduction;

                if (currentAllocation.usLargeCap) currentAllocation.usLargeCap *= reductionFactor;
                if (currentAllocation.usSmallCap) currentAllocation.usSmallCap *= reductionFactor;
                if (currentAllocation.intlDeveloped) currentAllocation.intlDeveloped *= reductionFactor;
                if (currentAllocation.emergingMarkets) currentAllocation.emergingMarkets *= reductionFactor;
                currentAllocation.usAggregateBonds = (currentAllocation.usAggregateBonds || 0) + bondIncrease;
            }
        }

        // Inflate ownership costs annually (if homeowner and haven't sold)
        // Use conservative 3% annual inflation for all ownership costs
        if (hasHome && !hasSoldHome && month % 12 === 0 && month > 0) {
            const ownershipCostInflation = 0.03; // 3% annual inflation
            currentMonthlyOwnershipCosts *= (1 + ownershipCostInflation);
        }

        // Generate monthly return for liquid portfolio
        let monthlyReturn = generatePortfolioReturn(currentAllocation, expectedReturns, volatility);

        // Apply crash injection if this simulation has a crash and we're in the crash window
        if (hasCrash && month >= crashStartMonth && month < crashStartMonth + crashDuration) {
            // Apply negative shock to equities portion of portfolio
            const equityWeight = (currentAllocation.usLargeCap || 0) +
                (currentAllocation.usSmallCap || 0) +
                (currentAllocation.intlDeveloped || 0) +
                (currentAllocation.emergingMarkets || 0);
            // Scale the drawdown by equity weight (cash/bonds less affected)
            monthlyReturn -= monthlyDrawdown * equityWeight;
        }

        portfolio *= (1 + monthlyReturn);

        // Accumulate monthly returns for annual return calculation
        annualReturnAccumulator += monthlyReturn;

        // Handle home appreciation if still owned
        if (hasHome && !hasSoldHome && homeValue > 0) {
            const homeReturn = generateMonthlyReturn(
                expectedReturns.residentialRealEstate || 0.035,
                volatility.residentialRealEstate || 0.08,
                false // Use normal distribution for real estate
            );
            homeValue *= (1 + homeReturn);

            // Check if it's time to sell (after holding period)
            // If holding period is 999+ years, never sell (keep home forever)
            const neverSell = holdingPeriodMonths >= 999 * 12;
            if (!neverSell && month >= holdingPeriodMonths) {
                const sellingCosts = 0.06; // 6% selling costs
                const netProceeds = homeValue * (1 - sellingCosts);
                portfolio += netProceeds;
                homeValue = 0;
                hasSoldHome = true;

                // Start paying rent (inflation-adjusted to this point)
                const yearsOwned = holdingPeriodMonths / 12;
                currentMonthlyRent = monthlyRent * Math.pow(1 + inflationRate, yearsOwned);
            }
        }

        // Apply contribution or withdrawal
        if (!isRetired) {
            // Accumulation phase: add contributions
            portfolio += monthlyContribution;

            // If homeowner, add rent savings minus ownership costs
            if (hasHome && !hasSoldHome) {
                const netMonthlySavings = monthlyRent - currentMonthlyOwnershipCosts;
                portfolio += netMonthlySavings;
            }
        } else {
            // Distribution phase: apply withdrawal strategy
            let monthlyWithdrawal = currentWithdrawal / 12;

            // NOTE: We do NOT add rent after selling home. The desiredIncome already
            // includes housing costs (consistent with "never bought" scenario where
            // rent is implicitly part of living expenses).

            if (withdrawalStrategy === 'guardrails' && month % 12 === 0) {
                const priorWithdrawal = currentWithdrawal;
                currentWithdrawal = applyGuardrails(
                    portfolio,
                    currentWithdrawal,
                    inflationRate,
                    lastYearReturn,
                    endAge - age
                );

                // Track what guardrails did
                if (currentWithdrawal > priorWithdrawal * 1.05) {
                    guardrailsIncreaseCount++;
                } else if (currentWithdrawal < priorWithdrawal * 0.95) {
                    guardrailsDecreaseCount++;
                } else if (Math.abs(currentWithdrawal - priorWithdrawal) < priorWithdrawal * 0.01) {
                    guardrailsFreezeCount++;
                }
            } else if (withdrawalStrategy === 'fixed' && month % 12 === 0) {
                currentWithdrawal *= (1 + inflationRate);
            }

            portfolio -= monthlyWithdrawal;
        }

        // Track annual return for guardrails
        if (month % 12 === 0) {
            // Use the sum of 12 monthly returns as the annual return
            lastYearReturn = annualReturnAccumulator;
            annualReturnAccumulator = 0; // Reset for next year

            if (isRetired && annualWithdrawal > 0) {
                // Calculate what the withdrawal SHOULD be with normal inflation
                const expectedWithdrawal = initialRetirementWithdrawal * Math.pow(1 + inflationRate, yearsIntoRetirement);
                const withdrawalRatio = currentWithdrawal / expectedWithdrawal;
                minWithdrawalRatio = Math.min(minWithdrawalRatio, withdrawalRatio);
                maxWithdrawalRatio = Math.max(maxWithdrawalRatio, withdrawalRatio);
                yearsIntoRetirement++;
            }
        }

        // Record trajectory at year boundaries
        if (month % 12 === 0) {
            trajectory.push({
                age: Math.round(age),
                portfolio: Math.max(0, portfolio),
                homeValue: homeValue,
                netWorth: Math.max(0, portfolio) + homeValue,
                phase: isRetired ? 'distribution' : 'accumulation'
            });
        }

        // Check for portfolio depletion
        if (portfolio <= 0) {
            portfolio = 0;
            const remainingYears = Math.ceil((totalMonths - month) / 12);
            for (let y = 0; y < remainingYears; y++) {
                trajectory.push({
                    age: Math.round(age + y + 1),
                    portfolio: 0,
                    homeValue: homeValue,
                    netWorth: homeValue,
                    phase: 'depleted'
                });
            }
            break;
        }
    }

    const incomeCut = minWithdrawalRatio < 1.0;

    return {
        trajectory,
        finalPortfolio: portfolio,
        finalHomeValue: homeValue,
        finalNetWorth: portfolio + homeValue,
        depleted: portfolio <= 0,
        incomeCut,
        minWithdrawalRatio,
        maxWithdrawalRatio,
        guardrailsIncreaseCount,
        guardrailsDecreaseCount,
        guardrailsFreezeCount,
        depletedAge: portfolio <= 0 ? trajectory.find(t => t.portfolio === 0)?.age : null,
        hasSoldHome
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
 * Build trajectory data by age using net worth (portfolio + home value)
 * This ensures the fan chart shows total wealth, not just liquid portfolio
 */
function buildTrajectoryByAge(results, currentAge, endAge) {
    const trajectoryByAge = {};
    for (let age = currentAge; age <= endAge; age++) {
        const netWorths = results
            .map(r => r.trajectory.find(t => t.age === age)?.netWorth || 0);

        trajectoryByAge[age] = {
            p10: percentile(netWorths, 10),
            p25: percentile(netWorths, 25),
            p50: percentile(netWorths, 50),
            p75: percentile(netWorths, 75),
            p90: percentile(netWorths, 90)
        };
    }
    return trajectoryByAge;
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
        glidePathEnabled = true,
        housingParams = null,  // Optional: { holdingPeriodYears, monthlyRent, monthlyOwnershipCosts }
        nearTermCrashProbability = 20 // 0-60%, probability of 20%+ crash in next 3 years
    } = params;

    const initialPortfolio = currentSavings + windfall;
    const inflationRate = MARKET_DATA.inflation.expected;

    // Calculate initial withdrawal at retirement
    // Adjust desiredIncome for inflation from today to retirement
    const yearsToRetirement = retirementAge - currentAge;
    const inflationAdjustedIncome = desiredIncome * Math.pow(1 + inflationRate, yearsToRetirement);

    // Project portfolio to retirement for fallback calculation
    const projectedAtRetirement = initialPortfolio * Math.pow(1.055, yearsToRetirement) +
        (monthlyContribution * 12) * ((Math.pow(1.055, yearsToRetirement) - 1) / 0.055);
    const plannedWithdrawal = inflationAdjustedIncome || projectedAtRetirement * withdrawalRate;

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
        inflationRate,
        housingParams,
        nearTermCrashProbability // Pass to individual simulations
    };

    // Run simulations
    const results = [];
    for (let i = 0; i < iterations; i++) {
        results.push(runSingleSimulation(simParams));
    }

    // Analyze results
    const finalPortfolios = results.map(r => r.finalPortfolio);
    // Success = portfolio didn't deplete AND income was never cut below target
    const successCount = results.filter(r => !r.depleted && !r.incomeCut).length;
    const successRate = successCount / iterations;

    // Also track partial success (portfolio survived but income was cut)
    const partialSuccessCount = results.filter(r => !r.depleted && r.incomeCut).length;

    // Guardrails debugging stats
    const avgGuardrailsIncreases = results.reduce((sum, r) => sum + (r.guardrailsIncreaseCount || 0), 0) / iterations;
    const avgGuardrailsDecreases = results.reduce((sum, r) => sum + (r.guardrailsDecreaseCount || 0), 0) / iterations;
    const avgGuardrailsFreezes = results.reduce((sum, r) => sum + (r.guardrailsFreezeCount || 0), 0) / iterations;
    const minWithdrawalRatios = results.map(r => r.minWithdrawalRatio);
    const maxWithdrawalRatios = results.map(r => r.maxWithdrawalRatio);

    // Calculate "funded through" age
    const fundedAges = results.map(r => {
        if (!r.depleted) return endAge;
        return r.depletedAge || endAge;
    });

    // Get percentile trajectories for fan chart (using netWorth to include home value)
    const trajectoryByAge = buildTrajectoryByAge(results, currentAge, endAge);

    return {
        // Summary statistics
        successRate,
        successCount,
        totalSimulations: iterations,

        // Age-based framing
        fundedThroughAge: Math.round(percentile(fundedAges, 10)), // Conservative: 10th percentile
        medianFundedAge: Math.round(percentile(fundedAges, 50)),

        // Portfolio projections at retirement (including home value if still owned)
        portfolioAtRetirement: {
            p10: percentile(
                results.map(r => r.trajectory.find(t => t.age === retirementAge)?.netWorth || 0),
                10
            ),
            p50: percentile(
                results.map(r => r.trajectory.find(t => t.age === retirementAge)?.netWorth || 0),
                50
            ),
            p90: percentile(
                results.map(r => r.trajectory.find(t => t.age === retirementAge)?.netWorth || 0),
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

        // Debugging: withdrawal ratio statistics
        withdrawalRatioStats: {
            minWithdrawalRatio: {
                p10: percentile(minWithdrawalRatios, 10),
                p50: percentile(minWithdrawalRatios, 50),
                p90: percentile(minWithdrawalRatios, 90)
            },
            maxWithdrawalRatio: {
                p10: percentile(maxWithdrawalRatios, 10),
                p50: percentile(maxWithdrawalRatios, 50),
                p90: percentile(maxWithdrawalRatios, 90)
            },
            avgGuardrailsIncreases,
            avgGuardrailsDecreases,
            avgGuardrailsFreezes
        },

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

/**
 * Generate a monthly return for residential real estate
 * Correlated with inflation and equities
 */
function generateHomeReturn(inflationFactor, equityFactor) {
    const { expectedReturns, volatility } = MARKET_DATA;
    const annualReturn = expectedReturns.residentialRealEstate || 0.035;
    const annualVol = volatility.residentialRealEstate || 0.08;

    const monthlyMean = annualReturn / 12;
    const monthlyVol = annualVol / Math.sqrt(12);

    // Correlated with inflation (0.6) and equities (0.2)
    const systematic = 0.6 * inflationFactor + 0.2 * equityFactor;
    const idiosyncratic = generateStandardNormal() * 0.8;
    const combinedZ = systematic * 0.4 + idiosyncratic * 0.6;

    // Use lognormal for real estate (prevents negative values)
    const logReturn = monthlyMean - (monthlyVol * monthlyVol) / 2 + monthlyVol * combinedZ;
    return Math.exp(logReturn) - 1;
}

/**
 * Run a single simulation path with home ownership
 * Tracks both liquid portfolio and home equity
 */
function runSingleSimulationWithHome(params) {
    const {
        currentAge,
        retirementAge,
        endAge,
        initialLiquidPortfolio,
        initialHomeValue,
        monthlyContribution,
        monthlyRentSavings,      // Rent eliminated by home purchase
        monthlyOwnershipCosts,   // Property tax, insurance, maintenance, HOA
        annualWithdrawal,
        withdrawalStrategy,
        allocation,
        glidePathEnabled,
        inflationRate,
        holdingPeriodYears,      // Expected holding period
        isRenter = false         // Whether this is the renting scenario
    } = params;

    const { expectedReturns, volatility } = MARKET_DATA;
    const monthsToRetirement = (retirementAge - currentAge) * 12;
    const totalMonths = (endAge - currentAge) * 12;
    const holdingPeriodMonths = holdingPeriodYears * 12;

    let portfolio = initialLiquidPortfolio;
    let homeValue = isRenter ? 0 : initialHomeValue;
    let currentAllocation = { ...allocation };
    let currentWithdrawal = annualWithdrawal;
    let lastYearReturn = 0;
    let minWithdrawalRatio = 1;
    let hasSoldHome = false;
    let monthlyRent = isRenter ? (params.originalMonthlyRent || 0) : 0;
    let currentMonthlyOwnershipCosts = monthlyOwnershipCosts;
    let maxWithdrawalRatio = 1;
    let annualReturnAccumulator = 0;
    let guardrailsIncreaseCount = 0;
    let guardrailsDecreaseCount = 0;
    let guardrailsFreezeCount = 0;
    let yearsIntoRetirement = 0;
    const initialRetirementWithdrawal = annualWithdrawal;

    const trajectory = [{
        age: currentAge,
        portfolio: portfolio,
        homeValue: homeValue,
        netWorth: portfolio + homeValue,
        phase: 'accumulation'
    }];

    for (let month = 1; month <= totalMonths; month++) {
        const currentAgeInMonths = currentAge * 12 + month;
        const age = currentAgeInMonths / 12;
        const isRetired = month > monthsToRetirement;

        // Generate common market factors for correlation
        const equityFactor = generateStandardNormal();
        const bondFactor = generateStandardNormal();
        const inflationFactor = generateStandardNormal();

        // Apply glide path (reduce equities)
        if (glidePathEnabled && month % 12 === 0 && !isRetired) {
            const equityReduction = 0.015;
            let totalEquity = (currentAllocation.usLargeCap || 0) +
                (currentAllocation.usSmallCap || 0) +
                (currentAllocation.intlDeveloped || 0) +
                (currentAllocation.emergingMarkets || 0);

            if (totalEquity > 0.20) {
                const reductionFactor = (totalEquity - equityReduction) / totalEquity;
                const bondIncrease = equityReduction;

                if (currentAllocation.usLargeCap) currentAllocation.usLargeCap *= reductionFactor;
                if (currentAllocation.usSmallCap) currentAllocation.usSmallCap *= reductionFactor;
                if (currentAllocation.intlDeveloped) currentAllocation.intlDeveloped *= reductionFactor;
                if (currentAllocation.emergingMarkets) currentAllocation.emergingMarkets *= reductionFactor;
                currentAllocation.usAggregateBonds = (currentAllocation.usAggregateBonds || 0) + bondIncrease;
            }
        }

        // Inflate ownership costs annually (if homeowner and haven't sold)
        // Use conservative 3% annual inflation for all ownership costs
        if (!isRenter && !hasSoldHome && month % 12 === 0 && month > 0) {
            const ownershipCostInflation = 0.03; // 3% annual inflation
            currentMonthlyOwnershipCosts *= (1 + ownershipCostInflation);
        }

        // Generate portfolio return
        const monthlyReturn = generatePortfolioReturn(currentAllocation, expectedReturns, volatility);
        portfolio *= (1 + monthlyReturn);

        // Accumulate monthly returns for annual return calculation
        annualReturnAccumulator += monthlyReturn;

        // Handle home value if owner and hasn't sold
        if (!isRenter && !hasSoldHome && homeValue > 0) {
            const homeReturn = generateHomeReturn(inflationFactor, equityFactor);
            homeValue *= (1 + homeReturn);

            // Check if it's time to sell (at holding period)
            // If holding period is 999+ years, never sell (keep home forever)
            const neverSell = holdingPeriodYears >= 999;
            if (!neverSell && month === holdingPeriodMonths && month < totalMonths) {
                const sellingCosts = 0.06; // 6% selling costs
                const netProceeds = homeValue * (1 - sellingCosts);
                portfolio += netProceeds;
                homeValue = 0;
                hasSoldHome = true;

                // Calculate current inflation-adjusted rent
                const yearsOwned = holdingPeriodYears;
                monthlyRent = (params.originalMonthlyRent || 0) * Math.pow(1 + inflationRate, yearsOwned);
            }
        }

        // Apply contributions or withdrawals
        if (!isRetired) {
            // Accumulation phase
            if (isRenter) {
                // Renter: standard contribution (rent is part of expenses, not modeled separately)
                portfolio += monthlyContribution;
            } else if (!hasSoldHome) {
                // Homeowner: contribution + rent savings - ownership costs
                const netMonthlyBenefit = monthlyRentSavings - currentMonthlyOwnershipCosts;
                portfolio += monthlyContribution + netMonthlyBenefit;
            } else {
                // Sold home, back to renting: just standard contribution
                portfolio += monthlyContribution;
            }
        } else {
            // Distribution phase
            let monthlyWithdrawal = currentWithdrawal / 12;

            // NOTE: We do NOT add rent after selling home. The desiredIncome already
            // includes housing costs (consistent with "never bought" scenario).

            if (withdrawalStrategy === 'guardrails' && month % 12 === 0) {
                const priorWithdrawal = currentWithdrawal;
                currentWithdrawal = applyGuardrails(
                    portfolio,
                    currentWithdrawal,
                    inflationRate,
                    lastYearReturn,
                    endAge - age
                );

                // Track what guardrails did
                if (currentWithdrawal > priorWithdrawal * 1.05) {
                    guardrailsIncreaseCount++;
                } else if (currentWithdrawal < priorWithdrawal * 0.95) {
                    guardrailsDecreaseCount++;
                } else if (Math.abs(currentWithdrawal - priorWithdrawal) < priorWithdrawal * 0.01) {
                    guardrailsFreezeCount++;
                }
            } else if (withdrawalStrategy === 'fixed' && month % 12 === 0) {
                currentWithdrawal *= (1 + inflationRate);
            }

            portfolio -= monthlyWithdrawal;
        }

        // Track annual return for guardrails
        if (month % 12 === 0) {
            // Use the sum of 12 monthly returns as the annual return
            lastYearReturn = annualReturnAccumulator;
            annualReturnAccumulator = 0; // Reset for next year

            if (isRetired && annualWithdrawal > 0) {
                // Calculate what the withdrawal SHOULD be with normal inflation
                const expectedWithdrawal = initialRetirementWithdrawal * Math.pow(1 + inflationRate, yearsIntoRetirement);
                const withdrawalRatio = currentWithdrawal / expectedWithdrawal;
                minWithdrawalRatio = Math.min(minWithdrawalRatio, withdrawalRatio);
                maxWithdrawalRatio = Math.max(maxWithdrawalRatio, withdrawalRatio);
                yearsIntoRetirement++;
            }
        }

        // Record trajectory at year boundaries
        if (month % 12 === 0) {
            trajectory.push({
                age: Math.round(age),
                portfolio: Math.max(0, portfolio),
                homeValue: homeValue,
                netWorth: Math.max(0, portfolio) + homeValue,
                phase: isRetired ? 'distribution' : 'accumulation'
            });
        }

        // Check for portfolio depletion
        if (portfolio <= 0) {
            portfolio = 0;
            const remainingYears = Math.ceil((totalMonths - month) / 12);
            for (let y = 0; y < remainingYears; y++) {
                trajectory.push({
                    age: Math.round(age + y + 1),
                    portfolio: 0,
                    homeValue: homeValue,
                    netWorth: homeValue,
                    phase: 'depleted'
                });
            }
            break;
        }
    }

    const incomeCut = minWithdrawalRatio < 1.0;

    return {
        trajectory,
        finalPortfolio: portfolio,
        finalHomeValue: homeValue,
        finalNetWorth: portfolio + homeValue,
        depleted: portfolio <= 0,
        incomeCut,
        minWithdrawalRatio,
        maxWithdrawalRatio,
        guardrailsIncreaseCount,
        guardrailsDecreaseCount,
        guardrailsFreezeCount,
        depletedAge: portfolio <= 0 ? trajectory.find(t => t.portfolio === 0)?.age : null,
        hasSoldHome
    };
}

/**
 * Run housing comparison simulation (Rent vs Buy)
 * Runs parallel simulations for both scenarios with correlated market conditions
 */
export function runHousingComparisonSimulation(params, iterations = 500) {
    const {
        currentAge = 52,
        retirementAge = 65,
        endAge = 95,
        currentSavings = 10000000,
        windfall = 0,
        monthlyContribution = 2000,
        desiredIncome = 400000,
        withdrawalStrategy = 'guardrails',
        allocation = {},
        glidePathEnabled = true,
        // Housing-specific params
        homePurchasePrice = 2500000,
        monthlyRent = 14000,
        propertyTaxRate = 0.012,
        annualInsurance = 8000,
        maintenanceRate = 0.01,
        annualMaintenance = 5000,
        expectedHoldingYears = 13
    } = params;

    const totalPortfolio = currentSavings + windfall;
    const inflationRate = MARKET_DATA.inflation.expected;

    // Calculate monthly ownership costs
    const annualOwnershipCosts =
        (homePurchasePrice * propertyTaxRate) +
        annualInsurance +
        (homePurchasePrice * maintenanceRate) +
        annualMaintenance;
    const monthlyOwnershipCosts = annualOwnershipCosts / 12;

    // Adjust desired income for inflation to retirement
    const yearsToRetirement = retirementAge - currentAge;
    const inflationAdjustedIncome = desiredIncome * Math.pow(1 + inflationRate, yearsToRetirement);

    const rentResults = [];
    const buyResults = [];

    for (let i = 0; i < iterations; i++) {
        // RENT scenario: Full portfolio, standard contributions
        const rentResult = runSingleSimulationWithHome({
            currentAge,
            retirementAge,
            endAge,
            initialLiquidPortfolio: totalPortfolio,
            initialHomeValue: 0,
            monthlyContribution,
            monthlyRentSavings: 0,
            monthlyOwnershipCosts: 0,
            annualWithdrawal: inflationAdjustedIncome,
            withdrawalStrategy,
            allocation: normalizeAllocation(allocation),
            glidePathEnabled,
            inflationRate,
            holdingPeriodYears: 0,
            isRenter: true,
            originalMonthlyRent: monthlyRent
        });
        rentResults.push(rentResult);

        // BUY scenario: Reduced portfolio, increased contributions from rent savings
        const buyResult = runSingleSimulationWithHome({
            currentAge,
            retirementAge,
            endAge,
            initialLiquidPortfolio: totalPortfolio - homePurchasePrice,
            initialHomeValue: homePurchasePrice,
            monthlyContribution,
            monthlyRentSavings: monthlyRent,
            monthlyOwnershipCosts,
            annualWithdrawal: inflationAdjustedIncome,
            withdrawalStrategy,
            allocation: normalizeAllocation(allocation),
            glidePathEnabled,
            inflationRate,
            holdingPeriodYears: expectedHoldingYears,
            isRenter: false,
            originalMonthlyRent: monthlyRent
        });
        buyResults.push(buyResult);
    }

    // Analyze results
    const rentFinals = rentResults.map(r => r.finalNetWorth);
    const buyFinals = buyResults.map(r => r.finalNetWorth);

    const rentSuccessCount = rentResults.filter(r => !r.depleted && !r.incomeCut).length;
    const buySuccessCount = buyResults.filter(r => !r.depleted && !r.incomeCut).length;

    // Calculate which scenario wins more often
    let buyWinsCount = 0;
    for (let i = 0; i < iterations; i++) {
        if (buyResults[i].finalNetWorth > rentResults[i].finalNetWorth) {
            buyWinsCount++;
        }
    }

    // Calculate break-even year (when buying becomes advantageous in median case)
    let breakEvenYear = null;
    for (let year = 1; year <= endAge - currentAge; year++) {
        const rentMedians = rentResults.map(r =>
            r.trajectory.find(t => t.age === currentAge + year)?.netWorth || 0
        );
        const buyMedians = buyResults.map(r =>
            r.trajectory.find(t => t.age === currentAge + year)?.netWorth || 0
        );

        const rentMedian = percentile(rentMedians, 50);
        const buyMedian = percentile(buyMedians, 50);

        if (buyMedian > rentMedian && breakEvenYear === null) {
            breakEvenYear = year;
            break;
        }
    }

    return {
        rent: {
            successRate: rentSuccessCount / iterations,
            finalNetWorth: {
                p10: percentile(rentFinals, 10),
                p25: percentile(rentFinals, 25),
                p50: percentile(rentFinals, 50),
                p75: percentile(rentFinals, 75),
                p90: percentile(rentFinals, 90)
            },
            trajectoryByAge: buildTrajectoryByAge(rentResults, currentAge, endAge)
        },
        buy: {
            successRate: buySuccessCount / iterations,
            finalNetWorth: {
                p10: percentile(buyFinals, 10),
                p25: percentile(buyFinals, 25),
                p50: percentile(buyFinals, 50),
                p75: percentile(buyFinals, 75),
                p90: percentile(buyFinals, 90)
            },
            trajectoryByAge: buildTrajectoryByAge(buyResults, currentAge, endAge),
            soldHomeCount: buyResults.filter(r => r.hasSoldHome).length
        },
        comparison: {
            buyWinsPercentage: (buyWinsCount / iterations) * 100,
            breakEvenYear: breakEvenYear,
            monthlySavingsFromBuying: monthlyRent - monthlyOwnershipCosts,
            initialPortfolioDifference: homePurchasePrice
        },
        inputs: {
            homePurchasePrice,
            monthlyRent,
            monthlyOwnershipCosts,
            expectedHoldingYears
        }
    };
}
