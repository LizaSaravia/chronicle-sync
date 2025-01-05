import './commands';

// Add Chrome extension testing support
Cypress.on('window:before:load', (win) => {
  // Stub chrome.runtime API
  win.chrome = win.chrome || {};
  win.chrome.runtime = win.chrome.runtime || {
    sendMessage: cy.stub().resolves({}),
    getManifest: cy.stub().returns({ id: 'testExtensionId' }),
    onMessage: {
      addListener: cy.stub(),
    },
  };
});

beforeEach(() => {
  // Clear any previous state
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Reset Chrome API stubs
  cy.window().then((win) => {
    if (win.chrome?.runtime?.sendMessage?.reset) {
      win.chrome.runtime.sendMessage.reset();
    }
  });
});