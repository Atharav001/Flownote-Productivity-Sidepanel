chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('syncTasks', { periodInMinutes: 10 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncTasks') {
    chrome.runtime.sendMessage({ action: 'background_sync' }).catch(() => {});
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick_capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId }, () => {
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'open_quick_capture' });
          }, 300);
        });
      }
    });
  }
});
