/**
 * CRASH 60% SCENARIO RUNNER
 * 
 * Runs 6 variations with 10,000 iterations each:
 * - 3 Strategies: Current, Risk-Matched, Income-Focused
 * - 2 Housing Options: Rent, Buy-5yr
 * - Income: $500K
 * - Crash Probability: 60%
 */

import { runMonteCarloSimulation } from './src/engine/monteCarlo.js';
import { calculateAllocation, calculatePortfolioStats } from './src/engine/assetAllocation.js';
import { calculateRiskProfile } from './src/components/RiskQuestionnaire.js';

const ITERATIONS = 10000;
const CRASH_PROBABILITY = 60;

// --- BASELINE PARAMETERS ---
const BASELINE = {
    age: 52,
    currentSavings: 11100000,
    monthlyContribution: 2000,
    retirementAge: 65,
    desiredIncome: 500000,
    endAge: 95,
    riskAnswers: [4, 4, 4, 4, 4, 4, 4, 4],
    socialSecurityMonthly: 2500,
    socialSecurityAge: 67,
    otherGuaranteedIncome: 0,
    filingStatus: 'married',
    jobStability: 'stable',
    withdrawalStrategy: 'fixed',
    useGlidePath: true,
    nearTermCrashProbability: CRASH_PROBABILITY,
    monthlyRent: 14000,
    homePurchasePrice: 3000000,
    propertyTaxRate: 0.012,
    annualInsurance: 5000,
    maintenanceRate: 0.0075
};

// --- PREDEFINED ALLOCATIONS ---
const ALLOCATIONS = {
    'Current': {
        usLargeCap: 0.22,
        usSmallCap: 0.04,
        intlDeveloped: 0.10,
        emergingMarkets: 0.01,
        usAggregateBonds: 0.23,
        tips: 0.00,
        cashMoneyMarket: 0.40
    },
    'Income-Focused': {
        usLargeCap: 0.30,
        usSmallCap: 0.00,
        intlDeveloped: 0.10,
        emergingMarkets: 0.00,
        usAggregateBonds: 0.30,
        tips: 0.15,
        highYieldBonds: 0.10,
        cashMoneyMarket: 0.05
    }
};

// --- HELPER FUNCTIONS ---
function formatCurrency(val) {
    if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`;
    }
    return `$${(val / 1000).toFixed(0)}K`;
}

function formatPercent(val) {
    return `${(val * 100).toFixed(1)}%`;
}

function getRiskMatchedAllocation(inputs) {
    const riskProfile = calculateRiskProfile(inputs.riskAnswers);
    const guaranteedIncome = (inputs.socialSecurityMonthly * 12) + inputs.otherGuaranteedIncome;

    const allocationResult = calculateAllocation({
        questionnaireScore: riskProfile.score,
        age: inputs.age,
        yearsToRetirement: inputs.retirementAge - inputs.age,
        jobStability: inputs.jobStability,
        guaranteedIncome: guaranteedIncome,
        incomeGoal: inputs.desiredIncome
    });

    return allocationResult.allocation;
}

function calculateOwnershipCosts(homePurchasePrice, propertyTaxRate, annualInsurance, maintenanceRate) {
    return (homePurchasePrice * propertyTaxRate) + annualInsurance + (homePurchasePrice * maintenanceRate);
}

// --- SCENARIO RUNNERS ---
function runRentScenario(params, allocation) {
    const simParams = {
        currentAge: params.age,
        retirementAge: params.retirementAge,
        endAge: params.endAge,
        currentSavings: params.currentSavings,
        windfall: 0,
        monthlyContribution: params.monthlyContribution,
        desiredIncome: params.desiredIncome,
        withdrawalStrategy: params.withdrawalStrategy,
        allocation: allocation,
        glidePathEnabled: params.useGlidePath,
        housingParams: null,
        nearTermCrashProbability: CRASH_PROBABILITY
    };

    return runMonteCarloSimulation(simParams, ITERATIONS);
}

function runBuy5yrScenario(params, allocation) {
    const holdingYears = 5;
    const annualOwnershipCosts = calculateOwnershipCosts(
        params.homePurchasePrice,
        params.propertyTaxRate,
        params.annualInsurance,
        params.maintenanceRate
    );

    const homeAllocationPct = params.homePurchasePrice / params.currentSavings;
    let finalAllocation = { ...allocation };

    let toDeduct = homeAllocationPct;
    const cashAvailable = finalAllocation.cashMoneyMarket || 0;
    const cashDeduction = Math.min(cashAvailable, toDeduct);
    finalAllocation.cashMoneyMarket = cashAvailable - cashDeduction;
    toDeduct -= cashDeduction;

    if (toDeduct > 0) {
        const bondsAvailable = finalAllocation.usAggregateBonds || 0;
        const bondDeduction = Math.min(bondsAvailable, toDeduct);
        finalAllocation.usAggregateBonds = bondsAvailable - bondDeduction;
        toDeduct -= bondDeduction;
    }
    if (toDeduct > 0) {
        const tipsAvailable = finalAllocation.tips || 0;
        const tipsDeduction = Math.min(tipsAvailable, toDeduct);
        finalAllocation.tips = tipsAvailable - tipsDeduction;
        toDeduct -= tipsDeduction;
    }
    if (toDeduct > 0) {
        const highYieldAvailable = finalAllocation.highYieldBonds || 0;
        const hyDeduction = Math.min(highYieldAvailable, toDeduct);
        finalAllocation.highYieldBonds = highYieldAvailable - hyDeduction;
        toDeduct -= hyDeduction;
    }
    if (toDeduct > 0) {
        const equityKeys = ['usLargeCap', 'usSmallCap', 'intlDeveloped', 'emergingMarkets'];
        for (const key of equityKeys) {
            if (toDeduct <= 0) break;
            const available = finalAllocation[key] || 0;
            const deduction = Math.min(available, toDeduct);
            finalAllocation[key] = available - deduction;
            toDeduct -= deduction;
        }
    }
    finalAllocation.residentialRealEstate = homeAllocationPct;

    const housingParams = {
        holdingPeriodYears: holdingYears,
        monthlyRent: params.monthlyRent,
        monthlyOwnershipCosts: annualOwnershipCosts / 12,
        homePurchasePrice: params.homePurchasePrice
    };

    const simParams = {
        currentAge: params.age,
        retirementAge: params.retirementAge,
        endAge: params.endAge,
        currentSavings: params.currentSavings,
        windfall: 0,
        monthlyContribution: params.monthlyContribution,
        desiredIncome: params.desiredIncome,
        withdrawalStrategy: params.withdrawalStrategy,
        allocation: finalAllocation,
        glidePathEnabled: params.useGlidePath,
        housingParams: housingParams,
        nearTermCrashProbability: CRASH_PROBABILITY
    };

    return runMonteCarloSimulation(simParams, ITERATIONS);
}

// --- MAIN EXECUTION ---
console.log('='.repeat(80));
console.log('HIGH PRECISION: 60% CRASH SCENARIO ($500K Income)');
console.log('='.repeat(80));
console.log(`Iterations per scenario: ${ITERATIONS.toLocaleString()}`);
console.log('');

// Get Risk-Matched allocation
const riskMatchedAllocation = getRiskMatchedAllocation(BASELINE);

const STRATEGIES = [
    { name: 'Current', allocation: ALLOCATIONS['Current'] },
    { name: 'Risk-Matched', allocation: riskMatchedAllocation },
    { name: 'Income-Focused', allocation: ALLOCATIONS['Income-Focused'] }
];

// Run all 6 scenarios
console.log('Running 6 scenarios...');
console.log('');

const results = {};

for (const strategy of STRATEGIES) {
    console.log(`Running: ${strategy.name}...`);

    const rentResult = runRentScenario(BASELINE, strategy.allocation);
    const buyResult = runBuy5yrScenario(BASELINE, strategy.allocation);

    results[strategy.name] = {
        rent: { successRate: rentResult.successRate, legacy: rentResult.finalPortfolio.p50 },
        buy: { successRate: buyResult.successRate, legacy: buyResult.finalPortfolio.p50 }
    };
}

// Output Results Table
console.log('');
console.log('='.repeat(80));
console.log('RESULTS: $500K Income, 60% Crash Probability');
console.log('='.repeat(80));
console.log('');
console.log('| Strategy       | $500K Rent     | $500K Buy-5yr  |');
console.log('|----------------|----------------|----------------|');

for (const strategy of STRATEGIES) {
    const r = results[strategy.name];
    const rentCell = `${formatPercent(r.rent.successRate)} / ${formatCurrency(r.rent.legacy)}`;
    const buyCell = `${formatPercent(r.buy.successRate)} / ${formatCurrency(r.buy.legacy)}`;
    console.log(`| ${strategy.name.padEnd(14)} | ${rentCell.padEnd(14)} | ${buyCell.padEnd(14)} |`);
}

console.log('');
console.log('(Each cell shows: Success Rate / Median Legacy at age 95)');
console.log('');
console.log('='.repeat(80));
