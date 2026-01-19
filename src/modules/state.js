/**
 * Application State Module
 * Central store for all user inputs and application status
 */

export const STEPS = [
    { id: 'basic', title: 'Basic Information', icon: '👤' },
    { id: 'portfolio', title: 'Current Portfolio', icon: '📁' },
    { id: 'goals', title: 'Retirement Goals', icon: '🎯' },
    { id: 'risk', title: 'Risk Assessment', icon: '📊' },
    { id: 'income', title: 'Guaranteed Income', icon: '💰' },
    { id: 'advanced', title: 'Advanced Settings', icon: '⚙️' }
];

export const state = {
    currentStep: 0,
    inputs: {
        // Basic Info
        age: 52,
        currentSavings: 10400000,
        windfall: 800000,
        monthlyContribution: 2000,
        // Goals
        retirementAge: 65,
        desiredIncome: 400000,
        endAge: 95,
        // Risk
        riskAnswers: [4, 4, 3, 4, 5, 4, 3, 3],
        // Social Security
        socialSecurityAge: 67,
        socialSecurityMonthly: 2500,
        otherGuaranteedIncome: 0,
        // Advanced
        filingStatus: 'married',
        jobStability: 'stable',
        useGlidePath: true,
        withdrawalStrategy: 'guardrails',
        // Current Portfolio Allocation
        currentAllocation: {
            usLargeCap: 24,
            usSmallMidCap: 4,
            intlDeveloped: 10,
            emergingMarkets: 2,
            usBonds: 24,
            tips: 0,
            cashMoneyMarket: 36
        },
        useCurrentAllocation: true
    },
    results: null,
    fanChart: null,
    selectedStrategy: 'Risk-Matched' // Default to risk-matched strategy
};

// Simple state reset helper
export function resetState() {
    state.currentStep = 0;
    state.results = null;
    state.fanChart = null;
    // Note: We intentionally preserve inputs so user doesn't lose data
}
