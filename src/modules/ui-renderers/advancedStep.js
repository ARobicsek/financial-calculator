import { state } from '../state.js';

export function renderAdvancedStep() {
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
          <option value="guardrails" ${state.inputs.withdrawalStrategy === 'guardrails' ? 'selected' : ''}>Guardrails (adaptive spending)</option>
          <option value="fixed" ${state.inputs.withdrawalStrategy === 'fixed' ? 'selected' : ''}>Fixed (inflation-adjusted only)</option>
        </select>
        <span class="form-hint">Guardrails adjusts spending based on portfolio performance; Fixed maintains constant real income</span>
      </div>
      <div class="form-group">
        <label class="form-label" style="cursor: pointer;">
          <input type="checkbox" id="useGlidePath" ${state.inputs.useGlidePath ? 'checked' : ''} style="margin-right: 8px;">
          Use Glide Path (gradually reduce equities)
        </label>
        <span class="form-hint">Reduces equity allocation by ~1.5% per year approaching retirement</span>
      </div>
      <div class="form-group full-width">
        <label class="form-label">Near-Term Crash Probability: <span id="crashProbValue">${state.inputs.nearTermCrashProbability}%</span></label>
        <input type="range" class="form-slider" id="nearTermCrashProbability" 
               value="${state.inputs.nearTermCrashProbability}" min="0" max="60" step="5">
        <div class="slider-labels" style="position: relative; height: 1.5em; margin-top: 0.5rem;">
          <span style="position: absolute; left: 0;">0%</span>
          <span style="position: absolute; left: 33.33%; transform: translateX(-50%); white-space: nowrap;">20% (base)</span>
          <span style="position: absolute; right: 0;">60%</span>
        </div>
        <span class="form-hint">Probability of a 20%+ equity drawdown in the next 3 years. Higher = more stress testing.</span>
      </div>
    </div>
  `;
}
