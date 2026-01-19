import { STEPS } from './state.js';
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

        return `
      <div class="dashboard-card" id="card-${step.id}">
        <div class="card-header">
          <h3 class="card-title">${step.icon} ${step.title}</h3>
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
    <button class="btn btn-primary btn-large" id="calculateBtn">Calculate My Results →</button>
  `;
    container.appendChild(footer);

    // Attach listeners using the existing logic from navigation.js (adapted)
    // We need to re-attach listeners because the DOM is fresh.
    // Note: attachStepListeners in navigation.js assumes wizard navigation (next/prev). 
    // We might need to call specific attach functions or adapt navigation.js. 
    // For now, let's assume we can reuse basic listener logic but we might need to be careful about conflicting NEXT/PREV buttons which are no longer rendered.
    // Actually, attachStepListeners attaches to 'nextBtn' etc which don't exist here. 
    // We need to attach listeners to inputs directly or use a new attach function.
    // Let's create a specific attach function for dashboard or import specific ones.

    // Reuse specific listeners from navigation.js?
    // navigation.js exported setupNavigation but not individual attachers in a granular way basically.
    // But wait, attachStepListeners is local in navigation.js. 
    // I should refactor navigation.js to export the input listeners (sliders etc) separate from button listeners.

    // For this step, I will basically inline or copy the necessary listener logic here or refactor navigation.js.
    // Given the extensive changes, I will define the listeners here to be safe and clean.
    attachDashboardListeners();
}

function attachDashboardListeners() {
    // Calculate button
    document.getElementById('calculateBtn')?.addEventListener('click', runCalculation);

    // Slider real-time updates (reused logic)
    // End Age
    const endAgeSlider = document.getElementById('endAge');
    if (endAgeSlider) {
        endAgeSlider.addEventListener('input', (e) => {
            const valSpan = document.getElementById('endAgeValue'); // Might need to ensure IDs are unique if rendered multiple times? No, single dashboard.
            if (valSpan) valSpan.textContent = e.target.value;
        });
    }

    // Portfolio Sliders
    document.querySelectorAll('.allocation-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            // Reusing logic from navigation.js
            // We should ideally import a shared helper or state updater but for now:
            const key = e.target.dataset.key;
            const valSpan = document.getElementById(`${key}Value`);
            if (valSpan) valSpan.textContent = `${e.target.value}%`;
            // Note: State update happens on Calculate in the current calculator.js structure? 
            // No, navigation.js updated state on NEXT. 
            // In dashboard, we should update state on input OR on calculate. 
            // Let's update state on Calculate to be simple, OR add change listeners.
            // Updating on Calculate is safer for performance unless we want real-time.
            // But existing sliders definitely updated display real-time.
        });
    });

    // Risk Options
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });

    // Checkbox
    document.getElementById('useCurrentAllocation')?.addEventListener('change', (e) => {
        // Toggle visibility of allocation section if needed, or just state
    });
}
