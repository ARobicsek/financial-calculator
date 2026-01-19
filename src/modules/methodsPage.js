/**
 * Methods Page Module
 * Handles displaying the methodology documentation
 */

let methodsContent = null;

/**
 * Simple markdown parser for basic formatting
 */
function parseMarkdown(markdown) {
  let html = markdown;

  // Headers (order matters - do h4 before h3, h3 before h2, etc.)
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered lists
  html = html.replace(/^\- (.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');

  // Paragraphs (lines that don't start with special characters)
  html = html.split('\n\n').map(paragraph => {
    if (!paragraph.match(/^<[h|u|o|p|l|d|b]/)) {
      return '<p>' + paragraph + '</p>';
    }
    return paragraph;
  }).join('\n\n');

  return html;
}

/**
 * Load and parse the methods.md file
 */
async function loadMethodsContent() {
  if (methodsContent) return methodsContent;

  try {
    const response = await fetch('/methods.md');
    const markdown = await response.text();
    methodsContent = parseMarkdown(markdown);
    return methodsContent;
  } catch (error) {
    console.error('Failed to load methods content:', error);
    return '<p>Failed to load methodology documentation.</p>';
  }
}

/**
 * Show the methods page
 */
export async function showMethodsPage() {
  const methodsPage = document.getElementById('methodsPage');
  const mainContent = document.querySelector('.main');
  const footer = document.querySelector('.disclaimer-footer');
  const assumptionsSidebar = document.getElementById('assumptionsSidebar');

  if (!methodsPage) return;

  // Hide main content and footer, but keep header visible
  if (mainContent) mainContent.style.display = 'none';
  if (footer) footer.style.display = 'none';
  if (assumptionsSidebar) assumptionsSidebar.classList.add('hidden');

  // Load and display content
  const content = await loadMethodsContent();
  const contentContainer = methodsPage.querySelector('.methods-content');
  if (contentContainer) {
    contentContainer.innerHTML = content;
  }

  methodsPage.classList.remove('hidden');

  // Scroll to top
  window.scrollTo(0, 0);
}

/**
 * Hide the methods page and return to main content
 */
export function hideMethodsPage() {
  const methodsPage = document.getElementById('methodsPage');
  const mainContent = document.querySelector('.main');
  const footer = document.querySelector('.disclaimer-footer');

  if (methodsPage) methodsPage.classList.add('hidden');
  if (mainContent) mainContent.style.display = 'block';
  if (footer) footer.style.display = 'block';

  // Scroll to top
  window.scrollTo(0, 0);
}

/**
 * Setup navigation handlers
 */
export function setupMethodsNavigation() {
  // Header Methods link
  const headerMethodsLink = document.getElementById('headerMethodsLink');
  if (headerMethodsLink) {
    headerMethodsLink.addEventListener('click', (e) => {
      e.preventDefault();
      showMethodsPage();
    });
  }

  // Header Assumptions link - close methods page if open
  const headerAssumptionsLink = document.getElementById('headerAssumptionsLink');
  if (headerAssumptionsLink) {
    headerAssumptionsLink.addEventListener('click', (e) => {
      const methodsPage = document.getElementById('methodsPage');
      if (methodsPage && !methodsPage.classList.contains('hidden')) {
        hideMethodsPage();
      }
    });
  }

  // Footer methodology link
  const footerMethodologyLink = document.querySelector('a[href="methodology"]');
  if (footerMethodologyLink) {
    footerMethodologyLink.addEventListener('click', (e) => {
      e.preventDefault();
      showMethodsPage();
    });
  }

  // Logo click - return to main page
  const logo = document.querySelector('.logo');
  const logoH1 = document.querySelector('.logo h1');

  if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      hideMethodsPage();
    });
  }

  if (logoH1) {
    logoH1.style.cursor = 'pointer';
    logoH1.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideMethodsPage();
    });
  }

  // Handle browser back button
  window.addEventListener('popstate', () => {
    const methodsPage = document.getElementById('methodsPage');
    if (methodsPage && !methodsPage.classList.contains('hidden')) {
      hideMethodsPage();
    }
  });
}
