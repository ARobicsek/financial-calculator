import { state } from '../state.js';

export function renderPortfolioStep() {
  const alloc = state.inputs.currentAllocation;
  const total = Object.values(alloc).reduce((sum, v) => sum + v, 0);
  const isValid = total === 100;

  const categories = [
    { key: 'usLargeCap', label: 'US Large Cap Stocks', hint: 'VTI, VOO, SPY, S&P 500 index funds' },
    { key: 'usSmallMidCap', label: 'US Small/Mid Cap', hint: 'VB, VXF, IJR, extended market' },
    { key: 'intlDeveloped', label: 'International Developed', hint: 'VXUS, VEA, SCHF (Europe, Japan, etc.)' },
    { key: 'emergingMarkets', label: 'Emerging Markets', hint: 'VWO, IEMG (China, India, Brazil, etc.)' },
    { key: 'usBonds', label: 'US Bonds (Aggregate)', hint: 'BND, AGG, investment-grade bonds' },
    { key: 'tips', label: 'TIPS / I-Bonds', hint: 'SCHP, VTIP, inflation-protected' },
    { key: 'cashMoneyMarket', label: 'Cash / Money Market', hint: 'VMFXX, savings, CDs' }
  ];

  return `
    <div class="portfolio-allocation">
      <div class="allocation-summary ${isValid ? 'valid' : 'invalid'}">
        <div class="total-label">Total Allocation:</div>
        <div class="total-value">${total}%</div>
        <div class="total-status">${isValid ? '✓ Perfect' : `${total < 100 ? 'Add ' + (100 - total) + '%' : 'Remove ' + (total - 100) + '%'}`}</div>
      </div>
      
      <div class="allocation-grid">
        ${categories.map(cat => `
          <div class="allocation-item">
            <div class="allocation-header">
              <label class="allocation-label">${cat.label}</label>
              <span class="allocation-value" id="${cat.key}Value">${alloc[cat.key]}%</span>
            </div>
            <input type="range" class="allocation-slider" id="${cat.key}Slider" 
                   value="${alloc[cat.key]}" min="0" max="100" step="1"
                   data-key="${cat.key}">
            <span class="form-hint">${cat.hint}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="portfolio-actions">
        <label class="use-allocation-checkbox">
          <input type="checkbox" id="useCurrentAllocation" ${state.inputs.useCurrentAllocation ? 'checked' : ''}>
          Compare my current allocation against recommended strategies
        </label>
      </div>
    </div>
  `;
}
