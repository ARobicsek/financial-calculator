import { state } from '../state.js';

export function renderPortfolioStep() {
  const alloc = state.inputs.currentAllocation;
  const housing = state.inputs.housing;
  const total = Object.values(alloc).reduce((sum, v) => sum + v, 0);
  const isValid = total === 100;
  const totalPortfolio = state.inputs.currentSavings + state.inputs.windfall;
  const homeValue = (alloc.residentialRealEstate / 100) * totalPortfolio;

  const categories = [
    { key: 'usLargeCap', label: 'US Large Cap Stocks', hint: 'VTI, VOO, SPY, S&P 500 index funds' },
    { key: 'usSmallMidCap', label: 'US Small/Mid Cap', hint: 'VB, VXF, IJR, extended market' },
    { key: 'intlDeveloped', label: 'International Developed', hint: 'VXUS, VEA, SCHF (Europe, Japan, etc.)' },
    { key: 'emergingMarkets', label: 'Emerging Markets', hint: 'VWO, IEMG (China, India, Brazil, etc.)' },
    { key: 'usBonds', label: 'US Bonds (Aggregate)', hint: 'BND, AGG, investment-grade bonds' },
    { key: 'tips', label: 'TIPS / I-Bonds', hint: 'SCHP, VTIP, inflation-protected' },
    { key: 'cashMoneyMarket', label: 'Cash / Money Market', hint: 'VMFXX, savings, CDs' },
    { key: 'residentialRealEstate', label: '🏠 Primary Home', hint: 'Buy a home instead of renting' }
  ];

  // Calculate annual ownership costs
  const annualOwnershipCosts = homeValue > 0 ?
    (homeValue * housing.propertyTaxRate) +
    housing.annualInsurance +
    (homeValue * housing.maintenanceRate) +
    (housing.annualMaintenance || 5000) : 0;
  const monthlyOwnershipCosts = annualOwnershipCosts / 12;
  const annualRent = housing.monthlyRent * 12;
  const monthlySavings = housing.monthlyRent - monthlyOwnershipCosts;

  return `
    <div class="portfolio-allocation">
      <div class="allocation-summary ${isValid ? 'valid' : 'invalid'}">
        <div class="total-label">Total Allocation:</div>
        <div class="total-value">${total}%</div>
        <div class="total-status">${isValid ? '✓ Perfect' : `${total < 100 ? 'Add ' + (100 - total) + '%' : 'Remove ' + (total - 100) + '%'}`}</div>
      </div>
      
      <div class="allocation-grid">
        ${categories.map(cat => `
          <div class="allocation-item ${cat.key === 'residentialRealEstate' ? 'home-allocation' : ''}">
            <div class="allocation-header">
              <label class="allocation-label">${cat.label}</label>
              <span class="allocation-value" id="${cat.key}Value">${alloc[cat.key]}%</span>
            </div>
            <input type="range" class="allocation-slider" id="${cat.key}Slider" 
                   value="${alloc[cat.key]}" min="0" max="100" step="1"
                   data-key="${cat.key}">
            <span class="form-hint">${cat.hint}${cat.key === 'residentialRealEstate' && alloc.residentialRealEstate > 0 ? ` = $${(homeValue / 1000000).toFixed(2)}M home` : ''}</span>
          </div>
        `).join('')}
      </div>
      
      ${alloc.residentialRealEstate > 0 ? `
      <div class="housing-config-section">
        <h4>🏠 Home Purchase Configuration</h4>
        <p class="housing-summary">
          Buying a <strong>$${(homeValue / 1000000).toFixed(2)}M</strong> home eliminates rent of
          <strong>$${housing.monthlyRent.toLocaleString()}/mo</strong>, saving
          <strong class="${monthlySavings > 0 ? 'positive' : 'negative'}">$${Math.abs(monthlySavings).toLocaleString()}/mo</strong>
          vs. renting costs.
        </p>
        
        <div class="housing-inputs-grid">
          <div class="form-group">
            <label>Current Monthly Rent</label>
            <div class="input-with-prefix">
              <span class="prefix">$</span>
              <input type="number" id="monthlyRent" value="${housing.monthlyRent}" min="0" max="50000" step="500">
            </div>
          </div>
          
          <div class="form-group">
            <label>When to sell and return to renting</label>
            <div class="slider-value-label" id="holdingPeriodLabel">${housing.expectedHoldingYears === 999 ? 'Never' : housing.expectedHoldingYears + ' years'}</div>
            <input type="range" id="expectedHoldingYears" value="${housing.expectedHoldingYears === 999 ? 21 : housing.expectedHoldingYears}" min="1" max="21" step="1" class="housing-slider">
            <div class="slider-labels">
              <span>1 year</span>
              <span>20 years</span>
              <span>Never</span>
            </div>
          </div>
          
          <div class="form-group">
            <label>Property Tax Rate</label>
            <div class="input-with-suffix">
              <input type="number" id="propertyTaxRate" value="${(housing.propertyTaxRate * 100).toFixed(2)}" min="0" max="5" step="0.1">
              <span class="suffix">%</span>
            </div>
          </div>
          
          <div class="form-group">
            <label>Annual Insurance</label>
            <div class="input-with-prefix">
              <span class="prefix">$</span>
              <input type="number" id="annualInsurance" value="${housing.annualInsurance}" min="0" max="50000" step="500">
            </div>
          </div>
          
          <div class="form-group">
            <label>Maintenance Rate</label>
            <div class="input-with-suffix">
              <input type="number" id="maintenanceRate" value="${(housing.maintenanceRate * 100).toFixed(2)}" min="0" max="5" step="0.1">
              <span class="suffix">%</span>
            </div>
          </div>
          
          <div class="form-group">
            <label>Annual Maintenance</label>
            <div class="input-with-prefix">
              <span class="prefix">$</span>
              <input type="number" id="annualMaintenance" value="${housing.annualMaintenance || 5000}" min="0" max="50000" step="500">
            </div>
          </div>
        </div>
        
        <div class="housing-cost-breakdown">
          <div class="cost-item">
            <span>Annual Rent (current):</span>
            <span>$${annualRent.toLocaleString()}</span>
          </div>
          <div class="cost-item">
            <span>Annual Ownership Costs:</span>
            <span>$${Math.round(annualOwnershipCosts).toLocaleString()}</span>
          </div>
          <div class="cost-item highlight">
            <span>Net Annual Savings from Buying:</span>
            <span class="${annualRent - annualOwnershipCosts > 0 ? 'positive' : 'negative'}">
              $${Math.abs(Math.round(annualRent - annualOwnershipCosts)).toLocaleString()}
              ${annualRent - annualOwnershipCosts > 0 ? 'saved' : 'extra cost'}
            </span>
          </div>
        </div>
      </div>
      ` : `
      <div class="housing-hint">
        <p>💡 <strong>Considering buying a home?</strong> Allocate some percentage to "Primary Home" above to compare buying vs. renting.</p>
      </div>
      `}
      
      <div class="portfolio-actions">
        <label class="use-allocation-checkbox">
          <input type="checkbox" id="useCurrentAllocation" ${state.inputs.useCurrentAllocation ? 'checked' : ''}>
          Compare my current allocation against recommended strategies
        </label>
      </div>
    </div>
  `;
}

// Initialize housing input event listeners
export function initHousingInputListeners() {
  const housingInputs = ['monthlyRent', 'expectedHoldingYears', 'propertyTaxRate',
    'annualInsurance', 'maintenanceRate', 'annualMaintenance'];

  housingInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      // For holding period slider, add real-time label update
      if (inputId === 'expectedHoldingYears') {
        input.addEventListener('input', (e) => {
          const value = parseInt(e.target.value) || 13;
          const label = document.getElementById('holdingPeriodLabel');
          if (label) {
            label.textContent = value === 999 ? 'Never' : value + ' years';
          }
        });
      }

      input.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value) || 0;
        if (inputId === 'propertyTaxRate' || inputId === 'maintenanceRate') {
          state.inputs.housing[inputId] = value / 100; // Convert from % to decimal
        } else if (inputId === 'expectedHoldingYears') {
          // Store 999 as a special value meaning "never sell"
          state.inputs.housing[inputId] = parseInt(value);
        } else {
          state.inputs.housing[inputId] = value;
        }
      });
    }
  });
}
