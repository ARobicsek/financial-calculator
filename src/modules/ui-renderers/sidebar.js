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
    alert('Methodology documentation coming soon. This calculator uses:\n\n• 1,000 Monte Carlo simulations\n• Monthly time steps for sequence-of-returns accuracy\n• Lognormal distribution for equities\n• Jan 2026 market assumptions from major forecasters\n• Guardrails withdrawal strategy (Guyton-Klinger modified)');
}
