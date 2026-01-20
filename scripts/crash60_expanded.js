/**
 * EXPANDED CRASH 60% SCENARIO RUNNER
 * 
 * Adds Buy-1yr scenarios for $400K and $500K income at 60% crash
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
    endAge: 95,
    riskAnswers: [4, 4, 4, 4, 4, 4, 4, 4],
    socialSecurityMonthly: 2500,
    socialSecurityAge: 67,
    otherGuaranteedIncome: 0,
    filingStatus: 'married',
    jobStability: 'stable',
    withdrawalStrategy: 'fixed',
    useGlidePath: true,
    monthlyRent: 14000,
    homePurchasePrice: 3000000,
    propertyTaxRate: 0.012,
    annualInsurance: 5000,
    maintenanceRate: 0.0075
};

// --- PREDEFINED ALLOCATIONS ---
const ALLOCATIONS = {
    'Current': {
        usLargeCap: 0.22, usSmallCap: 0.04, intlDeveloped: 0.10, emergingMarkets: 0.01,
        usAggregateBonds: 0.23, tips: 0.00, cashMoneyMarket: 0.40
    },
    'Income-Focused': {
        usLargeCap: 0.30, usSmallCap: 0.00, intlDeveloped: 0.10, emergingMarkets: 0.00,
        usAggregateBonds: 0.30, tips: 0.15, highYieldBonds: 0.10, cashMoneyMarket: 0.05
    }
};

function formatCurrency(val) {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    return `$${(val / 1000).toFixed(0)}K`;
}

function formatPercent(val) {
    return `${(val * 100).toFixed(1)}%`;
}

function getRiskMatchedAllocation(inputs) {
    const riskProfile = calculateRiskProfile(inputs.riskAnswers);
    const guaranteedIncome = (inputs.socialSecurityMonthly * 12) + inputs.otherGuaranteedIncome;
    const allocationResult = calculateAllocation({
        questionnaireScore: riskProfile.score, age: inputs.age,
        yearsToRetirement: inputs.retirementAge - inputs.age,
        jobStability: inputs.jobStability, guaranteedIncome: guaranteedIncome,
        incomeGoal: inputs.desiredIncome
    });
    return allocationResult.allocation;
}

function calculateOwnershipCosts(homePurchasePrice, propertyTaxRate, annualInsurance, maintenanceRate) {
    return (homePurchasePrice * propertyTaxRate) + annualInsurance + (homePurchasePrice * maintenanceRate);
}

function runRentScenario(params, allocation) {
    return runMonteCarloSimulation({
        currentAge: params.age, retirementAge: params.retirementAge, endAge: params.endAge,
        currentSavings: params.currentSavings, windfall: 0, monthlyContribution: params.monthlyContribution,
        desiredIncome: params.desiredIncome, withdrawalStrategy: params.withdrawalStrategy,
        allocation: allocation, glidePathEnabled: params.useGlidePath, housingParams: null,
        nearTermCrashProbability: CRASH_PROBABILITY
    }, ITERATIONS);
}

function runBuyScenario(params, allocation, holdingYears) {
    const annualOwnershipCosts = calculateOwnershipCosts(
        params.homePurchasePrice, params.propertyTaxRate, params.annualInsurance, params.maintenanceRate
    );
    const homeAllocationPct = params.homePurchasePrice / params.currentSavings;
    let finalAllocation = { ...allocation };

    let toDeduct = homeAllocationPct;
    const cashAvailable = finalAllocation.cashMoneyMarket || 0;
    finalAllocation.cashMoneyMarket = Math.max(0, cashAvailable - toDeduct);
    toDeduct -= Math.min(cashAvailable, toDeduct);

    if (toDeduct > 0) {
        const bondsAvailable = finalAllocation.usAggregateBonds || 0;
        finalAllocation.usAggregateBonds = Math.max(0, bondsAvailable - toDeduct);
        toDeduct -= Math.min(bondsAvailable, toDeduct);
    }
    if (toDeduct > 0) {
        for (const key of ['tips', 'highYieldBonds', 'usLargeCap', 'usSmallCap', 'intlDeveloped', 'emergingMarkets']) {
            if (toDeduct <= 0) break;
            const available = finalAllocation[key] || 0;
            finalAllocation[key] = Math.max(0, available - toDeduct);
            toDeduct -= Math.min(available, toDeduct);
        }
    }
    finalAllocation.residentialRealEstate = homeAllocationPct;

    return runMonteCarloSimulation({
        currentAge: params.age, retirementAge: params.retirementAge, endAge: params.endAge,
        currentSavings: params.currentSavings, windfall: 0, monthlyContribution: params.monthlyContribution,
        desiredIncome: params.desiredIncome, withdrawalStrategy: params.withdrawalStrategy,
        allocation: finalAllocation, glidePathEnabled: params.useGlidePath,
        housingParams: {
            holdingPeriodYears: holdingYears, monthlyRent: params.monthlyRent,
            monthlyOwnershipCosts: annualOwnershipCosts / 12, homePurchasePrice: params.homePurchasePrice
        },
        nearTermCrashProbability: CRASH_PROBABILITY
    }, ITERATIONS);
}

// --- MAIN ---
console.log('Running expanded 60% crash scenarios (10,000 iterations each)...\n');

const riskMatchedAllocation = getRiskMatchedAllocation({ ...BASELINE, desiredIncome: 500000 });

const STRATEGIES = [
    { name: 'Current', allocation: ALLOCATIONS['Current'] },
    { name: 'Risk-Matched', allocation: riskMatchedAllocation },
    { name: 'Income-Focused', allocation: ALLOCATIONS['Income-Focused'] }
];

const results = {};

for (const strategy of STRATEGIES) {
    results[strategy.name] = {};
    console.log(`Running: ${strategy.name}...`);

    for (const income of [400000, 500000]) {
        const params = { ...BASELINE, desiredIncome: income };
        const incomeKey = income === 400000 ? '400K' : '500K';

        results[strategy.name][incomeKey] = {
            rent: runRentScenario(params, strategy.allocation),
            buy1: runBuyScenario(params, strategy.allocation, 1),
            buy5: runBuyScenario(params, strategy.allocation, 5)
        };
    }
}

// Output Table
console.log('\n');
console.log('================================================================================');
console.log('HIGH PRECISION: 60% CRASH PROBABILITY (10,000 iterations each)');
console.log('================================================================================\n');

console.log('| Strategy       | $400K Rent     | $400K Buy-1yr  | $400K Buy-5yr  | $500K Rent     | $500K Buy-1yr  | $500K Buy-5yr  |');
console.log('|----------------|----------------|----------------|----------------|----------------|----------------|----------------|');

for (const strategy of STRATEGIES) {
    const r = results[strategy.name];
    const cells = [
        `${formatPercent(r['400K'].rent.successRate)} / ${formatCurrency(r['400K'].rent.finalPortfolio.p50)}`,
        `${formatPercent(r['400K'].buy1.successRate)} / ${formatCurrency(r['400K'].buy1.finalPortfolio.p50)}`,
        `${formatPercent(r['400K'].buy5.successRate)} / ${formatCurrency(r['400K'].buy5.finalPortfolio.p50)}`,
        `${formatPercent(r['500K'].rent.successRate)} / ${formatCurrency(r['500K'].rent.finalPortfolio.p50)}`,
        `${formatPercent(r['500K'].buy1.successRate)} / ${formatCurrency(r['500K'].buy1.finalPortfolio.p50)}`,
        `${formatPercent(r['500K'].buy5.successRate)} / ${formatCurrency(r['500K'].buy5.finalPortfolio.p50)}`
    ];
    console.log(`| ${strategy.name.padEnd(14)} | ${cells.map(c => c.padEnd(14)).join(' | ')} |`);
}

console.log('\n(Each cell: Success Rate / Median Legacy at age 95)');
