# Simulation Assumptions & Parameters

This document describes all assumptions used in the Monte Carlo retirement simulations.

---

## Personal Profile (Your Inputs)

| Parameter | Value |
|-----------|-------|
| Current Age | 52 |
| Retirement Age | 65 (13 years to retirement) |
| Plan Through Age | 95 (43-year horizon) |
| Tax Filing Status | Married Filing Jointly |
| Job Stability | Stable |
| Risk Tolerance | Moderate-to-high (4/5 on all questions) |

## Assets & Income

| Parameter | Value |
|-----------|-------|
| Current Savings | $11,100,000 |
| Monthly Contribution | $2,000 |
| Social Security | $2,500/month starting at age 67 |
| Other Guaranteed Income | $0 |
| Desired Annual Income | $400,000 or $500,000 (tested) |
| Withdrawal Strategy | Fixed (inflation-adjusted) |

## Housing Parameters

### Buy Scenario
| Parameter | Value |
|-----------|-------|
| Home Purchase Price | $3,000,000 |
| Down Payment | 100% (cash purchase from portfolio) |
| Property Tax Rate | 1.2% ($36,000/year) |
| Annual Insurance | $5,000 |
| Maintenance Rate | 0.75% ($22,500/year) |
| **Total Annual Ownership Costs** | **~$63,500/year** ($5,292/month) |

### Rent Scenario
| Parameter | Value |
|-----------|-------|
| Monthly Rent | $14,000 ($168,000/year) |
| **Net Annual Savings from Buying** | **~$104,500/year** |

---

## Simulation Settings

| Parameter | Value | Notes |
|-----------|-------|-------|
| Number of Iterations | 10,000 | High-precision runs |
| Glide Path | Enabled | Reduces equity by 1.5% per year until retirement |
| Near-Term Crash Probability | 20% (base) / 60% (stress test) | Probability of 25% drawdown in years 1-3 |
| Home Selling Costs | 6% | Agent fees, closing costs |
| Ownership Cost Inflation | 3% per year | |

---

## Market Return Assumptions (January 2026)

Based on Vanguard, BlackRock, and Morningstar consensus forecasts.

| Asset Class | Expected Annual Return | Annual Volatility (Std Dev) |
|-------------|----------------------|----------------------------|
| US Large Cap (S&P 500) | 5.5% | 17% |
| US Small Cap | 6.0% | 20% |
| International Developed | 7.0% | 18% |
| Emerging Markets | 7.5% | 23% |
| US Aggregate Bonds | 4.3% | 5.5% |
| TIPS | 2.0% real | 6% |
| High Yield Bonds | 5.8% | 10% |
| REITs | 8.0% | 18% |
| Cash/Money Market | 2.8% | 1% |
| **Residential Real Estate** | **3.5%** | **8%** |

**Key notes:**
- US Large Cap return (5.5%) is below historical average (~10%) because the Shiller CAPE ratio is above 40—the highest since the dot-com bubble
- International stocks have higher expected returns due to valuation advantage
- Residential real estate returns ~1% real after inflation

---

## Strategy Allocations Tested

### "Current" Portfolio
| Asset | Weight |
|-------|--------|
| US Large Cap | 22% |
| US Small Cap | 4% |
| International Developed | 10% |
| Emerging Markets | 1% |
| US Aggregate Bonds | 23% |
| Cash/Money Market | **40%** |
| **Expected Return** | **4.3%** |
| **Volatility** | **4.4%** |

### "Risk-Matched" Portfolio
| Asset | Weight |
|-------|--------|
| US Large Cap | 33.6% |
| US Small Cap | 11.2% |
| International Developed | 18.7% |
| Emerging Markets | 11.2% |
| US Aggregate Bonds | 15.1% |
| TIPS | 6.3% |
| Cash/Money Market | 3.8% |
| **Expected Return** | **5.6%** |
| **Volatility** | **7.5%** |

### "Income-Focused" Portfolio
| Asset | Weight |
|-------|--------|
| US Large Cap | 30% |
| International Developed | 10% |
| US Aggregate Bonds | 30% |
| TIPS | 15% |
| High Yield Bonds | 10% |
| Cash/Money Market | 5% |
| **Expected Return** | **4.7%** |
| **Volatility** | **5.8%** |

---

## Economic Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Inflation Rate | 2.4% per year | 10-year Treasury breakeven + buffer |
| Fed Funds Rate | 3.5-3.75% | January 2026 |
| 10-Year Treasury | 4.15-4.23% | January 2026 |
| TIPS 10-Year Real Yield | 1.9% | January 2026 |

---

## Monte Carlo Simulation Methodology

### Overview
The simulation uses a **Monte Carlo approach** to model uncertainty in investment returns. Rather than assuming a single "expected" path, we run 10,000 independent simulations, each with randomly generated returns. This produces a distribution of outcomes that captures the range of possible futures.

### Time Structure
- **Monthly time steps**: All calculations occur on a monthly basis (516 months from age 52 to 95)
- **Two phases**:
  - **Accumulation phase** (age 52-65): Contributions added, no withdrawals
  - **Distribution phase** (age 65-95): Withdrawals taken, no contributions

### How Returns Are Generated

#### Step 1: Generate Random Numbers
Each month, we generate independent random numbers using the **Box-Muller transform**:
```
z = √(-2 × ln(u₁)) × cos(2π × u₂)
```
where u₁ and u₂ are uniform random numbers between 0 and 1. This produces standard normal random variables (mean 0, std dev 1).

#### Step 2: Apply Correlation Structure
Asset returns are not independent. We use a simplified factor model:
- **Equity factor**: A single random shock that affects all stocks
- **Bond factor**: A separate random shock that affects all bonds
- Each asset's return = 70% common factor + 30% idiosyncratic noise

This means in a bad equity month, all stocks tend to fall together (but not perfectly).

#### Step 3: Generate Asset Returns
For **equities** (stocks, REITs), we use a **lognormal distribution**:
```
Monthly return = exp(μ - σ²/2 + σ×z) - 1
```
This prevents returns from going below -100% (you can't lose more than everything).

For **bonds and real estate**, we use a **normal distribution**:
```
Monthly return = μ + σ×z
```
where μ = annual return / 12, σ = annual volatility / √12

#### Step 4: Combine into Portfolio Return
The portfolio return each month is the weighted average of all asset returns:
```
Portfolio return = Σ (weight_i × return_i)
```

### Crash Injection Mechanism
To test resilience to near-term market crashes:

1. **Random draw**: At simulation start, decide if this path experiences a crash based on the crash probability (20% or 60%)
2. **Crash timing**: If a crash occurs, it starts randomly within months 1-36 (first 3 years)
3. **Crash duration**: 6-18 months (randomly selected)
4. **Crash magnitude**: 25% total drawdown, spread evenly across the crash period
5. **Application**: The monthly drawdown is applied proportionally to equity weight
   - A 100% equity portfolio takes the full hit
   - A 40% equity portfolio takes 40% of the hit

### Monthly Simulation Loop

For each month in each of the 10,000 simulations:

```
1. GENERATE RETURNS
   - Generate correlated random returns for each asset class
   - Apply crash shock if in crash window
   - Calculate portfolio return

2. UPDATE PORTFOLIO VALUE
   - Portfolio = Portfolio × (1 + return)

3. UPDATE HOME VALUE (if owned)
   - Home = Home × (1 + real_estate_return)
   - If holding period reached: sell home, add proceeds to portfolio

4. APPLY CASH FLOWS
   If accumulation phase:
     - Add monthly contribution ($2,000)
     - If homeowner: add net rent savings ($8,700/month)
   If distribution phase:
     - Subtract monthly withdrawal ($33K-42K/month)
     - Adjust withdrawal for inflation annually

5. CHECK FOR DEPLETION
   - If portfolio ≤ 0, mark simulation as failed
   - Record trajectory for this year

6. APPLY GLIDE PATH (annually)
   - Reduce equity allocation by 1.5% per year
   - Add that 1.5% to bonds
```

### Home Ownership Mechanics

When buying a home:
1. **Home value extracted from portfolio**: $3M comes out of cash first, then bonds, then equities
2. **Two separate values tracked**: Liquid portfolio + Home equity
3. **Monthly rent savings**: $14K rent - $5.3K ownership costs = $8.7K reinvested
4. **At sale date**:
   - Selling costs = 6% of appreciated home value
   - Net proceeds added back to liquid portfolio
   - User reverts to "renting" status (costs absorbed in desiredIncome)

### Output Statistics

After all 10,000 simulations complete:

| Metric | Calculation |
|--------|-------------|
| **Success Rate** | % of simulations where portfolio > $0 at age 95 |
| **Median Legacy** | 50th percentile of final portfolio values (p50) |
| **P10 / P90** | 10th and 90th percentile outcomes |
| **Trajectory** | Percentile bands at each age for fan charts |

### Withdrawal Strategy (Fixed, Inflation-Adjusted)

- Starting withdrawal at retirement = desiredIncome × (1 + inflation)^yearsToRetirement
- Each year, withdrawal increases by inflation rate (2.4%)
- No adjustments for market performance ("fixed" strategy)

**Success = portfolio lasts through age 95 without depletion**

---

## What "Success Rate" Means

A simulation is considered **successful** if:
1. Portfolio never depletes before age 95
2. Full inflation-adjusted income was maintained throughout

The reported success rate = (# of successful simulations) / (total simulations)

---

## Key Model Limitations

1. **No explicit rent expense post-home-sale:** Assumes desiredIncome includes all housing costs
2. **No taxes modeled:** Withdrawals are gross amounts; actual needs may differ
3. **Single home value:** No distinction between different real estate markets
4. **Simplified correlations:** Uses approximated correlation structure, not full covariance matrix
5. **Static allocation during retirement:** No further rebalancing modeled after retirement
6. **No health care shocks:** Medical expenses assumed stable within income

---

## Data Sources

- **Return Expectations:** Vanguard Capital Markets Model (2024), BlackRock Investment Institute
- **Inflation:** 10-Year Treasury Breakeven Rate (FRED)
- **Real Estate:** Case-Shiller US National Home Price Index historical analysis
- **Volatility:** Historical standard deviations from 1990-2024
