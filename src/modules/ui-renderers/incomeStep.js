import { state } from '../state.js';

export function renderIncomeStep() {
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
