import { state, STEPS } from './state.js';
import { renderBasicStep } from './ui-renderers/basicStep.js';
import { renderPortfolioStep } from './ui-renderers/portfolioStep.js';
import { renderGoalsStep } from './ui-renderers/goalsStep.js';
import { renderRiskStep } from './ui-renderers/riskStep.js';
import { renderIncomeStep } from './ui-renderers/incomeStep.js';
import { renderAdvancedStep } from './ui-renderers/advancedStep.js';
import { runCalculation } from './calculator.js'; // We will create this next
import { toggleSidebar, showMethodology } from './ui-renderers/sidebar.js'; // We will create this

export function renderProgressSteps() {
    const container = document.getElementById('progressSteps');
    if (!container) return;

    container.innerHTML = STEPS.map((step, idx) => `
    <div class="progress-step ${idx === state.currentStep ? 'active' : ''} ${idx < state.currentStep ? 'completed' : ''}" data-step="${idx}">
      <span class="step-number">${idx < state.currentStep ? '✓' : idx + 1}</span>
      <span class="step-label">${step.title}</span>
    </div>
  `).join('');

    // Update progress bar fill
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = `${(state.currentStep / (STEPS.length - 1)) * 100}%`;
}

export function setupNavigation() {
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

export function renderCurrentStep() {
    const container = document.getElementById('wizardContainer');
    if (!container) return;

    const step = STEPS[state.currentStep];

    let content = '';
    switch (step.id) {
        case 'basic': content = renderBasicStep(); break;
        case 'portfolio': content = renderPortfolioStep(); break;
        case 'goals': content = renderGoalsStep(); break;
        case 'risk': content = renderRiskStep(); break;
        case 'income': content = renderIncomeStep(); break;
        case 'advanced': content = renderAdvancedStep(); break;
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

            // Update summary - re-render to update the count
            // Optimize: just update the count instead of full re-render if possible, but full re-render is safe
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
            if (summary) {
                const totalValue = summary.querySelector('.total-value');
                const totalStatus = summary.querySelector('.total-status');

                totalValue.textContent = `${total}%`;
                summary.classList.toggle('valid', total === 100);
                summary.classList.toggle('invalid', total !== 100);
                totalStatus.textContent = total === 100 ? '✓ Perfect' :
                    (total < 100 ? `Add ${100 - total}%` : `Remove ${total - 100}%`);
            }
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
