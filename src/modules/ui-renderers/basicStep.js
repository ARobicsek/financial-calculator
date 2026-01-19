import { state } from '../state.js';

export function renderBasicStep() {
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
