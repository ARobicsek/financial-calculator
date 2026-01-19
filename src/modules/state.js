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
        currentSavings: 11100000,
        windfall: 0,
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
        nearTermCrashProbability: 20, // 0-60%, probability of 20%+ drawdown in next 3 years
        // Current Portfolio Allocation
        currentAllocation: {
            usLargeCap: 22,
            usSmallMidCap: 4,
            intlDeveloped: 10,
            emergingMarkets: 1,
            usBonds: 23,
            tips: 0,
            cashMoneyMarket: 40,
            residentialRealEstate: 0  // Home purchase as allocation %
        },
        useCurrentAllocation: true,
        // Housing Configuration (for residential real estate allocation)
        housing: {
            monthlyRent: 14000,              // Current rent payment
            propertyTaxRate: 0.012,          // 1.2% of home value annually
            annualInsurance: 8000,           // Home insurance
            maintenanceRate: 0.01,           // 1% of home value annually
            annualMaintenance: 5000,         // Annual maintenance budget
            expectedHoldingYears: 13         // Years before potential sale
        }
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
