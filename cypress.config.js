const { defineConfig } = require('cypress');
const path = require('path');
const { spawn } = require('child_process');

module.exports = defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      let devServer;

      // Start development server
      on('before:run', () => {
        return new Promise((resolve) => {
          console.log('Starting development server...');
          // Start wrangler in dev mode
          devServer = spawn('npx', ['wrangler', 'dev', '--local'], {
            stdio: 'inherit',
            env: {
              ...process.env,
              // Use miniflare for local development
              CLOUDFLARE_ACCOUNT_ID: 'test-account',
              CLOUDFLARE_API_TOKEN: 'test-token'
            }
          });
          
          // Wait for server to start
          setTimeout(resolve, 2000);
        });
      });

      // Stop development server
      on('after:run', () => {
        return new Promise((resolve) => {
          if (devServer) {
            devServer.kill();
          }
          resolve();
        });
      });

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
            resolve(global.extensionId);
          });
        },
        setExtensionId: (id) => {
          global.extensionId = id;
          return null;
        },
        restartDevServer: () => {
          return new Promise((resolve) => {
            if (devServer) {
              devServer.kill();
              // Start wrangler in dev mode again
              devServer = spawn('npx', ['wrangler', 'dev', '--local'], {
                stdio: 'inherit',
                env: {
                  ...process.env,
                  CLOUDFLARE_ACCOUNT_ID: 'test-account',
                  CLOUDFLARE_API_TOKEN: 'test-token'
                }
              });
              // Wait for server to restart
              setTimeout(resolve, 2000);
            } else {
              resolve();
            }
          });
        }
      });
    },
    baseUrl: 'http://127.0.0.1:8787', // Default wrangler dev port
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    experimentalModifyObstructiveThirdPartyCode: true,
    chromeWebSecurity: false,
    env: {
      apiUrl: 'http://127.0.0.1:8787/api'
    }
  },
});