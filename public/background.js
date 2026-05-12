// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

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
