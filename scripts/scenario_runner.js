
import { runMonteCarloSimulation } from './src/engine/monteCarlo.js';
import { calculateAllocation, calculatePortfolioStats } from './src/engine/assetAllocation.js';
import { calculateRiskProfile } from './src/components/RiskQuestionnaire.js';
import { MARKET_DATA } from './src/data/marketData.js';

// --- BASELINE PARAMETERS (Corrected) ---
const BASELINE = {
    age: 52,
    currentSavings: 11100000,
    monthlyContribution: 2000,
    retirementAge: 65,
    desiredIncome: 400000,
    endAge: 95,
    riskAnswers: [4, 4, 4, 4, 4, 4, 4, 4], // Moderate-to-high (avg 4/5)
    socialSecurityMonthly: 2500,
    socialSecurityAge: 67,
    otherGuaranteedIncome: 0,
    filingStatus: 'married',
    jobStability: 'stable',
    withdrawalStrategy: 'fixed',
    useGlidePath: true,
    nearTermCrashProbability: 20,
    // Housing params
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
    'US-Focused': {
        usLargeCap: 0.45,
        usSmallCap: 0.10,
        intlDeveloped: 0.10,
        emergingMarkets: 0.00,
        usAggregateBonds: 0.30,
        tips: 0.00,
        cashMoneyMarket: 0.05
    },
    'Global Tilt': {
        usLargeCap: 0.30,
        usSmallCap: 0.05,
        intlDeveloped: 0.25,
        emergingMarkets: 0.10,
        usAggregateBonds: 0.25,
        tips: 0.00,
        cashMoneyMarket: 0.05
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

// --- SCENARIO RUNNER ---
function runRentScenario(params, allocation, crashProb = 20) {
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
        nearTermCrashProbability: crashProb
    };

    return runMonteCarloSimulation(simParams, 1000);
}

function runBuyScenario(params, allocation, holdingYears, crashProb = 20) {
    const annualOwnershipCosts = calculateOwnershipCosts(
        params.homePurchasePrice,
        params.propertyTaxRate,
        params.annualInsurance,
        params.maintenanceRate
    );

    // Home allocation as percentage of portfolio
    const homeAllocationPct = params.homePurchasePrice / params.currentSavings;

    // Create allocation with home
    let finalAllocation = { ...allocation };

    // Deduct home value from liquid assets (cash first, then bonds, then equities)
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
        nearTermCrashProbability: crashProb
    };

    return runMonteCarloSimulation(simParams, 1000);
}

// --- MAIN EXECUTION ---
console.log('='.repeat(100));
console.log('COMPREHENSIVE RETIREMENT SCENARIO ANALYSIS - ALL STRATEGIES');
console.log('='.repeat(100));
console.log('\nBaseline Parameters:');
console.log(`  Age: ${BASELINE.age}, Retirement: ${BASELINE.retirementAge}, Plan Through: ${BASELINE.endAge}`);
console.log(`  Current Savings: ${formatCurrency(BASELINE.currentSavings)}`);
console.log(`  Monthly Contribution: ${formatCurrency(BASELINE.monthlyContribution)}/month`);
console.log(`  Desired Income: ${formatCurrency(BASELINE.desiredIncome)}/year`);
console.log(`  Social Security: ${formatCurrency(BASELINE.socialSecurityMonthly)}/month at age ${BASELINE.socialSecurityAge}`);
console.log(`  Monthly Rent: ${formatCurrency(BASELINE.monthlyRent)}`);
console.log(`  Home Price: ${formatCurrency(BASELINE.homePurchasePrice)}`);
console.log('');

// Get Risk-Matched allocation
const riskMatchedAllocation = getRiskMatchedAllocation(BASELINE);

// All strategies (Current first as base case)
const ALL_STRATEGIES = [
    { name: 'Current', allocation: ALLOCATIONS['Current'] },
    { name: 'Risk-Matched', allocation: riskMatchedAllocation },
    { name: 'US-Focused', allocation: ALLOCATIONS['US-Focused'] },
    { name: 'Global Tilt', allocation: ALLOCATIONS['Global Tilt'] },
    { name: 'Income-Focused', allocation: ALLOCATIONS['Income-Focused'] }
];

// Print all allocations
console.log('STRATEGY ALLOCATIONS:');
console.log('-'.repeat(100));
for (const strategy of ALL_STRATEGIES) {
    console.log(`\n${strategy.name}:`);
    const stats = calculatePortfolioStats(strategy.allocation);
    console.log(`  Expected Return: ${stats.expectedReturnFormatted}, Volatility: ${stats.volatilityFormatted}`);
    for (const [key, val] of Object.entries(strategy.allocation)) {
        if (val > 0.001) console.log(`    ${key}: ${(val * 100).toFixed(1)}%`);
    }
}
console.log('');

// Calculate annual ownership costs
const annualOwnershipCosts = calculateOwnershipCosts(
    BASELINE.homePurchasePrice,
    BASELINE.propertyTaxRate,
    BASELINE.annualInsurance,
    BASELINE.maintenanceRate
);
console.log(`Annual Ownership Costs: ${formatCurrency(annualOwnershipCosts)} (${formatCurrency(annualOwnershipCosts/12)}/month)`);
console.log(`Annual Rent: ${formatCurrency(BASELINE.monthlyRent * 12)} (${formatCurrency(BASELINE.monthlyRent)}/month)`);
console.log(`Net Annual Savings from Buying: ${formatCurrency((BASELINE.monthlyRent * 12) - annualOwnershipCosts)}`);
console.log('');

// ============================================================================
// QUESTION 1: RENT VS BUY - ALL STRATEGIES, ALL HOLDING PERIODS
// ============================================================================
console.log('='.repeat(100));
console.log('QUESTION 1: RENT VS BUY - ALL STRATEGIES ($400K Income, 20% Crash)');
console.log('='.repeat(100));
console.log('');

const holdingPeriods = [
    { years: 0, name: 'Rent' },
    { years: 5, name: 'Buy 5yr' },
    { years: 10, name: 'Buy 10yr' },
    { years: 13, name: 'Buy 13yr' },
    { years: 20, name: 'Buy 20yr' },
    { years: 999, name: 'Buy Never' }
];

// Store all results for summary tables
const q1Results = {};

for (const strategy of ALL_STRATEGIES) {
    q1Results[strategy.name] = {};
    console.log(`--- ${strategy.name} Strategy ---`);

    for (const hp of holdingPeriods) {
        let result;
        if (hp.years === 0) {
            result = runRentScenario(BASELINE, strategy.allocation, 20);
        } else {
            result = runBuyScenario(BASELINE, strategy.allocation, hp.years, 20);
        }

        q1Results[strategy.name][hp.name] = {
            successRate: result.successRate,
            medianFinal: result.finalPortfolio.p50,
            p10Final: result.finalPortfolio.p10,
            p90Final: result.finalPortfolio.p90
        };

        console.log(`  ${hp.name.padEnd(12)}: Success ${formatPercent(result.successRate).padStart(6)}, Median ${formatCurrency(result.finalPortfolio.p50).padStart(8)}, P10 ${formatCurrency(result.finalPortfolio.p10).padStart(8)}, P90 ${formatCurrency(result.finalPortfolio.p90).padStart(8)}`);
    }
    console.log('');
}

// ============================================================================
// QUESTION 2: INCOME LEVELS - ALL STRATEGIES
// ============================================================================
console.log('='.repeat(100));
console.log('QUESTION 2: INCOME LEVELS - ALL STRATEGIES (Renting, 20% Crash)');
console.log('='.repeat(100));
console.log('');

const incomes = [400000, 450000, 500000];
const q2Results = {};

for (const strategy of ALL_STRATEGIES) {
    q2Results[strategy.name] = {};
    console.log(`--- ${strategy.name} Strategy ---`);

    for (const income of incomes) {
        const params = { ...BASELINE, desiredIncome: income };
        const result = runRentScenario(params, strategy.allocation, 20);

        q2Results[strategy.name][income] = {
            successRate: result.successRate,
            medianFinal: result.finalPortfolio.p50,
            p10Final: result.finalPortfolio.p10
        };

        console.log(`  ${formatCurrency(income).padEnd(6)}/yr: Success ${formatPercent(result.successRate).padStart(6)}, Median ${formatCurrency(result.finalPortfolio.p50).padStart(8)}, P10 ${formatCurrency(result.finalPortfolio.p10).padStart(8)}`);
    }
    console.log('');
}

// ============================================================================
// QUESTION 3: CRASH SENSITIVITY - ALL STRATEGIES, RENT VS BUY 10YR
// ============================================================================
console.log('='.repeat(100));
console.log('QUESTION 3: CRASH SENSITIVITY - ALL STRATEGIES ($400K Income)');
console.log('='.repeat(100));
console.log('');

const crashProbs = [0, 20, 40, 60];
const q3Results = {};

for (const strategy of ALL_STRATEGIES) {
    q3Results[strategy.name] = {};
    console.log(`--- ${strategy.name} Strategy ---`);

    for (const crashProb of crashProbs) {
        const rentResult = runRentScenario(BASELINE, strategy.allocation, crashProb);
        const buy10Result = runBuyScenario(BASELINE, strategy.allocation, 10, crashProb);

        q3Results[strategy.name][crashProb] = {
            rent: { successRate: rentResult.successRate, medianFinal: rentResult.finalPortfolio.p50 },
            buy10: { successRate: buy10Result.successRate, medianFinal: buy10Result.finalPortfolio.p50 }
        };

        console.log(`  Crash ${crashProb.toString().padStart(2)}%: Rent ${formatPercent(rentResult.successRate).padStart(6)} (${formatCurrency(rentResult.finalPortfolio.p50).padStart(8)}), Buy10yr ${formatPercent(buy10Result.successRate).padStart(6)} (${formatCurrency(buy10Result.finalPortfolio.p50).padStart(8)})`);
    }
    console.log('');
}

// ============================================================================
// QUESTION 4: $500K INCOME - ALL STRATEGIES, RENT VS BUY
// ============================================================================
console.log('='.repeat(100));
console.log('QUESTION 4: $500K INCOME - ALL STRATEGIES, ALL HOLDING PERIODS (20% Crash)');
console.log('='.repeat(100));
console.log('');

const params500K = { ...BASELINE, desiredIncome: 500000 };
const q4Results = {};

for (const strategy of ALL_STRATEGIES) {
    q4Results[strategy.name] = {};
    console.log(`--- ${strategy.name} Strategy ---`);

    for (const hp of holdingPeriods) {
        let result;
        if (hp.years === 0) {
            result = runRentScenario(params500K, strategy.allocation, 20);
        } else {
            result = runBuyScenario(params500K, strategy.allocation, hp.years, 20);
        }

        q4Results[strategy.name][hp.name] = {
            successRate: result.successRate,
            medianFinal: result.finalPortfolio.p50,
            p10Final: result.finalPortfolio.p10
        };

        console.log(`  ${hp.name.padEnd(12)}: Success ${formatPercent(result.successRate).padStart(6)}, Median ${formatCurrency(result.finalPortfolio.p50).padStart(8)}, P10 ${formatCurrency(result.finalPortfolio.p10).padStart(8)}`);
    }
    console.log('');
}

// ============================================================================
// QUESTION 5: $500K + CRASH SENSITIVITY - ALL STRATEGIES
// ============================================================================
console.log('='.repeat(100));
console.log('QUESTION 5: $500K + CRASH SENSITIVITY - ALL STRATEGIES');
console.log('='.repeat(100));
console.log('');

const q5Results = {};

for (const strategy of ALL_STRATEGIES) {
    q5Results[strategy.name] = {};
    console.log(`--- ${strategy.name} Strategy ---`);

    for (const crashProb of crashProbs) {
        const rentResult = runRentScenario(params500K, strategy.allocation, crashProb);
        const buy10Result = runBuyScenario(params500K, strategy.allocation, 10, crashProb);

        q5Results[strategy.name][crashProb] = {
            rent: { successRate: rentResult.successRate, medianFinal: rentResult.finalPortfolio.p50 },
            buy10: { successRate: buy10Result.successRate, medianFinal: buy10Result.finalPortfolio.p50 }
        };

        console.log(`  Crash ${crashProb.toString().padStart(2)}%: Rent ${formatPercent(rentResult.successRate).padStart(6)} (${formatCurrency(rentResult.finalPortfolio.p50).padStart(8)}), Buy10yr ${formatPercent(buy10Result.successRate).padStart(6)} (${formatCurrency(buy10Result.finalPortfolio.p50).padStart(8)})`);
    }
    console.log('');
}

// ============================================================================
// SUMMARY TABLES - Combined Success % and Median $
// ============================================================================
console.log('');
console.log('='.repeat(120));
console.log('COMPREHENSIVE SUMMARY TABLES (Success % / Median $ at Age 95)');
console.log('='.repeat(120));

// Helper to format combined cell
function formatCell(successRate, medianFinal) {
    return `${formatPercent(successRate)} / ${formatCurrency(medianFinal)}`;
}

// Table 1: Q1 Summary - Rent vs Buy at $400K by Strategy
console.log('\n--- TABLE 1: RENT VS BUY ($400K Income, 20% Crash) - Success % / Median Final ---');
console.log('Strategy       | Rent              | Buy 5yr           | Buy 10yr          | Buy 13yr          | Buy 20yr          | Buy Never');
console.log('-'.repeat(135));
for (const strategy of ALL_STRATEGIES) {
    const r = q1Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r['Rent'].successRate, r['Rent'].medianFinal).padStart(17),
        formatCell(r['Buy 5yr'].successRate, r['Buy 5yr'].medianFinal).padStart(17),
        formatCell(r['Buy 10yr'].successRate, r['Buy 10yr'].medianFinal).padStart(17),
        formatCell(r['Buy 13yr'].successRate, r['Buy 13yr'].medianFinal).padStart(17),
        formatCell(r['Buy 20yr'].successRate, r['Buy 20yr'].medianFinal).padStart(17),
        formatCell(r['Buy Never'].successRate, r['Buy Never'].medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

// Table 2: Income Levels
console.log('\n--- TABLE 2: INCOME LEVELS (Renting, 20% Crash) - Success % / Median Final ---');
console.log('Strategy       | $400K             | $450K             | $500K');
console.log('-'.repeat(80));
for (const strategy of ALL_STRATEGIES) {
    const r = q2Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r[400000].successRate, r[400000].medianFinal).padStart(17),
        formatCell(r[450000].successRate, r[450000].medianFinal).padStart(17),
        formatCell(r[500000].successRate, r[500000].medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

// Table 3: Crash Sensitivity at $400K - RENT
console.log('\n--- TABLE 3a: CRASH SENSITIVITY - RENT ($400K Income) - Success % / Median Final ---');
console.log('Strategy       | 0% Crash          | 20% Crash         | 40% Crash         | 60% Crash');
console.log('-'.repeat(100));
for (const strategy of ALL_STRATEGIES) {
    const r = q3Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r[0].rent.successRate, r[0].rent.medianFinal).padStart(17),
        formatCell(r[20].rent.successRate, r[20].rent.medianFinal).padStart(17),
        formatCell(r[40].rent.successRate, r[40].rent.medianFinal).padStart(17),
        formatCell(r[60].rent.successRate, r[60].rent.medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

// Table 3b: Crash Sensitivity at $400K - BUY 10YR
console.log('\n--- TABLE 3b: CRASH SENSITIVITY - BUY 10YR ($400K Income) - Success % / Median Final ---');
console.log('Strategy       | 0% Crash          | 20% Crash         | 40% Crash         | 60% Crash');
console.log('-'.repeat(100));
for (const strategy of ALL_STRATEGIES) {
    const r = q3Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r[0].buy10.successRate, r[0].buy10.medianFinal).padStart(17),
        formatCell(r[20].buy10.successRate, r[20].buy10.medianFinal).padStart(17),
        formatCell(r[40].buy10.successRate, r[40].buy10.medianFinal).padStart(17),
        formatCell(r[60].buy10.successRate, r[60].buy10.medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

// Table 4: $500K Rent vs Buy
console.log('\n--- TABLE 4: $500K INCOME - RENT VS BUY (20% Crash) - Success % / Median Final ---');
console.log('Strategy       | Rent              | Buy 5yr           | Buy 10yr          | Buy 13yr          | Buy 20yr          | Buy Never');
console.log('-'.repeat(135));
for (const strategy of ALL_STRATEGIES) {
    const r = q4Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r['Rent'].successRate, r['Rent'].medianFinal).padStart(17),
        formatCell(r['Buy 5yr'].successRate, r['Buy 5yr'].medianFinal).padStart(17),
        formatCell(r['Buy 10yr'].successRate, r['Buy 10yr'].medianFinal).padStart(17),
        formatCell(r['Buy 13yr'].successRate, r['Buy 13yr'].medianFinal).padStart(17),
        formatCell(r['Buy 20yr'].successRate, r['Buy 20yr'].medianFinal).padStart(17),
        formatCell(r['Buy Never'].successRate, r['Buy Never'].medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

// Table 5: $500K Crash Sensitivity - RENT
console.log('\n--- TABLE 5a: $500K + CRASH - RENT - Success % / Median Final ---');
console.log('Strategy       | 0% Crash          | 20% Crash         | 40% Crash         | 60% Crash');
console.log('-'.repeat(100));
for (const strategy of ALL_STRATEGIES) {
    const r = q5Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r[0].rent.successRate, r[0].rent.medianFinal).padStart(17),
        formatCell(r[20].rent.successRate, r[20].rent.medianFinal).padStart(17),
        formatCell(r[40].rent.successRate, r[40].rent.medianFinal).padStart(17),
        formatCell(r[60].rent.successRate, r[60].rent.medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

// Table 5b: $500K Crash Sensitivity - BUY 10YR
console.log('\n--- TABLE 5b: $500K + CRASH - BUY 10YR - Success % / Median Final ---');
console.log('Strategy       | 0% Crash          | 20% Crash         | 40% Crash         | 60% Crash');
console.log('-'.repeat(100));
for (const strategy of ALL_STRATEGIES) {
    const r = q5Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r[0].buy10.successRate, r[0].buy10.medianFinal).padStart(17),
        formatCell(r[20].buy10.successRate, r[20].buy10.medianFinal).padStart(17),
        formatCell(r[40].buy10.successRate, r[40].buy10.medianFinal).padStart(17),
        formatCell(r[60].buy10.successRate, r[60].buy10.medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

// Final comparison: $400K vs $500K side by side
console.log('\n--- TABLE 6: $400K VS $500K COMPARISON (20% Crash) - Success % / Median Final ---');
console.log('Strategy       | $400K Rent        | $400K Buy10       | $500K Rent        | $500K Buy10');
console.log('-'.repeat(100));
for (const strategy of ALL_STRATEGIES) {
    const r400 = q1Results[strategy.name];
    const r500 = q4Results[strategy.name];
    const row = [
        strategy.name.padEnd(14),
        formatCell(r400['Rent'].successRate, r400['Rent'].medianFinal).padStart(17),
        formatCell(r400['Buy 10yr'].successRate, r400['Buy 10yr'].medianFinal).padStart(17),
        formatCell(r500['Rent'].successRate, r500['Rent'].medianFinal).padStart(17),
        formatCell(r500['Buy 10yr'].successRate, r500['Buy 10yr'].medianFinal).padStart(17)
    ];
    console.log(row.join(' | '));
}

console.log('\n' + '='.repeat(120));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(120));
