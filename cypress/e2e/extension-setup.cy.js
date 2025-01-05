describe('Extension Setup and Usage', () => {
  let extensionId;

  before(() => {
    // Build the extension first
    cy.exec('npm run build');

    // Launch Chrome and get the extension ID
    cy.window().then((win) => {
      const extensions = win.chrome.runtime.getManifest();
      extensionId = extensions.id;
      cy.task('setExtensionId', extensionId);
    });
  });

  beforeEach(() => {
    // Clear any existing state
    cy.clearLocalStorage();
    cy.clearCookies();
    indexedDB.deleteDatabase('chronicle-sync');
    
    // Clear extension storage
    cy.window().then((win) => {
      win.chrome.storage.local.clear();
    });
  });

  it('should show setup prompt in popup when not initialized', () => {
    // Visit the popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Check initial state
    cy.get('.not-setup').should('be.visible');
    cy.get('.history').should('not.be.visible');
    cy.get('#setup-btn').should('be.visible');
    cy.contains('Welcome to Chronicle Sync').should('be.visible');
  });

  it('should open options page when setup button is clicked', () => {
    // Visit the popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Click setup button and verify options page opens
    cy.window().then((win) => {
      cy.stub(win.chrome.runtime, 'openOptionsPage').as('openOptions');
    });
    
    cy.get('#setup-btn').click();
    cy.get('@openOptions').should('have.been.called');
  });

  it('should validate password setup in options page', () => {
    // Visit the options page directly
    cy.visit(`chrome-extension://${extensionId}/options.html`);

    // Try submitting empty form
    cy.get('#setup-btn').click();
    cy.get('.error').should('be.visible')
      .and('contain', 'Passwords do not match or are empty');

    // Try mismatched passwords
    cy.get('#password').type('password123');
    cy.get('#confirm-password').type('password456');
    cy.get('#setup-btn').click();
    cy.get('.error').should('be.visible')
      .and('contain', 'Passwords do not match or are empty');
  });

  it('should complete setup process successfully', () => {
    // Visit the options page
    cy.visit(`chrome-extension://${extensionId}/options.html`);

    // Set up with valid password
    const password = 'ValidPassword123!';
    cy.get('#password').type(password);
    cy.get('#confirm-password').type(password);

    // Stub the initialization message response
    cy.window().then((win) => {
      cy.stub(win.chrome.runtime, 'sendMessage')
        .withArgs({ type: 'INITIALIZE', password })
        .resolves({ success: true });
    });

    // Submit the form
    cy.get('#setup-btn').click();

    // Verify success message
    cy.get('.success').should('be.visible')
      .and('contain', 'Chronicle Sync has been successfully set up');
    cy.get('#setup-form').should('not.be.visible');
  });

  it('should show history view after initialization', () => {
    // Set initialized flag
    cy.window().then((win) => {
      win.chrome.storage.local.set({ initialized: true });
    });

    // Mock history data
    cy.window().then((win) => {
      cy.stub(win.chrome.runtime, 'sendMessage')
        .withArgs({ type: 'GET_HISTORY' })
        .resolves({
          success: true,
          history: [
            { title: 'Test Page', url: 'https://example.com' }
          ]
        });
    });

    // Visit the popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Verify history view is shown
    cy.get('.not-setup').should('not.be.visible');
    cy.get('.history').should('be.visible');
    cy.get('#sync-btn').should('be.visible');
    cy.get('.history-item').should('be.visible')
      .and('contain', 'Test Page')
      .and('contain', 'https://example.com');
  });

  it('should handle sync functionality', () => {
    // Set initialized flag
    cy.window().then((win) => {
      win.chrome.storage.local.set({ initialized: true });
    });

    // Mock sync and history responses
    cy.window().then((win) => {
      const stub = cy.stub(win.chrome.runtime, 'sendMessage');
      
      stub.withArgs({ type: 'FORCE_SYNC' })
        .resolves({ success: true });
      
      stub.withArgs({ type: 'GET_HISTORY' })
        .resolves({
          success: true,
          history: [
            { title: 'New Page', url: 'https://example.com/new' }
          ]
        });
    });

    // Visit the popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Click sync button
    cy.get('#sync-btn').click();

    // Verify loading state
    cy.get('#sync-loading').should('be.visible');

    // Verify updated history
    cy.get('.history-item').should('contain', 'New Page');
  });

  it('should handle sync errors', () => {
    // Set initialized flag
    cy.window().then((win) => {
      win.chrome.storage.local.set({ initialized: true });
    });

    // Mock sync failure
    cy.window().then((win) => {
      cy.stub(win.chrome.runtime, 'sendMessage')
        .withArgs({ type: 'FORCE_SYNC' })
        .resolves({ success: false, error: 'Network error' });
    });

    // Visit the popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Click sync button
    cy.get('#sync-btn').click();

    // Verify error message
    cy.get('#history-error').should('be.visible')
      .and('contain', 'Sync failed: Network error');
  });

  it('should open links in new tabs', () => {
    // Set initialized flag
    cy.window().then((win) => {
      win.chrome.storage.local.set({ initialized: true });
      
      // Mock history data
      cy.stub(win.chrome.runtime, 'sendMessage')
        .withArgs({ type: 'GET_HISTORY' })
        .resolves({
          success: true,
          history: [
            { title: 'Test Page', url: 'https://example.com' }
          ]
        });

      // Stub tab creation
      cy.stub(win.chrome.tabs, 'create').as('createTab');
    });

    // Visit the popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Click history item
    cy.get('.history-item').click();

    // Verify new tab was created
    cy.get('@createTab').should('have.been.calledWith', {
      url: 'https://example.com'
    });
  });
});