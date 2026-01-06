let currentDomain = null;
let startTime = null;
let trackingInterval = null;

// Function to get domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:' || urlObj.protocol === 'about:') return null;
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Save time accumulator
async function saveTime() {
  if (!currentDomain || !startTime) return;

  const now = Date.now();
  const duration = (now - startTime) / 1000; // in seconds
  startTime = now; // Reset start time for next interval

  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  
  const data = await chrome.storage.local.get(date);
  const dailyData = data[date] || {};
  
  if (dailyData[currentDomain]) {
    dailyData[currentDomain] += duration;
  } else {
    dailyData[currentDomain] = duration;
  }
  
  await chrome.storage.local.set({ [date]: dailyData });
}

// Function to handle tab/window changes
async function updateTracking() {
  // If we were tracking something, save it first
  if (currentDomain) {
    await saveTime();
  }

  // Get active tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      const domain = getDomain(tab.url);
      if (domain) {
        currentDomain = domain;
        startTime = Date.now();
        console.log(`Started tracking: ${domain}`);
      } else {
        currentDomain = null;
        startTime = null;
        console.log('Stopped tracking: System/Internal page');
      }
    } else {
      currentDomain = null;
      startTime = null;
      console.log('Stopped tracking: No active tab');
    }
  } catch (e) {
    console.error("Error updating tracking:", e);
  }
}

// Listeners
chrome.tabs.onActivated.addListener(updateTracking);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateTracking();
  }
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    if (currentDomain) {
      saveTime();
      currentDomain = null;
      startTime = null;
      console.log('Browser lost focus, stopped tracking');
    }
  } else {
    updateTracking();
  }
});

// Idle detection (stop tracking if user is idle for 60 seconds)
chrome.idle.setDetectionInterval(60);

chrome.idle.onStateChanged.addListener((newState) => {
  console.log(`Idle state changed: ${newState}`);
  if (newState === 'active') {
    updateTracking();
  } else {
    if (currentDomain) {
      saveTime();
      currentDomain = null;
      startTime = null;
      console.log('User idle, stopped tracking');
    }
  }
});

// Periodic save (every 1 minute just to be safe in case of crashes)
chrome.alarms.create('saveData', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'saveData') {
    saveTime();
  }
});

// Initialize
updateTracking();
