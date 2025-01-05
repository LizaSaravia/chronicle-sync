const { defineConfig } = require('cypress');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      // Load the extension
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          // Get the extension path
          const extensionPath = path.resolve(__dirname, 'dist');
          
          // Add the extension to Chrome
          launchOptions.args.push(`--load-extension=${extensionPath}`);
          launchOptions.args.push('--auto-open-devtools-for-tabs');
          
          return launchOptions;
        }
      });

      // Get the extension ID after loading
      on('task', {
        getExtensionId: () => {
          return new Promise((resolve) => {
            // The extension ID will be set by the test after loading
            resolve(global.extensionId);
          });
        },
        setExtensionId: (id) => {
          global.extensionId = id;
          return null;
        }
      });
    },
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    experimentalModifyObstructiveThirdPartyCode: true,
    chromeWebSecurity: false
  },
});
