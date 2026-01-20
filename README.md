# Not Relying on Chance - Financial Calculator

🌐 **Live Site:** [https://not-relying-on-chance.netlify.app](https://not-relying-on-chance.netlify.app)

A sophisticated retirement planning tool that uses Monte Carlo simulations to model portfolio outcomes, with a focus on risk-matched strategies and real estate decisions.

## 🌟 Key Features
- **Monte Carlo Simulation:** 1,000 runs to project likely retirement outcomes.
- **Unified Home Ownership Model:** "Primary Home" is treated as a distinct asset class across all strategies. It tracks equity, appreciation, sale events (after a holding period), and rent vs. buy trade-offs.
- **Strategy Comparison:** Interactive comparison of "Risk-Matched", "US-Focused", "Global Tilt", "Income-Focused", "Your Current", and "Build Your Own" portfolios.
- **Dynamic Dashboard:** Real-time updates for sliders, home value hints, and "Rent vs Buy" analysis.
- **Near-Term Crash Stress Testing:** Configurable probability (0-60%) of a significant market downturn in the first 3 years.

## 📂 Key Files
| File | Purpose |
|------|---------|
| `src/engine/monteCarlo.js` | Core simulation engine with `runSingleSimulation` (unified liquid + home assets) and `runMonteCarloSimulation` |
| `src/modules/calculator.js` | Orchestrates data flow, builds `housingParams`, runs simulations for all strategies |
| `src/modules/ui-renderers/resultsStep.js` | Renders results dashboard including dynamic **Rent vs Buy** card |
| `src/modules/dashboard.js` | Handles dashboard inputs, sliders, and real-time value hints |
| `vite.config.js` | Vite build configuration (outputs to `dist/`) |

## 🚀 Getting Started

### Local Development
```bash
npm install
npm run dev
# Opens http://localhost:5173
```

### Production Build
```bash
npm run build    # Creates dist/ folder
npm run preview  # Test production build locally
```

## 🌐 Deployment

The app is hosted on **Netlify** with continuous deployment from GitHub.

| Setting | Value |
|---------|-------|
| **Live URL** | [https://not-relying-on-chance.netlify.app](https://not-relying-on-chance.netlify.app) |
| **Repository** | [ARobicsek/financial-calculator](https://github.com/ARobicsek/financial-calculator) |
| **Branch** | `main` |
| **Build Command** | `npm ci && npm run build` (via `netlify.toml`) |
| **Publish Directory** | `dist` |
| **Static Assets** | `public/` folder (copied to root of `dist/`) |

**Auto-deploy:** Every `git push` to `main` triggers an automatic rebuild (~1 min).

```bash
# Deploy changes
git add .
git commit -m "Your changes"
git push
# Netlify auto-deploys in ~1 minute
```

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

## 🔧 Changelog

### Jan 19, 2026 - Deployment
- 🚀 **Deployed to Netlify** at [not-relying-on-chance.netlify.app](https://not-relying-on-chance.netlify.app)
- Added `.gitignore` (excludes `node_modules/`, `dist/`)
- CI/CD: Auto-deploys on push to `main`

### Jan 2026 - Features & Fixes
- Added "Near-Term Crash Probability" slider for stress testing
- Fixed Rent vs Buy comparison to use original (pre-home-funding) allocations
- Strategy cards now use realistic home funding (cash/bonds first)
- Removed "Recommended Low-Cost Funds" table
- Added animated ellipsis during Monte Carlo calculation
- "Build Your Own" card now correctly updates main dashboard when selected
- **Fixed "Build Your Own" slider interactions** using robust event delegation
- **Refined Rent vs Buy analysis** to correctly compare strategy vs. strategy-without-home
- Removed hover question marks from assumptions sidebar

## 📝 Development Notes

### Architecture
- **Frontend:** Vanilla JavaScript + Vite (no framework)
- **Styling:** Custom CSS with dark theme
- **Charts:** Chart.js for portfolio projections
- **Build:** Vite bundles to ~281KB (gzipped: ~92KB)

### Known Considerations
- All calculations run client-side (no backend/database)
- Monte Carlo simulations use 1,000 iterations for balance of accuracy and performance
- Housing model assumes 3% annual cost inflation and 6% sale transaction costs
