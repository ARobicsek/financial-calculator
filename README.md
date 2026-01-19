# Not Relying on Chance - Financial Calculator

A sophisticated retirement planning tool that uses Monte Carlo simulations to model portfolio outcomes, with a focus on risk-matched strategies and real estate decisions.

## 🌟 Key Features
- **Monte Carlo Simulation:** 1,000 runs to project likely retirement outcomes.
- **Unified Home Ownership Model:** "Primary Home" is treated as a distinct asset class across all strategies. It tracks equity, appreciation, sale events (after a holding period), and rent vs. buy trade-offs.
- **Strategy Comparison:** interactive comparing of "Risk-Matched", "US-Focused", and "Your Current" portfolios.
- **Dynamic Dashboard:** Real-time updates for sliders, home value hints, and "Rent vs Buy" analysis.

## 📂 Key Files
- `src/engine/monteCarlo.js`: The core simulation engine. Contains `runSingleSimulation` (unified logic for liquid + home assets) and `runMonteCarloSimulation`.
- `src/modules/calculator.js`: Orchestrates data flow. Builds `housingParams` and runs simulations for all strategies.
- `src/modules/ui-renderers/resultsStep.js`: Renders the results dashboard, including the dynamic **Rent vs Buy** card.
- `src/modules/dashboard.js`: Handles dashboard inputs, sliders, and real-time value hints.

## 🚀 Getting Started
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`

## 🏠 Home Purchase Model details
The calculator now consistently models home ownership:
- **Purchase:** Part of portfolio is allocated to home (user-specified percentage).
- **Holding Period:** Configurable from 1-20 years or "Never" (keep home forever).
- **Ownership Costs:** Property tax, insurance, maintenance (all inflating at 3% annually).
- **Sale:** Home sold after holding period (minus 6% costs), proceeds reinvested into liquid portfolio.
- **Net Worth Tracking:** Portfolio chart displays total net worth (liquid + home equity) for smooth projections without "steps" when home is sold.
- **Comparison:** The "Rent vs Buy" card dynamically compares the *selected* strategy with and without the home purchase.
- **Strategy Consistency:** All strategy cards (Risk-Matched, US-Focused, etc.) include the user's home allocation if specified.
