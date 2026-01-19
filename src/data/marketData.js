/**
 * Market Data - January 2026 Assumptions
 * Based on major forecaster consensus and current market conditions
 */

export const MARKET_DATA = {
    // Expected annual returns by asset class
    expectedReturns: {
        usLargeCap: 0.055,        // 5.5% - compressed due to CAPE > 40
        usSmallCap: 0.060,        // 6.0%
        intlDeveloped: 0.070,     // 7.0% - valuation advantage
        emergingMarkets: 0.075,   // 7.5%
        usAggregateBonds: 0.043,  // 4.3% - normalized yields
        tips: 0.020,              // 2.0% real + inflation
        highYieldBonds: 0.058,    // 5.8%
        reits: 0.080,             // 8.0%
        cashMoneyMarket: 0.028    // 2.8%
    },

    // Annual volatility (standard deviation)
    volatility: {
        usLargeCap: 0.17,
        usSmallCap: 0.20,
        intlDeveloped: 0.18,
        emergingMarkets: 0.23,
        usAggregateBonds: 0.055,
        tips: 0.06,
        highYieldBonds: 0.10,
        reits: 0.18,
        cashMoneyMarket: 0.01
    },

    // Current economic environment
    inflation: {
        expected: 0.024,          // 2.4% annual
        breakeven5Year: 0.023,    // 2.3%
        breakeven10Year: 0.0224   // 2.24%
    },

    // Interest rates as of Jan 2026
    rates: {
        fedFundsRate: 0.0363,     // 3.50-3.75% midpoint
        treasury10Year: 0.0419,   // 4.15-4.23%
        tips10Year: 0.019         // 1.9% real yield
    }
};

// Detailed explanations for assumption tooltips
export const ASSUMPTION_TOOLTIPS = {
    // Category-level tooltips
    categories: {
        expectedReturns: "10-year forward projections based on Vanguard Capital Markets Model, BlackRock, and Morningstar consensus. US equity returns are lower than historical averages (~5.5% vs 10%) because the Shiller CAPE ratio is above 40—the highest since the dot-com bubble. International stocks have a valuation advantage with lower price-to-earnings ratios.",
        volatility: "Standard deviation of annual returns. This measures how much returns vary year-to-year. For example, 17% volatility means roughly 68% of years will see returns within ±17% of the expected return (one standard deviation). Higher volatility means more unpredictable results but historically higher long-term returns.",
        inflation: "Based on the 10-year Treasury breakeven inflation rate (2.24%) plus a small buffer for conservatism. This represents market expectations for average inflation over the next decade. Used to project future income needs and adjust withdrawal amounts to maintain purchasing power.",
        economicRates: "Current interest rate environment as of January 2026. The Fed Funds rate impacts short-term borrowing costs, while the 10-Year Treasury is a benchmark for longer-term rates including mortgages and bond yields."
    },
    // Asset-class specific tooltips
    assets: {
        usLargeCap: "S&P 500 and similar large-company US stocks. Lower expected return (5.5%) reflects CAPE ratio above 40—the highest level since the 2000 tech bubble. Historically strong but current valuations suggest muted forward returns.",
        usSmallCap: "Smaller US companies (Russell 2000, S&P 600). Higher risk but expected to outperform large-cap by ~0.5% annually due to small-cap premium. More volatile through market cycles.",
        intlDeveloped: "Non-US developed markets (Europe, Japan, Australia). Trading at significant discount to US stocks with CAPE ratios 15-20 vs US at 40+. Higher expected returns (7%) due to valuation gap.",
        emergingMarkets: "High-growth economies (China, India, Brazil, etc.). Highest expected return (7.5%) but also highest volatility (23%). Currency risk and political instability add uncertainty.",
        usAggregateBonds: "Investment-grade US bonds (government and corporate). Normalized yields of 4.3% after 2022-2024 rate increases. Provides portfolio stability and income with lower volatility (5.5%).",
        tips: "Treasury Inflation-Protected Securities. Returns 2% real yield plus actual inflation. Excellent hedge against unexpected inflation spikes but returns lag in low-inflation environments.",
        highYieldBonds: "Below-investment-grade corporate bonds. Higher yield (5.8%) compensates for default risk. Behaves partly like stocks during market stress—less diversification benefit.",
        reits: "Real Estate Investment Trusts. Expected 8% return with real estate appreciation plus rental income. Interest-rate sensitive; performs differently in various economic cycles.",
        cashMoneyMarket: "Money market funds, T-bills, high-yield savings. Currently yielding ~2.8% but rates expected to decline as Fed normalizes policy. Essential for near-term expenses and emergency funds."
    }
};


// Simplified asset allocation profiles for portfolio construction
export const ASSET_ALLOCATIONS = {
    conservative: {
        usLargeCap: 0.25,
        intlDeveloped: 0.10,
        usAggregateBonds: 0.50,
        tips: 0.10,
        cashMoneyMarket: 0.05
    },
    moderate: {
        usLargeCap: 0.35,
        intlDeveloped: 0.15,
        usSmallCap: 0.05,
        usAggregateBonds: 0.30,
        tips: 0.10,
        cashMoneyMarket: 0.05
    },
    aggressive: {
        usLargeCap: 0.40,
        intlDeveloped: 0.20,
        usSmallCap: 0.10,
        emergingMarkets: 0.05,
        usAggregateBonds: 0.15,
        tips: 0.05,
        cashMoneyMarket: 0.05
    }
};

// Fund recommendations with expense ratios
export const FUND_RECOMMENDATIONS = [
    {
        assetClass: 'US Total Market',
        primary: { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', expense: 0.0003 },
        alternatives: [
            { ticker: 'FZROX', name: 'Fidelity ZERO Total Market', expense: 0.0000 },
            { ticker: 'SWTSX', name: 'Schwab Total Stock Market', expense: 0.0003 }
        ]
    },
    {
        assetClass: 'International Developed',
        primary: { ticker: 'VXUS', name: 'Vanguard Total International ETF', expense: 0.0005 },
        alternatives: [
            { ticker: 'FZILX', name: 'Fidelity ZERO International', expense: 0.0000 },
            { ticker: 'SCHF', name: 'Schwab International Equity', expense: 0.0006 }
        ]
    },
    {
        assetClass: 'US Bonds',
        primary: { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', expense: 0.0003 },
        alternatives: [
            { ticker: 'FXNAX', name: 'Fidelity US Bond Index', expense: 0.00025 },
            { ticker: 'SWAGX', name: 'Schwab US Aggregate Bond', expense: 0.0004 }
        ]
    },
    {
        assetClass: 'Small-Cap Value',
        primary: { ticker: 'VBR', name: 'Vanguard Small-Cap Value ETF', expense: 0.0007 },
        alternatives: []
    },
    {
        assetClass: 'TIPS',
        primary: { ticker: 'SCHP', name: 'Schwab US TIPS ETF', expense: 0.0003 },
        alternatives: []
    },
    {
        assetClass: 'REITs',
        primary: { ticker: 'SCHH', name: 'Schwab US REIT ETF', expense: 0.0007 },
        alternatives: [
            { ticker: 'FREL', name: 'Fidelity MSCI Real Estate ETF', expense: 0.0008 }
        ]
    }
];

// Tax brackets for 2026 (projected)
export const TAX_BRACKETS_2026 = {
    single: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 106650, rate: 0.22 },
        { min: 106650, max: 213352, rate: 0.24 },
        { min: 213352, max: 538100, rate: 0.32 },
        { min: 538100, max: 1000000000, rate: 0.35 }
    ],
    married: [
        { min: 0, max: 23200, rate: 0.10 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 213300, rate: 0.22 },
        { min: 213300, max: 426700, rate: 0.24 },
        { min: 426700, max: 609350, rate: 0.32 },
        { min: 609350, max: 1000000000, rate: 0.35 }
    ]
};

// Standard deductions for 2026 (projected)
export const STANDARD_DEDUCTION_2026 = {
    single: 16100,
    married: 32200
};

// IRMAA thresholds for Medicare premium increases
export const IRMAA_THRESHOLDS = {
    single: 109000,
    married: 218000
};

// Social Security assumptions
export const SOCIAL_SECURITY = {
    maxBenefitAge67: 3822,  // Monthly max at full retirement age
    colaAssumption: 0.025,  // 2.5% annual COLA
    fullRetirementAge: 67,
    earlyRetirementAge: 62,
    delayedCreditAge: 70,
    earlyReductionPerMonth: 0.00556,  // ~6.67% per year before FRA
    delayedCreditPerMonth: 0.00667   // 8% per year after FRA
};
