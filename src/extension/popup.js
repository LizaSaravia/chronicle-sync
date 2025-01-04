document.addEventListener('DOMContentLoaded', async () => {
  const setupDiv = document.querySelector('.setup');
  const historyDiv = document.querySelector('.history');
  const setupBtn = document.getElementById('setup-btn');
  const syncBtn = document.getElementById('sync-btn');
  const historyList = document.getElementById('history-list');

  // Check if extension is initialized
  const storage = await chrome.storage.local.get('initialized');
  if (storage.initialized) {
    setupDiv.style.display = 'none';
    historyDiv.style.display = 'block';
    loadHistory();
  } else {
    setupDiv.style.display = 'block';
    historyDiv.style.display = 'none';
  }

  // Setup button click handler
  setupBtn.addEventListener('click', async () => {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!password || password !== confirmPassword) {
      alert('Passwords do not match or are empty');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'INITIALIZE',
      password
    });

    if (response.success) {
      setupDiv.style.display = 'none';
      historyDiv.style.display = 'block';
      loadHistory();
    } else {
      alert('Initialization failed: ' + response.error);
    }
  });

  // Force sync button click handler
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    const response = await chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
    if (response.success) {
      loadHistory();
    } else {
      alert('Sync failed: ' + response.error);
    }
    syncBtn.disabled = false;
  });

  // Load and display history
  async function loadHistory() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
    if (!response.success) {
      alert('Failed to load history: ' + response.error);
      return;
    }

    historyList.innerHTML = '';
    response.history.slice(0, 50).forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="title">${item.title || 'Untitled'}</div>
        <div class="url">${item.url}</div>
      `;
      div.addEventListener('click', () => {
        chrome.tabs.create({ url: item.url });
      });
      historyList.appendChild(div);
    });
  }
});