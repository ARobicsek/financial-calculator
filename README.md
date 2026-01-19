# Not Relying on Chance - Financial Calculator

A sophisticated retirement planning tool that uses Monte Carlo simulations to model portfolio outcomes, with a focus on risk-matched strategies and real estate decisions.

## 🌟 Key Features
- **Monte Carlo Simulation:** 1,000 runs to project likely retirement outcomes.
- **Unified Home Ownership Model:** "Primary Home" is treated as a distinct asset class across all strategies. It tracks equity, appreciation, sale events (after a holding period), and rent vs. buy trade-offs.
- **Strategy Comparison:** Interactive comparison of "Risk-Matched", "US-Focused", "Global Tilt", "Income-Focused", "Your Current", and "Build Your Own" portfolios.
- **Dynamic Dashboard:** Real-time updates for sliders, home value hints, and "Rent vs Buy" analysis.
- **Near-Term Crash Stress Testing:** Configurable probability (0-60%) of a significant market downturn in the first 3 years.

## 📂 Key Files
- `src/engine/monteCarlo.js`: The core simulation engine. Contains `runSingleSimulation` (unified logic for liquid + home assets) and `runMonteCarloSimulation`.
- `src/modules/calculator.js`: Orchestrates data flow. Builds `housingParams` and runs simulations for all strategies.
- `src/modules/ui-renderers/resultsStep.js`: Renders the results dashboard, including the dynamic **Rent vs Buy** card.
- `src/modules/dashboard.js`: Handles dashboard inputs, sliders, and real-time value hints.

## 🚀 Getting Started
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`

## 🏠 Home Purchase Model
The calculator consistently models home ownership:
- **Purchase:** Part of portfolio is allocated to home (user-specified percentage).
- **Realistic Funding:** Non-user strategies draw home funds from cash first, then bonds, then TIPS, then equities (not pro-rata).
- **Holding Period:** Configurable from 1-20 years or "Never" (keep home forever).
- **Ownership Costs:** Property tax, insurance, maintenance (all inflating at 3% annually).
- **Sale:** Home sold after holding period (minus 6% costs), proceeds reinvested into liquid portfolio.
- **Net Worth Tracking:** Portfolio chart displays total net worth (liquid + home equity).
- **Rent vs Buy Comparison:** Dynamically compares the *selected* strategy with and without the home purchase.

## 📉 Near-Term Crash Model
The "Near-Term Crash Probability" slider in Advanced Settings allows stress testing:
- **Range:** 0% to 60% probability of a crash in the first 3 years
- **Default:** 20% (roughly matches historical frequency)
- **Crash Magnitude:** ~25% equity drawdown spread over 6-18 months
- **Affected Assets:** US Large Cap, US Small/Mid Cap, International Developed, Emerging Markets
- **Unaffected Assets:** Bonds, TIPS, Cash, Real Estate

## 🔧 Recent Changes (Jan 2026)
- Added "Near-Term Crash Probability" slider for stress testing
- Fixed Rent vs Buy comparison to use original (pre-home-funding) allocations
- Strategy cards now use realistic home funding (cash/bonds first)
- Removed "Recommended Low-Cost Funds" table
- Added animated ellipsis during Monte Carlo calculation
- "Build Your Own" card now correctly updates main dashboard when selected
