// Custom commands for extension testing
Cypress.Commands.add('loadExtension', () => {
  // Load the extension popup
  cy.visit('/popup.html');
});

Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});
