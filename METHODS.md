# Financial Calculator: Complete Methodology Documentation

## Table of Contents
1. [Overview](#overview)
2. [Monte Carlo Simulation Engine](#monte-carlo-simulation-engine)
3. [Market Assumptions and Data Sources](#market-assumptions-and-data-sources)
4. [Risk-Based Asset Allocation](#risk-based-asset-allocation)
5. [Home Ownership Model](#home-ownership-model)
6. [Portfolio Growth Calculations](#portfolio-growth-calculations)
7. [Withdrawal Strategies](#withdrawal-strategies)
8. [Glide Path Implementation](#glide-path-implementation)
9. [Near-Term Crash Modeling](#near-term-crash-modeling)
10. [Strategy Comparison](#strategy-comparison)
11. [Success Metrics and Statistical Analysis](#success-metrics-and-statistical-analysis)
12. [Limitations and Disclaimers](#limitations-and-disclaimers)

---

## Overview

This financial calculator uses **Monte Carlo simulation** to model retirement outcomes under uncertainty. Rather than relying on a single deterministic projection, it runs 1,000 independent simulations, each with randomly generated market returns, to produce a distribution of potential outcomes.

### Core Philosophy

The calculator embodies several key principles:
- **Probabilistic thinking**: Success rates rather than guaranteed outcomes
- **Sequence-of-returns risk**: Monthly time steps capture the impact of return timing
- **Conservative assumptions**: Uses current market valuations, not historical averages
- **Comprehensive modeling**: Includes home ownership as a distinct asset class
- **Transparency**: All assumptions, formulas, and limitations are documented

---

## Monte Carlo Simulation Engine

### What is Monte Carlo Simulation?

Monte Carlo simulation is a computational technique that uses repeated random sampling to model complex systems with uncertainty. In retirement planning, it accounts for:
- **Market volatility**: Returns vary unpredictably year to year
- **Sequence-of-returns risk**: The order of returns matters when adding/withdrawing funds
- **Path dependency**: Early losses have different impacts than late losses

### Simulation Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Iterations** | 1,000 | Provides statistical stability (1% granularity in success rates) |
| **Time Step** | Monthly | Captures sequence-of-returns risk; annual steps underestimate volatility |
| **Strategy Comparison** | 500 iterations | Reduced for performance when comparing 4+ strategies |
| **Random Seed** | Varies per run | Independent outcomes each calculation |

### Return Generation Algorithm

The simulation generates monthly returns using **correlated random walks**:

#### Step 1: Generate Random Normal Variables

Uses the **Box-Muller transform** to convert uniform random numbers into standard normal distribution:

```
U₁, U₂ ~ Uniform(0,1)
Z = √(-2 ln U₁) × cos(2πU₂)
where Z ~ Normal(0,1)
```

#### Step 2: Create Correlated Returns

Returns are generated using a **common factor model** to simulate market correlation:

```
For each asset i:
  Return_i = μ_i + σ_i × [0.70 × Common_Factor + 0.30 × Idiosyncratic_i]

where:
  μ_i = expected monthly return for asset i
  σ_i = monthly volatility for asset i
  Common_Factor = shared market factor (equity or bond)
  Idiosyncratic_i = asset-specific random component
```

This creates realistic correlation:
- **70% systematic risk**: All stocks/bonds move together somewhat
- **30% idiosyncratic risk**: Each asset has independent variation

#### Step 3: Convert Annual to Monthly Parameters

```
Monthly Mean Return = Annual Mean / 12

Monthly Standard Deviation = Annual Std Dev / √12
```

**Note**: This assumes **lognormal returns** for equities (prevents negative prices) and **normal returns** for bonds.

#### Step 4: Generate Asset-Specific Returns

**For Equities** (lognormal distribution):
```
Return = exp(μ - σ²/2 + σ × Z) - 1

where:
  μ = monthly mean return
  σ = monthly standard deviation
  Z = standard normal random variable (correlated)
```

The `-σ²/2` term is the **drift correction** that ensures the geometric mean equals the expected return.

**For Bonds** (normal distribution):
```
Return = μ + σ × Z
```

### Portfolio Balance Evolution

#### Accumulation Phase (Current Age → Retirement)

Each month:
1. **Apply returns**: `Balance = Balance × (1 + weighted_return)`
2. **Add contribution**: `Balance = Balance + monthly_contribution`
3. **Home ownership adjustment** (if applicable): Add rent savings minus ownership costs

Each year:
4. **Apply glide path** (if enabled): Reduce equity allocation by schedule
5. **Inflate ownership costs**: Property tax, insurance, maintenance increase by 3% annually

#### Distribution Phase (Retirement → End Age)

Each month:
1. **Apply returns**: `Balance = Balance × (1 + weighted_return)`
2. **Subtract withdrawal**: `Balance = Balance - monthly_withdrawal`
3. **Add rent expense** (if home was sold): Include inflation-adjusted rent

Each year:
4. **Adjust withdrawal** per strategy (Guardrails, Fixed, etc.)
5. **Apply glide path** (if enabled): Continue reducing equity allocation

### Single Simulation Termination

A simulation path ends in one of three states:

1. **Success**: Portfolio balance > $0 at end age AND income never cut below target
2. **Partial Success**: Portfolio survives but income was reduced below target
3. **Failure**: Portfolio depleted before end age

---

## Market Assumptions and Data Sources

### Expected Annual Returns (January 2026)

| Asset Class | Expected Return | Volatility (Std Dev) | Source/Rationale |
|-------------|-----------------|----------------------|------------------|
| **Equities** |
| US Large Cap | 5.5% | 17% | Vanguard CMM - compressed due to CAPE > 40 |
| US Small Cap | 6.0% | 20% | Size premium + higher volatility |
| International Developed | 7.0% | 18% | Valuation advantage over US |
| Emerging Markets | 7.5% | 23% | Growth potential, higher risk |
| REITs | 8.0% | 18% | Income + growth; real estate exposure |
| **Fixed Income** |
| US Aggregate Bonds | 4.3% | 5.5% | Current yield to maturity (10-yr @ 4.19%) |
| TIPS | 2.0% | 6% | Real yield (inflation-protected) |
| High-Yield Bonds | 5.8% | 10% | Credit spread over investment grade |
| **Cash** |
| Money Market | 2.8% | 1% | Fed funds rate (3.50-3.75% range midpoint) |
| **Real Estate** |
| Residential Real Estate | 3.5% | 8% | Historical home appreciation + current market |

### Economic Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| **Inflation** | 2.4% | Current Federal Reserve target + market expectations |
| **10-Year Treasury** | 4.19% | Current market yield (Jan 2026) |
| **Fed Funds Rate** | 3.63% | Current rate (3.50-3.75% range) |

### Data Sources

1. **Vanguard Capital Markets Model (VCMM)**: Forward-looking 10-year return expectations
2. **BlackRock**: Long-term capital market assumptions
3. **Morningstar**: Historical volatility and asset class characteristics
4. **J.P. Morgan**: Long-term capital market assumptions and economic forecasts

### Valuation-Adjusted Returns

**Why US equity returns are lower than historical averages:**

The 5.5% expected return for US Large Cap stocks is significantly below the ~10% historical average because:

1. **High current valuations**: Shiller CAPE ratio > 40 (vs. historical average ~17)
2. **Mean reversion**: Above-average valuations typically predict below-average future returns
3. **Decomposition of returns**:
   ```
   Total Return = Dividend Yield + Earnings Growth + Valuation Change

   Current:
   = 1.5% (current dividend yield)
   + 4.0% (expected earnings growth)
   + 0% (no further valuation expansion assumed)
   = 5.5%
   ```

**International equity premium**: International developed markets show higher expected returns (7.0%) due to:
- Lower valuations (CAPE ~15-20)
- Currency diversification benefits
- Potential mean reversion vs. US outperformance

---

## Risk-Based Asset Allocation

### Risk Questionnaire

Users complete an **8-question assessment** measuring:
1. Investment knowledge and experience
2. Time horizon and flexibility
3. Emotional response to volatility
4. Need for liquidity
5. Financial resilience
6. Concentration vs. diversification preference
7. Loss tolerance
8. Return expectations vs. safety

**Scoring**: Each question rated 1-5, total score 8-40

### Risk Profile Mapping

| Total Score | Risk Profile | Typical Equity Range |
|-------------|--------------|---------------------|
| 8-12 | Very Conservative | 20-30% |
| 13-18 | Conservative | 30-45% |
| 19-26 | Moderate | 45-60% |
| 27-34 | Moderately Aggressive | 60-75% |
| 35-40 | Aggressive | 75-90% |

### Asset Allocation Algorithm

#### Base Equity Allocation

```
Base Equity % = 10% + (Risk Score / 40) × 80%

Example: Score of 30 → 10% + (30/40)×80% = 70%
```

#### Adjustment Factor 1: Time Horizon

Time to retirement affects capacity for risk:

```
If Years to Retirement > 20:  Multiplier = 1.00× (no adjustment)
If 10 ≤ Years ≤ 20:          Multiplier = 0.90× (reduce 10%)
If 5 ≤ Years < 10:           Multiplier = 0.75× (reduce 25%)
If Years < 5:                Multiplier = 0.50× (reduce 50%)
```

**Rationale**: Shorter time horizons reduce ability to recover from market downturns.

#### Adjustment Factor 2: Job Stability (Human Capital)

Your earning power is an asset. Stable income allows more portfolio risk:

```
Job Stability Level     | Adjustment
------------------------|------------
Very Stable             | +10% × (years remaining / 40)
Stable                  | +5% × (years remaining / 40)
Variable                | 0%
Highly Variable/Retired | -10% × (years remaining / 40)
```

**Example**: If you're 15 years from retirement with "Very Stable" job:
```
Adjustment = +10% × (15/40) = +3.75%
```

**Rationale**: Human capital is bond-like (stable income stream). Stable job = higher total wealth stability = can take more portfolio risk.

#### Adjustment Factor 3: Guaranteed Income

Pension and Social Security income reduces need for portfolio to generate income:

```
Guaranteed Income Boost = Min(0.15, (Annual Guaranteed Income / Income Goal) × 0.15)

Maximum boost: 15 percentage points
```

**Example**:
- Income Goal: $100,000/year
- Social Security + Pension: $50,000/year
- Boost = Min(0.15, ($50k/$100k) × 0.15) = Min(0.15, 0.075) = 7.5%

**Rationale**: If guaranteed income covers 50%+ of needs, portfolio can be more aggressive since it only needs to cover the gap.

#### Final Equity Allocation

```
Final Equity % = Base Equity %
                 × Time Horizon Multiplier
                 + Job Stability Adjustment
                 + Guaranteed Income Boost

Constrained to: [10%, 95%]
```

### Equity Sub-Allocation by Risk Profile

The equity portion is divided across geographies based on risk tolerance:

| Risk Level | US Large Cap | US Small Cap | Intl Developed | Emerging Markets |
|------------|--------------|--------------|----------------|------------------|
| **Conservative** (score ≤ 20) | 70% | 5% | 20% | 5% |
| **Moderate** (score 21-30) | 55% | 10% | 25% | 10% |
| **Aggressive** (score 31+) | 45% | 15% | 25% | 15% |

**Rationale**:
- Conservative portfolios overweight large-cap US (lower volatility)
- Aggressive portfolios increase small-cap and emerging markets exposure (higher expected returns, higher risk)
- All portfolios maintain significant international diversification

### Fixed Income Sub-Allocation

The bond/cash portion uses a standard mix:

| Asset Class | Allocation | Purpose |
|-------------|-----------|---------|
| US Aggregate Bonds | 60% | Core investment-grade diversification |
| TIPS | 25% | Inflation protection |
| Cash/Money Market | 15% | Liquidity, stability |

**High-Yield Bonds** only appear in specialized strategies (Income-Focused), not the primary Risk-Matched allocation, to maintain quality.

---

## Home Ownership Model

The calculator treats **Primary Home** as a distinct asset class with comprehensive modeling of purchase, ownership, and sale.

### Key Features

1. **Unified Treatment**: Home is an asset class across all strategies
2. **Equity Tracking**: Monitors home value appreciation separate from liquid portfolio
3. **Realistic Funding**: Home purchase reduces liquid portfolio by purchase price
4. **Holding Period**: Configurable from 1-20 years or "Never" (keep forever)
5. **Sale Mechanics**: 6% selling costs, proceeds reinvested in liquid portfolio
6. **Net Worth Tracking**: Portfolio charts display total net worth (liquid + home equity)

### Home Purchase

When user allocates X% to "Primary Home":
```
Home Purchase Price = Total Portfolio × (X% / 100)
Liquid Portfolio = Total Portfolio - Home Purchase Price
```

### Realistic Home Funding for Strategy Comparison

For non-user strategies, home funds are drawn realistically (not pro-rata):
1. **Cash first**: Draw from money market
2. **Bonds second**: Draw from aggregate bonds
3. **TIPS third**: Draw from inflation-protected bonds
4. **Equities last**: Only if home allocation exceeds all safe assets

**Example**:
```
Strategy: Income-Focused (before home)
- US Large Cap: 30%
- Bonds: 30%
- TIPS: 15%
- Cash: 5%
- Total: 80% + 20% other

User wants 25% in Primary Home

Funding sequence:
1. Take 5% from Cash → Cash now 0%
2. Take 15% from TIPS → TIPS now 0%
3. Take 5% from Bonds → Bonds now 25%
4. Add 25% Primary Home

Final allocation:
- US Large Cap: 30%
- Bonds: 25% (reduced from 30%)
- TIPS: 0% (reduced from 15%)
- Cash: 0% (reduced from 5%)
- Primary Home: 25%
- Other: 20%
```

### Ownership Costs

Monthly ownership costs include:
```
Monthly Ownership Costs =
  (Home Price × Property Tax Rate) / 12 +
  (Annual Insurance) / 12 +
  (Home Price × Maintenance Rate) / 12 +
  (Annual Maintenance) / 12

Where defaults:
  Property Tax Rate = 1.2% annually
  Annual Insurance = $8,000
  Maintenance Rate = 1.0% annually
  Annual Maintenance = $5,000
```

**Inflation adjustment**: All ownership costs increase by 3% annually (conservative estimate above general inflation).

### Accumulation Phase with Home

Each month before retirement:
```
Net Monthly Benefit = Monthly Rent Savings - Monthly Ownership Costs
Portfolio += Monthly Contribution + Net Monthly Benefit
```

**Rent Savings**: The monthly rent you would have paid if renting instead of owning.

### Home Sale

After holding period (or at age 999+ for "Never" option):
```
Selling Costs = 6% of Home Value
Net Proceeds = Home Value × (1 - 0.06)
Liquid Portfolio += Net Proceeds
Home Value = 0
```

After sale, if still alive:
```
Monthly Rent = Original Rent × (1 + inflation)^years_owned
This rent is added to monthly expenses in retirement
```

### Home Appreciation

Home value grows each month using:
```
Monthly Return = generateHomeReturn(inflationFactor, equityFactor)

Correlation structure:
- 60% correlated with inflation
- 20% correlated with equities
- 20% idiosyncratic (local market factors)
```

Expected annual appreciation: **3.5%** with **8% volatility** (normal distribution).

---

## Portfolio Growth Calculations

### Deterministic Projection (Quick Estimate)

For UI feedback, a simplified calculation estimates portfolio growth:

```
Future Value = FV_of_Current_Savings + FV_of_Contributions

where:

FV_of_Current_Savings = Current_Portfolio × (1 + r_monthly)^n_months

FV_of_Contributions = Monthly_Contribution × [((1 + r)^n - 1) / r]
```

**Example**:
- Current Portfolio: $1,000,000
- Monthly Contribution: $2,000
- Monthly Return: 5.5%/12 = 0.458%
- Months to Retirement: 13 years × 12 = 156 months

```
FV_Savings = $1,000,000 × (1.00458)^156 = $2,030,000

FV_Contributions = $2,000 × [((1.00458)^156 - 1) / 0.00458]
                 = $2,000 × 224.6
                 = $449,200

Total = $2,030,000 + $449,200 = $2,479,200
```

### Monte Carlo Projection (Full Simulation)

The full simulation applies monthly returns with reinvestment:

```
For each month from now to end age:

  # Generate random return for this month
  monthly_return = generate_correlated_return()

  # Apply return to liquid portfolio
  liquid_portfolio = liquid_portfolio × (1 + monthly_return)

  # Apply return to home (if owned)
  if owns_home and not sold_home:
    home_return = generate_home_return()
    home_value = home_value × (1 + home_return)

  # Check if it's time to sell home
  if month == holding_period_months:
    sell_home()

  # Cash flow
  if in_accumulation_phase:
    liquid_portfolio += monthly_contribution
    if owns_home and not sold_home:
      liquid_portfolio += (rent_savings - ownership_costs)
  else:
    withdrawal = current_withdrawal / 12
    if sold_home:
      withdrawal += monthly_rent  # Add rent expense
    liquid_portfolio -= withdrawal

  # Record balance
  net_worth = liquid_portfolio + home_value
  trajectory.append(net_worth)

  # Check if depleted
  if liquid_portfolio < 0:
    mark_as_failed()
    break
```

This process repeats 1,000 times, creating 1,000 different portfolio paths.

---

## Withdrawal Strategies

### Initial Withdrawal Calculation

At retirement, the calculator determines the starting annual withdrawal:

```
Step 1: Inflation-adjust desired income to retirement year
  Inflation_Adjusted_Income = Current_Income_Goal × (1 + inflation)^years_to_retirement

Step 2: Use inflation-adjusted income OR 4% rule (whichever is lower)
  Projected_Portfolio_at_Retirement = (estimate from compound growth)

  Initial_Withdrawal = Min(
    Inflation_Adjusted_Income,
    Projected_Portfolio × 0.04
  )
```

### Strategy 1: Guardrails (Modified Guyton-Klinger)

The **Guardrails** strategy uses **dynamic adjustments** to balance flexibility and sustainability:

#### Initial Setup
```
Initial_Withdrawal_Rate = 4.5%
Upper_Guard = Initial_Rate × 1.20 = 5.4%
Lower_Guard = Initial_Rate × 0.80 = 3.6%
```

#### Annual Adjustment Rules

Each year in retirement:

**Rule 1: Portfolio Prosperity Adjustment**
```
Current_Rate = Current_Withdrawal / Current_Portfolio

If Current_Rate < Lower_Guard (3.6%):
  # Portfolio is doing well, can increase spending
  Withdrawal = Withdrawal × 1.10  (+10% increase)
```

**Rule 2: Portfolio Preservation Adjustment**
```
If Current_Rate > Upper_Guard (5.4%) AND Years_Remaining > 15:
  # Portfolio is stressed, need to cut spending
  Withdrawal = Withdrawal × 0.90  (-10% decrease)

Note: No cuts if fewer than 15 years remaining (preserve lifestyle in final years)
```

**Rule 3: Inflation Adjustment**
```
If Prior_Year_Return < 0:
  # After down year, skip inflation adjustment (give portfolio time to recover)
  Withdrawal = Withdrawal (no change)
Else:
  # Normal years, adjust for inflation
  Withdrawal = Withdrawal × (1 + inflation)
```

**Advantages**:
- Flexibility to capture portfolio gains
- Automatic spending cuts when needed
- Skips inflation after down years (reduces sequence-of-returns risk)

**Disadvantages**:
- Income variability (±10% possible)
- Requires discipline to cut spending

### Strategy 2: Fixed Withdrawal

The **Fixed** strategy maintains constant inflation-adjusted income:

```
Annual Adjustment:
  Withdrawal = Withdrawal × (1 + inflation)
```

**No adjustments** based on portfolio performance.

**Advantages**:
- Predictable, stable income
- Simplicity

**Disadvantages**:
- Higher failure risk in poor markets (no flexibility)
- Misses opportunity to increase spending when portfolio thrives

---

## Glide Path Implementation

### What is a Glide Path?

A **glide path** is a predetermined schedule to reduce equity exposure as you age, similar to target-date funds. It reduces portfolio volatility when you have less time to recover from losses.

### Glide Path Schedule

#### Phase 1: Pre-Retirement (Ongoing)

```
Reduction Rate: 1.5 percentage points per year
Floor: 20% equities

Example:
  Age 50 (15 years to retirement): Start at Risk-Based allocation (say 75%)
  Age 51: 75% - 1.5% = 73.5%
  Age 52: 73.5% - 1.5% = 72.0%
  ...
  Age 65 (retirement): ~52.5%
```

#### Phase 2: Early Retirement (First 7 Years)

```
Reduction Rate: 3 percentage points per year
Floor: 30% equities

Example:
  Age 65: 52.5%
  Age 66: 49.5%
  Age 67: 46.5%
  Age 68: 43.5%
  Age 69: 40.5%
  Age 70: 37.5%
  Age 71: 34.5%
  Age 72: 31.5% (approaching floor)
  Age 73+: 30% (floor reached)
```

### Mathematical Formula

```
Equity Allocation at Year t:

If before retirement:
  Equity% = Max(20%, Current_Equity% - 1.5%)

If in first 7 years of retirement:
  Equity% = Max(30%, Current_Equity% - 3%)

If after 7 years of retirement:
  Equity% = 30%
```

### Rationale

1. **Pre-retirement reduction (1.5%/year)**: Gradual de-risking as "human capital" (earning years) converts to "financial capital" (portfolio)

2. **Post-retirement acceleration (3%/year)**: Faster reduction when:
   - No income to replenish losses
   - Spending needs are certain
   - Psychological impact of losses is highest

3. **30% equity floor**: Even in late retirement, maintain growth potential for:
   - Longevity risk (portfolio may need to last 30+ years)
   - Inflation protection
   - Legacy/estate goals

---

## Near-Term Crash Modeling

### Overview

The **Near-Term Crash Probability** slider allows stress-testing plans against early market downturns, which are particularly dangerous due to sequence-of-returns risk.

### Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Probability Range** | 0% to 60% | User-configurable stress test |
| **Default** | 20% | Roughly matches historical frequency of 20%+ corrections |
| **Crash Window** | First 3 years (36 months) | Early years are most vulnerable |
| **Crash Magnitude** | ~25% equity drawdown | Typical major correction |
| **Crash Duration** | 6-18 months | Variable, randomized within range |
| **Affected Assets** | Equities only | Stocks bear brunt of crash |

### Implementation

For each simulation:
```
1. Determine if this simulation experiences crash:
   hasCrash = random() < (crashProbability / 100)

2. If hasCrash, randomize crash timing:
   crashDuration = random(6 to 18 months)
   crashStartMonth = random(1 to 36 - crashDuration)

3. During crash months:
   monthlyDrawdown = 0.25 / crashDuration

   For each month in crash period:
     equityWeight = % of portfolio in equities
     monthlyReturn -= monthlyDrawdown × equityWeight
```

### Example

User sets crash probability to 30%:
- 300 out of 1,000 simulations will experience a crash
- Each crash occurs randomly in months 1-36
- Each crash lasts 6-18 months
- Total equity drawdown: ~25%

**Result**: Success rate reflects realistic early-crash scenarios, not just average returns.

---

## Strategy Comparison

### Available Strategies

The calculator compares 4-6 portfolio strategies:

1. **Risk-Matched** 🎯
   - Personalized to user's risk questionnaire
   - Adjusts for age, job stability, guaranteed income

2. **US-Focused** 🇺🇸
   - 45% US Large Cap, 10% US Small Cap, 10% Intl
   - Emphasizes domestic equities

3. **Global Tilt** 🌍
   - 30% US Large Cap, 25% Intl Developed, 10% Emerging
   - Higher international diversification

4. **Income-Focused** 💵
   - 40% equities, 60% bonds/TIPS/high-yield
   - Lower volatility, higher yield

5. **Your Current** 📊 (optional)
   - User's existing portfolio allocation
   - Only shown if user enters current holdings

6. **Build Your Own** ⚙️ (optional)
   - Custom allocation from sliders
   - Real-time interactive building

### Strategy Comparison Methodology

Each strategy runs 500 Monte Carlo simulations (reduced from 1,000 for performance) with identical parameters except allocation.

**Key:** If user allocates to Primary Home, ALL strategies include that home allocation, funded realistically from cash/bonds first (except "Your Current" which uses exact user percentages).

### Metrics Displayed

For each strategy:
```
Success Rate: % of simulations where portfolio lasts AND income not cut
Median Portfolio at Retirement: 50th percentile net worth at retirement age
Expected Return: Weighted average of asset returns
Volatility: Portfolio standard deviation
```

---

## Success Metrics and Statistical Analysis

### Primary Success Metric: "Success Rate"

```
Success = Portfolio balance > $0 at end age
          AND
          Income never cut below target

Success Rate = (Number of successful simulations / Total simulations) × 100%
```

**Example**: If 847 out of 1,000 simulations succeed → **84.7% Success Rate**

### Supplementary Metrics

#### 1. Funded Through Age (Conservative Estimate)
```
Funded Through Age (Conservative) = 10th percentile age when portfolio depletes

Interpretation: "In 90% of scenarios, your portfolio lasts at least until age X"
```

**Example**: If the 10th percentile depletion age is 91, you can be 90% confident your portfolio will last until at least age 91.

#### 2. Funded Through Age (Median)
```
Funded Through Age (Median) = 50th percentile age when portfolio depletes

Interpretation: "In half of scenarios, your portfolio lasts past age X"
```

#### 3. Portfolio Value Percentiles

At key milestones (retirement start, end age), the simulator reports:

```
Portfolio Percentiles:
  10th: Value below which 90% of outcomes fall (pessimistic)
  50th: Median value (typical outcome)
  90th: Value below which only 10% of outcomes fall (optimistic)
```

### Fan Chart Visualization

The "trajectory by age" creates a **fan chart** showing:

```
For each age from now to end age:
  - 10th percentile net worth (liquid + home)
  - 25th percentile
  - 50th percentile (median)
  - 75th percentile
  - 90th percentile
```

This visualization shows:
- **Central tendency** (median line) = most likely path
- **Confidence bands** = range of outcomes
- **Widening fan** over time = uncertainty compounds

### Interpreting Success Rates

| Success Rate | Interpretation | Typical Recommendation |
|--------------|----------------|------------------------|
| **95%+** | Very high confidence | May be over-saving; consider increasing spending or retiring earlier |
| **85-94%** | Strong plan | Good balance of security and lifestyle |
| **75-84%** | Moderate confidence | Acceptable, but consider small adjustments |
| **65-74%** | Borderline | Reduce spending, delay retirement, or increase savings |
| **< 65%** | High risk | Significant plan changes needed |

**Note**: Financial planners often target 80-90% success rate (not 100%) because:
- Too conservative = sacrificing lifestyle unnecessarily
- Plans can adapt over time (dynamic spending, part-time work)
- Non-portfolio resources exist (home equity, inheritance)

---

## Limitations and Disclaimers

### What This Calculator DOES NOT Model

1. **Taxes on Withdrawals**
   - Roth vs. Traditional IRA tax impacts not included in success rate
   - State income taxes not modeled
   - Tax drag on taxable accounts not included

2. **Healthcare Costs**
   - Medicare premiums, supplemental insurance, out-of-pocket costs not explicitly modeled
   - Long-term care expenses not included
   - Recommendation: Add 10-20% buffer to income goal for healthcare

3. **One-Time Expenses**
   - Major home repairs beyond annual maintenance
   - College funding for children/grandchildren
   - Large charitable gifts
   - Recommendation: Reduce "current savings" by anticipated expenses

4. **Lifestyle Changes**
   - Travel in early retirement, lower spending in later years not modeled
   - "Retirement smile" (spending decreases with age) not captured
   - Part-time work in retirement not included

5. **Multiple Properties**
   - Only primary home is modeled
   - Rental income properties not supported
   - Vacation homes not included

6. **Estate Planning**
   - Inheritances (receiving or leaving)
   - Estate taxes on large portfolios
   - Gifting strategies

7. **Detailed Correlations**
   - Simplified correlation model (70/30 common/idiosyncratic)
   - Does not fully capture crisis correlations (when all assets fall together)

8. **Behavioral Risk**
   - Assumes you stick to the plan (no panic selling)
   - Assumes consistent contributions (no job loss or spending shocks)
   - Assumes rational rebalancing

### Assumptions That May Change

1. **Constant Asset Allocation**
   - Assumes allocation stays fixed (except glide path)
   - Reality: May shift based on market conditions, advice, or preferences

2. **No Tactical Changes**
   - No market timing
   - No sector rotation
   - No individual stock selection

3. **Linear Inflation**
   - Assumes 2.4% constant inflation
   - Reality: Inflation varies (could be 0% or 8%)

4. **Social Security**
   - Assumes benefits are paid as promised
   - Reality: Potential reforms by 2035 when trust fund depletes

5. **No Advisor Fees**
   - Assumes zero management fees
   - Reality: 0.25% - 1.5% annual fees reduce returns

### How to Interpret Results

✅ **Do use this calculator to**:
- Understand the *probability distribution* of outcomes
- Compare different strategies
- Stress-test your plan under various scenarios
- Identify gaps in your retirement readiness

❌ **Do NOT use this calculator to**:
- Predict the exact dollar amount you'll have
- Time the market
- Replace comprehensive financial planning
- Make decisions about specific tax strategies or account types

### Recommended Safety Factors

To account for unmodeled risks:

1. **Add 10-20% to income goal** for healthcare/unexpected expenses
2. **Reduce current savings by 10%** for emergency buffers
3. **Target 85%+ success rate**, not just 50%
4. **Review annually** and adjust plan based on actual results

### Black Swan Events

This calculator **cannot predict**:
- Major economic crises (2008-level events beyond the modeled crash scenario)
- Policy changes (tax law, Social Security reform)
- Personal shocks (health, divorce, job loss)
- Technological disruption affecting markets

**Recommendation**: Build flexibility into your plan (emergency fund, part-time work options, willingness to adjust spending).

---

## Appendix: Formula Quick Reference

### Monte Carlo
```
Z ~ N(0,1)  [via Box-Muller transform]
Return_equity = exp(μ - σ²/2 + σ×Z) - 1
Return_bond = μ + σ×Z
Return_home = normal distribution, correlated with inflation (0.6) and equities (0.2)
Monthly μ = Annual μ / 12
Monthly σ = Annual σ / √12
```

### Asset Allocation
```
Equity% = [10% + (score/40)×80%]
          × Time_Horizon_Multiplier
          + Job_Stability_Adj
          + Guaranteed_Income_Boost
Constrained: [10%, 95%]
```

### Guardrails Withdrawal
```
Rate = Withdrawal / Portfolio
If Rate < 3.6%: Increase withdrawal by 10%
If Rate > 5.4% (and 15+ years left): Decrease by 10%
If prior return < 0: Skip inflation
Else: Inflate by 2.4%
```

### Glide Path
```
Pre-retirement: Equity% decreases 1.5%/year (floor 20%)
Post-retirement: Equity% decreases 3%/year (floor 30%)
```

### Home Ownership
```
Net Monthly Benefit = Monthly Rent - (
  Property Tax / 12 +
  Insurance / 12 +
  Maintenance / 12
)

Home Sale Proceeds = Home Value × 0.94  (6% selling costs)

Ownership Costs Inflation = 3% annually
```

### Success Rate
```
Success Rate = (Sims where balance > 0 at end AND income never cut) / Total Sims
```

---

**Document Version**: 2.0
**Last Updated**: January 19, 2026
**Methodology Current As Of**: January 19, 2026
**Market Data Date**: January 2026
