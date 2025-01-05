describe('Chronicle Sync Extension', () => {
  beforeEach(() => {
    cy.loadExtension();
  });

  it('should show the extension popup', () => {
    cy.get('body').should('be.visible');
  });

  it('should have the correct title', () => {
    cy.get('h1').should('contain', 'Chronicle Sync');
  });

  it('should show sync status', () => {
    cy.getByTestId('sync-status').should('exist');
  });

  it('should allow user to start sync', () => {
    cy.getByTestId('sync-button')
      .should('be.visible')
      .should('not.be.disabled')
      .click();
    
    cy.getByTestId('sync-status')
      .should('contain', 'Syncing');
  });
});