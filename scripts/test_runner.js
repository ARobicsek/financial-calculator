
import { runMonteCarloSimulation } from './src/engine/monteCarlo.js';
import { calculateAllocation, calculatePortfolioStats } from './src/engine/assetAllocation.js';
import { calculateRiskProfile } from './src/components/RiskQuestionnaire.js';
import { MARKET_DATA } from './src/data/marketData.js';

// --- CONFIGURATION ---

const SCENARIOS = [
    {
        id: 12,
        name: "Pre-Retirement with Modest Home",
        inputs: {
            age: 62,
            currentSavings: 2800000,
            monthlyContribution: 5500,
            retirementAge: 67,
            desiredIncome: 140000,
            endAge: 95,
            riskAnswers: [3, 3, 3, 3, 3, 3, 3, 3], // Moderate
            socialSecurityMonthly: 3600,
            socialSecurityAge: 67,
            otherGuaranteedIncome: 0,
            filingStatus: 'married',
            jobStability: 'stable',
            withdrawalStrategy: 'fixed',
            useGlidePath: true,
            nearTermCrashProbability: 20,
            currentAllocation: {
                usLargeCap: 22,
                usSmallMidCap: 4,
                intlDeveloped: 10,
                emergingMarkets: 1,
                usBonds: 23,
                tips: 0,
                cashMoneyMarket: 22,
                residentialRealEstate: 18
            },
            housing: {
                monthlyRent: 6500,
                expectedHoldingYears: 8,
                propertyTaxRate: 0.013,
                annualInsurance: 6000,
                maintenanceRate: 0.01,
                annualMaintenance: 0
            },
            useCurrentAllocation: true
        }
    }
];

// --- HELPER FUNCTIONS ---

function formatCurrency(val) {
    return `$${(val / 1000000).toFixed(2)}M`;
}

function formatPercent(val) {
    return `${(val * 100).toFixed(1)}%`;
}

function runScenario(scenario) {
    console.log(`\n### SCENARIO ${scenario.id}: ${scenario.name}\n`);

    // 1. Calculate Risk Profile & Guaranteed Income
    const inputs = scenario.inputs;
    const riskProfile = calculateRiskProfile(inputs.riskAnswers);
    const guaranteedIncome = (inputs.socialSecurityMonthly * 12) + inputs.otherGuaranteedIncome;

    // 2. Calculate Risk-Matched Allocation
    const allocationResult = calculateAllocation({
        questionnaireScore: riskProfile.score,
        age: inputs.age,
        yearsToRetirement: inputs.retirementAge - inputs.age,
        jobStability: inputs.jobStability,
        guaranteedIncome: guaranteedIncome,
        incomeGoal: inputs.desiredIncome
    });

    // 3. Define Strategies
    const strategies = [
        {
            name: 'Risk-Matched',
            allocation: allocationResult.allocation,
            isUserAllocation: false
        },
        {
            name: 'US-Focused',
            allocation: {
                usLargeCap: 0.45,
                usSmallCap: 0.10,
                intlDeveloped: 0.10,
                emergingMarkets: 0.00,
                usAggregateBonds: 0.30,
                tips: 0.00,
                cashMoneyMarket: 0.05
            },
            isUserAllocation: false
        },
        {
            name: 'Global Tilt',
            allocation: {
                usLargeCap: 0.30,
                usSmallCap: 0.05,
                intlDeveloped: 0.25,
                emergingMarkets: 0.10,
                usAggregateBonds: 0.25,
                tips: 0.00,
                cashMoneyMarket: 0.05
            },
            isUserAllocation: false
        },
        {
            name: 'Income-Focused',
            allocation: {
                usLargeCap: 0.30,
                usSmallCap: 0.00,
                intlDeveloped: 0.10,
                emergingMarkets: 0.00,
                usAggregateBonds: 0.30,
                tips: 0.15,
                highYieldBonds: 0.10,
                cashMoneyMarket: 0.05
            },
            isUserAllocation: false
        },
        {
            name: 'Current',
            allocation: inputs.currentAllocation,
            isUserAllocation: true
        }
    ];

    if (inputs.useCurrentAllocation) {
        const ua = inputs.currentAllocation;
        const total = Object.values(ua).reduce((a, b) => a + b, 0);
        const normalizedUA = {};
        for (const k in ua) normalizedUA[k] = ua[k] / total;
        strategies[4].allocation = normalizedUA;
    }

    // 4. Run Simulations
    for (const strategy of strategies) {
        let strategyNameDisplay = strategy.name;
        if (strategy.name === 'Current') strategyNameDisplay = 'Current Strategy';

        let nameHeader = `${strategyNameDisplay} Strategy`;
        if (strategy.name === 'Risk-Matched' || strategy.name === 'US-Focused' || strategy.name === 'Global Tilt' || strategy.name === 'Income-Focused') {
            nameHeader = `${strategy.name} Strategy`;
        }

        console.log(`#### ${nameHeader}`);

        // Handle Home Allocation Logic
        const homeAllocation = inputs.currentAllocation.residentialRealEstate || 0;
        let finalAllocation = { ...strategy.allocation };
        let housingParams = null;

        if (homeAllocation > 0) {
            const totalPortfolio = inputs.currentSavings + (inputs.windfall || 0);
            const homePurchasePrice = (homeAllocation / 100) * totalPortfolio;

            const annualOwnershipCosts =
                (homePurchasePrice * inputs.housing.propertyTaxRate) +
                inputs.housing.annualInsurance +
                (homePurchasePrice * inputs.housing.maintenanceRate) +
                (inputs.housing.annualMaintenance || 0);

            housingParams = {
                holdingPeriodYears: inputs.housing.expectedHoldingYears,
                monthlyRent: inputs.housing.monthlyRent,
                monthlyOwnershipCosts: annualOwnershipCosts / 12,
                homePurchasePrice: homePurchasePrice
            };

            if (!strategy.isUserAllocation) {
                const homeAllocPct = homeAllocation / 100;
                let toDeduct = homeAllocPct;
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
                    const equityKeys = ['usLargeCap', 'usSmallCap', 'intlDeveloped', 'emergingMarkets'];
                    for (const key of equityKeys) {
                        if (toDeduct <= 0) break;
                        const available = finalAllocation[key] || 0;
                        const deduction = Math.min(available, toDeduct);
                        finalAllocation[key] = available - deduction;
                        toDeduct -= deduction;
                    }
                }
                finalAllocation.residentialRealEstate = homeAllocPct;
            }
        }

        const simParams = {
            currentAge: inputs.age,
            retirementAge: inputs.retirementAge,
            endAge: inputs.endAge,
            currentSavings: inputs.currentSavings,
            windfall: inputs.windfall || 0,
            monthlyContribution: inputs.monthlyContribution,
            desiredIncome: inputs.desiredIncome,
            withdrawalStrategy: inputs.withdrawalStrategy,
            allocation: finalAllocation,
            glidePathEnabled: inputs.useGlidePath,
            housingParams: housingParams,
            nearTermCrashProbability: inputs.nearTermCrashProbability
        };

        const result = runMonteCarloSimulation(simParams, 1000);
        const stats = calculatePortfolioStats(finalAllocation);

        console.log(`- Median Portfolio at Retirement: ${formatCurrency(result.portfolioAtRetirement.p50)}`);
        console.log(`- Success Rate: ${Math.round(result.successRate * 100)}%`);
        console.log(`- Expected Return: ${stats.expectedReturnFormatted}`);
        console.log(`- Volatility: ${stats.volatilityFormatted}`);
        console.log('');
    }
    console.log('---\n');
}

SCENARIOS.forEach(runScenario);
