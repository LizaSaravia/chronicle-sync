document.addEventListener('DOMContentLoaded', async () => {
  const setupDiv = document.querySelector('.setup');
  const historyDiv = document.querySelector('.history');
  const setupForm = document.getElementById('setup-form');
  const setupBtn = document.getElementById('setup-btn');
  const setupError = document.getElementById('setup-error');
  const setupLoading = document.getElementById('setup-loading');
  const syncBtn = document.getElementById('sync-btn');
  const syncLoading = document.getElementById('sync-loading');
  const historyError = document.getElementById('history-error');
  const historyList = document.getElementById('history-list');

  function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }

  // Check if extension is initialized
  try {
    const storage = await chrome.storage.local.get('initialized');
    if (storage.initialized) {
      setupDiv.style.display = 'none';
      historyDiv.style.display = 'block';
      await loadHistory();
    } else {
      setupDiv.style.display = 'block';
      historyDiv.style.display = 'none';
    }
  } catch (error) {
    showError(setupError, 'Failed to check initialization status: ' + error.message);
  }

  // Setup form submit handler
  setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!password || password !== confirmPassword) {
      showError(setupError, 'Passwords do not match or are empty');
      return;
    }

    try {
      setupBtn.disabled = true;
      setupLoading.style.display = 'block';
      setupError.style.display = 'none';

      const response = await chrome.runtime.sendMessage({
        type: 'INITIALIZE',
        password
      });

      if (response.success) {
        setupDiv.style.display = 'none';
        historyDiv.style.display = 'block';
        await loadHistory();
      } else {
        showError(setupError, 'Initialization failed: ' + response.error);
      }
    } catch (error) {
      showError(setupError, 'Initialization failed: ' + error.message);
    } finally {
      setupBtn.disabled = false;
      setupLoading.style.display = 'none';
    }
  });

  // Force sync button click handler
  syncBtn.addEventListener('click', async () => {
    try {
      syncBtn.disabled = true;
      syncLoading.style.display = 'block';
      historyError.style.display = 'none';

      const response = await chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
      if (response.success) {
        await loadHistory();
      } else {
        showError(historyError, 'Sync failed: ' + response.error);
      }
    } catch (error) {
      showError(historyError, 'Sync failed: ' + error.message);
    } finally {
      syncBtn.disabled = false;
      syncLoading.style.display = 'none';
    }
  });

  // Load and display history
  async function loadHistory() {
    try {
      historyError.style.display = 'none';
      const response = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
      
      if (!response.success) {
        showError(historyError, 'Failed to load history: ' + response.error);
        return;
      }

      historyList.innerHTML = '';
      if (!response.history || response.history.length === 0) {
        historyList.innerHTML = '<div class="history-item">No history items yet</div>';
        return;
      }

      response.history.slice(0, 50).forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
          <div class="title">${item.title ? item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Untitled'}</div>
          <div class="url">${item.url.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        `;
        div.addEventListener('click', () => {
          chrome.tabs.create({ url: item.url });
        });
        historyList.appendChild(div);
      });
    } catch (error) {
      showError(historyError, 'Failed to load history: ' + error.message);
    }
  }
});