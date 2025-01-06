document.addEventListener('DOMContentLoaded', async () => {
  const setupForm = document.getElementById('setup-form');
  const setupBtn = document.getElementById('setup-btn');
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');
  const environment = document.getElementById('environment');
  const customApiGroup = document.getElementById('custom-api-group');
  const customApiUrl = document.getElementById('custom-api-url');

  // Handle environment change
  environment.addEventListener('change', () => {
    if (environment.value === 'custom') {
      customApiGroup.style.display = 'block';
      customApiUrl.required = true;
    } else {
      customApiGroup.style.display = 'none';
      customApiUrl.required = false;
    }
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
  }

  function showSuccess(message) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
  }

  // Handle copy button click
  document.getElementById('copy-btn').addEventListener('click', async () => {
    const groupId = document.getElementById('group-id').textContent;
    try {
      await navigator.clipboard.writeText(groupId);
      const copySuccess = document.getElementById('copy-success');
      copySuccess.style.display = 'block';
      setTimeout(() => {
        copySuccess.style.display = 'none';
      }, 2000);
    } catch (error) {
      showError('Failed to copy to clipboard: ' + error.message);
    }
  });

  // Check if already initialized and get current environment
  try {
    const storage = await chrome.storage.local.get(['initialized', 'environment', 'groupId']);
    if (storage.initialized) {
      setupForm.style.display = 'none';
      const syncInfo = document.getElementById('sync-info');
      
      if (storage.groupId) {
        document.getElementById('group-id').textContent = storage.groupId;
        syncInfo.style.display = 'block';
        showSuccess('Chronicle Sync is set up and running.');
      } else {
        // If no group ID yet, show a message that it's still being created
        showSuccess('Chronicle Sync is initializing. Please wait a moment and refresh this page.');
      }
      return;
    }
    // Set environment dropdown to current value if exists
    if (storage.environment) {
      document.getElementById('environment').value = storage.environment;
    }
  } catch (error) {
    showError('Failed to check initialization status: ' + error.message);
  }

  setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const environment = document.getElementById('environment').value;
    const customApiUrl = document.getElementById('custom-api-url').value;

    if (!password || password !== confirmPassword) {
      showError('Passwords do not match or are empty');
      return;
    }

    if (environment === 'custom' && !customApiUrl) {
      showError('Custom API URL is required when using custom environment');
      return;
    }

    if (environment === 'custom' && !customApiUrl.match(/^https?:\/\/.+/)) {
      showError('Please enter a valid HTTP/HTTPS URL');
      return;
    }

    try {
      setupBtn.disabled = true;
      errorDiv.style.display = 'none';
      
      // Save environment and API settings
      await chrome.storage.local.set({ 
        environment,
        customApiUrl: environment === 'custom' ? customApiUrl : null
      });

      const response = await chrome.runtime.sendMessage({
        type: 'INITIALIZE',
        password,
        environment,
        customApiUrl: environment === 'custom' ? customApiUrl : null
      });

      if (response.success) {
        setupForm.style.display = 'none';
        showSuccess('Chronicle Sync has been successfully set up! You can close this tab.');
        
        // Open the popup to show it's working
        setTimeout(() => {
          chrome.action.openPopup();
        }, 1500);
      } else {
        showError('Initialization failed: ' + response.error);
      }
    } catch (error) {
      showError('Initialization failed: ' + error.message);
    } finally {
      setupBtn.disabled = false;
    }
  });
});