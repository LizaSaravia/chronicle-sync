// Chronicle Sync Background Script
const VERSION = '1.0.0';

chrome.runtime.onInstalled.addListener(() => {
  console.log(`Chronicle Sync ${VERSION} installed`);
});