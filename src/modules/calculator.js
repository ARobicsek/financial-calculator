import { state } from './state.js';
import { runMonteCarloSimulation } from '../engine/monteCarlo.js';
import { calculateAllocation, calculatePortfolioStats } from '../engine/assetAllocation.js';
import { calculateRiskProfile } from '../components/RiskQuestionnaire.js';
import { renderResults } from './ui-renderers/resultsStep.js';

export function runCalculation() {
    const container = document.getElementById('wizardContainer');
    container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <h3>Running Monte Carlo Simulations...</h3>
      <p>Projecting 1,000 potential market scenarios based on your inputs.</p>
    </div>
  `;
    document.getElementById('progressContainer').classList.add('hidden');

    // Allow UI to update
    setTimeout(() => {
        performCalculation();
        renderResults(runRecalculation);
    }, 100);
}

export function runRecalculation() {
    // Recalculate risk profile from updated answers (in case they changed in inline editor)
    const riskProfile = calculateRiskProfile(state.inputs.riskAnswers);
    // Important: Update state risk profile before calculation uses it?
    // Actually calculateAllocation takes score.
    // We should update state.results? Or just use local variable?
    // The original code updated state.results later.
    // But calculateAllocation needs the score.

    performCalculation();
    renderResults(runRecalculation);
}

function performCalculation() {
    const riskProfile = calculateRiskProfile(state.inputs.riskAnswers);
    const guaranteedIncome = (state.inputs.socialSecurityMonthly * 12) + state.inputs.otherGuaranteedIncome;

    const allocationResult = calculateAllocation({
        questionnaireScore: riskProfile.score,
        age: state.inputs.age,
        yearsToRetirement: state.inputs.retirementAge - state.inputs.age,
        jobStability: state.inputs.jobStability,
        guaranteedIncome: guaranteedIncome,
        incomeGoal: state.inputs.desiredIncome
    });

    // Run Monte Carlo
    const mcResults = runMonteCarloSimulation({
        currentAge: state.inputs.age,
        retirementAge: state.inputs.retirementAge,
        endAge: state.inputs.endAge,
        currentSavings: state.inputs.currentSavings,
        windfall: state.inputs.windfall,
        monthlyContribution: state.inputs.monthlyContribution,
        desiredIncome: state.inputs.desiredIncome,
        withdrawalStrategy: state.inputs.withdrawalStrategy,
        allocation: allocationResult.allocation,
        glidePathEnabled: state.inputs.useGlidePath
    });

    // Define allocation strategies
    const allocationStrategies = [
        {
            name: 'Risk-Matched',
            description: 'Optimized for your risk profile',
            allocation: allocationResult.allocation,
            icon: '🎯'
        },
        {
            name: 'US-Focused',
            description: 'Emphasizes domestic equities',
            allocation: {
                usLargeCap: 0.45,
                usSmallCap: 0.10,
                intlDeveloped: 0.10,
                emergingMarkets: 0.00,
                usAggregateBonds: 0.30,
                tips: 0.00,
                cashMoneyMarket: 0.05
            },
            icon: '🇺🇸'
        },
        {
            name: 'Global Tilt',
            description: 'Higher international exposure',
            allocation: {
                usLargeCap: 0.30,
                usSmallCap: 0.05,
                intlDeveloped: 0.25,
                emergingMarkets: 0.10,
                usAggregateBonds: 0.25,
                tips: 0.00,
                cashMoneyMarket: 0.05
            },
            icon: '🌍'
        },
        {
            name: 'Income-Focused',
            description: 'Lower volatility, higher yield',
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
            icon: '💵'
        }
    ];

    // Add user's current allocation if enabled
    if (state.inputs.useCurrentAllocation) {
        const userAlloc = state.inputs.currentAllocation;
        allocationStrategies.push({
            name: 'Your Current',
            description: 'Your existing portfolio mix',
            allocation: {
                usLargeCap: userAlloc.usLargeCap / 100,
                usSmallCap: userAlloc.usSmallMidCap / 100,
                intlDeveloped: userAlloc.intlDeveloped / 100,
                emergingMarkets: userAlloc.emergingMarkets / 100,
                usAggregateBonds: userAlloc.usBonds / 100,
                tips: userAlloc.tips / 100,
                cashMoneyMarket: userAlloc.cashMoneyMarket / 100
            },
            icon: '📊',
            isUserAllocation: true
        });
    }

    // Run simulations for each strategy
    const strategyResults = allocationStrategies.map(strategy => {
        const result = runMonteCarloSimulation({
            currentAge: state.inputs.age,
            retirementAge: state.inputs.retirementAge,
            endAge: state.inputs.endAge,
            currentSavings: state.inputs.currentSavings,
            windfall: state.inputs.windfall,
            monthlyContribution: state.inputs.monthlyContribution,
            desiredIncome: state.inputs.desiredIncome,
            withdrawalStrategy: state.inputs.withdrawalStrategy,
            allocation: strategy.allocation,
            glidePathEnabled: state.inputs.useGlidePath,
            iterations: 500
        });

        return {
            ...strategy,
            successRate: result.successRate,
            medianPortfolio: result.portfolioAtRetirement.p50,
            stats: calculatePortfolioStats(strategy.allocation)
        };
    });

    // Update state with new results
    state.results = {
        monte: mcResults,
        allocation: allocationResult,
        riskProfile,
        portfolioStats: calculatePortfolioStats(allocationResult.allocation),
        strategyComparison: strategyResults
    };
}
