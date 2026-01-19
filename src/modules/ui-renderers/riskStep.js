import { state } from '../state.js';
import { RISK_QUESTIONS } from '../../components/RiskQuestionnaire.js';

export function renderRiskStep() {
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
