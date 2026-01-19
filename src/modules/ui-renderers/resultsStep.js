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
  const selectedStrategy = strategyComparison?.find(s => s.name === selectedStrategyName) || riskMatchedStrategy;

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
    ${renderFundTable()}
    ${renderAssumptionsUsed()}
  `;

  renderFanChart();
  attachCustomCardListeners();

  // Setup assumptions sidebar
  setupAssumptionsSidebar();

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
