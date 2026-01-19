import { STEPS, state } from './state.js';
import { renderBasicStep } from './ui-renderers/basicStep.js';
import { renderPortfolioStep } from './ui-renderers/portfolioStep.js';
import { renderGoalsStep } from './ui-renderers/goalsStep.js';
import { renderRiskStep } from './ui-renderers/riskStep.js';
import { renderIncomeStep } from './ui-renderers/incomeStep.js';
import { renderAdvancedStep } from './ui-renderers/advancedStep.js';
import { runCalculation } from './calculator.js';

export function renderDashboard() {
  const container = document.getElementById('inputsContainer');
  if (!container) return;

  // Determine which cards should be open. 
  // Default: First card open, others collapsed.
  // Or maybe check if we have stored state? For now, simple default.

  container.innerHTML = STEPS.map((step, idx) => {
    let content = '';
    switch (step.id) {
      case 'basic': content = renderBasicStep(); break;
      case 'portfolio': content = renderPortfolioStep(); break;
      case 'goals': content = renderGoalsStep(); break;
      case 'risk': content = renderRiskStep(); break;
      case 'income': content = renderIncomeStep(); break;
      case 'advanced': content = renderAdvancedStep(); break;
    }

    const isCollapsed = idx !== 0; // First card open, others collapsed

    return `
      <div class="dashboard-card ${isCollapsed ? 'collapsed' : ''}" id="card-${step.id}">
        <div class="card-header" onclick="toggleCard('${step.id}')">
          <div class="card-header-title">
            <h3 class="card-title">${step.icon} ${step.title}</h3>
          </div>
          <div class="card-header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-down"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        <div class="card-content">
          ${content}
        </div>
      </div>
    `;
  }).join('');

  // Add a sticky calculation footer or button within the inputs column
  const footer = document.createElement('div');
  footer.className = 'dashboard-actions';
  footer.innerHTML = `
    <button class="btn btn-primary btn-large" id="calculateBtn">Calculate My Results</button>
  `;
  container.appendChild(footer);

  attachDashboardListeners();
}

// Global toggle function
window.toggleCard = function (id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.classList.toggle('collapsed');
  }
};

function attachDashboardListeners() {
  // Calculate button
  document.getElementById('calculateBtn')?.addEventListener('click', runCalculation);

  // Slider real-time updates (reused logic)
  // End Age
  const endAgeSlider = document.getElementById('endAge');
  if (endAgeSlider) {
    endAgeSlider.addEventListener('input', (e) => {
      const valSpan = document.getElementById('endAgeValue');
      if (valSpan) valSpan.textContent = e.target.value;
    });
  }

  // Portfolio Sliders - update display on input, re-render on change (release)
  document.querySelectorAll('.allocation-slider').forEach(slider => {
    // Update display value in real-time as user drags
    slider.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      const valSpan = document.getElementById(`${key}Value`);
      if (valSpan) valSpan.textContent = `${e.target.value}%`;

      // Update state immediately
      if (state.inputs.currentAllocation.hasOwnProperty(key)) {
        state.inputs.currentAllocation[key] = parseInt(e.target.value) || 0;
      }

      // Recalculate and update total allocation display
      const total = Object.values(state.inputs.currentAllocation).reduce((sum, v) => sum + v, 0);
      const isValid = total === 100;
      const totalValueEl = document.querySelector('.allocation-summary .total-value');
      const totalStatusEl = document.querySelector('.allocation-summary .total-status');
      const summaryEl = document.querySelector('.allocation-summary');

      if (totalValueEl) totalValueEl.textContent = `${total}%`;
      if (totalStatusEl) {
        totalStatusEl.textContent = isValid ? '✓ Perfect' : `${total < 100 ? 'Add ' + (100 - total) + '%' : 'Remove ' + (total - 100) + '%'}`;
      }
      if (summaryEl) {
        summaryEl.classList.toggle('valid', isValid);
        summaryEl.classList.toggle('invalid', !isValid);
      }

      // Update Primary Home value hint in real-time
      if (key === 'residentialRealEstate') {
        updateHomeValueHint(parseInt(e.target.value) || 0);
      }
    });

    // Only re-render housing config on slider release (change event)
    slider.addEventListener('change', (e) => {
      const key = e.target.dataset.key;
      if (key === 'residentialRealEstate') {
        refreshPortfolioCard();
      }
    });
  });

  // Risk Options
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const questionCard = e.target.closest('.question-card');
      const questionIdx = parseInt(e.target.dataset.question);
      const value = parseInt(e.target.dataset.value);

      // Remove selected class from all options in this question
      questionCard.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');

      // Update state immediately
      state.inputs.riskAnswers[questionIdx] = value;

      // Update the "answered" counter
      const answeredCount = state.inputs.riskAnswers.filter(a => a !== undefined).length;
      const counterEl = document.querySelector('.risk-summary strong');
      if (counterEl) {
        counterEl.textContent = `${answeredCount}/8`;
      }
    });
  });

  // Checkbox
  document.getElementById('useCurrentAllocation')?.addEventListener('change', (e) => {
    // Toggle visibility of allocation section if needed, or just state
  });

  // Initialize housing input listeners if they exist
  initHousingInputListeners();
}

function attachPortfolioSliderListeners() {
  document.querySelectorAll('.allocation-slider').forEach(slider => {
    // Update display value in real-time as user drags
    slider.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      const valSpan = document.getElementById(`${key}Value`);
      if (valSpan) valSpan.textContent = `${e.target.value}%`;

      // Update state immediately
      if (state.inputs.currentAllocation.hasOwnProperty(key)) {
        state.inputs.currentAllocation[key] = parseInt(e.target.value) || 0;
      }

      // Recalculate and update total allocation display
      const total = Object.values(state.inputs.currentAllocation).reduce((sum, v) => sum + v, 0);
      const isValid = total === 100;
      const totalValueEl = document.querySelector('.allocation-summary .total-value');
      const totalStatusEl = document.querySelector('.allocation-summary .total-status');
      const summaryEl = document.querySelector('.allocation-summary');

      if (totalValueEl) totalValueEl.textContent = `${total}%`;
      if (totalStatusEl) {
        totalStatusEl.textContent = isValid ? '✓ Perfect' : `${total < 100 ? 'Add ' + (100 - total) + '%' : 'Remove ' + (total - 100) + '%'}`;
      }
      if (summaryEl) {
        summaryEl.classList.toggle('valid', isValid);
        summaryEl.classList.toggle('invalid', !isValid);
      }

      // Update Primary Home value hint in real-time
      if (key === 'residentialRealEstate') {
        updateHomeValueHint(parseInt(e.target.value) || 0);
      }
    });

    // Only re-render housing config on slider release (change event)
    slider.addEventListener('change', (e) => {
      const key = e.target.dataset.key;
      if (key === 'residentialRealEstate') {
        refreshPortfolioCard();
      }
    });
  });

  // Also initialize housing config listeners
  initHousingInputListeners();
}

function refreshPortfolioCard() {
  // Update state from input fields BEFORE re-rendering (so home value is calculated correctly)
  state.inputs.currentSavings = parseFloat(document.getElementById('currentSavings')?.value) || state.inputs.currentSavings;
  state.inputs.windfall = parseFloat(document.getElementById('windfall')?.value) || state.inputs.windfall;

  const portfolioCard = document.getElementById('card-portfolio');
  if (portfolioCard) {
    const cardContent = portfolioCard.querySelector('.card-content');
    if (cardContent) {
      cardContent.innerHTML = renderPortfolioStep();
      attachPortfolioSliderListeners();
    }
  }
}

// Initialize housing configuration input listeners
function initHousingInputListeners() {
  const housingInputs = ['monthlyRent', 'expectedHoldingYears', 'propertyTaxRate',
    'annualInsurance', 'maintenanceRate', 'monthlyHOA'];

  housingInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value) || 0;
        if (inputId === 'propertyTaxRate' || inputId === 'maintenanceRate') {
          state.inputs.housing[inputId] = value / 100;
        } else {
          state.inputs.housing[inputId] = value;
        }
      });
    }
  });
}

// Update Primary Home value hint in real-time based on current input values
function updateHomeValueHint(homePercentage) {
  // Read current values from input fields (not stale state)
  const currentSavings = parseFloat(document.getElementById('currentSavings')?.value) || state.inputs.currentSavings;
  const windfall = parseFloat(document.getElementById('windfall')?.value) || state.inputs.windfall;
  const totalPortfolio = currentSavings + windfall;
  const homeValue = (homePercentage / 100) * totalPortfolio;

  // Find the Primary Home slider's hint element
  const homeSlider = document.getElementById('residentialRealEstateSlider');
  if (homeSlider) {
    const hintEl = homeSlider.closest('.allocation-item')?.querySelector('.form-hint');
    if (hintEl) {
      const baseHint = 'Buy a home instead of renting';
      if (homePercentage > 0 && homeValue > 0) {
        hintEl.textContent = `${baseHint} = $${(homeValue / 1000000).toFixed(2)}M home`;
      } else {
        hintEl.textContent = baseHint;
      }
    }
  }
}
