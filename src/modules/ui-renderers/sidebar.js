import { MARKET_DATA, ASSUMPTION_TOOLTIPS } from '../../data/marketData.js';
import { formatAssetName } from '../utils/formatting.js';

export function setupAssumptionsSidebar() {
  document.getElementById('closeSidebar')?.addEventListener('click', () => toggleSidebar(false));
}

export function toggleSidebar(show) {
  const sidebar = document.getElementById('assumptionsSidebar');
  if (show) {
    renderAssumptionsSidebar();
    sidebar.classList.add('visible');
    sidebar.classList.remove('hidden');
  } else {
    sidebar.classList.remove('visible');
  }
}

function renderAssumptionsSidebar() {
  const content = document.getElementById('assumptionsContent');
  content.innerHTML = `
    <div class="assumption-group">
      <h4 class="tooltip-trigger" data-tooltip="${ASSUMPTION_TOOLTIPS.categories.expectedReturns}">
        Expected Returns (Annual)
        <span class="info-icon">ⓘ</span>
      </h4>
      ${Object.entries(MARKET_DATA.expectedReturns).map(([k, v]) => `
        <div class="assumption-item tooltip-trigger" data-tooltip="${ASSUMPTION_TOOLTIPS.assets[k] || ''}">
          <span class="label">${formatAssetName(k)}</span>
          <span class="value">${(v * 100).toFixed(1)}%</span>
        </div>
      `).join('')}
    </div>
    <div class="assumption-group">
      <h4 class="tooltip-trigger" data-tooltip="${ASSUMPTION_TOOLTIPS.categories.volatility}">
        Volatility
        <span class="info-icon">ⓘ</span>
      </h4>
      ${Object.entries(MARKET_DATA.volatility).map(([k, v]) => `
        <div class="assumption-item tooltip-trigger" data-tooltip="${ASSUMPTION_TOOLTIPS.assets[k] || ''}">
          <span class="label">${formatAssetName(k)}</span>
          <span class="value">${(v * 100).toFixed(1)}%</span>
        </div>
      `).join('')}
    </div>
    <div class="assumption-group">
      <h4 class="tooltip-trigger" data-tooltip="${ASSUMPTION_TOOLTIPS.categories.inflation}">
        Economic Assumptions
        <span class="info-icon">ⓘ</span>
      </h4>
      <div class="assumption-item">
        <span class="label">Inflation</span>
        <span class="value">${(MARKET_DATA.inflation.expected * 100).toFixed(1)}%</span>
      </div>
      <div class="assumption-item tooltip-trigger" data-tooltip="${ASSUMPTION_TOOLTIPS.categories.economicRates}">
        <span class="label">10-Year Treasury</span>
        <span class="value">${(MARKET_DATA.rates.treasury10Year * 100).toFixed(2)}%</span>
      </div>
    </div>
  `;

  // Setup tooltip interactions
  setupTooltips();
}

function setupTooltips() {
  const triggers = document.querySelectorAll('.tooltip-trigger');

  triggers.forEach(trigger => {
    const tooltipText = trigger.dataset.tooltip;
    if (!tooltipText) return;

    trigger.addEventListener('mouseenter', (e) => {
      showTooltip(e.target, tooltipText);
    });

    trigger.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    // Touch support for mobile
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.querySelector('.custom-tooltip');
      if (existing) {
        hideTooltip();
      } else {
        showTooltip(e.target, tooltipText);
      }
    });
  });
}

function showTooltip(element, text) {
  hideTooltip(); // Remove any existing tooltip

  const tooltip = document.createElement('div');
  tooltip.className = 'custom-tooltip';
  tooltip.textContent = text;
  document.body.appendChild(tooltip);

  // Position tooltip
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Try to position to the left of the sidebar
  let left = rect.left - tooltipRect.width - 12;
  if (left < 10) {
    // If no room on left, position below
    left = rect.left;
    tooltip.style.top = `${rect.bottom + 8}px`;
  } else {
    tooltip.style.top = `${rect.top}px`;
  }
  tooltip.style.left = `${Math.max(10, left)}px`;

  // Ensure tooltip doesn't go off bottom of screen
  setTimeout(() => {
    const finalRect = tooltip.getBoundingClientRect();
    if (finalRect.bottom > window.innerHeight - 10) {
      tooltip.style.top = `${window.innerHeight - finalRect.height - 10}px`;
    }
  }, 0);
}

function hideTooltip() {
  const existing = document.querySelector('.custom-tooltip');
  if (existing) existing.remove();
}

export function showMethodology() {
  // Remove any existing modal
  const existing = document.querySelector('.methodology-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'methodology-modal-overlay';
  overlay.innerHTML = `
        <div class="methodology-modal">
            <button class="methodology-close">&times;</button>
            <h2>📊 Methodology</h2>
            
            <div class="methodology-section">
                <h3>Monte Carlo Simulation</h3>
                <ul>
                    <li><strong>1,000 iterations</strong> per analysis for statistical significance</li>
                    <li><strong>Monthly time steps</strong> to capture sequence-of-returns risk accurately</li>
                    <li><strong>Lognormal distribution</strong> for equity returns (prevents negative prices)</li>
                    <li><strong>Normal distribution</strong> for bond returns</li>
                    <li><strong>Correlated returns</strong> using common factor model (70% systematic, 30% idiosyncratic)</li>
                </ul>
            </div>
            
            <div class="methodology-section">
                <h3>Market Assumptions (Jan 2026)</h3>
                <p>Expected returns derived from consensus of major forecasters:</p>
                <ul>
                    <li>Vanguard Capital Markets Model</li>
                    <li>BlackRock Investment Institute</li>
                    <li>J.P. Morgan Long-Term Capital Market Assumptions</li>
                    <li>Research Affiliates Asset Allocation</li>
                </ul>
                <p><em>International equities assume higher returns due to current valuation discount vs. US markets.</em></p>
            </div>
            
            <div class="methodology-section">
                <h3>Withdrawal Strategies</h3>
                <ul>
                    <li><strong>Guardrails (Default):</strong> Modified Guyton-Klinger rules. Spending adjusts ±10% if withdrawal rate deviates &gt;20% from initial target. Inflation adjustments skipped after negative return years.</li>
                    <li><strong>Fixed:</strong> Constant inflation-adjusted withdrawals regardless of portfolio performance.</li>
                </ul>
            </div>
            
            <div class="methodology-section">
                <h3>Success Definition</h3>
                <p>A simulation is considered <strong>successful</strong> if:</p>
                <ul>
                    <li>Portfolio balance remains above $0 through end age, AND</li>
                    <li>Annual withdrawals are always maintained at 100% of target income (no cuts)</li>
                </ul>
                <p><em>Note: Target income is inflation-adjusted from today's dollars to retirement.</em></p>
            </div>
            
            <div class="methodology-section">
                <h3>Key Limitations</h3>
                <ul>
                    <li>Past performance and forecasts do not guarantee future results</li>
                    <li>Does not model taxes, healthcare costs, or long-term care</li>
                    <li>Assumes constant asset allocation (except glide path)</li>
                    <li>Social Security estimates are user-provided, not calculated</li>
                </ul>
            </div>
            
            <p class="methodology-disclaimer">
                <strong>Disclaimer:</strong> This tool is for educational purposes only. Consult a qualified financial advisor for personalized advice.
            </p>
        </div>
    `;

  document.body.appendChild(overlay);

  // Close handlers
  overlay.querySelector('.methodology-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

