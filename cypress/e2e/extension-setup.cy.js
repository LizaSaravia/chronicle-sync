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
    
    // Clear databases
    indexedDB.deleteDatabase('chronicle-sync');
    
    // Clear extension storage
    cy.window().then((win) => {
      win.chrome.storage.local.clear();
    });

    // Reset server state by restarting it
    cy.task('restartDevServer');
  });

  it('should complete full setup and sync flow with real backend', () => {
    // Start with popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Verify initial state
    cy.get('.not-setup').should('be.visible');
    cy.get('.history').should('not.be.visible');
    cy.get('#setup-btn').should('be.visible');
    cy.contains('Welcome to Chronicle Sync').should('be.visible');

    // Click setup and go to options
    cy.get('#setup-btn').click();
    cy.origin(`chrome-extension://${extensionId}`, () => {
      cy.get('#password').type('ValidPassword123!');
      cy.get('#confirm-password').type('ValidPassword123!');
      cy.get('#setup-btn').click();

      // Wait for initialization
      cy.get('.success', { timeout: 10000 }).should('be.visible')
        .and('contain', 'Chronicle Sync has been successfully set up');
    });

    // Go back to popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Add some history entries
    cy.window().then((win) => {
      // Add history entries directly to chrome.history
      const entries = [
        { title: 'Test Page 1', url: 'https://example.com/1', lastVisitTime: Date.now() },
        { title: 'Test Page 2', url: 'https://example.com/2', lastVisitTime: Date.now() }
      ];

      entries.forEach(entry => {
        win.chrome.history.addUrl({ url: entry.url });
      });
    });

    // Force sync
    cy.get('#sync-btn').click();

    // Verify sync status
    cy.get('#sync-loading').should('be.visible');
    cy.get('#sync-loading', { timeout: 10000 }).should('not.exist');

    // Verify history entries are displayed
    cy.get('.history-item').should('have.length', 2);
    cy.get('.history-item').first().should('contain', 'Test Page 1');
    cy.get('.history-item').last().should('contain', 'Test Page 2');

    // Test real encryption/decryption
    cy.window().then(async (win) => {
      // Get the sync group data from the server
      const response = await fetch(`${Cypress.env('apiUrl')}/sync/group/default`);
      const { data: encryptedData } = await response.json();

      // Verify the data is actually encrypted
      expect(encryptedData).to.be.a('string');
      expect(encryptedData).to.not.include('Test Page');

      // Decrypt the data using the extension's crypto
      const crypto = new win.CryptoManager('ValidPassword123!');
      const decrypted = await crypto.decrypt(encryptedData);

      // Verify decrypted data
      expect(decrypted).to.be.an('array');
      expect(decrypted[0].title).to.equal('Test Page 1');
      expect(decrypted[1].title).to.equal('Test Page 2');
    });

    // Test sync between devices
    cy.window().then(async (win) => {
      // Simulate another device updating the history
      const crypto = new win.CryptoManager('ValidPassword123!');
      const newHistory = [
        { title: 'Test Page 1', url: 'https://example.com/1' },
        { title: 'Test Page 2', url: 'https://example.com/2' },
        { title: 'Test Page 3', url: 'https://example.com/3' }
      ];
      
      const encryptedData = await crypto.encrypt(newHistory);
      
      await fetch(`${Cypress.env('apiUrl')}/sync/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: 'default',
          encryptedData
        })
      });
    });

    // Force sync again
    cy.get('#sync-btn').click();

    // Verify updated history
    cy.get('.history-item', { timeout: 10000 }).should('have.length', 3);
    cy.get('.history-item').last().should('contain', 'Test Page 3');

    // Test error handling
    cy.window().then(async () => {
      // Simulate server error
      await fetch(`${Cypress.env('apiUrl')}/sync/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: 'invalid',
          encryptedData: 'invalid'
        })
      });
    });

    cy.get('#sync-btn').click();
    cy.get('#history-error').should('be.visible');
  });

  it('should handle password validation and errors', () => {
    // Visit options page
    cy.visit(`chrome-extension://${extensionId}/options.html`);

    // Test empty password
    cy.get('#setup-btn').click();
    cy.get('.error').should('be.visible')
      .and('contain', 'Passwords do not match or are empty');

    // Test mismatched passwords
    cy.get('#password').type('password123');
    cy.get('#confirm-password').type('password456');
    cy.get('#setup-btn').click();
    cy.get('.error').should('be.visible')
      .and('contain', 'Passwords do not match or are empty');

    // Test weak password
    cy.get('#password').clear().type('weak');
    cy.get('#confirm-password').clear().type('weak');
    cy.get('#setup-btn').click();
    cy.get('.error').should('be.visible')
      .and('contain', 'Password must be at least 8 characters');

    // Test invalid characters
    const invalidPassword = 'pass\x00word';
    cy.get('#password').clear().type(invalidPassword);
    cy.get('#confirm-password').clear().type(invalidPassword);
    cy.get('#setup-btn').click();
    cy.get('.error').should('be.visible')
      .and('contain', 'Password contains invalid characters');
  });

  it('should handle real WebSocket updates', () => {
    // Set up extension first
    cy.visit(`chrome-extension://${extensionId}/options.html`);
    cy.get('#password').type('ValidPassword123!');
    cy.get('#confirm-password').type('ValidPassword123!');
    cy.get('#setup-btn').click();
    cy.get('.success', { timeout: 10000 }).should('be.visible');

    // Go to popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Simulate another device making changes
    cy.window().then(async (win) => {
      const crypto = new win.CryptoManager('ValidPassword123!');
      const newHistory = [
        { title: 'WebSocket Test', url: 'https://example.com/ws' }
      ];
      
      const encryptedData = await crypto.encrypt(newHistory);
      
      // Update via WebSocket
      const ws = new WebSocket('ws://localhost:3000');
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          groupId: 'default'
        }));

        // Update data
        fetch(`${Cypress.env('apiUrl')}/sync/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: 'default',
            encryptedData
          })
        });
      };
    });

    // Verify real-time update
    cy.get('.history-item', { timeout: 10000 })
      .should('contain', 'WebSocket Test');
  });
});
