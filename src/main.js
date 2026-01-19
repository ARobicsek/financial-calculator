/**
 * RetireWise - Main Application Entry Point
 * Sophisticated Retirement Investment Calculator
 */

import { runMonteCarloSimulation, quickProjection } from './engine/monteCarlo.js';
import { calculateAllocation, calculatePortfolioStats } from './engine/assetAllocation.js';
import { calculateSafeWithdrawalRate, compareStrategies } from './engine/withdrawalStrategies.js';
import { calculateOptimalConversion, getAssetLocationRecommendations } from './engine/taxOptimizer.js';
import { RISK_QUESTIONS, calculateRiskProfile } from './components/RiskQuestionnaire.js';
import { MARKET_DATA, FUND_RECOMMENDATIONS, ASSUMPTION_TOOLTIPS } from './data/marketData.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Application State
const state = {
  currentStep: 0,
  inputs: {
    // Basic Info
    age: 52,
    currentSavings: 500000,
    windfall: 200000,
    monthlyContribution: 2000,
    // Goals
    retirementAge: 65,
    desiredIncome: 60000,
    endAge: 95,
    // Risk
    riskAnswers: [],
    // Social Security
    socialSecurityAge: 67,
    socialSecurityMonthly: 2500,
    otherGuaranteedIncome: 0,
    // Advanced
    filingStatus: 'married',
    jobStability: 'stable',
    useGlidePath: true,
    withdrawalStrategy: 'guardrails',
    // Current Portfolio Allocation
    currentAllocation: {
      usLargeCap: 40,
      usSmallMidCap: 5,
      intlDeveloped: 10,
      emergingMarkets: 5,
      usBonds: 25,
      tips: 5,
      cashMoneyMarket: 10
    },
    useCurrentAllocation: false
  },
  results: null,
  fanChart: null
};

const STEPS = [
  { id: 'basic', title: 'Basic Information', icon: '👤' },
  { id: 'portfolio', title: 'Current Portfolio', icon: '📁' },
  { id: 'goals', title: 'Retirement Goals', icon: '🎯' },
  { id: 'risk', title: 'Risk Assessment', icon: '📊' },
  { id: 'income', title: 'Guaranteed Income', icon: '💰' },
  { id: 'advanced', title: 'Advanced Settings', icon: '⚙️' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  renderProgressSteps();
  renderCurrentStep();
  setupNavigation();
  setupAssumptionsSidebar();
});

// ============================================
// Progress Bar & Navigation
// ============================================

function renderProgressSteps() {
  const container = document.getElementById('progressSteps');
  container.innerHTML = STEPS.map((step, idx) => `
    <div class="progress-step ${idx === state.currentStep ? 'active' : ''} ${idx < state.currentStep ? 'completed' : ''}" data-step="${idx}">
      <span class="step-number">${idx < state.currentStep ? '✓' : idx + 1}</span>
      <span class="step-label">${step.title}</span>
    </div>
  `).join('');

  // Update progress bar fill
  const fill = document.getElementById('progressFill');
  fill.style.width = `${(state.currentStep / (STEPS.length - 1)) * 100}%`;
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const section = e.target.dataset.section;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      if (section === 'assumptions') {
        toggleSidebar(true);
      } else if (section === 'methodology') {
        showMethodology();
      } else {
        toggleSidebar(false);
      }
    });
  });
}

// ============================================
// Wizard Step Rendering
// ============================================

function renderCurrentStep() {
  const container = document.getElementById('wizardContainer');
  const step = STEPS[state.currentStep];

  let content = '';
  switch (step.id) {
    case 'basic':
      content = renderBasicStep();
      break;
    case 'portfolio':
      content = renderPortfolioStep();
      break;
    case 'goals':
      content = renderGoalsStep();
      break;
    case 'risk':
      content = renderRiskStep();
      break;
    case 'income':
      content = renderIncomeStep();
      break;
    case 'advanced':
      content = renderAdvancedStep();
      break;
  }

  container.innerHTML = `
    <div class="wizard-step active">
      <div class="step-card">
        <div class="step-header">
          <h2 class="step-title">${step.icon} ${step.title}</h2>
          <p class="step-subtitle">${getStepSubtitle(step.id)}</p>
        </div>
        ${content}
        <div class="btn-group">
          ${state.currentStep > 0 ? '<button class="btn btn-secondary" id="prevBtn">← Previous</button>' : ''}
          ${state.currentStep < STEPS.length - 1
      ? '<button class="btn btn-primary" id="nextBtn">Continue →</button>'
      : '<button class="btn btn-primary" id="calculateBtn">Calculate My Results →</button>'}
        </div>
      </div>
    </div>
  `;

  attachStepListeners();
  renderProgressSteps();
}

function getStepSubtitle(stepId) {
  const subtitles = {
    basic: "Let's start with your current financial situation and available funds.",
    portfolio: "Tell us how your current retirement savings are allocated (optional).",
    goals: "Define when you want to retire and how much income you'll need.",
    risk: "Answer 8 questions to determine your optimal investment mix.",
    income: "Include Social Security and any pension or guaranteed income sources.",
    advanced: "Fine-tune tax strategies and withdrawal approaches."
  };
  return subtitles[stepId] || '';
}

function renderBasicStep() {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Current Age</label>
        <input type="number" class="form-input" id="age" value="${state.inputs.age}" min="18" max="85">
      </div>
      <div class="form-group">
        <label class="form-label">Current Retirement Savings</label>
        <div class="input-with-prefix">
          <span class="input-prefix">$</span>
          <input type="number" class="form-input" id="currentSavings" value="${state.inputs.currentSavings}" min="0" step="1000">
        </div>
        <span class="form-hint">Total across all accounts (401k, IRA, taxable)</span>
      </div>
      <div class="form-group">
        <label class="form-label">Cash Windfall / Additional Investment</label>
        <div class="input-with-prefix">
          <span class="input-prefix">$</span>
          <input type="number" class="form-input" id="windfall" value="${state.inputs.windfall}" min="0" step="1000">
        </div>
        <span class="form-hint">House sale proceeds, inheritance, bonus, etc.</span>
      </div>
      <div class="form-group">
        <label class="form-label">Monthly Contribution</label>
        <div class="input-with-prefix">
          <span class="input-prefix">$</span>
          <input type="number" class="form-input" id="monthlyContribution" value="${state.inputs.monthlyContribution}" min="0" step="100">
        </div>
        <span class="form-hint">Ongoing monthly additions to savings</span>
      </div>
    </div>
  `;
}

function renderPortfolioStep() {
  const alloc = state.inputs.currentAllocation;
  const total = Object.values(alloc).reduce((sum, v) => sum + v, 0);
  const isValid = total === 100;

  const categories = [
    { key: 'usLargeCap', label: 'US Large Cap Stocks', hint: 'VTI, VOO, SPY, S&P 500 index funds' },
    { key: 'usSmallMidCap', label: 'US Small/Mid Cap', hint: 'VB, VXF, IJR, extended market' },
    { key: 'intlDeveloped', label: 'International Developed', hint: 'VXUS, VEA, SCHF (Europe, Japan, etc.)' },
    { key: 'emergingMarkets', label: 'Emerging Markets', hint: 'VWO, IEMG (China, India, Brazil, etc.)' },
    { key: 'usBonds', label: 'US Bonds (Aggregate)', hint: 'BND, AGG, investment-grade bonds' },
    { key: 'tips', label: 'TIPS / I-Bonds', hint: 'SCHP, VTIP, inflation-protected' },
    { key: 'cashMoneyMarket', label: 'Cash / Money Market', hint: 'VMFXX, savings, CDs' }
  ];

  return `
    <div class="portfolio-allocation">
      <div class="allocation-summary ${isValid ? 'valid' : 'invalid'}">
        <div class="total-label">Total Allocation:</div>
        <div class="total-value">${total}%</div>
        <div class="total-status">${isValid ? '✓ Perfect' : `${total < 100 ? 'Add ' + (100 - total) + '%' : 'Remove ' + (total - 100) + '%'}`}</div>
      </div>
      
      <div class="allocation-grid">
        ${categories.map(cat => `
          <div class="allocation-item">
            <div class="allocation-header">
              <label class="allocation-label">${cat.label}</label>
              <span class="allocation-value" id="${cat.key}Value">${alloc[cat.key]}%</span>
            </div>
            <input type="range" class="allocation-slider" id="${cat.key}Slider" 
                   value="${alloc[cat.key]}" min="0" max="100" step="5"
                   data-key="${cat.key}">
            <span class="form-hint">${cat.hint}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="portfolio-actions">
        <label class="use-allocation-checkbox">
          <input type="checkbox" id="useCurrentAllocation" ${state.inputs.useCurrentAllocation ? 'checked' : ''}>
          Compare my current allocation against recommended strategies
        </label>
        <button type="button" class="btn btn-secondary btn-small" id="skipPortfolioBtn">
          Skip → Use suggested allocation
        </button>
      </div>
    </div>
  `;
}

function renderGoalsStep() {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Target Retirement Age</label>
        <input type="number" class="form-input" id="retirementAge" value="${state.inputs.retirementAge}" min="${state.inputs.age + 1}" max="85">
      </div>
      <div class="form-group">
        <label class="form-label">Desired Annual Retirement Income</label>
        <div class="input-with-prefix">
          <span class="input-prefix">$</span>
          <input type="number" class="form-input" id="desiredIncome" value="${state.inputs.desiredIncome}" min="0" step="1000">
        </div>
        <span class="form-hint">In today's dollars (will be adjusted for inflation)</span>
      </div>
      <div class="form-group full-width">
        <label class="form-label">Plan Through Age</label>
        <div class="slider-container">
          <div class="slider-value" id="endAgeValue">${state.inputs.endAge}</div>
          <input type="range" class="form-slider" id="endAge" value="${state.inputs.endAge}" min="80" max="100" step="1">
          <div class="slider-labels">
            <span>80</span>
            <span>85</span>
            <span>90</span>
            <span>95</span>
            <span>100</span>
          </div>
        </div>
        <span class="form-hint">~50% of 65-year-olds will live past 85; plan conservatively</span>
      </div>
    </div>
  `;
}

function renderRiskStep() {
  const answeredQuestions = state.inputs.riskAnswers.filter(a => a !== undefined).length;

  return `
    <div class="risk-questionnaire">
      ${RISK_QUESTIONS.map((q, idx) => `
        <div class="question-card" id="question-${q.id}">
          <p class="question-text">
            <span class="question-number">${q.id}.</span> ${q.question}
          </p>
          <div class="options-grid">
            ${q.options.map(opt => `
              <button class="option-btn ${state.inputs.riskAnswers[idx] === opt.value ? 'selected' : ''}" 
                      data-question="${idx}" data-value="${opt.value}">
                ${opt.text}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div class="risk-summary" style="margin-top: 1.5rem; padding: 1rem; background: var(--color-bg-card); border-radius: var(--radius-md);">
        <p style="color: var(--color-text-secondary); font-size: 0.875rem;">
          Questions answered: <strong style="color: var(--color-accent);">${answeredQuestions}/8</strong>
        </p>
      </div>
    </div>
  `;
}

function renderIncomeStep() {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Social Security Start Age</label>
        <select class="form-select" id="socialSecurityAge">
          <option value="62" ${state.inputs.socialSecurityAge == 62 ? 'selected' : ''}>62 (reduced benefits)</option>
          <option value="65" ${state.inputs.socialSecurityAge == 65 ? 'selected' : ''}>65</option>
          <option value="67" ${state.inputs.socialSecurityAge == 67 ? 'selected' : ''}>67 (full retirement age)</option>
          <option value="70" ${state.inputs.socialSecurityAge == 70 ? 'selected' : ''}>70 (maximum benefits)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Expected Monthly SS Benefit (at age 67)</label>
        <div class="input-with-prefix">
          <span class="input-prefix">$</span>
          <input type="number" class="form-input" id="socialSecurityMonthly" value="${state.inputs.socialSecurityMonthly}" min="0" step="100">
        </div>
        <span class="form-hint">Check ssa.gov for your estimate</span>
      </div>
      <div class="form-group">
        <label class="form-label">Other Guaranteed Annual Income</label>
        <div class="input-with-prefix">
          <span class="input-prefix">$</span>
          <input type="number" class="form-input" id="otherGuaranteedIncome" value="${state.inputs.otherGuaranteedIncome}" min="0" step="1000">
        </div>
        <span class="form-hint">Pension, annuity, rental income, etc.</span>
      </div>
    </div>
  `;
}

function renderAdvancedStep() {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Tax Filing Status</label>
        <select class="form-select" id="filingStatus">
          <option value="single" ${state.inputs.filingStatus === 'single' ? 'selected' : ''}>Single</option>
          <option value="married" ${state.inputs.filingStatus === 'married' ? 'selected' : ''}>Married Filing Jointly</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Job Stability</label>
        <select class="form-select" id="jobStability">
          <option value="very_stable" ${state.inputs.jobStability === 'very_stable' ? 'selected' : ''}>Very Stable (government, tenured)</option>
          <option value="stable" ${state.inputs.jobStability === 'stable' ? 'selected' : ''}>Stable (long-term employment)</option>
          <option value="variable" ${state.inputs.jobStability === 'variable' ? 'selected' : ''}>Variable (private sector)</option>
          <option value="highly_variable" ${state.inputs.jobStability === 'highly_variable' ? 'selected' : ''}>Highly Variable (commission, freelance)</option>
        </select>
        <span class="form-hint">Stable income acts like a bond - affects allocation</span>
      </div>
      <div class="form-group">
        <label class="form-label">Withdrawal Strategy</label>
        <select class="form-select" id="withdrawalStrategy">
          <option value="guardrails" ${state.inputs.withdrawalStrategy === 'guardrails' ? 'selected' : ''}>Guardrails (4.5% initial, adaptive)</option>
          <option value="fixed" ${state.inputs.withdrawalStrategy === 'fixed' ? 'selected' : ''}>Fixed (3.9% safe withdrawal rate)</option>
        </select>
        <span class="form-hint">Guardrails adjusts spending based on portfolio performance</span>
      </div>
      <div class="form-group">
        <label class="form-label" style="cursor: pointer;">
          <input type="checkbox" id="useGlidePath" ${state.inputs.useGlidePath ? 'checked' : ''} style="margin-right: 8px;">
          Use Glide Path (gradually reduce equities)
        </label>
        <span class="form-hint">Reduces equity allocation by ~1.5% per year approaching retirement</span>
      </div>
    </div>
  `;
}

// ============================================
// Event Listeners & Input Handling
// ============================================

function attachStepListeners() {
  // Navigation buttons
  document.getElementById('prevBtn')?.addEventListener('click', () => {
    saveCurrentStepInputs();
    state.currentStep--;
    renderCurrentStep();
  });

  document.getElementById('nextBtn')?.addEventListener('click', () => {
    if (validateCurrentStep()) {
      saveCurrentStepInputs();
      state.currentStep++;
      renderCurrentStep();
    }
  });

  document.getElementById('calculateBtn')?.addEventListener('click', () => {
    if (validateCurrentStep()) {
      saveCurrentStepInputs();
      runCalculation();
    }
  });

  // Risk questionnaire options
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const questionIdx = parseInt(e.target.dataset.question);
      const value = parseInt(e.target.dataset.value);
      state.inputs.riskAnswers[questionIdx] = value;

      // Update UI
      e.target.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');

      // Update summary
      renderCurrentStep();
    });
  });

  // Slider real-time update
  const endAgeSlider = document.getElementById('endAge');
  if (endAgeSlider) {
    endAgeSlider.addEventListener('input', (e) => {
      document.getElementById('endAgeValue').textContent = e.target.value;
    });
  }

  // Portfolio allocation sliders
  document.querySelectorAll('.allocation-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      const value = parseInt(e.target.value);
      state.inputs.currentAllocation[key] = value;

      // Update display value
      document.getElementById(`${key}Value`).textContent = `${value}%`;

      // Update total
      const total = Object.values(state.inputs.currentAllocation).reduce((sum, v) => sum + v, 0);
      const summary = document.querySelector('.allocation-summary');
      const totalValue = summary.querySelector('.total-value');
      const totalStatus = summary.querySelector('.total-status');

      totalValue.textContent = `${total}%`;
      summary.classList.toggle('valid', total === 100);
      summary.classList.toggle('invalid', total !== 100);
      totalStatus.textContent = total === 100 ? '✓ Perfect' :
        (total < 100 ? `Add ${100 - total}%` : `Remove ${total - 100}%`);
    });
  });

  // Skip portfolio button
  document.getElementById('skipPortfolioBtn')?.addEventListener('click', () => {
    state.inputs.useCurrentAllocation = false;
    state.currentStep++;
    renderCurrentStep();
  });

  // Use current allocation checkbox
  document.getElementById('useCurrentAllocation')?.addEventListener('change', (e) => {
    state.inputs.useCurrentAllocation = e.target.checked;
  });
}

function saveCurrentStepInputs() {
  const step = STEPS[state.currentStep];

  switch (step.id) {
    case 'basic':
      state.inputs.age = parseInt(document.getElementById('age')?.value) || 52;
      state.inputs.currentSavings = parseFloat(document.getElementById('currentSavings')?.value) || 0;
      state.inputs.windfall = parseFloat(document.getElementById('windfall')?.value) || 0;
      state.inputs.monthlyContribution = parseFloat(document.getElementById('monthlyContribution')?.value) || 0;
      break;
    case 'portfolio':
      // Allocation values are saved in real-time via slider listeners
      state.inputs.useCurrentAllocation = document.getElementById('useCurrentAllocation')?.checked ?? false;
      break;
    case 'goals':
      state.inputs.retirementAge = parseInt(document.getElementById('retirementAge')?.value) || 65;
      state.inputs.desiredIncome = parseFloat(document.getElementById('desiredIncome')?.value) || 60000;
      state.inputs.endAge = parseInt(document.getElementById('endAge')?.value) || 95;
      break;
    case 'income':
      state.inputs.socialSecurityAge = parseInt(document.getElementById('socialSecurityAge')?.value) || 67;
      state.inputs.socialSecurityMonthly = parseFloat(document.getElementById('socialSecurityMonthly')?.value) || 0;
      state.inputs.otherGuaranteedIncome = parseFloat(document.getElementById('otherGuaranteedIncome')?.value) || 0;
      break;
    case 'advanced':
      state.inputs.filingStatus = document.getElementById('filingStatus')?.value || 'married';
      state.inputs.jobStability = document.getElementById('jobStability')?.value || 'stable';
      state.inputs.withdrawalStrategy = document.getElementById('withdrawalStrategy')?.value || 'guardrails';
      state.inputs.useGlidePath = document.getElementById('useGlidePath')?.checked ?? true;
      break;
  }
}

function validateCurrentStep() {
  const step = STEPS[state.currentStep];

  if (step.id === 'risk') {
    const answered = state.inputs.riskAnswers.filter(a => a !== undefined).length;
    if (answered < 8) {
      alert(`Please answer all 8 risk questions. You've answered ${answered}/8.`);
      return false;
    }
  }

  return true;
}

// ============================================
// Calculation & Results
// ============================================

function runCalculation() {
  // Show loading state
  const container = document.getElementById('wizardContainer');
  container.innerHTML = `
    <div class="step-card" style="text-align: center; padding: 3rem;">
      <div class="loading" style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
      <h3>Running 1,000 Monte Carlo Simulations...</h3>
      <p style="color: var(--color-text-secondary);">Analyzing your retirement scenarios</p>
    </div>
  `;

  // Calculate allocation
  const riskProfile = calculateRiskProfile(state.inputs.riskAnswers);
  const guaranteedIncome = (state.inputs.socialSecurityMonthly * 12) + state.inputs.otherGuaranteedIncome;

  const allocationResult = calculateAllocation({
    questionnaireScore: riskProfile.score,
    age: state.inputs.age,
    yearsToRetirement: state.inputs.retirementAge - state.inputs.age,
    jobStability: state.inputs.jobStability,
    guaranteedIncome: guaranteedIncome,
    incomeGoal: state.inputs.desiredIncome
  });

  // Run Monte Carlo
  setTimeout(() => {
    const mcResults = runMonteCarloSimulation({
      currentAge: state.inputs.age,
      retirementAge: state.inputs.retirementAge,
      endAge: state.inputs.endAge,
      currentSavings: state.inputs.currentSavings,
      windfall: state.inputs.windfall,
      monthlyContribution: state.inputs.monthlyContribution,
      desiredIncome: state.inputs.desiredIncome,
      withdrawalStrategy: state.inputs.withdrawalStrategy,
      allocation: allocationResult.allocation,
      glidePathEnabled: state.inputs.useGlidePath
    });

    // Define allocation strategies to compare
    const allocationStrategies = [
      {
        name: 'Risk-Matched',
        description: 'Optimized for your risk profile',
        allocation: allocationResult.allocation,
        icon: '🎯'
      },
      {
        name: 'US-Focused',
        description: 'Emphasizes domestic equities',
        allocation: {
          usLargeCap: 0.45,
          usSmallCap: 0.10,
          intlDeveloped: 0.10,
          emergingMarkets: 0.00,
          usAggregateBonds: 0.30,
          tips: 0.00,
          cashMoneyMarket: 0.05
        },
        icon: '🇺🇸'
      },
      {
        name: 'Global Tilt',
        description: 'Higher international exposure',
        allocation: {
          usLargeCap: 0.30,
          usSmallCap: 0.05,
          intlDeveloped: 0.25,
          emergingMarkets: 0.10,
          usAggregateBonds: 0.25,
          tips: 0.00,
          cashMoneyMarket: 0.05
        },
        icon: '🌍'
      },
      {
        name: 'Income-Focused',
        description: 'Lower volatility, higher yield',
        allocation: {
          usLargeCap: 0.30,
          usSmallCap: 0.00,
          intlDeveloped: 0.10,
          emergingMarkets: 0.00,
          usAggregateBonds: 0.30,
          tips: 0.15,
          highYieldBonds: 0.10,
          cashMoneyMarket: 0.05
        },
        icon: '💵'
      }
    ];

    // Add user's current allocation if they enabled it
    if (state.inputs.useCurrentAllocation) {
      const userAlloc = state.inputs.currentAllocation;
      allocationStrategies.push({
        name: 'Your Current',
        description: 'Your existing portfolio mix',
        allocation: {
          usLargeCap: userAlloc.usLargeCap / 100,
          usSmallCap: userAlloc.usSmallMidCap / 100,
          intlDeveloped: userAlloc.intlDeveloped / 100,
          emergingMarkets: userAlloc.emergingMarkets / 100,
          usAggregateBonds: userAlloc.usBonds / 100,
          tips: userAlloc.tips / 100,
          cashMoneyMarket: userAlloc.cashMoneyMarket / 100
        },
        icon: '📊',
        isUserAllocation: true
      });
    }

    // Run quick simulations for each strategy (fewer iterations for speed)
    const strategyResults = allocationStrategies.map(strategy => {
      const result = runMonteCarloSimulation({
        currentAge: state.inputs.age,
        retirementAge: state.inputs.retirementAge,
        endAge: state.inputs.endAge,
        currentSavings: state.inputs.currentSavings,
        windfall: state.inputs.windfall,
        monthlyContribution: state.inputs.monthlyContribution,
        desiredIncome: state.inputs.desiredIncome,
        withdrawalStrategy: state.inputs.withdrawalStrategy,
        allocation: strategy.allocation,
        glidePathEnabled: state.inputs.useGlidePath,
        iterations: 500 // Fewer iterations for comparison speed
      });

      return {
        ...strategy,
        successRate: result.successRate,
        medianPortfolio: result.portfolioAtRetirement.p50,
        stats: calculatePortfolioStats(strategy.allocation)
      };
    });

    state.results = {
      monte: mcResults,
      allocation: allocationResult,
      riskProfile,
      portfolioStats: calculatePortfolioStats(allocationResult.allocation),
      strategyComparison: strategyResults
    };

    renderResults();
  }, 500);
}

function renderResults() {
  document.getElementById('progressContainer').classList.add('hidden');
  document.getElementById('wizardContainer').classList.add('hidden');
  document.getElementById('resultsContainer').classList.remove('hidden');

  const { monte, allocation, riskProfile, portfolioStats } = state.results;
  const successPercent = (monte.successRate * 100).toFixed(0);
  const equityPercent = (allocation.equityPercentage * 100).toFixed(0);

  document.getElementById('resultsContainer').innerHTML = `
    <div class="results-header">
      <h2>Your Retirement Analysis</h2>
    </div>
    
    ${renderInlineEditor()}
    
    <div class="primary-result">
      <div class="funded-age">
        <div class="label">Your plan is funded through age</div>
        <div class="age">${monte.fundedThroughAge}</div>
        <div class="success-rate">
          <span class="percent">${successPercent}%</span> probability of success
          ${successPercent >= 80 ? '✓' : '⚠️'}
        </div>
      </div>
    </div>
    
    <div class="results-grid">
      <div class="result-card">
        <h4>Portfolio at Retirement</h4>
        <div class="value">$${formatNumber(monte.portfolioAtRetirement.p50)}</div>
        <div class="subtext">Median projection at age ${state.inputs.retirementAge}</div>
      </div>
      <div class="result-card">
        <h4>Initial Annual Withdrawal</h4>
        <div class="value">$${formatNumber(monte.initialWithdrawal)}</div>
        <div class="subtext">${(monte.withdrawalRate * 100).toFixed(1)}% withdrawal rate</div>
      </div>
      <div class="result-card">
        <h4>Recommended Allocation</h4>
        <div class="value">${equityPercent}% Stocks</div>
        <div class="subtext">Risk profile: ${formatRiskProfile(riskProfile.profile)}</div>
      </div>
      <div class="result-card">
        <h4>Expected Portfolio Return</h4>
        <div class="value">${portfolioStats.expectedReturnFormatted}</div>
        <div class="subtext">Volatility: ${portfolioStats.volatilityFormatted}</div>
      </div>
    </div>
    
    <div class="chart-container">
      <div class="chart-header">
        <h3>Portfolio Projection</h3>
        <div class="chart-legend">
          <div class="legend-item"><span class="legend-color" style="background: rgba(34, 197, 94, 0.3);"></span> 25th-75th percentile</div>
          <div class="legend-item"><span class="legend-color" style="background: rgba(212, 169, 66, 1);"></span> Median (50th)</div>
          <div class="legend-item"><span class="legend-color" style="background: rgba(239, 68, 68, 0.3);"></span> 10th-90th percentile</div>
        </div>
      </div>
      <div class="chart-wrapper">
        <canvas id="fanChart"></canvas>
      </div>
    </div>
    
    ${renderStrategyComparison()}
    ${renderRecommendations()}
    ${renderFundTable()}
    ${renderAssumptionsUsed()}
    
    <div class="btn-group" style="justify-content: center; margin-top: 2rem;">
      <button class="btn btn-secondary" id="startOverBtn">← Modify Inputs</button>
    </div>
  `;

  renderFanChart();
  attachInlineEditorListeners();
  attachCustomCardListeners();

  document.getElementById('startOverBtn')?.addEventListener('click', () => {
    state.currentStep = 0;
    document.getElementById('progressContainer').classList.remove('hidden');
    document.getElementById('wizardContainer').classList.remove('hidden');
    document.getElementById('resultsContainer').classList.add('hidden');
    renderCurrentStep();
  });
}

function renderFanChart() {
  const { trajectoryByAge } = state.results.monte;
  const ages = Object.keys(trajectoryByAge).map(Number);

  const ctx = document.getElementById('fanChart').getContext('2d');

  if (state.fanChart) state.fanChart.destroy();

  state.fanChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        // Order: bottom to top, with fill references pointing to correct boundaries
        // Dataset 0: 10th percentile (bottom boundary)
        {
          label: '10th Percentile',
          data: ages.map(age => trajectoryByAge[age].p10),
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0
        },
        // Dataset 1: 25th percentile - fills DOWN to 10th (outer red band lower)
        {
          label: '25th Percentile',
          data: ages.map(age => trajectoryByAge[age].p25),
          borderColor: 'transparent',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: '-1',  // Fill to dataset 0 (10th)
          pointRadius: 0
        },
        // Dataset 2: 75th percentile - fills DOWN to 25th (green band)
        {
          label: '75th Percentile',
          data: ages.map(age => trajectoryByAge[age].p75),
          borderColor: 'transparent',
          backgroundColor: 'rgba(34, 197, 94, 0.25)',
          fill: '-1',  // Fill to dataset 1 (25th)
          pointRadius: 0
        },
        // Dataset 3: 90th percentile - fills DOWN to 75th (outer red band upper)
        {
          label: '90th Percentile',
          data: ages.map(age => trajectoryByAge[age].p90),
          borderColor: 'transparent',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: '-1',  // Fill to dataset 2 (75th)
          pointRadius: 0
        },
        // Dataset 4: Median line on top (no fill, just line)
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

function renderStrategyComparison() {
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
let customCardAllocation = {
  usLargeCap: 35,
  usSmallCap: 10,
  intlDeveloped: 20,
  emergingMarkets: 5,
  usAggregateBonds: 20,
  tips: 5,
  cashMoneyMarket: 5
};
let customCardSuccessRate = null;
let customCardMedian = null;
let customCardDebounceTimer = null;

function renderCustomAllocationCard() {
  const cats = [
    { key: 'usLargeCap', label: 'US Large Cap' },
    { key: 'usSmallCap', label: 'US Small/Mid' },
    { key: 'intlDeveloped', label: 'Intl Developed' },
    { key: 'emergingMarkets', label: 'Emerging Mkts' },
    { key: 'usAggregateBonds', label: 'US Bonds' },
    { key: 'tips', label: 'TIPS' },
    { key: 'cashMoneyMarket', label: 'Cash' }
  ];

  const total = Object.values(customCardAllocation).reduce((s, v) => s + v, 0);
  const successDisplay = customCardSuccessRate !== null ? `${(customCardSuccessRate * 100).toFixed(0)}%` : '—';
  const successClass = customCardSuccessRate !== null ? (customCardSuccessRate >= 0.80 ? 'good' : customCardSuccessRate >= 0.60 ? 'warning' : 'danger') : '';

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
  `;
}

function attachCustomCardListeners() {
  document.querySelectorAll('.custom-card-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      const newValue = parseInt(e.target.value);
      const oldValue = customCardAllocation[key];
      const delta = newValue - oldValue;

      // Update this slider's value
      customCardAllocation[key] = newValue;
      document.getElementById(`customValue_${key}`).textContent = `${newValue}%`;
      const val = Math.round((state.inputs.currentSavings || 0) * (newValue / 100));
      e.target.closest('.custom-slider-row').title = `$${formatNumber(val)}`;

      // Rebalance others proportionally to maintain ~100%
      if (delta !== 0) {
        rebalanceOtherSliders(key, delta);
      }

      updateCustomCardTotal();
      debouncedCustomSimulation();
    });
  });
}

function rebalanceOtherSliders(changedKey, delta) {
  const keys = Object.keys(customCardAllocation).filter(k => k !== changedKey);
  const changedValue = customCardAllocation[changedKey];
  const targetOtherTotal = 100 - changedValue;

  // Calculate the current total of OTHER sliders (before any rebalancing)
  // We need to add back the delta since we already updated the changed slider
  // The "old" other total is what we're scaling FROM
  const currentOtherTotal = keys.reduce((s, k) => s + customCardAllocation[k], 0);

  if (currentOtherTotal === 0) {
    // If others are all zero, distribute evenly
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
    // If changed slider is 100% or more, zero out others
    keys.forEach(key => {
      customCardAllocation[key] = 0;
      document.getElementById(`customValue_${key}`).textContent = '0%';
      const el = document.getElementById(`customSlider_${key}`);
      el.value = 0;
      el.closest('.custom-slider-row').title = `$0`;
    });
    return;
  }

  // Scale each slider proportionally to hit exact target
  const scaleFactor = targetOtherTotal / currentOtherTotal;
  let allocated = 0;

  keys.forEach((key, i) => {
    const oldValue = customCardAllocation[key];
    let newValue;

    if (i === keys.length - 1) {
      // Last slider gets the remainder to ensure exactly 100%
      newValue = targetOtherTotal - allocated;
    } else {
      // Scale proportionally and round to 5%
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
  // Show loading indicator
  const loadingEl = document.getElementById('customCardLoading');
  if (loadingEl) loadingEl.classList.remove('hidden');

  // Clear previous timer
  if (customCardDebounceTimer) clearTimeout(customCardDebounceTimer);

  // Debounce 400ms
  customCardDebounceTimer = setTimeout(() => {
    runCustomCardSimulation();
  }, 400);
}

function runCustomCardSimulation() {
  const total = Object.values(customCardAllocation).reduce((s, v) => s + v, 0);
  if (total !== 100) {
    customCardSuccessRate = null;
    customCardMedian = null;
    const successEl = document.getElementById('customCardSuccess');
    if (successEl) {
      successEl.textContent = '—';
      successEl.className = 'success-number';
    }
    const loadingEl = document.getElementById('customCardLoading');
    if (loadingEl) loadingEl.classList.add('hidden');
    return;
  }

  // Build allocation object (convert % to decimal)
  const allocation = {};
  for (const [key, value] of Object.entries(customCardAllocation)) {
    allocation[key] = value / 100;
  }

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
    glidePathEnabled: state.inputs.useGlidePath
  }, 200);

  customCardSuccessRate = result.successRate;
  customCardMedian = result.portfolioAtRetirement.p50;

  // Update UI
  const successEl = document.getElementById('customCardSuccess');
  if (successEl) {
    const pct = (customCardSuccessRate * 100).toFixed(0);
    successEl.textContent = `${pct}%`;
    successEl.className = `success-number ${pct >= 80 ? 'good' : pct >= 60 ? 'warning' : 'danger'}`;
  }

  const loadingEl = document.getElementById('customCardLoading');
  if (loadingEl) loadingEl.classList.add('hidden');
}

function renderAllocationBreakdown(allocation) {
  // Asset types in display order with labels and ticker hints
  const assetTypes = [
    { key: 'usLargeCap', name: 'US Large Cap Stocks', tickers: 'VTI, VOO, SPY, S&P 500 index funds' },
    { key: 'usSmallCap', name: 'US Small/Mid Cap', tickers: 'VB, VXF, IJR, extended market' },
    { key: 'intlDeveloped', name: 'International Developed', tickers: 'VXUS, VEA, SCHF (Europe, Japan, etc.)' },
    { key: 'emergingMarkets', name: 'Emerging Markets', tickers: 'VWO, IEMG (China, India, Brazil, etc.)' },
    { key: 'usAggregateBonds', name: 'US Bonds (Aggregate)', tickers: 'BND, AGG, investment-grade bonds' },
    { key: 'tips', name: 'TIPS / I-Bonds', tickers: 'SCHP, VTIP, inflation-protected' },
    { key: 'cashMoneyMarket', name: 'Cash / Money Market', tickers: 'VMFXX, savings, CDs' }
  ];

  // Always show all 7 asset classes in consistent order (including 0% allocations)
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


// ============================================
// Inline Editor for Results Page
// ============================================

function renderInlineEditor() {
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'portfolio', label: 'Portfolio', icon: '💼' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'risk', label: 'Risk', icon: '📊' },
    { id: 'income', label: 'Income', icon: '💰' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
  ];

  return `
    <div class="inline-editor" id="inlineEditor">
      <div class="inline-editor-header" id="inlineEditorHeader">
        <div class="inline-editor-title">
          <span>⚙️</span>
          Adjust Your Inputs
        </div>
        <button class="inline-editor-toggle" id="inlineEditorToggle">
          <span id="toggleText">Expand</span>
          <span id="toggleIcon">▼</span>
        </button>
      </div>
      <div class="inline-editor-body">
        <div class="inline-editor-tabs">
          ${tabs.map((tab, i) => `
            <button class="inline-editor-tab ${i === 0 ? 'active' : ''}" data-tab="${tab.id}">
              ${tab.label}
            </button>
          `).join('')}
        </div>
        <div class="inline-editor-content" id="inlineEditorContent">
          ${renderInlineTabContent('basic')}
        </div>
        <div class="inline-editor-actions">
          <button class="btn-recalculate" id="recalculateBtn">
            Recalculate Results
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderInlineTabContent(tabId) {
  switch (tabId) {
    case 'basic':
      return `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Current Age</label>
            <input type="number" class="form-input" id="inlineAge" value="${state.inputs.age}" min="18" max="80">
          </div>
          <div class="form-group">
            <label class="form-label">Current Savings ($)</label>
            <input type="number" class="form-input" id="inlineCurrentSavings" value="${state.inputs.currentSavings}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Windfall (inheritance, etc.)</label>
            <input type="number" class="form-input" id="inlineWindfall" value="${state.inputs.windfall}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Monthly Contribution ($)</label>
            <input type="number" class="form-input" id="inlineMonthlyContribution" value="${state.inputs.monthlyContribution}" min="0">
          </div>
        </div>
      `;
    case 'portfolio':
      const alloc = state.inputs.currentAllocation;
      const total = Object.values(alloc).reduce((sum, v) => sum + v, 0);
      const isValid = total === 100;
      const categories = [
        { key: 'usLargeCap', label: 'US Large Cap Stocks', hint: 'VTI, VOO, SPY' },
        { key: 'usSmallMidCap', label: 'US Small/Mid Cap', hint: 'VB, VXF, IJR' },
        { key: 'intlDeveloped', label: 'International Developed', hint: 'VXUS, VEA, SCHF' },
        { key: 'emergingMarkets', label: 'Emerging Markets', hint: 'VWO, IEMG' },
        { key: 'usBonds', label: 'US Bonds (Aggregate)', hint: 'BND, AGG' },
        { key: 'tips', label: 'TIPS / I-Bonds', hint: 'SCHP, VTIP' },
        { key: 'cashMoneyMarket', label: 'Cash / Money Market', hint: 'VMFXX, savings' }
      ];
      return `
        <div class="portfolio-allocation">
          <div class="allocation-summary ${isValid ? 'valid' : 'invalid'}" id="inlineAllocationSummary">
            <div class="total-label">Total Allocation:</div>
            <div class="total-value" id="inlineAllocationTotal">${total}%</div>
            <div class="total-status" id="inlineAllocationStatus">${isValid ? '✓ Perfect' : `${total < 100 ? 'Add ' + (100 - total) + '%' : 'Remove ' + (total - 100) + '%'}`}</div>
          </div>
          
          <div class="allocation-grid">
            ${categories.map(cat => `
              <div class="allocation-item">
                <div class="allocation-header">
                  <label class="allocation-label">${cat.label}</label>
                  <span class="allocation-value" id="inline${cat.key}Value">${alloc[cat.key]}%</span>
                </div>
                <input type="range" class="allocation-slider inline-allocation-slider" id="inline${cat.key}Slider" 
                       value="${alloc[cat.key]}" min="0" max="100" step="5"
                       data-key="${cat.key}">
                <span class="form-hint">${cat.hint}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="portfolio-actions">
            <label class="use-allocation-checkbox">
              <input type="checkbox" id="inlineUseCurrentAllocation" ${state.inputs.useCurrentAllocation ? 'checked' : ''}>
              Compare my current allocation against recommended strategies
            </label>
          </div>
        </div>
      `;
    case 'goals':
      return `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Retirement Age</label>
            <input type="number" class="form-input" id="inlineRetirementAge" value="${state.inputs.retirementAge}" min="${state.inputs.age + 1}" max="80">
          </div>
          <div class="form-group">
            <label class="form-label">Desired Annual Income ($)</label>
            <input type="number" class="form-input" id="inlineDesiredIncome" value="${state.inputs.desiredIncome}" min="0">
          </div>
          <div class="form-group full-width">
            <label class="form-label">Plan Through Age: <span id="inlineEndAgeValue">${state.inputs.endAge}</span></label>
            <input type="range" class="form-slider" id="inlineEndAge" value="${state.inputs.endAge}" min="80" max="100">
            <div class="slider-labels">
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>
      `;
    case 'risk':
      return `
        <div style="max-height: 400px; overflow-y: auto;">
          <p class="form-hint" style="margin-bottom: 1rem;">Your current risk profile: <strong>${formatRiskProfile(state.results.riskProfile.profile)}</strong> (Score: ${state.results.riskProfile.score}/40)</p>
          ${RISK_QUESTIONS.map((q, idx) => `
            <div class="question-card" data-question-idx="${idx}">
              <div class="question-text"><span class="question-number">${idx + 1}.</span> ${q.question}</div>
              <div class="options-grid">
                ${q.options.map(opt => `
                  <button type="button" class="option-btn inline-risk-option ${state.inputs.riskAnswers[idx] === opt.value ? 'selected' : ''}" 
                          data-question="${idx}" data-value="${opt.value}">
                    ${opt.text}
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    case 'income':
      return `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Social Security Start Age</label>
            <input type="number" class="form-input" id="inlineSocialSecurityAge" value="${state.inputs.socialSecurityAge}" min="62" max="70">
          </div>
          <div class="form-group">
            <label class="form-label">Estimated Monthly SS Benefit ($)</label>
            <input type="number" class="form-input" id="inlineSocialSecurityMonthly" value="${state.inputs.socialSecurityMonthly}" min="0">
          </div>
          <div class="form-group full-width">
            <label class="form-label">Other Guaranteed Annual Income ($)</label>
            <input type="number" class="form-input" id="inlineOtherGuaranteedIncome" value="${state.inputs.otherGuaranteedIncome}" min="0">
            <span class="form-hint">Pensions, annuities, rental income</span>
          </div>
        </div>
      `;
    case 'advanced':
      return `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Tax Filing Status</label>
            <select class="form-select" id="inlineFilingStatus">
              <option value="single" ${state.inputs.filingStatus === 'single' ? 'selected' : ''}>Single</option>
              <option value="married" ${state.inputs.filingStatus === 'married' ? 'selected' : ''}>Married Filing Jointly</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Job Stability</label>
            <select class="form-select" id="inlineJobStability">
              <option value="stable" ${state.inputs.jobStability === 'stable' ? 'selected' : ''}>Stable</option>
              <option value="moderate" ${state.inputs.jobStability === 'moderate' ? 'selected' : ''}>Moderate risk</option>
              <option value="unstable" ${state.inputs.jobStability === 'unstable' ? 'selected' : ''}>Unstable</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Withdrawal Strategy</label>
            <select class="form-select" id="inlineWithdrawalStrategy">
              <option value="guardrails" ${state.inputs.withdrawalStrategy === 'guardrails' ? 'selected' : ''}>Guardrails (4.5% flexible)</option>
              <option value="fixed" ${state.inputs.withdrawalStrategy === 'fixed' ? 'selected' : ''}>Fixed (3.9% safe)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="use-allocation-checkbox">
              <input type="checkbox" id="inlineUseGlidePath" ${state.inputs.useGlidePath ? 'checked' : ''}>
              Use Glide Path (reduce equities over time)
            </label>
          </div>
        </div>
      `;
    default:
      return '';
  }
}

function attachInlineEditorListeners() {
  // Toggle expand/collapse
  const header = document.getElementById('inlineEditorHeader');
  const editor = document.getElementById('inlineEditor');
  const toggleText = document.getElementById('toggleText');
  const toggleIcon = document.getElementById('toggleIcon');

  header?.addEventListener('click', () => {
    const isExpanded = editor.classList.toggle('expanded');
    toggleText.textContent = isExpanded ? 'Collapse' : 'Expand';
    toggleIcon.textContent = isExpanded ? '▲' : '▼';
  });

  // Tab switching - save current tab inputs before switching
  document.querySelectorAll('.inline-editor-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Save current inputs before switching
      saveCurrentTabInputs();

      // Update active tab
      document.querySelectorAll('.inline-editor-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');

      // Update content
      const tabId = e.target.dataset.tab;
      document.getElementById('inlineEditorContent').innerHTML = renderInlineTabContent(tabId);

      // Re-attach listeners based on tab
      attachTabSpecificListeners(tabId);
    });
  });

  // Slider for end age (initial tab)
  document.getElementById('inlineEndAge')?.addEventListener('input', (e) => {
    document.getElementById('inlineEndAgeValue').textContent = e.target.value;
  });

  // Recalculate button
  document.getElementById('recalculateBtn')?.addEventListener('click', recalculateFromInlineEditor);
}

function attachTabSpecificListeners(tabId) {
  if (tabId === 'goals') {
    document.getElementById('inlineEndAge')?.addEventListener('input', (e) => {
      document.getElementById('inlineEndAgeValue').textContent = e.target.value;
    });
  }

  if (tabId === 'portfolio') {
    document.querySelectorAll('.inline-allocation-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const key = e.target.dataset.key;
        const value = parseInt(e.target.value);
        state.inputs.currentAllocation[key] = value;
        document.getElementById(`inline${key}Value`).textContent = `${value}%`;
        updateInlineAllocationSummary();
      });
    });
  }

  if (tabId === 'risk') {
    document.querySelectorAll('.inline-risk-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const questionIdx = parseInt(e.target.dataset.question);
        const value = parseInt(e.target.dataset.value);
        state.inputs.riskAnswers[questionIdx] = value;

        // Update UI - deselect siblings, select this one
        const card = e.target.closest('.question-card');
        card.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
      });
    });
  }
}

function updateInlineAllocationSummary() {
  const alloc = state.inputs.currentAllocation;
  const total = Object.values(alloc).reduce((sum, v) => sum + v, 0);
  const isValid = total === 100;

  const summary = document.getElementById('inlineAllocationSummary');
  const totalEl = document.getElementById('inlineAllocationTotal');
  const statusEl = document.getElementById('inlineAllocationStatus');

  if (summary && totalEl && statusEl) {
    summary.className = `allocation-summary ${isValid ? 'valid' : 'invalid'}`;
    totalEl.textContent = `${total}%`;
    statusEl.textContent = isValid ? '✓ Perfect' : `${total < 100 ? 'Add ' + (100 - total) + '%' : 'Remove ' + (total - 100) + '%'}`;
  }
}

function saveCurrentTabInputs() {
  // Basic Info
  const age = document.getElementById('inlineAge');
  if (age) state.inputs.age = parseInt(age.value) || state.inputs.age;

  const currentSavings = document.getElementById('inlineCurrentSavings');
  if (currentSavings) state.inputs.currentSavings = parseFloat(currentSavings.value) || state.inputs.currentSavings;

  const windfall = document.getElementById('inlineWindfall');
  if (windfall) state.inputs.windfall = parseFloat(windfall.value) || 0;

  const monthlyContribution = document.getElementById('inlineMonthlyContribution');
  if (monthlyContribution) state.inputs.monthlyContribution = parseFloat(monthlyContribution.value) || 0;

  // Portfolio - allocation sliders save in real-time, just need checkbox
  const useCurrentAllocation = document.getElementById('inlineUseCurrentAllocation');
  if (useCurrentAllocation) state.inputs.useCurrentAllocation = useCurrentAllocation.checked;

  // Also save any portfolio sliders visible (they save in real-time but this catches edge cases)
  const allocKeys = ['usLargeCap', 'usSmallMidCap', 'intlDeveloped', 'emergingMarkets', 'usBonds', 'tips', 'cashMoneyMarket'];
  allocKeys.forEach(key => {
    const slider = document.getElementById(`inline${key}Slider`);
    if (slider) state.inputs.currentAllocation[key] = parseInt(slider.value) || 0;
  });

  // Goals
  const retirementAge = document.getElementById('inlineRetirementAge');
  if (retirementAge) state.inputs.retirementAge = parseInt(retirementAge.value) || state.inputs.retirementAge;

  const desiredIncome = document.getElementById('inlineDesiredIncome');
  if (desiredIncome) state.inputs.desiredIncome = parseFloat(desiredIncome.value) || state.inputs.desiredIncome;

  const endAge = document.getElementById('inlineEndAge');
  if (endAge) state.inputs.endAge = parseInt(endAge.value) || state.inputs.endAge;

  // Income
  const socialSecurityAge = document.getElementById('inlineSocialSecurityAge');
  if (socialSecurityAge) state.inputs.socialSecurityAge = parseInt(socialSecurityAge.value) || state.inputs.socialSecurityAge;

  const socialSecurityMonthly = document.getElementById('inlineSocialSecurityMonthly');
  if (socialSecurityMonthly) state.inputs.socialSecurityMonthly = parseFloat(socialSecurityMonthly.value) || 0;

  const otherGuaranteedIncome = document.getElementById('inlineOtherGuaranteedIncome');
  if (otherGuaranteedIncome) state.inputs.otherGuaranteedIncome = parseFloat(otherGuaranteedIncome.value) || 0;

  // Advanced
  const filingStatus = document.getElementById('inlineFilingStatus');
  if (filingStatus) state.inputs.filingStatus = filingStatus.value;

  const jobStability = document.getElementById('inlineJobStability');
  if (jobStability) state.inputs.jobStability = jobStability.value;

  const withdrawalStrategy = document.getElementById('inlineWithdrawalStrategy');
  if (withdrawalStrategy) state.inputs.withdrawalStrategy = withdrawalStrategy.value;

  const useGlidePath = document.getElementById('inlineUseGlidePath');
  if (useGlidePath) state.inputs.useGlidePath = useGlidePath.checked;

  // Risk answers are saved in real-time via click handlers
}

function recalculateFromInlineEditor() {
  // First save any current tab inputs
  saveCurrentTabInputs();

  const btn = document.getElementById('recalculateBtn');
  btn.disabled = true;
  btn.innerHTML = 'Recalculating...';
  btn.classList.add('loading');

  // All inputs are now saved via saveCurrentTabInputs(), just run calculation
  // Basic Info
  const age = document.getElementById('inlineAge');
  if (age) state.inputs.age = parseInt(age.value) || state.inputs.age;

  const currentSavings = document.getElementById('inlineCurrentSavings');
  if (currentSavings) state.inputs.currentSavings = parseFloat(currentSavings.value) || state.inputs.currentSavings;

  const windfall = document.getElementById('inlineWindfall');
  if (windfall) state.inputs.windfall = parseFloat(windfall.value) || 0;

  const monthlyContribution = document.getElementById('inlineMonthlyContribution');
  if (monthlyContribution) state.inputs.monthlyContribution = parseFloat(monthlyContribution.value) || 0;

  // Portfolio
  const useCurrentAllocation = document.getElementById('inlineUseCurrentAllocation');
  if (useCurrentAllocation) state.inputs.useCurrentAllocation = useCurrentAllocation.checked;

  // Goals
  const retirementAge = document.getElementById('inlineRetirementAge');
  if (retirementAge) state.inputs.retirementAge = parseInt(retirementAge.value) || state.inputs.retirementAge;

  const desiredIncome = document.getElementById('inlineDesiredIncome');
  if (desiredIncome) state.inputs.desiredIncome = parseFloat(desiredIncome.value) || state.inputs.desiredIncome;

  const endAge = document.getElementById('inlineEndAge');
  if (endAge) state.inputs.endAge = parseInt(endAge.value) || state.inputs.endAge;

  // Income
  const socialSecurityAge = document.getElementById('inlineSocialSecurityAge');
  if (socialSecurityAge) state.inputs.socialSecurityAge = parseInt(socialSecurityAge.value) || state.inputs.socialSecurityAge;

  const socialSecurityMonthly = document.getElementById('inlineSocialSecurityMonthly');
  if (socialSecurityMonthly) state.inputs.socialSecurityMonthly = parseFloat(socialSecurityMonthly.value) || 0;

  const otherGuaranteedIncome = document.getElementById('inlineOtherGuaranteedIncome');
  if (otherGuaranteedIncome) state.inputs.otherGuaranteedIncome = parseFloat(otherGuaranteedIncome.value) || 0;

  // Advanced
  const filingStatus = document.getElementById('inlineFilingStatus');
  if (filingStatus) state.inputs.filingStatus = filingStatus.value;

  const jobStability = document.getElementById('inlineJobStability');
  if (jobStability) state.inputs.jobStability = jobStability.value;

  const withdrawalStrategy = document.getElementById('inlineWithdrawalStrategy');
  if (withdrawalStrategy) state.inputs.withdrawalStrategy = withdrawalStrategy.value;

  const useGlidePath = document.getElementById('inlineUseGlidePath');
  if (useGlidePath) state.inputs.useGlidePath = useGlidePath.checked;

  // Run calculation (reuse existing logic)
  setTimeout(() => {
    runRecalculation();
  }, 100);
}

function runRecalculation() {
  // Recalculate risk profile from updated answers
  const riskProfile = calculateRiskProfile(state.inputs.riskAnswers);
  const guaranteedIncome = (state.inputs.socialSecurityMonthly * 12) + state.inputs.otherGuaranteedIncome;

  const allocationResult = calculateAllocation({
    questionnaireScore: riskProfile.score,
    age: state.inputs.age,
    yearsToRetirement: state.inputs.retirementAge - state.inputs.age,
    jobStability: state.inputs.jobStability,
    guaranteedIncome: guaranteedIncome,
    incomeGoal: state.inputs.desiredIncome
  });

  // Run Monte Carlo
  const mcResults = runMonteCarloSimulation({
    currentAge: state.inputs.age,
    retirementAge: state.inputs.retirementAge,
    endAge: state.inputs.endAge,
    currentSavings: state.inputs.currentSavings,
    windfall: state.inputs.windfall,
    monthlyContribution: state.inputs.monthlyContribution,
    desiredIncome: state.inputs.desiredIncome,
    withdrawalStrategy: state.inputs.withdrawalStrategy,
    allocation: allocationResult.allocation,
    glidePathEnabled: state.inputs.useGlidePath
  });

  // Define allocation strategies
  const allocationStrategies = [
    {
      name: 'Risk-Matched',
      description: 'Optimized for your risk profile',
      allocation: allocationResult.allocation,
      icon: '🎯'
    },
    {
      name: 'US-Focused',
      description: 'Emphasizes domestic equities',
      allocation: {
        usLargeCap: 0.45,
        usSmallCap: 0.10,
        intlDeveloped: 0.10,
        emergingMarkets: 0.00,
        usAggregateBonds: 0.30,
        tips: 0.00,
        cashMoneyMarket: 0.05
      },
      icon: '🇺🇸'
    },
    {
      name: 'Global Tilt',
      description: 'Higher international exposure',
      allocation: {
        usLargeCap: 0.30,
        usSmallCap: 0.05,
        intlDeveloped: 0.25,
        emergingMarkets: 0.10,
        usAggregateBonds: 0.25,
        tips: 0.00,
        cashMoneyMarket: 0.05
      },
      icon: '🌍'
    },
    {
      name: 'Income-Focused',
      description: 'Lower volatility, higher yield',
      allocation: {
        usLargeCap: 0.30,
        usSmallCap: 0.00,
        intlDeveloped: 0.10,
        emergingMarkets: 0.00,
        usAggregateBonds: 0.30,
        tips: 0.15,
        highYieldBonds: 0.10,
        cashMoneyMarket: 0.05
      },
      icon: '💵'
    }
  ];

  // Add user's current allocation if enabled
  if (state.inputs.useCurrentAllocation) {
    const userAlloc = state.inputs.currentAllocation;
    allocationStrategies.push({
      name: 'Your Current',
      description: 'Your existing portfolio mix',
      allocation: {
        usLargeCap: userAlloc.usLargeCap / 100,
        usSmallCap: userAlloc.usSmallMidCap / 100,
        intlDeveloped: userAlloc.intlDeveloped / 100,
        emergingMarkets: userAlloc.emergingMarkets / 100,
        usAggregateBonds: userAlloc.usBonds / 100,
        tips: userAlloc.tips / 100,
        cashMoneyMarket: userAlloc.cashMoneyMarket / 100
      },
      icon: '📊',
      isUserAllocation: true
    });
  }

  // Run simulations for each strategy
  const strategyResults = allocationStrategies.map(strategy => {
    const result = runMonteCarloSimulation({
      currentAge: state.inputs.age,
      retirementAge: state.inputs.retirementAge,
      endAge: state.inputs.endAge,
      currentSavings: state.inputs.currentSavings,
      windfall: state.inputs.windfall,
      monthlyContribution: state.inputs.monthlyContribution,
      desiredIncome: state.inputs.desiredIncome,
      withdrawalStrategy: state.inputs.withdrawalStrategy,
      allocation: strategy.allocation,
      glidePathEnabled: state.inputs.useGlidePath,
      iterations: 500
    });

    return {
      ...strategy,
      successRate: result.successRate,
      medianPortfolio: result.portfolioAtRetirement.p50,
      stats: calculatePortfolioStats(strategy.allocation)
    };
  });

  // Update state with new results
  state.results = {
    monte: mcResults,
    allocation: allocationResult,
    riskProfile,
    portfolioStats: calculatePortfolioStats(allocationResult.allocation),
    strategyComparison: strategyResults
  };

  // Re-render results
  renderResults();
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
      <h3 style="margin-bottom: 1rem; color: var(--color-accent);">📋 Assumptions Used</h3>
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
        Based on January 2026 market conditions and major forecaster consensus. Review <a href="#" onclick="showMethodology(); return false;" style="color: var(--color-accent);">methodology</a> for details.
      </p>
    </div>
  `;
}

// ============================================
// Sidebar & Utility Functions
// ============================================

function setupAssumptionsSidebar() {
  document.getElementById('closeSidebar')?.addEventListener('click', () => toggleSidebar(false));
}

function toggleSidebar(show) {
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


function showMethodology() {
  alert('Methodology documentation coming soon. This calculator uses:\n\n• 1,000 Monte Carlo simulations\n• Monthly time steps for sequence-of-returns accuracy\n• Lognormal distribution for equities\n• Jan 2026 market assumptions from major forecasters\n• Guardrails withdrawal strategy (Guyton-Klinger modified)');
}

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toFixed(0);
}

function formatAssetName(key) {
  const names = {
    usLargeCap: 'US Large Cap',
    usSmallCap: 'US Small Cap',
    intlDeveloped: 'Intl Developed',
    emergingMarkets: 'Emerging Markets',
    usAggregateBonds: 'US Bonds',
    tips: 'TIPS',
    highYieldBonds: 'High Yield',
    reits: 'REITs',
    cashMoneyMarket: 'Cash/MM'
  };
  return names[key] || key;
}

function formatRiskProfile(profile) {
  const labels = {
    very_conservative: 'Very Conservative',
    conservative: 'Conservative',
    moderate: 'Moderate',
    moderately_aggressive: 'Moderately Aggressive',
    aggressive: 'Aggressive'
  };
  return labels[profile] || profile;
}
