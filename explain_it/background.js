
chrome.commands.onCommand.addListener((command) => {
  if (command === "summarize") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "summarize" });
      }
    });
  }
});
