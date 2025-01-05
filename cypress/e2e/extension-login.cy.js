describe('Extension Login', () => {
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
    
    // Open extension popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);
  });

  it('should show login screen on first open', () => {
    cy.getByTestId('login-view').should('be.visible');
    cy.getByTestId('email-input').should('be.visible');
    cy.getByTestId('password-input').should('be.visible');
    cy.getByTestId('login-button').should('be.visible');
  });

  it('should validate login form', () => {
    // Try submitting empty form
    cy.getByTestId('login-button').click();
    cy.getByTestId('email-error').should('be.visible');
    cy.getByTestId('password-error').should('be.visible');

    // Try invalid email
    cy.getByTestId('email-input').type('invalid-email');
    cy.getByTestId('password-input').type('password123');
    cy.getByTestId('login-button').click();
    cy.getByTestId('email-error')
      .should('be.visible')
      .and('contain', 'Please enter a valid email');
  });

  it('should handle incorrect credentials', () => {
    cy.getByTestId('email-input').type('wrong@example.com');
    cy.getByTestId('password-input').type('wrongpassword123');
    cy.getByTestId('login-button').click();

    cy.getByTestId('login-error')
      .should('be.visible')
      .and('contain', 'Invalid email or password');
  });

  it('should successfully login with valid credentials', () => {
    // Get test credentials from environment variables
    const testEmail = Cypress.env('TEST_USER_EMAIL');
    const testPassword = Cypress.env('TEST_USER_PASSWORD');

    // Fill and submit login form
    cy.getByTestId('email-input').type(testEmail);
    cy.getByTestId('password-input').type(testPassword);
    cy.getByTestId('login-button').click();

    // Verify successful login
    cy.getByTestId('sync-status').should('be.visible');
    cy.getByTestId('user-email').should('contain', testEmail);

    // Verify extension state
    cy.window().then((win) => {
      // Check if auth token is stored
      const authToken = win.localStorage.getItem('authToken');
      expect(authToken).to.exist;

      // Check if background script received login message
      cy.wrap(null).then(() => {
        return new Promise((resolve) => {
          win.chrome.runtime.sendMessage(
            extensionId,
            { type: 'getAuthState' },
            (response) => {
              expect(response.isAuthenticated).to.be.true;
              resolve();
            }
          );
        });
      });
    });
  });

  it('should persist login state between popup opens', () => {
    // Login first
    const testEmail = Cypress.env('TEST_USER_EMAIL');
    const testPassword = Cypress.env('TEST_USER_PASSWORD');
    cy.getByTestId('email-input').type(testEmail);
    cy.getByTestId('password-input').type(testPassword);
    cy.getByTestId('login-button').click();

    // Close and reopen popup
    cy.visit(`chrome-extension://${extensionId}/popup.html`);

    // Should still be logged in
    cy.getByTestId('sync-status').should('be.visible');
    cy.getByTestId('user-email').should('contain', testEmail);
    cy.getByTestId('login-view').should('not.exist');
  });

  it('should successfully logout', () => {
    // Login first
    const testEmail = Cypress.env('TEST_USER_EMAIL');
    const testPassword = Cypress.env('TEST_USER_PASSWORD');
    cy.getByTestId('email-input').type(testEmail);
    cy.getByTestId('password-input').type(testPassword);
    cy.getByTestId('login-button').click();

    // Click logout
    cy.getByTestId('logout-button').click();

    // Verify logged out state
    cy.getByTestId('login-view').should('be.visible');
    cy.getByTestId('sync-status').should('not.exist');

    // Verify extension state
    cy.window().then((win) => {
      // Check if auth token is removed
      const authToken = win.localStorage.getItem('authToken');
      expect(authToken).to.be.null;

      // Check if background script received logout message
      cy.wrap(null).then(() => {
        return new Promise((resolve) => {
          win.chrome.runtime.sendMessage(
            extensionId,
            { type: 'getAuthState' },
            (response) => {
              expect(response.isAuthenticated).to.be.false;
              resolve();
            }
          );
        });
      });
    });
  });
});