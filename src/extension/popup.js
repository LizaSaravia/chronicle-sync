document.addEventListener('DOMContentLoaded', async () => {
  const notSetupDiv = document.querySelector('.not-setup');
  const historyDiv = document.querySelector('.history');
  const setupBtn = document.getElementById('setup-btn');
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
      notSetupDiv.style.display = 'none';
      historyDiv.style.display = 'block';
      await loadHistory();
    } else {
      notSetupDiv.style.display = 'block';
      historyDiv.style.display = 'none';
    }
  } catch (error) {
    showError(historyError, 'Failed to check initialization status: ' + error.message);
  }

  // Setup button click handler - opens options page
  setupBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
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
      console.log('Requesting history from background...');
      const response = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
      console.log('Got history response:', response);
      
      if (!response.success) {
        const errorMsg = 'Failed to load history: ' + response.error;
        console.error(errorMsg);
        showError(historyError, errorMsg);
        return;
      }

      historyList.innerHTML = '';
      if (!response.history || response.history.length === 0) {
        console.log('No history items found');
        historyList.innerHTML = '<div class="history-item">No history items yet</div>';
        return;
      }

      console.log(`Found ${response.history.length} history items, displaying first 50`);
      response.history.slice(0, 50).forEach(item => {
        console.log('Adding history item:', { url: item.url, title: item.title });
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
      console.log('History display complete');
    } catch (error) {
      const errorMsg = 'Failed to load history: ' + error.message;
      console.error(errorMsg, error);
      showError(historyError, errorMsg);
    }
  }
});