import './commands';

beforeEach(() => {
  // Clear any previous state
  cy.clearLocalStorage();
  cy.clearCookies();
});