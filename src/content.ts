// Content script to grab content from page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractContent") {
    // Extract text content from selection or main body
    const selection = window.getSelection()?.toString();
    if (selection) {
      sendResponse({ content: selection });
      return true;
    }
    
    // Try to grab text from screen
    const bodyText = document.body.innerText || "";
    sendResponse({ content: bodyText.slice(0, 10000) });
  }
  return true;
});
