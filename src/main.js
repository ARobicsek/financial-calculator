/**
 * Not Relying on Chance - Main Application Entry Point
 * Sophisticated Retirement Investment Calculator
 */

import { setupAssumptionsSidebar } from './modules/ui-renderers/sidebar.js';
import { renderCurrentStep, setupNavigation } from './modules/navigation.js';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components globally
Chart.register(...registerables);

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  setupAssumptionsSidebar();
  setupNavigation();
  renderCurrentStep();
});
