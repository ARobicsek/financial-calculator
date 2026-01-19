# Home Purchase Feature: Design & Integration Plan

## Overview

This document outlines how to integrate a home purchase decision framework into the retirement calculator, allowing users to compare:
- **Continue Renting + Invest All Savings** vs. **Buy Home with Cash + Invest Remaining Savings**

## Key Design Decisions

### 1. Home as a Distinct Asset Class

**Characteristics:**
- **Expected Return**: 3.5% nominal (~1% real after inflation)
- **Volatility**: 8% (lower than stocks, higher than bonds)
- **Correlation**: 0.6 with inflation, 0.2 with equities
- **Liquidity**: Illiquid (cannot be partially sold)
- **Income**: Implicit (rent savings, not dividends)

### 2. Financial Model

#### Initial Impact
```javascript
// Renting Scenario
initialPortfolio = currentSavings + windfall

// Home Purchase Scenario
initialPortfolio = currentSavings + windfall - homePurchasePrice
homeEquity = homePurchasePrice
```

#### Ongoing Cash Flow
```javascript
// Renting: Monthly expenses include rent
monthlyExpenses = desiredIncome / 12  // Includes rent

// Home Ownership: Rent savings offset by ownership costs
ownershipCosts = (propertyTax + insurance + maintenance + HOA) / 12
adjustedExpenses = (desiredIncome - annualRent) / 12 + ownershipCosts
```

#### Annual Ownership Costs
| Cost | Typical Rate | Inflation Rate |
|------|-------------|----------------|
| Property Tax | 0.5% - 2.5% of home value | 3% annually |
| Insurance | 0.3% - 0.6% of home value | 4-5% annually |
| Maintenance | 1% - 2% of home value | 2.4% annually |
| HOA | Variable | 3-5% annually |

#### Home Appreciation Model
```javascript
// Monthly return generation (in Monte Carlo)
expectedReturn = 0.035  // 3.5% nominal
volatility = 0.08       // 8% annual

// Correlated with market factors
systematic = 0.6 × inflationFactor + 0.2 × equityFactor
idiosyncratic = randomNormal() × 0.8

monthlyReturn = (expectedReturn/12) + (volatility/√12) × (systematic + idiosyncratic)
```

### 3. Asset Allocation Impact

**Home Equity as "Bond-Like" Asset:**
- Provides stability (lower volatility than stocks)
- Inflation hedge (appreciates with inflation)
- But illiquid (cannot rebalance easily)

**Allocation Adjustment:**
```javascript
homeEquityRatio = homeEquity / (portfolio + homeEquity)
homeAdjustment = homeEquityRatio × 0.5  // Treat 50% as bond-like

// Allows slightly higher equity % in liquid portfolio
equityPct += homeAdjustment × 0.10
```

**Display:**
```
Liquid Portfolio:
  Stocks: 60%
  Bonds: 35%
  Cash: 5%

Total Net Worth (including home):
  Stocks: 45%
  Bonds: 26%
  Cash: 4%
  Home Equity: 25%
```

### 4. Comparison Framework

**Side-by-Side Monte Carlo Simulations:**

Run 1,000 iterations for each scenario:

| Metric | Renting | Buying | Interpretation |
|--------|---------|--------|----------------|
| **Success Rate** | 87% | 82% | Renting has higher success (more liquidity) |
| **Median Final Net Worth** | $4.2M liquid | $4.8M ($3.1M + $1.7M home) | Buying builds more total wealth |
| **10th Percentile** | $1.8M | $2.4M total | Buying provides higher floor (home equity) |
| **Break-Even** | — | 12 years | Years until buying becomes advantageous |

**Break-Even Formula:**
```javascript
rentCumulative = Σ (monthlyRent × 12 × (1.035)^year)

buyCumulative = Σ (ownershipCosts + opportunityCost - appreciation)
  where opportunityCost = homePurchasePrice × expectedReturn

breakEvenYear = first year when rentCumulative > buyCumulative
```

### 5. Advanced Features

#### Downsizing Option
```javascript
// At age 75 (or user-specified age):
if (currentAge === downsizeAge) {
  netProceeds = currentHomeValue × (1 - sellingCosts)  // ~6% costs
  portfolio += netProceeds - replacementHomeCost

  // Option 1: Rent after downsizing
  monthlyExpenses += newMonthlyRent

  // Option 2: Buy smaller home
  homeEquity = replacementHomeCost
  ownershipCosts = adjustedCosts
}
```

#### Reverse Mortgage Alert
```javascript
// If liquid portfolio depleted but home equity exists:
if (portfolio < annualExpenses × 2 && homeEquity > portfolio) {
  alert('Consider accessing home equity via sale or reverse mortgage')
}
```

## UI Integration

### New Dashboard Card: "Housing Situation"

**Position**: Between "Basic Information" and "Current Portfolio"

**Inputs Required:**

**Renting:**
- Monthly rent
- Rent inflation rate (default 3.5%)

**Considering Home Purchase:**
- Home purchase price
- Property tax rate (default 1.2%)
- Annual home insurance
- Maintenance rate (default 1%)
- Monthly HOA fees
- Expected appreciation (default 3.5%)

**Optional Advanced:**
- Plan to downsize? (yes/no)
- Downsizing age
- Net proceeds from downsizing

### Results Display

**New Comparison Card:**
```
┌─────────────────────────────────────────────────────────┐
│  🏠 Housing Decision Analysis                           │
├─────────────────────────────────────────────────────────┤
│                    RENT         BUY HOME                │
│  Success Rate      87%            82%                   │
│  Final Net Worth   $4.2M          $4.8M                 │
│  (Median)          (liquid)       ($3.1M + $1.7M home)  │
│  Worst Case        $1.8M          $2.4M total           │
│  Break-even        —              12 years              │
├─────────────────────────────────────────────────────────┤
│  💡 Buying provides higher net worth but lower          │
│     success rate due to reduced liquidity.              │
│     Consider if you plan to stay 12+ years.             │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Basic Toggle (Complexity: 3/10)
- Add "Renting vs. Own Outright" toggle
- If owns home, exclude from liquid assets
- Adjust expenses (no rent payment)
- No appreciation modeling

**Files:** `state.js`, `dashboard.js`, `monteCarlo.js`

### Phase 2: Home Purchase Analysis (Complexity: 5/10)
- Add purchase price input
- Deduct from initial portfolio
- Model ownership costs
- Calculate rent savings
- Fixed appreciation rate (no volatility)

**Files:** Add `housingStep.js`, update `calculator.js`, `resultsStep.js`

### Phase 3: Full Monte Carlo (Complexity: 7/10)
- Stochastic home appreciation
- Correlation with market factors
- Side-by-side comparison
- Break-even analysis
- Home equity affects asset allocation

**Files:** `monteCarlo.js` (major updates), `assetAllocation.js`, `marketData.js`

### Phase 4: Advanced Features (Complexity: 8/10)
- Downsizing modeling
- Reverse mortgage alerts
- Multiple property scenarios
- Geographic adjustment factors

## Key Files to Modify

| File | Changes | Effort |
|------|---------|--------|
| `src/modules/state.js` | Add housing object to inputs | Low |
| `src/data/marketData.js` | Add homeEquity asset class | Low |
| `src/engine/monteCarlo.js` | Track home value, adjust withdrawals | High |
| `src/engine/assetAllocation.js` | Factor home equity into allocation | Medium |
| `src/modules/ui-renderers/housingStep.js` | **New file** - Housing inputs UI | Medium |
| `src/modules/calculator.js` | Run parallel rent vs. buy simulations | Medium |
| `src/modules/ui-renderers/resultsStep.js` | Add comparison display | High |

## Edge Cases & Validation

### Validation Rules
```javascript
homePurchasePrice: {
  max: (currentSavings + windfall) × 0.95,  // Keep 5% liquid
  min: 0
}

propertyTaxRate: { min: 0, max: 0.05 }    // 0-5%
maintenanceRate: { min: 0, max: 0.05 }    // 0-5%
expectedAppreciation: { min: -0.02, max: 0.08 }  // -2% to 8%
```

### User Warnings

Display alerts when:
- ⚠️ Home purchase leaves <3 years of expenses liquid
- ⚠️ Break-even exceeds time horizon
- ⚠️ Ownership costs exceed rent by >30%
- ⚠️ User is within 5 years of retirement (buying less advantageous)

## Mathematical Formulas Summary

### Total Net Worth
```
Renting: NW = investablePortfolio

Owning: NW = investablePortfolio + homeEquity
```

### Home Value Projection
```
homeValue(t) = homeValue(t-1) × (1 + return_t)

where return_t ~ N(μ = 0.035/12, σ = 0.08/√12)
  correlated 0.6 with inflation, 0.2 with equities
```

### Break-Even Analysis
```
Break-even when:
  Cumulative Rent Paid > Cumulative (Ownership Costs + Opportunity Cost - Appreciation)
```

### Net Cash Flow Impact
```
Renting: monthlyExpenses = desiredIncome / 12

Owning: monthlyExpenses = (desiredIncome - annualRent) / 12 + ownershipCosts / 12
```

## Recommendation Summary

**Best for Renting:**
- Maximize flexibility
- Uncertain location/timeline
- Want highest success rate
- Plan to move within 10 years

**Best for Buying:**
- Build total net worth
- Stable location (12+ years)
- Value predictable housing costs
- Accept lower liquidity for higher wealth

**Key Insight:** Buying trades liquidity (lower success rate) for total wealth accumulation (higher net worth). The optimal choice depends on the user's flexibility needs vs. wealth-building goals.

---

## Implementation Status

### ✅ Completed (Phase 3 - Full Monte Carlo)

The home purchase feature has been fully implemented with the following capabilities:

1. **Unified Asset Class Model**
   - Home treated as `residentialRealEstate` asset class in portfolio allocation
   - User specifies home allocation as percentage of total portfolio (0-100%)
   - All strategy cards (Risk-Matched, US-Focused, Global Tilt, etc.) include home allocation consistently

2. **Flexible Holding Period**
   - Slider control: 1-20 years or "Never" (keep home forever)
   - Home automatically sold after holding period (unless "Never" selected)
   - 6% selling costs deducted from proceeds

3. **Comprehensive Cost Modeling**
   - Property tax (% of home value)
   - Annual insurance (fixed dollar amount)
   - Maintenance rate (% of home value)
   - Annual maintenance budget (fixed dollar amount)
   - **All costs inflate at 3% annually** for realistic projections

4. **Net Worth Tracking**
   - Chart displays `netWorth = portfolio + homeValue` throughout entire timeline
   - Smooth, continuous projections without "steps" when home is sold
   - Home appreciation modeled with 3.5% expected return, 8% volatility

5. **Rent vs Buy Comparison**
   - Dynamic card that compares selected strategy with/without home purchase
   - Side-by-side success rates and median portfolio values
   - Uses pre-computed simulation results for consistency

6. **Cash Flow Integration**
   - **Before retirement**: Monthly contribution + rent savings - ownership costs
   - **After retirement**: If home sold, rent expenses added back to withdrawals
   - Rent inflates at 3% annually when user returns to renting post-sale

### Key Technical Details

**Files Modified:**
- `src/engine/monteCarlo.js`: Core simulation engine with `buildTrajectoryByAge()` using netWorth
- `src/modules/calculator.js`: Orchestrates housing params, applies to all strategies
- `src/modules/ui-renderers/portfolioStep.js`: Housing configuration UI with slider
- `src/modules/ui-renderers/resultsStep.js`: Rent vs Buy comparison card
- `src/modules/dashboard.js`: Real-time slider updates and value mapping
- `src/modules/state.js`: Housing configuration state management

**Chart Fix (Jan 2026):**
- Portfolio projection chart now correctly plots `netWorth` (portfolio + home value)
- Eliminates artificial "step" when home is sold (proceeds just transfer between asset types)
- Consistent rendering whether viewing initial results or after clicking strategy cards

### Remaining Opportunities (Phase 4)

Optional advanced features not yet implemented:
- Downsizing modeling (selling at specific age, buying smaller home)
- Reverse mortgage alerts
- Multiple property scenarios
- Geographic adjustment factors
- Break-even year calculation display

**Current Status:** Phase 3 complete. Feature is production-ready with full Monte Carlo integration.
