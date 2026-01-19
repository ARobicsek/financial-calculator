import { state } from '../state.js';
// import { renderInlineEditor, attachInlineEditorListeners } from './inlineEditor.js'; // Disabling inline editor in dashboard mode
import { renderStrategyComparison, attachCustomCardListeners, customCardAllocation } from './strategyComparison.js';
import { formatNumber, formatRiskProfile } from '../utils/formatting.js';
import { showMethodology, toggleSidebar, setupAssumptionsSidebar } from './sidebar.js';
import { FUND_RECOMMENDATIONS } from '../../data/marketData.js';
import { Chart } from 'chart.js';
import { runMonteCarloSimulation } from '../../engine/monteCarlo.js';
import { calculatePortfolioStats } from '../../engine/assetAllocation.js';

export function updateResultsView(recalculateCallback) {
  // In Dashboard mode, we target the #resultsContainer directly.
  // We no longer need to hide wizard/show results.
  const container = document.getElementById('resultsContainer');
  if (!container) return; // Should not happen in dashboard mode

  const { monte, allocation, riskProfile, portfolioStats, strategyComparison } = state.results;

  // Get selected strategy or default to Risk-Matched
  const selectedStrategyName = state.selectedStrategy || 'Risk-Matched';
  const selectedStrategy = strategyComparison?.find(s => s.name === selectedStrategyName);

  // Debug: log if strategy not found
  if (!selectedStrategy) {
    console.warn('Strategy not found:', selectedStrategyName, 'Available:', strategyComparison?.map(s => s.name));
  }

  const successPercent = selectedStrategy
    ? (selectedStrategy.successRate * 100).toFixed(0)
    : (monte.successRate * 100).toFixed(0);
  const selectedStats = selectedStrategy?.stats || portfolioStats;

  container.innerHTML = `
    <div class="results-header">
      <h2>Your Projections</h2>
    </div>
    
    <div class="primary-result">
      <div class="funded-age">
        <div class="label">Your plan is funded through age</div>
        <div class="age">${monte.fundedThroughAge}</div>
        <div class="success-rate">
          <span class="percent">${successPercent}%</span> probability of success
          ${successPercent >= 80 ? '✓' : '⚠️'}
        </div>
        <div class="selected-strategy-label">
          Using <strong>${selectedStrategyName}</strong> allocation
        </div>
      </div>
    </div>
    
    <div class="results-grid three-columns">
      <div class="result-card">
        <h4>Portfolio at Retirement</h4>
        <div class="value">$${formatNumber(selectedStrategy?.medianPortfolio || monte.portfolioAtRetirement.p50)}</div>
        <div class="subtext">Median projection at age ${state.inputs.retirementAge}</div>
      </div>
      <div class="result-card">
        <h4>Initial Annual Withdrawal</h4>
        <div class="value">$${formatNumber(monte.initialWithdrawal)}</div>
        <div class="subtext">${(monte.withdrawalRate * 100).toFixed(1)}% withdrawal rate</div>
      </div>
      <div class="result-card">
        <h4>Expected Portfolio Return</h4>
        <div class="value">${selectedStats.expectedReturnFormatted}</div>
        <div class="subtext">Volatility: ${selectedStats.volatilityFormatted}</div>
      </div>
    </div>
    
    <div class="chart-container">
      <div class="chart-header">
        <h3>Portfolio Projection</h3>
        <div class="chart-legend">
          <div class="legend-item"><span class="legend-color" style="background: rgba(34, 197, 94, 0.3);"></span> 25-75th</div>
          <div class="legend-item"><span class="legend-color" style="background: rgba(212, 169, 66, 1);"></span> Median</div>
          <div class="legend-item"><span class="legend-color" style="background: rgba(239, 68, 68, 0.3);"></span> 10-90th</div>
        </div>
      </div>
      <div class="chart-wrapper">
        <canvas id="fanChart"></canvas>
      </div>
    </div>
    
    ${renderStrategyComparison()}
    ${renderHousingComparison()}
    ${renderAssumptionsUsed()}
  `;

  renderFanChart();
  attachCustomCardListeners();

  // Setup assumptions sidebar
  setupAssumptionsSidebar();

  // Initialize Rent vs Buy comparison
  if (selectedStrategy) {
    updateHousingComparison(selectedStrategyName, selectedStrategy.allocation);
  }

  // Attach methodology link listener
  document.getElementById('methodologyLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showMethodology();
  });

  // Attach assumptions sidebar button listener
  document.getElementById('viewAssumptionsBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleSidebar(true);
  });

  // Attach strategy card click handlers
  attachStrategyCardListeners();
}

function attachStrategyCardListeners() {
  document.querySelectorAll('.strategy-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking on a slider inside the custom card
      if (e.target.tagName === 'INPUT') return;

      const strategyName = card.querySelector('h4')?.textContent;
      if (strategyName) {
        if (strategyName === 'Build Your Own') {
          // For Build Your Own, pass the current custom allocation (converted to decimals)
          const allocation = {};
          for (const [key, value] of Object.entries(customCardAllocation)) {
            allocation[key] = value / 100;
          }
          selectStrategy(strategyName, allocation);
        } else {
          selectStrategy(strategyName);
        }
      }
    });
  });
}

export function selectStrategy(strategyName, customAllocation = null) {
  state.selectedStrategy = strategyName;

  // Get strategy data
  const { strategyComparison } = state.results;
  let selectedStrategy = strategyComparison?.find(s => s.name === strategyName);

  // For Build Your Own, use current custom allocation
  let allocation;
  if (strategyName === 'Build Your Own' && customAllocation) {
    allocation = customAllocation;
  } else if (selectedStrategy) {
    allocation = selectedStrategy.allocation;
  } else {
    return;
  }

  // Run a fresh simulation to get trajectory data for the chart
  // Include housing params if this allocation has home ownership
  const hasHome = (allocation.residentialRealEstate || 0) > 0;
  const housingParams = hasHome ? state.results.housingParams : null;

  const simResult = runMonteCarloSimulation({
    currentAge: state.inputs.age,
    retirementAge: state.inputs.retirementAge,
    endAge: state.inputs.endAge,
    currentSavings: state.inputs.currentSavings,
    windfall: state.inputs.windfall,
    monthlyContribution: state.inputs.monthlyContribution,
    desiredIncome: state.inputs.desiredIncome,
    withdrawalStrategy: state.inputs.withdrawalStrategy,
    allocation: allocation,
    glidePathEnabled: state.inputs.useGlidePath,
    housingParams: housingParams,
    nearTermCrashProbability: state.inputs.nearTermCrashProbability,
    iterations: 500
  });

  // Update summary cards
  const successPercent = (simResult.successRate * 100).toFixed(0);
  const stats = selectedStrategy?.stats || calculatePortfolioStats(allocation);

  document.querySelector('.percent').textContent = successPercent + '%';
  document.querySelector('.success-rate').innerHTML = `
    <span class="percent">${successPercent}%</span> probability of success
    ${successPercent >= 80 ? '✓' : '⚠️'}
  `;
  document.querySelector('.selected-strategy-label').innerHTML =
    `Using <strong>${strategyName}</strong> allocation`;

  // Update result cards
  const resultCards = document.querySelectorAll('.result-card');
  if (resultCards[0]) {
    resultCards[0].querySelector('.value').textContent = '$' + formatNumber(simResult.portfolioAtRetirement.p50);
  }
  if (resultCards[2]) {
    resultCards[2].querySelector('.value').textContent = stats.expectedReturnFormatted;
    resultCards[2].querySelector('.subtext').textContent = 'Volatility: ' + stats.volatilityFormatted;
  }

  // Update Rent vs Buy comparison
  updateHousingComparison(strategyName, allocation);

  // Update visual selection on cards
  document.querySelectorAll('.strategy-card').forEach(card => {
    card.classList.remove('selected');
    const cardTitle = card.querySelector('h4')?.textContent;
    if (cardTitle === strategyName) {
      card.classList.add('selected');
    }
  });

  // Redraw fan chart with new trajectory data
  state.results.monte.trajectoryByAge = simResult.trajectoryByAge;
  renderFanChartWithData(simResult.trajectoryByAge);
}

function renderFanChart() {
  const { trajectoryByAge } = state.results.monte;
  renderFanChartWithData(trajectoryByAge);
}

function renderFanChartWithData(trajectoryByAge) {
  const ages = Object.keys(trajectoryByAge).map(Number);

  const ctx = document.getElementById('fanChart').getContext('2d');

  if (state.fanChart) state.fanChart.destroy();

  state.fanChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        {
          label: '10th Percentile',
          data: ages.map(age => trajectoryByAge[age].p10),
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0
        },
        {
          label: '25th Percentile',
          data: ages.map(age => trajectoryByAge[age].p25),
          borderColor: 'transparent',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: '-1',
          pointRadius: 0
        },
        {
          label: '75th Percentile',
          data: ages.map(age => trajectoryByAge[age].p75),
          borderColor: 'transparent',
          backgroundColor: 'rgba(34, 197, 94, 0.25)',
          fill: '-1',
          pointRadius: 0
        },
        {
          label: '90th Percentile',
          data: ages.map(age => trajectoryByAge[age].p90),
          borderColor: 'transparent',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: '-1',
          pointRadius: 0
        },
        {
          label: 'Median (50th)',
          data: ages.map(age => trajectoryByAge[age].p50),
          borderColor: '#d4a942',
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: $${formatNumber(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Age', color: '#9ca3af' },
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          title: { display: true, text: 'Portfolio Value', color: '#9ca3af' },
          ticks: { color: '#9ca3af', callback: v => '$' + formatNumber(v) },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

function renderRecommendations() {
  const { monte, allocation } = state.results;
  const recommendations = [];

  if (monte.successRate < 0.80) {
    recommendations.push({
      icon: '⚠️',
      title: 'Consider Adjustments',
      text: `Your success rate is ${(monte.successRate * 100).toFixed(0)}%. Consider increasing savings, delaying retirement, or reducing desired income.`
    });
  }

  recommendations.push({
    icon: '📈',
    title: `${(allocation.equityPercentage * 100).toFixed(0)}/${(100 - allocation.equityPercentage * 100).toFixed(0)} Stock/Bond Split`,
    text: `Based on your risk profile and time horizon. International stocks (${(allocation.allocation.intlDeveloped * 100).toFixed(0)}%) offer valuation advantage over US equities.`
  });

  recommendations.push({
    icon: '🔄',
    title: 'Consider Roth Conversions',
    text: 'Fill the 22% tax bracket before retirement to reduce future RMD tax burden. Review with a tax professional.'
  });

  return `
    <div class="recommendations-section">
      <h3>Recommendations</h3>
      ${recommendations.map(r => `
        <div class="recommendation-card">
          <div class="recommendation-icon">${r.icon}</div>
          <div class="recommendation-content">
            <h4>${r.title}</h4>
            <p>${r.text}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFundTable() {
  return `
    <div class="chart-container">
      <h3 style="margin-bottom: 1rem;">Recommended Low-Cost Funds</h3>
      <table class="fund-table">
        <thead>
          <tr>
            <th>Asset Class</th>
            <th>Primary ETF</th>
            <th>Expense Ratio</th>
            <th>Alternative</th>
          </tr>
        </thead>
        <tbody>
          ${FUND_RECOMMENDATIONS.map(f => `
            <tr>
              <td>${f.assetClass}</td>
              <td><strong>${f.primary.ticker}</strong> - ${f.primary.name}</td>
              <td class="expense-ratio">${(f.primary.expense * 100).toFixed(2)}%</td>
              <td>${f.alternatives[0] ? `${f.alternatives[0].ticker} (${(f.alternatives[0].expense * 100).toFixed(2)}%)` : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAssumptionsUsed() {
  return `
    <div class="chart-container" style="background: rgba(212, 169, 66, 0.05); border-color: rgba(212, 169, 66, 0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0; color: var(--color-accent);">📋 Assumptions Used</h3>
        <button id="viewAssumptionsBtn" class="btn btn-secondary btn-small" style="font-size: 0.75rem;">View All Assumptions</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; font-size: 0.875rem;">
        <div>
          <strong>US Large Cap:</strong> 5.5% return, 17% vol<br>
          <strong>International:</strong> 7.0% return, 18% vol<br>
          <strong>Bonds:</strong> 4.3% return, 5.5% vol
        </div>
        <div>
          <strong>Inflation:</strong> 2.4% annual<br>
          <strong>Simulations:</strong> 1,000 iterations<br>
          <strong>Time Steps:</strong> Monthly
        </div>
        <div>
          <strong>Withdrawal:</strong> ${state.inputs.withdrawalStrategy === 'guardrails' ? 'Guardrails (4.5% initial)' : 'Fixed (3.9%)'}<br>
          <strong>Glide Path:</strong> ${state.inputs.useGlidePath ? 'Enabled' : 'Disabled'}
        </div>
      </div>
      <p style="margin-top: 1rem; font-size: 0.75rem; color: var(--color-text-muted);">
        Based on January 2026 market conditions and major forecaster consensus. Review <a href="#" id="methodologyLink" style="color: var(--color-accent);">methodology</a> for details.
      </p>
    </div>
  `;
}

function renderHousingComparison() {
  // Show placeholder if user has home allocation - content will be populated by updateHousingComparison
  const housingParams = state.results.housingParams;
  if (!housingParams) return '';

  return `
    <div class="chart-container housing-comparison-card" id="housingComparisonCard" style="border: 2px solid var(--color-accent); background: rgba(212, 169, 66, 0.05);">
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
        <span style="font-size: 1.75rem;">🏠</span>
        <div>
          <h3 style="margin: 0; color: var(--color-accent);">Rent vs. Buy Analysis</h3>
          <p style="margin: 0; font-size: 0.875rem; color: var(--color-text-secondary);" id="housingSubtitle">
            Comparing selected strategy with and without home purchase ($${(housingParams.homePurchasePrice / 1000000).toFixed(2)}M home)
          </p>
        </div>
      </div>
      <div id="housingComparisonContent">
        <p style="text-align: center; color: var(--color-text-muted);">Loading comparison...</p>
      </div>
    </div>
  `;
}

// Run on-demand comparison for selected strategy with vs without home
export function updateHousingComparison(strategyName, allocation) {
  const housingParams = state.results.housingParams;
  const contentDiv = document.getElementById('housingComparisonContent');
  if (!housingParams || !contentDiv) return;

  // Grey out for Build Your Own - too complex to properly compare
  if (strategyName === 'Build Your Own') {
    contentDiv.innerHTML = `
      <div style="text-align: center; padding: 2rem; opacity: 0.6;">
        <p style="color: var(--color-text-muted); font-style: italic;">
          Rent vs. Buy analysis is not available for custom allocations.<br>
          <span style="font-size: 0.875rem;">Select a preset strategy to see housing comparison.</span>
        </p>
      </div>
    `;
    // Update subtitle
    const subtitle = document.getElementById('housingSubtitle');
    if (subtitle) {
      subtitle.textContent = 'Select a preset strategy to compare housing scenarios';
    }
    return;
  }

  // Check if this strategy has home allocation
  const hasHome = (allocation.residentialRealEstate || 0) > 0;

  // Find the selected strategy from pre-computed results
  // If not found, it might be "Build Your Own"
  const selectedStrategy = state.results.strategyComparison?.find(s => s.name === strategyName);

  let withHomeResult, allocationWithoutHome;

  if (selectedStrategy) {
    // Standard Strategy: Use pre-computed result
    withHomeResult = {
      successRate: selectedStrategy.successRate,
      portfolioAtRetirement: {
        p50: selectedStrategy.medianPortfolio
      }
    };
    allocationWithoutHome = selectedStrategy.originalAllocation || allocation;
  } else {
    // Custom Strategy (Build Your Own)
    // We must run the "Buy" simulation explicitly if not already available (though selectStrategy usually runs it to get stats)
    // Using the passed allocation which INCLUDES home
    const buySim = runMonteCarloSimulation({
      currentAge: state.inputs.age,
      retirementAge: state.inputs.retirementAge,
      endAge: state.inputs.endAge,
      currentSavings: state.inputs.currentSavings,
      windfall: state.inputs.windfall,
      monthlyContribution: state.inputs.monthlyContribution,
      desiredIncome: state.inputs.desiredIncome,
      withdrawalStrategy: state.inputs.withdrawalStrategy,
      allocation: allocation,
      glidePathEnabled: state.inputs.useGlidePath,
      housingParams: housingParams,
      nearTermCrashProbability: state.inputs.nearTermCrashProbability,
      iterations: 500
    });

    withHomeResult = {
      successRate: buySim.successRate,
      portfolioAtRetirement: {
        p50: buySim.portfolioAtRetirement.p50
      }
    };

    // Construct rent allocation: move home % back to Cash (or Liquid)
    allocationWithoutHome = { ...allocation };
    if (hasHome) {
      const homePct = allocationWithoutHome.residentialRealEstate;
      allocationWithoutHome.residentialRealEstate = 0;
      allocationWithoutHome.cashMoneyMarket = (allocationWithoutHome.cashMoneyMarket || 0) + homePct;
    }
  }

  // Run simulation WITHOUT home (RENT scenario)



  // Run simulation WITHOUT home (RENT scenario)
  const withoutHomeResult = runMonteCarloSimulation({
    currentAge: state.inputs.age,
    retirementAge: state.inputs.retirementAge,
    endAge: state.inputs.endAge,
    currentSavings: state.inputs.currentSavings,
    windfall: state.inputs.windfall,
    monthlyContribution: state.inputs.monthlyContribution,
    desiredIncome: state.inputs.desiredIncome,
    withdrawalStrategy: state.inputs.withdrawalStrategy,
    allocation: allocationWithoutHome,
    glidePathEnabled: state.inputs.useGlidePath,
    nearTermCrashProbability: state.inputs.nearTermCrashProbability,
    housingParams: null, // No home
    iterations: 500  // Match the strategy comparison iterations
  });

  const buySuccess = (withHomeResult.successRate * 100).toFixed(0);
  const rentSuccess = (withoutHomeResult.successRate * 100).toFixed(0);
  const buyMedian = withHomeResult.portfolioAtRetirement.p50;
  const rentMedian = withoutHomeResult.portfolioAtRetirement.p50;
  const buyIsBetter = parseFloat(buySuccess) >= parseFloat(rentSuccess);
  const monthlySavings = housingParams.monthlyRent - housingParams.monthlyOwnershipCosts;

  contentDiv.innerHTML = `
    <div class="housing-comparison-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
      <div class="comparison-column rent-column" style="padding: 1.25rem; background: var(--color-bg-card); border-radius: var(--radius-lg); ${!buyIsBetter ? 'border: 2px solid var(--color-success);' : ''}">
        <h4 style="margin: 0 0 1rem 0; color: var(--color-text-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">
          🔑 Rent + Invest
        </h4>
        <div style="font-size: 2rem; font-weight: 700; color: var(--color-text-primary); margin-bottom: 0.5rem;">
          ${rentSuccess}%
        </div>
        <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Success Rate
        </div>
        <div style="border-top: 1px solid var(--color-border); padding-top: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: var(--color-text-muted);">Median at Retirement</span>
            <span style="font-weight: 600;">$${formatNumber(rentMedian)}</span>
          </div>
        </div>
      </div>
      
      <div class="comparison-column buy-column" style="padding: 1.25rem; background: var(--color-bg-card); border-radius: var(--radius-lg); ${buyIsBetter ? 'border: 2px solid var(--color-success);' : ''}">
        <h4 style="margin: 0 0 1rem 0; color: var(--color-text-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">
          🏠 Buy Home
        </h4>
        <div style="font-size: 2rem; font-weight: 700; color: var(--color-text-primary); margin-bottom: 0.5rem;">
          ${buySuccess}%
        </div>
        <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Success Rate
        </div>
        <div style="border-top: 1px solid var(--color-border); padding-top: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: var(--color-text-muted);">Median at Retirement</span>
            <span style="font-weight: 600; color: ${buyIsBetter ? 'var(--color-success)' : 'inherit'};">$${formatNumber(buyMedian)}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="housing-insights" style="background: var(--color-bg-dark); border-radius: var(--radius-md); padding: 1.25rem;">
      <h4 style="margin: 0 0 1rem 0; font-size: 1rem;">Key Insights for ${strategyName}</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-accent);">
            ${housingParams.holdingPeriodYears} years
          </div>
          <div style="font-size: 0.875rem; color: var(--color-text-muted);">
            home holding period
          </div>
        </div>
        <div>
          <div style="font-size: 1.5rem; font-weight: 700; color: ${monthlySavings > 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
            $${formatNumber(Math.abs(monthlySavings))}/mo
          </div>
          <div style="font-size: 0.875rem; color: var(--color-text-muted);">
            ${monthlySavings > 0 ? 'saved by buying' : 'extra owning vs rent'}
          </div>
        </div>
        <div>
          <div style="font-size: 1.5rem; font-weight: 700; color: ${buyIsBetter ? 'var(--color-success)' : 'var(--color-warning)'};">
            ${buyIsBetter ? 'Buy' : 'Rent'}
          </div>
          <div style="font-size: 0.875rem; color: var(--color-text-muted);">
            recommended for this strategy
          </div>
        </div>
      </div>
    </div>
    
    <div style="margin-top: 1.25rem; padding: 1rem; background: rgba(212, 169, 66, 0.1); border-radius: var(--radius-md);">
      <p style="margin: 0; font-size: 0.875rem; color: var(--color-text-secondary);">
        💡 <strong style="color: var(--color-accent);">Analysis:</strong> 
        ${buyIsBetter ?
      `For <strong>${strategyName}</strong>, buying a home shows a ${buySuccess}% success rate vs ${rentSuccess}% for renting. After ${housingParams.holdingPeriodYears} years, home proceeds are reinvested.` :
      `For <strong>${strategyName}</strong>, renting and investing the difference shows a ${rentSuccess}% success rate vs ${buySuccess}% for buying. Consider keeping capital liquid.`
    }
      </p>
    </div>
  `;

  // Update subtitle
  const subtitle = document.getElementById('housingSubtitle');
  if (subtitle) {
    subtitle.textContent = `${strategyName} strategy: with vs without home purchase ($${(housingParams.homePurchasePrice / 1000000).toFixed(2)}M home)`;
  }
}

