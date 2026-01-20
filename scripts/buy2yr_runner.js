/**
 * BUY-2YR SCENARIO RUNNER (20% Crash)
 */

import { runMonteCarloSimulation } from './src/engine/monteCarlo.js';
import { calculateAllocation } from './src/engine/assetAllocation.js';
import { calculateRiskProfile } from './src/components/RiskQuestionnaire.js';

const ITERATIONS = 10000;
const CRASH_PROBABILITY = 20;

const BASELINE = {
    age: 52, currentSavings: 11100000, monthlyContribution: 2000,
    retirementAge: 65, endAge: 95, riskAnswers: [4, 4, 4, 4, 4, 4, 4, 4],
    socialSecurityMonthly: 2500, socialSecurityAge: 67, otherGuaranteedIncome: 0,
    filingStatus: 'married', jobStability: 'stable', withdrawalStrategy: 'fixed',
    useGlidePath: true, monthlyRent: 14000, homePurchasePrice: 3000000,
    propertyTaxRate: 0.012, annualInsurance: 5000, maintenanceRate: 0.0075
};

const ALLOCATIONS = {
    'Current': { usLargeCap: 0.22, usSmallCap: 0.04, intlDeveloped: 0.10, emergingMarkets: 0.01, usAggregateBonds: 0.23, tips: 0.00, cashMoneyMarket: 0.40 },
    'Income-Focused': { usLargeCap: 0.30, usSmallCap: 0.00, intlDeveloped: 0.10, emergingMarkets: 0.00, usAggregateBonds: 0.30, tips: 0.15, highYieldBonds: 0.10, cashMoneyMarket: 0.05 }
};

function formatCurrency(val) { return val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${(val / 1000).toFixed(0)}K`; }
function formatPercent(val) { return `${(val * 100).toFixed(1)}%`; }

function getRiskMatchedAllocation(inputs) {
    const riskProfile = calculateRiskProfile(inputs.riskAnswers);
    const guaranteedIncome = (inputs.socialSecurityMonthly * 12) + inputs.otherGuaranteedIncome;
    return calculateAllocation({
        questionnaireScore: riskProfile.score, age: inputs.age,
        yearsToRetirement: inputs.retirementAge - inputs.age,
        jobStability: inputs.jobStability, guaranteedIncome: guaranteedIncome,
        incomeGoal: inputs.desiredIncome
    }).allocation;
}

function calculateOwnershipCosts(price, taxRate, insurance, maintenance) {
    return (price * taxRate) + insurance + (price * maintenance);
}

function runBuy2yrScenario(params, allocation) {
    const holdingYears = 2;
    const annualOwnershipCosts = calculateOwnershipCosts(params.homePurchasePrice, params.propertyTaxRate, params.annualInsurance, params.maintenanceRate);
    const homeAllocationPct = params.homePurchasePrice / params.currentSavings;
    let finalAllocation = { ...allocation };

    let toDeduct = homeAllocationPct;
    for (const key of ['cashMoneyMarket', 'usAggregateBonds', 'tips', 'highYieldBonds', 'usLargeCap', 'usSmallCap', 'intlDeveloped', 'emergingMarkets']) {
        if (toDeduct <= 0) break;
        const available = finalAllocation[key] || 0;
        finalAllocation[key] = Math.max(0, available - toDeduct);
        toDeduct -= Math.min(available, toDeduct);
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

console.log('Running Buy-2yr scenarios at 20% crash (10,000 iterations each)...\n');

const riskMatchedAllocation = getRiskMatchedAllocation({ ...BASELINE, desiredIncome: 500000 });

const STRATEGIES = [
    { name: 'Current', allocation: ALLOCATIONS['Current'] },
    { name: 'Risk-Matched', allocation: riskMatchedAllocation },
    { name: 'Income-Focused', allocation: ALLOCATIONS['Income-Focused'] }
];

const results = {};

for (const strategy of STRATEGIES) {
    console.log(`Running: ${strategy.name}...`);
    results[strategy.name] = {};

    for (const income of [400000, 500000]) {
        const params = { ...BASELINE, desiredIncome: income };
        const result = runBuy2yrScenario(params, strategy.allocation);
        results[strategy.name][income] = { successRate: result.successRate, legacy: result.finalPortfolio.p50 };
    }
}

console.log('\n================================================================================');
console.log('BUY-2YR RESULTS (20% Crash Probability, 10,000 iterations each)');
console.log('================================================================================\n');

console.log('| Strategy       | $400K Buy-2yr  | $500K Buy-2yr  |');
console.log('|----------------|----------------|----------------|');

for (const strategy of STRATEGIES) {
    const r = results[strategy.name];
    console.log(`| ${strategy.name.padEnd(14)} | ${formatPercent(r[400000].successRate)} / ${formatCurrency(r[400000].legacy).padEnd(6)} | ${formatPercent(r[500000].successRate)} / ${formatCurrency(r[500000].legacy).padEnd(6)} |`);
}

console.log('\n(Each cell: Success Rate / Median Legacy at age 95)');
