Cypress.Commands.add('loadExtension', () => {
  // Load the extension popup
  cy.visit('/popup.html');
});

Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('login', (email, password) => {
  cy.getByTestId('email-input').type(email);
  cy.getByTestId('password-input').type(password);
  cy.getByTestId('login-button').click();
});

Cypress.Commands.add('loginAsTestUser', () => {
  cy.login(Cypress.env('TEST_USER_EMAIL'), Cypress.env('TEST_USER_PASSWORD'));
});

Cypress.Commands.add('logout', () => {
  cy.getByTestId('logout-button').click();
});

// Clear all application storage
Cypress.Commands.add('clearAppData', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  indexedDB.deleteDatabase('chronicle-sync');
});