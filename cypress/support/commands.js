Cypress.Commands.add('loadExtension', () => {
  // This command will be implemented once we have the extension ID
  cy.visit('/');
});

Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});