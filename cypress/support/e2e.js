import './commands';

// Add Chrome extension testing support
Cypress.on('window:before:load', (win) => {
  // Stub Chrome APIs
  win.chrome = win.chrome || {};
  
  // Runtime API
  win.chrome.runtime = {
    sendMessage: cy.stub().resolves({}),
    getManifest: cy.stub().returns({ id: 'testExtensionId' }),
    openOptionsPage: cy.stub(),
    onMessage: {
      addListener: cy.stub(),
    },
  };

  // Storage API
  win.chrome.storage = {
    local: {
      get: cy.stub().resolves({}),
      set: cy.stub().resolves(),
      clear: cy.stub().resolves(),
    },
  };

  // Tabs API
  win.chrome.tabs = {
    create: cy.stub().resolves({}),
    query: cy.stub().resolves([]),
  };

  // Action API
  win.chrome.action = {
    openPopup: cy.stub().resolves(),
  };
});

beforeEach(() => {
  // Clear any previous state
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Reset Chrome API stubs
  cy.window().then((win) => {
    Object.values(win.chrome).forEach(api => {
      Object.values(api).forEach(method => {
        if (method?.reset) {
          method.reset();
        }
      });
    });
  });
});
