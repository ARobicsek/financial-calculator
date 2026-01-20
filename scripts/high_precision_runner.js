/**
 * HIGH PRECISION SCENARIO RUNNER
 * 
 * Runs 12 variations with 10,000 iterations each for maximum accuracy:
 * - 3 Strategies: Current, Risk-Matched, Income-Focused
 * - 2 Housing Options: Rent, Buy-5yr
 * - 2 Income Levels: $400K, $500K
 */

import { runMonteCarloSimulation } from './src/engine/monteCarlo.js';
import { calculateAllocation, calculatePortfolioStats } from './src/engine/assetAllocation.js';
import { calculateRiskProfile } from './src/components/RiskQuestionnaire.js';

const ITERATIONS = 10000;

// --- BASELINE PARAMETERS (Corrected) ---
const BASELINE = {
    age: 52,
    currentSavings: 11100000,
    monthlyContribution: 2000,
    retirementAge: 65,
    desiredIncome: 400000,
    endAge: 95,
    riskAnswers: [4, 4, 4, 4, 4, 4, 4, 4],
    socialSecurityMonthly: 2500,
    socialSecurityAge: 67,
    otherGuaranteedIncome: 0,
    filingStatus: 'married',
    jobStability: 'stable',
    withdrawalStrategy: 'fixed',
    useGlidePath: true,
    nearTermCrashProbability: 20,
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
        return `$${(val / 1000000).toFixed(2)}M`;
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
        nearTermCrashProbability: 20
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

    // Deduct home value from cash first
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
        nearTermCrashProbability: 20
    };

    return runMonteCarloSimulation(simParams, ITERATIONS);
}

// --- MAIN EXECUTION ---
console.log('='.repeat(100));
console.log('HIGH PRECISION ANALYSIS (10,000 Simulations Each)');
console.log('='.repeat(100));
console.log('');
console.log('Parameters:');
console.log(`  Age: ${BASELINE.age}, Retirement: ${BASELINE.retirementAge}, Plan Through: ${BASELINE.endAge}`);
console.log(`  Current Savings: ${formatCurrency(BASELINE.currentSavings)}`);
console.log(`  Social Security: ${formatCurrency(BASELINE.socialSecurityMonthly)}/month at age 67`);
console.log(`  Monthly Rent: ${formatCurrency(BASELINE.monthlyRent)}`);
console.log(`  Home Price: ${formatCurrency(BASELINE.homePurchasePrice)} (100% cash purchase)`);
console.log(`  Near-Term Crash Probability: 20%`);
console.log(`  Iterations per scenario: ${ITERATIONS.toLocaleString()}`);
console.log('');

// Get Risk-Matched allocation
const riskMatchedAllocation = getRiskMatchedAllocation(BASELINE);

// Define strategies
const STRATEGIES = [
    { name: 'Current', allocation: ALLOCATIONS['Current'] },
    { name: 'Risk-Matched', allocation: riskMatchedAllocation },
    { name: 'Income-Focused', allocation: ALLOCATIONS['Income-Focused'] }
];

// Print strategy allocations
console.log('Strategy Allocations:');
console.log('-'.repeat(60));
for (const strategy of STRATEGIES) {
    console.log(`\n${strategy.name}:`);
    const stats = calculatePortfolioStats(strategy.allocation);
    console.log(`  Expected Return: ${stats.expectedReturnFormatted}, Volatility: ${stats.volatilityFormatted}`);
    for (const [key, val] of Object.entries(strategy.allocation)) {
        if (val > 0.001) console.log(`    ${key}: ${(val * 100).toFixed(1)}%`);
    }
}
console.log('');

// Run all 12 scenarios
console.log('='.repeat(100));
console.log('RUNNING 12 SCENARIOS...');
console.log('='.repeat(100));
console.log('');

const results = {};

for (const strategy of STRATEGIES) {
    results[strategy.name] = {};

    for (const income of [400000, 500000]) {
        results[strategy.name][income] = {};
        const params = { ...BASELINE, desiredIncome: income };

        console.log(`Running: ${strategy.name} @ $${income / 1000}K...`);

        // Rent scenario
        console.log(`  - Rent (10,000 iterations)...`);
        const rentResult = runRentScenario(params, strategy.allocation);
        results[strategy.name][income]['Rent'] = {
            successRate: rentResult.successRate,
            medianLegacy: rentResult.finalPortfolio.p50
        };

        // Buy-5yr scenario
        console.log(`  - Buy-5yr (10,000 iterations)...`);
        const buyResult = runBuy5yrScenario(params, strategy.allocation);
        results[strategy.name][income]['Buy-5yr'] = {
            successRate: buyResult.successRate,
            medianLegacy: buyResult.finalPortfolio.p50
        };
    }
    console.log('');
}

// Output Results Table
console.log('');
console.log('='.repeat(100));
console.log('RESULTS TABLE (% Success / Median Legacy at Age 95)');
console.log('='.repeat(100));
console.log('');

// Table Header
console.log('                        |        $400K/year        |        $500K/year        |');
console.log('Strategy                |   Rent        Buy-5yr    |   Rent        Buy-5yr    |');
console.log('-'.repeat(78));

for (const strategy of STRATEGIES) {
    const r400 = results[strategy.name][400000];
    const r500 = results[strategy.name][500000];

    const row = [
        strategy.name.padEnd(23),
        `${formatPercent(r400['Rent'].successRate).padStart(6)} / ${formatCurrency(r400['Rent'].medianLegacy).padStart(7)}`,
        `${formatPercent(r400['Buy-5yr'].successRate).padStart(6)} / ${formatCurrency(r400['Buy-5yr'].medianLegacy).padStart(7)}`,
        `${formatPercent(r500['Rent'].successRate).padStart(6)} / ${formatCurrency(r500['Rent'].medianLegacy).padStart(7)}`,
        `${formatPercent(r500['Buy-5yr'].successRate).padStart(6)} / ${formatCurrency(r500['Buy-5yr'].medianLegacy).padStart(7)}`
    ];

    console.log(`${row[0]} | ${row[1]}  ${row[2]} | ${row[3]}  ${row[4]} |`);
}

console.log('-'.repeat(78));
console.log('');

// Summary insights
console.log('='.repeat(100));
console.log('KEY OBSERVATIONS (from 10,000 iterations per scenario)');
console.log('='.repeat(100));
console.log('');

// Calculate deltas
for (const strategy of STRATEGIES) {
    console.log(`${strategy.name}:`);

    const r400Rent = results[strategy.name][400000]['Rent'];
    const r400Buy = results[strategy.name][400000]['Buy-5yr'];
    const r500Rent = results[strategy.name][500000]['Rent'];
    const r500Buy = results[strategy.name][500000]['Buy-5yr'];

    const delta400Success = (r400Buy.successRate - r400Rent.successRate) * 100;
    const delta400Legacy = r400Buy.medianLegacy - r400Rent.medianLegacy;
    const delta500Success = (r500Buy.successRate - r500Rent.successRate) * 100;
    const delta500Legacy = r500Buy.medianLegacy - r500Rent.medianLegacy;

    console.log(`  At $400K: Buying adds ${delta400Success >= 0 ? '+' : ''}${delta400Success.toFixed(1)}pp to success rate, ${formatCurrency(delta400Legacy)} to legacy`);
    console.log(`  At $500K: Buying adds ${delta500Success >= 0 ? '+' : ''}${delta500Success.toFixed(1)}pp to success rate, ${formatCurrency(delta500Legacy)} to legacy`);
    console.log('');
}

console.log('='.repeat(100));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(100));
