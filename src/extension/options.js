document.addEventListener('DOMContentLoaded', async () => {
  const setupForm = document.getElementById('setup-form');
  const setupBtn = document.getElementById('setup-btn');
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');

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

  // Check if already initialized
  try {
    const storage = await chrome.storage.local.get('initialized');
    if (storage.initialized) {
      setupForm.style.display = 'none';
      showSuccess('Chronicle Sync is already set up and running.');
      return;
    }
  } catch (error) {
    showError('Failed to check initialization status: ' + error.message);
  }

  setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!password || password !== confirmPassword) {
      showError('Passwords do not match or are empty');
      return;
    }

    try {
      setupBtn.disabled = true;
      errorDiv.style.display = 'none';
      
      const response = await chrome.runtime.sendMessage({
        type: 'INITIALIZE',
        password
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