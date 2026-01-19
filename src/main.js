/**
 * Not Relying on Chance - Main Application Entry Point
 * Sophisticated Retirement Investment Calculator
 */

import { setupAssumptionsSidebar, toggleSidebar } from './modules/ui-renderers/sidebar.js';
import { renderDashboard } from './modules/dashboard.js';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components globally
Chart.register(...registerables);

// Track sidebar state for toggle
let sidebarOpen = false;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  setupAssumptionsSidebar();
  renderDashboard();

  // Header assumptions link - toggle sidebar
  document.getElementById('headerAssumptionsLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebarOpen = !sidebarOpen;
    toggleSidebar(sidebarOpen);
  });
});
