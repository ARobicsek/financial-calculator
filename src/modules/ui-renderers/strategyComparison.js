import { state } from '../state.js';
import { formatNumber } from '../utils/formatting.js';
import { runMonteCarloSimulation } from '../../engine/monteCarlo.js';

export function renderStrategyComparison() {
  const { strategyComparison } = state.results;

  if (!strategyComparison || strategyComparison.length === 0) {
    return '';
  }

  // Position user's card first, then sort remaining by success rate descending
  const userCard = strategyComparison.find(s => s.isUserAllocation);
  const others = strategyComparison.filter(s => !s.isUserAllocation);
  const sorted = [...(userCard ? [userCard] : []), ...others.sort((a, b) => b.successRate - a.successRate)];

  return `
    <div class="chart-container strategy-comparison">
      <h3 style="margin-bottom: 1rem;">📊 Allocation Strategy Comparison</h3>
      <p class="strategy-intro">Different allocation strategies that could work for your goals. Success rates based on 500 Monte Carlo simulations each.</p>
      
      <div class="strategy-grid">
        ${sorted.map((strategy, index) => {
    const successPercent = (strategy.successRate * 100).toFixed(0);
    const isRecommended = index === 0;

    return `
            <div class="strategy-card ${isRecommended ? 'recommended' : ''} ${strategy.isUserAllocation ? 'user-allocation' : ''}">
              ${isRecommended ? '<div class="recommended-badge">Best Match</div>' : ''}
              ${strategy.isUserAllocation ? '<div class="user-badge">Your Portfolio</div>' : ''}
              <div class="strategy-header">
                <span class="strategy-icon">${strategy.icon}</span>
                <div class="strategy-title">
                  <h4>${strategy.name}</h4>
                  <p>${strategy.description}</p>
                </div>
              </div>
              <div class="strategy-success">
                <span class="success-number ${successPercent >= 80 ? 'good' : successPercent >= 60 ? 'warning' : 'danger'}">${successPercent}%</span>
                <span class="success-label">Success Rate</span>
              </div>
              <div class="strategy-details">
                <div class="strategy-metrics">
                  <div class="detail-row">
                    <span class="detail-label">Median at Retirement</span>
                    <span class="detail-value">$${formatNumber(strategy.medianPortfolio)}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Expected Return</span>
                    <span class="detail-value">${strategy.stats.expectedReturnFormatted}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Volatility</span>
                    <span class="detail-value">${strategy.stats.volatilityFormatted}</span>
                  </div>
                </div>
                ${renderAllocationBreakdown(strategy.allocation)}
              </div>
            </div>
          `;
  }).join('')}
        ${renderCustomAllocationCard()}
      </div>
    </div>
  `;
}

// Initialize custom card allocation state
export let customCardAllocation = {
  usLargeCap: 24,
  usSmallCap: 4,
  intlDeveloped: 10,
  emergingMarkets: 2,
  usAggregateBonds: 24,
  tips: 0,
  cashMoneyMarket: 36,
  residentialRealEstate: 0
};

// These refer to the *custom card result* state
export let customCardState = {
  successRate: null,
  median: null
};

let customCardDebounceTimer = null;

import { calculatePortfolioStats } from '../../engine/assetAllocation.js';

export function renderCustomAllocationCard() {
  // Sync home allocation from user inputs if they have configured one
  const userHomeAlloc = state.inputs.currentAllocation?.residentialRealEstate || 0;
  if (userHomeAlloc > 0 && customCardAllocation.residentialRealEstate === 0) {
    // Initialize custom card's home allocation to match user's portfolio
    customCardAllocation.residentialRealEstate = userHomeAlloc;
    // Reduce cash proportionally to accommodate home
    customCardAllocation.cashMoneyMarket = Math.max(0, customCardAllocation.cashMoneyMarket - userHomeAlloc);
  }

  // Build categories - always include home if user has configured home ownership
  const baseCats = [
    { key: 'usLargeCap', label: 'US Large Cap' },
    { key: 'usSmallCap', label: 'US Small/Mid' },
    { key: 'intlDeveloped', label: 'Intl Developed' },
    { key: 'emergingMarkets', label: 'Emerging Mkts' },
    { key: 'usAggregateBonds', label: 'US Bonds' },
    { key: 'tips', label: 'TIPS' },
    { key: 'cashMoneyMarket', label: 'Cash' }
  ];

  // Add home slider if user has configured housing params
  const cats = state.results?.housingParams
    ? [...baseCats, { key: 'residentialRealEstate', label: 'House' }]
    : baseCats;

  const total = Object.values(customCardAllocation).reduce((s, v) => s + v, 0);
  const successDisplay = customCardState.successRate !== null ? `${(customCardState.successRate * 100).toFixed(0)}%` : '—';
  const successClass = customCardState.successRate !== null ? (customCardState.successRate >= 0.80 ? 'good' : customCardState.successRate >= 0.60 ? 'warning' : 'danger') : '';

  return `
    <div class="strategy-card custom-allocation-card">
      <div class="custom-badge">Interactive</div>
      <div class="strategy-header">
        <span class="strategy-icon">🎛️</span>
        <div class="strategy-title">
          <h4>Build Your Own</h4>
          <p>Drag sliders to create your mix</p>
        </div>
      </div>
      <div class="strategy-success">
        <span class="success-number ${successClass}" id="customCardSuccess">${successDisplay}</span>
        <span class="success-label">Success Rate <span id="customCardLoading" class="custom-loading hidden">⏳</span></span>
      </div>
      
      <div class="strategy-details">
        <div class="strategy-metrics">
          <div class="detail-row">
            <span class="detail-label">Median at Retirement</span>
            <span class="detail-value" id="customCardMedian">${customCardState.median !== null ? '$' + formatNumber(customCardState.median) : '—'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Expected Return</span>
            <span class="detail-value" id="customCardReturn">${customCardState.stats ? customCardState.stats.expectedReturnFormatted : '—'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Volatility</span>
            <span class="detail-value" id="customCardVol">${customCardState.stats ? customCardState.stats.volatilityFormatted : '—'}</span>
          </div>
        </div>
      
        <div class="custom-sliders">
            ${cats.map(cat => {
    const val = Math.round((state.inputs.currentSavings || 0) * (customCardAllocation[cat.key] / 100));
    return `
              <div class="custom-slider-row" title="$${formatNumber(val)}">
                <span class="custom-slider-label">${cat.label}</span>
                <input type="range" class="custom-card-slider" id="customSlider_${cat.key}" 
                       data-key="${cat.key}" value="${customCardAllocation[cat.key]}" min="0" max="100" step="5">
                <span class="custom-slider-value" id="customValue_${cat.key}">${customCardAllocation[cat.key]}%</span>
              </div>
            `}).join('')}
            <div class="custom-total ${total === 100 ? 'valid' : 'invalid'}">
              Total: <strong id="customTotalValue">${total}%</strong> ${total === 100 ? '✓' : ''}
            </div>
        </div>
      </div>
    </div>
  `;
}

// Listeners for interactive sliders using event delegation
// This ensures events are caught even after DOM replacement

function handleSliderInput(e) {
  // Check if target is a slider - robust against different events or bubbling
  if (!e.target || !e.target.matches || !e.target.matches('.custom-card-slider')) return;

  // LOGGING: Check if event is caught
  console.log('Slider Input Event:', e.type, e.target.dataset.key, e.target.value);

  const key = e.target.dataset.key;
  const newValue = parseInt(e.target.value);

  // Safety check for key existence
  if (customCardAllocation[key] === undefined) return;

  const oldValue = customCardAllocation[key];
  const delta = newValue - oldValue;

  // Update this slider's value
  customCardAllocation[key] = newValue;

  const valueEl = document.getElementById(`customValue_${key}`);
  if (valueEl) valueEl.textContent = `${newValue}%`;

  const val = Math.round((state.inputs.currentSavings || 0) * (newValue / 100));
  const rowEl = e.target.closest('.custom-slider-row');
  if (rowEl) rowEl.title = `$${formatNumber(val)}`;

  // Rebalance others proportionally to maintain ~100%
  if (delta !== 0) {
    rebalanceOtherSliders(key, delta);
  }

  updateCustomCardTotal();
  debouncedCustomSimulation();
}

export function attachCustomCardListeners() {
  // Clear any pending debounce timer from previous render
  if (customCardDebounceTimer) {
    clearTimeout(customCardDebounceTimer);
    customCardDebounceTimer = null;
  }

  // Use event delegation - attach once to document
  // We remove the listener first to ensure we don't duplicate if called multiple times
  document.removeEventListener('input', handleSliderInput);
  document.addEventListener('input', handleSliderInput);

  // Also listen for change events as backup (for some browsers/devices)
  document.removeEventListener('change', handleSliderInput);
  document.addEventListener('change', handleSliderInput);

  console.log('Custom card listeners attached to document');
}

function rebalanceOtherSliders(changedKey, delta) {
  const keys = Object.keys(customCardAllocation).filter(k => k !== changedKey);
  const changedValue = customCardAllocation[changedKey];
  const targetOtherTotal = 100 - changedValue;

  const currentOtherTotal = keys.reduce((s, k) => s + customCardAllocation[k], 0);

  if (currentOtherTotal === 0) {
    const perSlider = Math.floor(targetOtherTotal / keys.length / 5) * 5;
    let remaining = targetOtherTotal;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) {
        customCardAllocation[key] = Math.max(0, remaining);
      } else {
        customCardAllocation[key] = perSlider;
        remaining -= perSlider;
      }
      document.getElementById(`customValue_${key}`).textContent = `${customCardAllocation[key]}%`;
      const el = document.getElementById(`customSlider_${key}`);
      el.value = customCardAllocation[key];
      const val = Math.round((state.inputs.currentSavings || 0) * (customCardAllocation[key] / 100));
      el.closest('.custom-slider-row').title = `$${formatNumber(val)}`;
    });
    return;
  }

  if (targetOtherTotal <= 0) {
    keys.forEach(key => {
      customCardAllocation[key] = 0;
      document.getElementById(`customValue_${key}`).textContent = '0%';
      const el = document.getElementById(`customSlider_${key}`);
      el.value = 0;
      el.closest('.custom-slider-row').title = `$0`;
    });
    return;
  }

  const scaleFactor = targetOtherTotal / currentOtherTotal;
  let allocated = 0;

  keys.forEach((key, i) => {
    const oldValue = customCardAllocation[key];
    let newValue;

    if (i === keys.length - 1) {
      newValue = targetOtherTotal - allocated;
    } else {
      newValue = Math.round((oldValue * scaleFactor) / 5) * 5;
    }

    newValue = Math.max(0, Math.min(100, newValue));
    customCardAllocation[key] = newValue;
    allocated += newValue;

    document.getElementById(`customValue_${key}`).textContent = `${newValue}%`;
    const el = document.getElementById(`customSlider_${key}`);
    el.value = newValue;
    const val = Math.round((state.inputs.currentSavings || 0) * (newValue / 100));
    el.closest('.custom-slider-row').title = `$${formatNumber(val)}`;
  });
}

function updateCustomCardTotal() {
  const total = Object.values(customCardAllocation).reduce((s, v) => s + v, 0);
  const totalEl = document.getElementById('customTotalValue');
  if (totalEl) {
    totalEl.textContent = `${total}%`;
    totalEl.parentElement.className = `custom-total ${total === 100 ? 'valid' : 'invalid'}`;
    totalEl.parentElement.innerHTML = `Total: <strong id="customTotalValue">${total}%</strong> ${total === 100 ? '✓' : ''}`;
  }
}

function debouncedCustomSimulation() {
  const loadingEl = document.getElementById('customCardLoading');
  if (loadingEl) loadingEl.classList.remove('hidden');

  if (customCardDebounceTimer) clearTimeout(customCardDebounceTimer);

  customCardDebounceTimer = setTimeout(() => {
    runCustomCardSimulation();
  }, 400);
}

function runCustomCardSimulation() {
  const total = Object.values(customCardAllocation).reduce((s, v) => s + v, 0);
  if (total !== 100) {
    customCardState.successRate = null;
    customCardState.median = null;
    customCardState.stats = null;
    updateCustomCardUI();
    return;
  }

  // Build allocation object (convert % to decimal)
  const allocation = {};
  for (const [key, value] of Object.entries(customCardAllocation)) {
    allocation[key] = value / 100;
  }

  // Calculate stats
  const stats = calculatePortfolioStats(allocation);
  customCardState.stats = stats;

  // Debug: Log the simulation inputs
  console.log('=== Custom Card Simulation ===');
  console.log('Inputs from state:', {
    age: state.inputs.age,
    retirementAge: state.inputs.retirementAge,
    endAge: state.inputs.endAge,
    currentSavings: state.inputs.currentSavings,
    windfall: state.inputs.windfall,
    desiredIncome: state.inputs.desiredIncome,
    withdrawalStrategy: state.inputs.withdrawalStrategy
  });
  console.log('Allocation:', allocation);

  // Check if this allocation includes home ownership
  const hasHome = (allocation.residentialRealEstate || 0) > 0;

  // Use real housing params if available, so that "Build Your Own" 
  // correctly models ownership costs (taxes, maintenance) vs rent savings.
  // This aligns the math with "Current" and prevents "free lunch" home returns.
  const housingParams = state.results ? state.results.housingParams : null;

  // Run quick simulation (200 iterations)
  const result = runMonteCarloSimulation({
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
    iterations: 200 // Fewer iterations for interactive speed
  });

  console.log('Result:', {
    successRate: result.successRate,
    successCount: result.successCount,
    initialWithdrawal: result.initialWithdrawal,
    withdrawalRate: result.withdrawalRate
  });

  customCardState.successRate = result.successRate;
  customCardState.median = result.portfolioAtRetirement.p50;

  updateCustomCardUI();
}

function updateCustomCardUI() {
  const successEl = document.getElementById('customCardSuccess');
  if (successEl) {
    if (customCardState.successRate !== null) {
      const pct = (customCardState.successRate * 100).toFixed(0);
      successEl.textContent = `${pct}%`;
      successEl.className = `success-number ${pct >= 80 ? 'good' : pct >= 60 ? 'warning' : 'danger'}`;
    } else {
      successEl.textContent = '—';
      successEl.className = 'success-number';
    }
  }

  const medianEl = document.getElementById('customCardMedian');
  if (medianEl) medianEl.textContent = customCardState.median !== null ? '$' + formatNumber(customCardState.median) : '—';

  const returnEl = document.getElementById('customCardReturn');
  if (returnEl) returnEl.textContent = customCardState.stats ? customCardState.stats.expectedReturnFormatted : '—';

  const volEl = document.getElementById('customCardVol');
  if (volEl) volEl.textContent = customCardState.stats ? customCardState.stats.volatilityFormatted : '—';

  const loadingEl = document.getElementById('customCardLoading');
  if (loadingEl) loadingEl.classList.add('hidden');
}

function renderAllocationBreakdown(allocation) {
  const assetTypes = [
    { key: 'usLargeCap', name: 'US Large Cap Stocks', tickers: 'VTI, VOO, SPY, S&P 500 index funds' },
    { key: 'usSmallCap', name: 'US Small/Mid Cap', tickers: 'VB, VXF, IJR, extended market' },
    { key: 'intlDeveloped', name: 'International Developed', tickers: 'VXUS, VEA, SCHF (Europe, Japan, etc.)' },
    { key: 'emergingMarkets', name: 'Emerging Markets', tickers: 'VWO, IEMG (China, India, Brazil, etc.)' },
    { key: 'usAggregateBonds', name: 'US Bonds (Aggregate)', tickers: 'BND, AGG, investment-grade bonds' },
    { key: 'tips', name: 'TIPS / I-Bonds', tickers: 'SCHP, VTIP, inflation-protected' },
    { key: 'cashMoneyMarket', name: 'Cash / Money Market', tickers: 'VMFXX, savings, CDs' },
    { key: 'residentialRealEstate', name: '🏠 Primary Home', tickers: 'Home ownership - eliminates rent' }
  ];

  return `
    <div class="allocation-breakdown">
      ${assetTypes.map(asset => {
    const pct = (allocation[asset.key] || 0) * 100;
    const val = Math.round((state.inputs.currentSavings || 0) * (allocation[asset.key] || 0));
    return `
          <div class="allocation-row" title="$${formatNumber(val)}">
            <div class="allocation-row-header">
              <span class="allocation-asset-name">${asset.name}</span>
              <span class="allocation-percent">${pct.toFixed(0)}%</span>
            </div>
            <div class="allocation-bar">
              <div class="allocation-bar-fill" style="width: ${pct}%;"></div>
            </div>
            <span class="allocation-ticker">${asset.tickers}</span>
          </div>
        `;
  }).join('')}
    </div>
  `;
}
