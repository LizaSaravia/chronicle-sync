describe('Login Functionality', () => {
  beforeEach(() => {
    cy.loadExtension();
    // Clear any existing login state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should show login form when not authenticated', () => {
    cy.getByTestId('login-form').should('be.visible');
    cy.getByTestId('email-input').should('be.visible');
    cy.getByTestId('password-input').should('be.visible');
    cy.getByTestId('login-button').should('be.visible');
  });

  it('should show validation errors for invalid input', () => {
    cy.getByTestId('email-input').type('invalid-email');
    cy.getByTestId('password-input').type('short');
    cy.getByTestId('login-button').click();

    cy.getByTestId('email-error').should('be.visible')
      .and('contain', 'Please enter a valid email');
    cy.getByTestId('password-error').should('be.visible')
      .and('contain', 'Password must be at least 8 characters');
  });

  it('should show error message for incorrect credentials', () => {
    cy.getByTestId('email-input').type('wrong@example.com');
    cy.getByTestId('password-input').type('wrongpassword123');
    cy.getByTestId('login-button').click();

    cy.getByTestId('login-error')
      .should('be.visible')
      .and('contain', 'Invalid email or password');
  });

  it('should successfully log in with valid credentials', () => {
    // You should replace these with test account credentials or mock the authentication
    cy.getByTestId('email-input').type(Cypress.env('TEST_USER_EMAIL'));
    cy.getByTestId('password-input').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.getByTestId('login-button').click();

    // Verify successful login
    cy.getByTestId('user-profile').should('be.visible');
    cy.getByTestId('sync-status').should('exist');
    
    // Verify local storage has auth token
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.exist;
    });
  });

  it('should persist login state after browser restart', () => {
    // Login first
    cy.getByTestId('email-input').type(Cypress.env('TEST_USER_EMAIL'));
    cy.getByTestId('password-input').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.getByTestId('login-button').click();

    // Verify login successful
    cy.getByTestId('user-profile').should('be.visible');

    // Reload the page to simulate browser restart
    cy.reload();

    // Should still be logged in
    cy.getByTestId('user-profile').should('be.visible');
    cy.getByTestId('login-form').should('not.exist');
  });

  it('should successfully log out', () => {
    // Login first
    cy.getByTestId('email-input').type(Cypress.env('TEST_USER_EMAIL'));
    cy.getByTestId('password-input').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.getByTestId('login-button').click();

    // Click logout button
    cy.getByTestId('logout-button').click();

    // Verify logged out state
    cy.getByTestId('login-form').should('be.visible');
    cy.getByTestId('user-profile').should('not.exist');
    
    // Verify auth token is removed
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.be.null;
    });
  });
});