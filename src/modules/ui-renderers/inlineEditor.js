import { state } from '../state.js';
import { RISK_QUESTIONS } from '../../components/RiskQuestionnaire.js';
import { formatRiskProfile } from '../utils/formatting.js';

export function renderInlineEditor() {
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

export function attachInlineEditorListeners(recalculateCallback) {
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

  // Tab switching
  document.querySelectorAll('.inline-editor-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      saveCurrentTabInputs();
      document.querySelectorAll('.inline-editor-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const tabId = e.target.dataset.tab;
      document.getElementById('inlineEditorContent').innerHTML = renderInlineTabContent(tabId);
      attachTabSpecificListeners(tabId);
    });
  });

  document.getElementById('inlineEndAge')?.addEventListener('input', (e) => {
    document.getElementById('inlineEndAgeValue').textContent = e.target.value;
  });

  document.getElementById('recalculateBtn')?.addEventListener('click', () => recalculateFromInlineEditor(recalculateCallback));

  // Attach listeners for the default active tab (basic)
  attachTabSpecificListeners('basic');
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

export function saveCurrentTabInputs() {
  // Basic Info
  const age = document.getElementById('inlineAge');
  if (age) state.inputs.age = parseInt(age.value) || state.inputs.age;

  const currentSavings = document.getElementById('inlineCurrentSavings');
  if (currentSavings) state.inputs.currentSavings = parseFloat(currentSavings.value) || state.inputs.currentSavings;

  const monthlyContribution = document.getElementById('inlineMonthlyContribution');
  if (monthlyContribution) state.inputs.monthlyContribution = parseFloat(monthlyContribution.value) || 0;

  // Portfolio
  const useCurrentAllocation = document.getElementById('inlineUseCurrentAllocation');
  if (useCurrentAllocation) state.inputs.useCurrentAllocation = useCurrentAllocation.checked;

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
}

function recalculateFromInlineEditor(recalculateCallback) {
  saveCurrentTabInputs();
  const btn = document.getElementById('recalculateBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Recalculating...';
    btn.classList.add('loading');
  }

  // Use setTimeout to allow UI to update
  setTimeout(() => {
    if (recalculateCallback) recalculateCallback();
  }, 100);
}
