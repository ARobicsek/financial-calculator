import { state } from '../state.js';

export function renderGoalsStep() {
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
