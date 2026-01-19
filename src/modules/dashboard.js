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

  // Portfolio Sliders
  document.querySelectorAll('.allocation-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      const valSpan = document.getElementById(`${key}Value`);
      if (valSpan) valSpan.textContent = `${e.target.value}%`;
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
}
