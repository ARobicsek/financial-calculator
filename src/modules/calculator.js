import { state } from './state.js';
import { runMonteCarloSimulation } from '../engine/monteCarlo.js';
import { calculateAllocation, calculatePortfolioStats } from '../engine/assetAllocation.js';
import { calculateRiskProfile } from '../components/RiskQuestionnaire.js';
import { updateResultsView } from './ui-renderers/resultsStep.js';

export function runCalculation() {
    const customLoading = document.getElementById('resultsLoading');
    if (!customLoading) {
        // Create a temporary loading overlay or text in results
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = `
        <div class="loading-state" id="resultsLoading">
          <div class="spinner"></div>
          <h3>Running Monte Carlo Simulations...</h3>
        </div>
      `;
    }

    // Scrape inputs from the dashboard before calculating
    scrapeDashboardInputs();

    // Allow UI to update
    setTimeout(() => {
        performCalculation();
        updateResultsView(runRecalculation);
    }, 100);
}

export function runRecalculation() {
    // Used by inline editor or re-calc interaction
    scrapeDashboardInputs();
    performCalculation();
    updateResultsView(runRecalculation);
}

function scrapeDashboardInputs() {
    // Basic
    state.inputs.age = parseInt(document.getElementById('age')?.value) || 52;
    state.inputs.currentSavings = parseFloat(document.getElementById('currentSavings')?.value) || 0;
    state.inputs.windfall = parseFloat(document.getElementById('windfall')?.value) || 0;
    state.inputs.monthlyContribution = parseFloat(document.getElementById('monthlyContribution')?.value) || 0;

    // Portfolio
    state.inputs.useCurrentAllocation = document.getElementById('useCurrentAllocation')?.checked ?? false;
    // Sliders
    const allocKeys = ['usLargeCap', 'usSmallMidCap', 'intlDeveloped', 'emergingMarkets', 'usBonds', 'tips', 'cashMoneyMarket'];
    allocKeys.forEach(key => {
        const slider = document.getElementById(`${key}Slider`);
        if (slider) state.inputs.currentAllocation[key] = parseInt(slider.value) || 0;
    });

    // Goals
    state.inputs.retirementAge = parseInt(document.getElementById('retirementAge')?.value) || 65;
    state.inputs.desiredIncome = parseFloat(document.getElementById('desiredIncome')?.value) || 60000;
    state.inputs.endAge = parseInt(document.getElementById('endAge')?.value) || 95;

    // Risk - handled by existing click listeners updating state? 
    // In dashboard.js I only did UI class toggle. Need to scrape or update state there.
    // Let's scrape:
    document.querySelectorAll('.question-card').forEach((card, idx) => {
        const selected = card.querySelector('.option-btn.selected');
        if (selected) {
            state.inputs.riskAnswers[idx] = parseInt(selected.dataset.value);
        }
    });

    // Income
    state.inputs.socialSecurityAge = parseInt(document.getElementById('socialSecurityAge')?.value) || 67;
    state.inputs.socialSecurityMonthly = parseFloat(document.getElementById('socialSecurityMonthly')?.value) || 0;
    state.inputs.otherGuaranteedIncome = parseFloat(document.getElementById('otherGuaranteedIncome')?.value) || 0;

    // Advanced
    state.inputs.filingStatus = document.getElementById('filingStatus')?.value || 'married';
    state.inputs.jobStability = document.getElementById('jobStability')?.value || 'stable';
    state.inputs.withdrawalStrategy = document.getElementById('withdrawalStrategy')?.value || 'guardrails';
    state.inputs.useGlidePath = document.getElementById('useGlidePath')?.checked ?? true;
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

    state.results = {
        monte: mcResults,
        allocation: allocationResult,
        riskProfile,
        portfolioStats: calculatePortfolioStats(allocationResult.allocation),
        strategyComparison: strategyResults
    };
}
